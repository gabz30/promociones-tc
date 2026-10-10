import { Resolver } from "dns/promises";
import { execFile, spawn } from "child_process";
import { existsSync, mkdtempSync, readFileSync, rmSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";
import { promisify } from "util";
import { Agent, fetch as undiciFetch } from "undici";

const execFileAsync = promisify(execFile);

const PUBLIC_DNS_SERVERS = ["1.1.1.1", "8.8.8.8"];

function lookupWith(resolver: Resolver) {
  return function publicDnsLookup(
    hostname: string,
    options: { all?: boolean } | number | undefined,
    callback: (...args: any[]) => void,
  ) {
    const wantAll = Boolean(
      options && typeof options === "object" && "all" in options && options.all,
    );

    resolver
      .resolve4(hostname)
      .then((addresses) => {
        if (!addresses.length) {
          callback(new Error(`No A records for ${hostname}`), wantAll ? [] : "", 4);
          return;
        }

        if (wantAll) {
          callback(
            null,
            addresses.map((address) => ({ address, family: 4 as const })),
          );
          return;
        }

        callback(null, addresses[0], 4);
      })
      .catch((error: Error) => {
        callback(error, wantAll ? [] : "", 4);
      });
  };
}

function createResolver(server: string) {
  const resolver = new Resolver();
  resolver.setServers([server]);
  return resolver;
}

/**
 * Some local DNS resolvers hijack bank domains. Resolve via public DNS.
 * Akamai sometimes 403s one edge, so each server is tried on its own.
 */
const publicDnsClients = PUBLIC_DNS_SERVERS.map((server) => {
  const resolver = createResolver(server);
  const lookup = lookupWith(resolver);
  return {
    resolver,
    agent: new Agent({ connect: { lookup } }),
    insecureAgent: new Agent({
      connect: { rejectUnauthorized: false, lookup },
    }),
  };
});

export interface FetchRemoteOptions {
  method?: "GET" | "POST";
  body?: string;
  headers?: Record<string, string>;
}

async function fetchWithCurl(
  url: string,
  options: FetchRemoteOptions = {},
  resolver: Resolver = publicDnsClients[0].resolver,
): Promise<string> {
  const hostname = new URL(url).hostname;
  const addresses = await resolver.resolve4(hostname);
  if (!addresses.length) {
    throw new Error(`No A records for ${hostname}`);
  }

  const args = [
    "-fsSL",
    "-k",
    "--max-time",
    "30",
    "-A",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "--resolve",
    `${hostname}:443:${addresses[0]}`,
  ];

  if (options.method === "POST") {
    args.push("-X", "POST");
  }
  if (options.body) {
    args.push("--data-binary", options.body);
  }
  for (const [key, value] of Object.entries(options.headers ?? {})) {
    args.push("-H", `${key}: ${value}`);
  }
  args.push(url);

  const { stdout } = await execFileAsync("curl.exe", args, {
    encoding: "utf8",
    maxBuffer: 10 * 1024 * 1024,
    windowsHide: true,
  });
  return assertReadableBody(stdout);
}

async function fetchWithUndici(
  url: string,
  options: FetchRemoteOptions,
  dispatcher: Agent,
): Promise<string> {
  const response = await undiciFetch(url, {
    dispatcher,
    method: options.method ?? "GET",
    body: options.body,
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      Accept: "text/html,application/xhtml+xml,application/json,*/*",
      ...options.headers,
    },
    signal: AbortSignal.timeout(30000),
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }

  return assertReadableBody(await response.text());
}

function isIncapsulaChallenge(text: string): boolean {
  return (
    text.length < 20000 &&
    text.includes("_Incapsula_Resource") &&
    !text.includes('"d"')
  );
}

function assertReadableBody(text: string): string {
  if (isIncapsulaChallenge(text)) {
    throw new Error("Incapsula challenge");
  }
  return text;
}

function findChrome(): string | null {
  const localAppData = process.env.LOCALAPPDATA;
  const candidates = [
    "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
    localAppData
      ? join(localAppData, "Google", "Chrome", "Application", "chrome.exe")
      : "",
  ].filter(Boolean);
  return candidates.find((path) => existsSync(path)) ?? null;
}

async function readChromeDebugPort(userDataDir: string): Promise<number> {
  const file = join(userDataDir, "DevToolsActivePort");
  for (let attempt = 0; attempt < 40; attempt += 1) {
    if (existsSync(file)) {
      const port = Number(readFileSync(file, "utf8").split(/\r?\n/)[0]);
      if (port) return port;
    }
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  throw new Error("Chrome no abrió el puerto de depuración");
}

async function cdpEvaluate(wsUrl: string, expression: string): Promise<string> {
  const ws = new WebSocket(wsUrl);
  await new Promise<void>((resolve, reject) => {
    const timer = setTimeout(
      () => reject(new Error("Tiempo de espera al conectar con Chrome")),
      10000,
    );
    ws.addEventListener("open", () => {
      clearTimeout(timer);
      resolve();
    });
    ws.addEventListener("error", () => {
      clearTimeout(timer);
      reject(new Error("No se pudo conectar a Chrome"));
    });
  });

  const messageId = 1;
  const result = new Promise<string>((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error("Chrome no respondió a tiempo"));
    }, 45000);
    ws.addEventListener("message", (event) => {
      const raw = event.data;
      const text =
        typeof raw === "string"
          ? raw
          : raw instanceof ArrayBuffer
            ? Buffer.from(raw).toString("utf8")
            : ArrayBuffer.isView(raw)
              ? Buffer.from(raw.buffer, raw.byteOffset, raw.byteLength).toString("utf8")
              : String(raw);
      const data = JSON.parse(text) as {
        id?: number;
        error?: { message?: string };
        result?: {
          exceptionDetails?: unknown;
          result?: { value?: string };
        };
      };
      if (data.id !== messageId) return;
      clearTimeout(timer);
      if (data.error) {
        reject(new Error(data.error.message || "Error de Chrome"));
        return;
      }
      if (data.result?.exceptionDetails) {
        reject(new Error("Chrome no pudo leer la página"));
        return;
      }
      resolve(String(data.result?.result?.value ?? ""));
    });
  });

  ws.send(
    JSON.stringify({
      id: messageId,
      method: "Runtime.evaluate",
      params: { expression, awaitPromise: true, returnByValue: true },
    }),
  );

  try {
    return await result;
  } finally {
    ws.close();
  }
}

/** Some bank sites only answer after a real browser clears the bot check. */
async function fetchWithChrome(
  url: string,
  options: FetchRemoteOptions,
): Promise<string> {
  const chrome = findChrome();
  if (!chrome) throw new Error("Chrome no está instalado");

  const pageUrl = new URL(url);
  const resolver = createResolver("8.8.8.8");
  const addresses = await resolver.resolve4(pageUrl.hostname);
  const userDataDir = mkdtempSync(join(tmpdir(), "promotc-chrome-"));
  const child = spawn(
    chrome,
    [
      "--headless=new",
      "--disable-gpu",
      "--disable-blink-features=AutomationControlled",
      "--no-first-run",
      "--no-default-browser-check",
      "--window-size=1280,800",
      `--user-data-dir=${userDataDir}`,
      "--remote-debugging-port=0",
      `--host-resolver-rules=MAP ${pageUrl.hostname} ${addresses[0]}, EXCLUDE localhost`,
      "about:blank",
    ],
    { stdio: "ignore", windowsHide: true },
  );

  try {
    const port = await readChromeDebugPort(userDataDir);
    const created = await fetch(
      `http://127.0.0.1:${port}/json/new?${encodeURIComponent(`https://${pageUrl.hostname}/`)}`,
      { method: "PUT" },
    );
    const target = (await created.json()) as { webSocketDebuggerUrl?: string };
    if (!target.webSocketDebuggerUrl) {
      throw new Error("Chrome no devolvió un depurador");
    }

    await new Promise((resolve) => setTimeout(resolve, 2000));
    const accept = options.headers?.Accept ?? "application/json, text/html, */*";
    const expression = `(async () => {
      const target = ${JSON.stringify(url)};
      const accept = ${JSON.stringify(accept)};
      const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
      const deadline = Date.now() + 25000;
      while (
        Date.now() < deadline &&
        document.documentElement.outerHTML.includes("_Incapsula_Resource")
      ) {
        await sleep(1000);
      }
      const response = await fetch(target, {
        headers: { Accept: accept },
        credentials: "include",
        signal: AbortSignal.timeout(10000),
      });
      return await response.text();
    })()`;
    return assertReadableBody(await cdpEvaluate(target.webSocketDebuggerUrl, expression));
  } finally {
    child.kill();
    await new Promise((resolve) => setTimeout(resolve, 300));
    try {
      rmSync(userDataDir, { recursive: true, force: true });
    } catch {
      // Chrome may still be releasing the profile folder.
    }
  }
}

function errorText(error: unknown): string {
  const parts: string[] = [];
  let current: unknown = error;
  for (let depth = 0; current && depth < 4; depth += 1) {
    if (current instanceof Error) {
      parts.push(current.message);
      const code = "code" in current ? String(current.code) : "";
      if (code) parts.push(code);
      current = "cause" in current ? current.cause : undefined;
      continue;
    }
    parts.push(String(current));
    break;
  }
  return parts.join(" ");
}

function isCertificateError(error: unknown): boolean {
  return /certificate|UNABLE_TO_VERIFY|SELF_SIGNED|unable to verify|CERT_/i.test(
    errorText(error),
  );
}

export async function fetchRemoteText(
  url: string,
  options: FetchRemoteOptions = {},
): Promise<string> {
  let lastError: unknown;

  for (const client of publicDnsClients) {
    try {
      return await fetchWithUndici(url, options, client.agent);
    } catch (error) {
      lastError = error;
      if (error instanceof Error && error.message === "Incapsula challenge") break;
      if (!isCertificateError(error)) continue;

      try {
        return await fetchWithUndici(url, options, client.insecureAgent);
      } catch (insecureError) {
        lastError = insecureError;
      }
    }
  }

  if (
    process.platform === "win32" &&
    !(lastError instanceof Error && lastError.message === "Incapsula challenge")
  ) {
    for (const client of publicDnsClients) {
      try {
        return await fetchWithCurl(url, options, client.resolver);
      } catch (error) {
        lastError = error;
      }
    }
  }

  if (
    lastError instanceof Error &&
    lastError.message === "Incapsula challenge"
  ) {
    return await fetchWithChrome(url, options);
  }

  throw lastError instanceof Error ? lastError : new Error(String(lastError));
}

/** @deprecated Use fetchRemoteText — kept for Qik callers that validate HTML. */
export async function fetchHtml(url: string): Promise<string> {
  const html = await fetchRemoteText(url);
  if (!html.includes("promo-cards")) {
    throw new Error("Respuesta inesperada (sin promo-cards)");
  }
  return html;
}
