import { NextRequest, NextResponse } from "next/server";
import { Resolver } from "dns/promises";
import { Agent, fetch as undiciFetch } from "undici";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ALLOWED_HOSTS = new Set([
  "qik.do",
  "www.qik.do",
  "lafise.com",
  "www.lafise.com",
  "cdn.lafise.com",
  "bhd.com.do",
  "www.bhd.com.do",
  "static.bhd.com.do",
  "backend.bhd.com.do",
  "do.scotiabank.com",
  "www.scotiabank.com",
  "cibao.com.do",
  "www.cibao.com.do",
  "bsc.com.do",
  "www.bsc.com.do",
]);

const publicResolver = new Resolver();
publicResolver.setServers(["1.1.1.1", "8.8.8.8"]);

const publicDnsAgent = new Agent({
  connect: {
    // Bank sites sometimes ship incomplete cert chains; hosts are allowlisted.
    rejectUnauthorized: false,
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
        .catch((error: Error) => callback(error, wantAll ? [] : "", 4));
    },
  },
});

function isAllowed(url: URL) {
  if (url.protocol !== "https:" && url.protocol !== "http:") return false;
  const host = url.hostname.toLowerCase();
  if (ALLOWED_HOSTS.has(host)) return true;
  // allow subdomains of known banks
  return [...ALLOWED_HOSTS].some(
    (allowed) => host === allowed || host.endsWith(`.${allowed}`),
  );
}

function stripFrameHeaders(headers: Headers) {
  const out = new Headers(headers);
  out.delete("x-frame-options");
  out.delete("content-security-policy");
  out.delete("content-security-policy-report-only");
  out.set("X-Frame-Options", "SAMEORIGIN");
  out.set(
    "Content-Security-Policy",
    "frame-ancestors 'self'; default-src * data: blob: 'unsafe-inline' 'unsafe-eval'",
  );
  // Avoid caching proxied bank pages aggressively
  out.set("Cache-Control", "private, max-age=300");
  return out;
}

function injectBaseHref(html: string, baseHref: string) {
  if (/<base\s/i.test(html)) return html;
  if (/<head[^>]*>/i.test(html)) {
    return html.replace(/<head([^>]*)>/i, `<head$1><base href="${baseHref}">`);
  }
  return `<base href="${baseHref}">${html}`;
}

export async function GET(request: NextRequest) {
  const raw = request.nextUrl.searchParams.get("url");
  if (!raw) {
    return NextResponse.json({ error: "Falta url" }, { status: 400 });
  }

  let target: URL;
  try {
    target = new URL(raw);
  } catch {
    return NextResponse.json({ error: "URL inválida" }, { status: 400 });
  }

  if (!isAllowed(target)) {
    return NextResponse.json({ error: "Dominio no permitido" }, { status: 403 });
  }

  try {
    const upstream = await undiciFetch(target.toString(), {
      dispatcher: publicDnsAgent,
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        Accept: "*/*",
        Referer: `${target.origin}/`,
      },
      redirect: "follow",
      signal: AbortSignal.timeout(45000),
    });

    if (!upstream.ok) {
      return NextResponse.json(
        { error: `Upstream ${upstream.status}` },
        { status: upstream.status },
      );
    }

    const contentType = upstream.headers.get("content-type") || "application/octet-stream";
    const headers = stripFrameHeaders(new Headers());
    headers.set("Content-Type", contentType);

    if (contentType.includes("text/html")) {
      const html = await upstream.text();
      const withBase = injectBaseHref(html, `${target.origin}/`);
      return new NextResponse(withBase, { status: 200, headers });
    }

    const buffer = Buffer.from(await upstream.arrayBuffer());
    headers.set("Content-Length", String(buffer.byteLength));
    if (contentType.includes("pdf")) {
      headers.set("Content-Disposition", "inline");
    }
    return new NextResponse(buffer, { status: 200, headers });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error de proxy";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
