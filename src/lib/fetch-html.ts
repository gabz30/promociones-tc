import { Resolver } from "dns/promises";
import { execFile } from "child_process";
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
      if (!isCertificateError(error)) continue;

      try {
        return await fetchWithUndici(url, options, client.insecureAgent);
      } catch (insecureError) {
        lastError = insecureError;
      }
    }
  }

  if (process.platform === "win32") {
    for (const client of publicDnsClients) {
      try {
        return await fetchWithCurl(url, options, client.resolver);
      } catch (error) {
        lastError = error;
      }
    }
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
