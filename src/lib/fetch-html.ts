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

function findBrowser(): string | null {
  const localAppData = process.env.LOCALAPPDATA ?? "";
  const programFiles = process.env.ProgramFiles ?? "C:\\Program Files";
  const programFilesX86 = process.env["ProgramFiles(x86)"] ?? "C:\\Program Files (x86)";
  const programW6432 = process.env.ProgramW6432 ?? programFiles;
  const candidates = [
    join(programFiles, "Google", "Chrome", "Application", "chrome.exe"),
    join(programW6432, "Google", "Chrome", "Application", "chrome.exe"),
    join(programFilesX86, "Google", "Chrome", "Application", "chrome.exe"),
    join(localAppData, "Google", "Chrome", "Application", "chrome.exe"),
    join(programFiles, "Microsoft", "Edge", "Application", "msedge.exe"),
    join(programFilesX86, "Microsoft", "Edge", "Application", "msedge.exe"),
    join(localAppData, "Microsoft", "Edge", "Application", "msedge.exe"),
  ];
  return candidates.find((path) => path && existsSync(path)) ?? null;
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

function cdpMessageText(data: unknown): string {
  if (typeof data === "string") return data;
  if (data instanceof ArrayBuffer) return Buffer.from(data).toString("utf8");
  if (ArrayBuffer.isView(data)) {
    return Buffer.from(data.buffer, data.byteOffset, data.byteLength).toString("utf8");
  }
  return String(data);
}

class BrowserSession {
  private nextId = 0;
  private readonly pending = new Map<
    number,
    {
      resolve: (value: unknown) => void;
      reject: (error: Error) => void;
      timer: ReturnType<typeof setTimeout>;
    }
  >();

  private constructor(private readonly ws: WebSocket) {}

  static async open(wsUrl: string): Promise<BrowserSession> {
    const ws = new WebSocket(wsUrl);
    await new Promise<void>((resolve, reject) => {
      const timer = setTimeout(
        () => reject(new Error("Tiempo de espera al conectar con el navegador")),
        10000,
      );
      ws.addEventListener("open", () => {
        clearTimeout(timer);
        resolve();
      });
      ws.addEventListener("error", () => {
        clearTimeout(timer);
        reject(new Error("No se pudo conectar al navegador"));
      });
    });

    const session = new BrowserSession(ws);
    ws.addEventListener("message", (event) => {
      let data: { id?: number; error?: { message?: string }; result?: unknown };
      try {
        data = JSON.parse(cdpMessageText(event.data)) as typeof data;
      } catch {
        return;
      }
      if (data.id == null) return;
      const pending = session.pending.get(data.id);
      if (!pending) return;
      clearTimeout(pending.timer);
      session.pending.delete(data.id);
      if (data.error) pending.reject(new Error(data.error.message || "Error del navegador"));
      else pending.resolve(data.result);
    });
    return session;
  }

  send(method: string, params: object = {}, timeoutMs = 8000): Promise<unknown> {
    const id = ++this.nextId;
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pending.delete(id);
        reject(new Error("El navegador no respondió a tiempo"));
      }, timeoutMs);
      this.pending.set(id, { resolve, reject, timer });
      this.ws.send(JSON.stringify({ id, method, params }));
    });
  }

  close() {
    for (const pending of this.pending.values()) {
      clearTimeout(pending.timer);
      pending.reject(new Error("Navegador cerrado"));
    }
    this.pending.clear();
    this.ws.close();
  }
}

async function openBlankPage(port: number): Promise<string> {
  const listed = await fetch(`http://127.0.0.1:${port}/json/list`);
  const pages = (await listed.json()) as {
    type?: string;
    webSocketDebuggerUrl?: string;
  }[];
  const page = pages.find((item) => item.type === "page" && item.webSocketDebuggerUrl);
  if (!page?.webSocketDebuggerUrl) {
    throw new Error("El navegador no devolvió un depurador");
  }
  return page.webSocketDebuggerUrl;
}

let browserQueue: Promise<unknown> = Promise.resolve();

function enqueueBrowser<T>(task: () => Promise<T>): Promise<T> {
  const run = browserQueue.then(task, task);
  browserQueue = run.then(
    () => undefined,
    () => undefined,
  );
  return run;
}

/** Some bank sites only answer after a real browser clears the bot check. */
async function fetchWithChrome(
  url: string,
  options: FetchRemoteOptions,
): Promise<string> {
  return enqueueBrowser(() => fetchWithBrowserOnce(url, options));
}

async function fetchWithBrowserOnce(
  url: string,
  options: FetchRemoteOptions,
): Promise<string> {
  const browser = findBrowser();
  if (!browser) throw new Error("No se encontró Chrome ni Edge");

  const pageUrl = new URL(url);
  const resolver = createResolver("8.8.8.8");
  const addresses = await resolver.resolve4(pageUrl.hostname);
  const userDataDir = mkdtempSync(join(tmpdir(), "promotc-chrome-"));
  const child = spawn(
    browser,
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

  let session: BrowserSession | null = null;
  try {
    const port = await readChromeDebugPort(userDataDir);
    const wsUrl = await openBlankPage(port);
    session = await BrowserSession.open(wsUrl);
    await session.send("Page.enable");
    await session.send("Runtime.enable");
    await session.send("Network.enable");
    await session.send("Network.setUserAgentOverride", {
      userAgent:
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
    });
    await session.send("Page.addScriptToEvaluateOnNewDocument", {
      source: `Object.defineProperty(navigator, "webdriver", { get: () => undefined });
        window.chrome = window.chrome || { runtime: {} };`,
    });
    await session.send("Page.navigate", { url: `https://${pageUrl.hostname}/` });

    const deadline = Date.now() + 8000;
    let lastState = "pending";
    while (Date.now() < deadline) {
      try {
        const probe = (await session.send(
          "Runtime.evaluate",
          {
            expression: `(() => {
              const host = location.hostname || "";
              if (!host.endsWith(${JSON.stringify(pageUrl.hostname)})) return "pending";
              const html = document.documentElement ? document.documentElement.outerHTML : "";
              if (!html.includes("_Incapsula_Resource")) return "ready";
              const frame = document.getElementById("main-iframe");
              const frameText = frame && frame.contentDocument && frame.contentDocument.body
                ? frame.contentDocument.body.innerText
                : "";
              if (frameText.includes("Request unsuccessful") || html.includes("Request unsuccessful")) {
                return "blocked";
              }
              return "challenge";
            })()`,
            returnByValue: true,
          },
          4000,
        )) as { result?: { value?: string } };
        lastState = probe.result?.value ?? "pending";
        if (lastState === "ready" || lastState === "blocked") break;
      } catch {
        lastState = "reloading";
      }
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
    if (lastState !== "ready") {
      throw new Error("Popular bloqueó la lectura automática");
    }

    const accept = options.headers?.Accept ?? "application/json, text/html, */*";
    const expression = `(async () => {
      const response = await fetch(${JSON.stringify(url)}, {
        headers: { Accept: ${JSON.stringify(accept)} },
        credentials: "include",
        signal: AbortSignal.timeout(12000),
      });
      return await response.text();
    })()`;
    const evaluated = (await session.send(
      "Runtime.evaluate",
      { expression, awaitPromise: true, returnByValue: true },
      20000,
    )) as {
      exceptionDetails?: unknown;
      result?: { value?: string };
    };
    if (evaluated.exceptionDetails) {
      const details = evaluated.exceptionDetails as {
        text?: string;
        exception?: { description?: string };
      };
      throw new Error(
        details.exception?.description || details.text || "El navegador no pudo leer la página",
      );
    }
    return assertReadableBody(String(evaluated.result?.value ?? ""));
  } finally {
    session?.close();
    child.kill();
    await new Promise((resolve) => setTimeout(resolve, 300));
    try {
      rmSync(userDataDir, { recursive: true, force: true });
    } catch {
      // The browser may still be releasing the profile folder.
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
