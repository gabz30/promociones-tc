import { Resolver } from "dns/promises";
import { execFile } from "child_process";
import { promisify } from "util";
import { Agent, fetch as undiciFetch } from "undici";

const execFileAsync = promisify(execFile);

const publicResolver = new Resolver();
publicResolver.setServers(["1.1.1.1", "8.8.8.8"]);

function publicDnsLookup(
  hostname: string,
  options: { all?: boolean } | number | undefined,
  callback: (...args: any[]) => void,
) {
  const wantAll = Boolean(
    options && typeof options === "object" && "all" in options && options.all,
  );

  publicResolver
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
}

/**
 * Some local DNS resolvers hijack bank domains. Resolve via public DNS
 * and keep TLS verification enabled.
 */
const publicDnsAgent = new Agent({
  connect: {
    lookup: publicDnsLookup,
  },
});

/** Fallback when a bank site has a broken/incomplete cert chain. */
const publicDnsInsecureAgent = new Agent({
  connect: {
    rejectUnauthorized: false,
    lookup: publicDnsLookup,
  },
});

export interface FetchRemoteOptions {
  method?: "GET" | "POST";
  body?: string;
  headers?: Record<string, string>;
}

async function fetchWithCurl(
  url: string,
  options: FetchRemoteOptions = {},
): Promise<string> {
  const hostname = new URL(url).hostname;
  const addresses = await publicResolver.resolve4(hostname);
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
  return stdout;
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

  return await response.text();
}

export async function fetchRemoteText(
  url: string,
  options: FetchRemoteOptions = {},
): Promise<string> {
  try {
    return await fetchWithUndici(url, options, publicDnsAgent);
  } catch (primaryError) {
    try {
      return await fetchWithUndici(url, options, publicDnsInsecureAgent);
    } catch {
      // continue to curl on Windows
    }

    if (process.platform === "win32") {
      try {
        return await fetchWithCurl(url, options);
      } catch {
        // fall through to primary error
      }
    }
    throw primaryError instanceof Error
      ? primaryError
      : new Error(String(primaryError));
  }
}

/** @deprecated Use fetchRemoteText — kept for Qik callers that validate HTML. */
export async function fetchHtml(url: string): Promise<string> {
  const html = await fetchRemoteText(url);
  if (!html.includes("promo-cards")) {
    throw new Error("Respuesta inesperada (sin promo-cards)");
  }
  return html;
}
