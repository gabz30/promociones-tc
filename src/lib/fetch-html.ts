import { Resolver } from "dns/promises";
import { execFile } from "child_process";
import { promisify } from "util";
import { Agent, fetch as undiciFetch } from "undici";

const execFileAsync = promisify(execFile);

const publicResolver = new Resolver();
publicResolver.setServers(["1.1.1.1", "8.8.8.8"]);

/**
 * Some local DNS resolvers hijack bank domains. Resolve via public DNS
 * and keep TLS verification enabled.
 */
const publicDnsAgent = new Agent({
  connect: {
    lookup(hostname, options, callback) {
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
    },
  },
});

async function fetchWithCurl(url: string): Promise<string> {
  const { stdout } = await execFileAsync(
    "curl.exe",
    [
      "-fsSL",
      "--max-time",
      "30",
      "-A",
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      url,
    ],
    {
      encoding: "utf8",
      maxBuffer: 10 * 1024 * 1024,
      windowsHide: true,
    },
  );
  return stdout;
}

export async function fetchRemoteText(url: string): Promise<string> {
  try {
    const response = await undiciFetch(url, {
      dispatcher: publicDnsAgent,
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        Accept: "text/html,application/xhtml+xml,application/json,*/*",
      },
      signal: AbortSignal.timeout(30000),
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    return await response.text();
  } catch (primaryError) {
    if (process.platform === "win32") {
      try {
        return await fetchWithCurl(url);
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
