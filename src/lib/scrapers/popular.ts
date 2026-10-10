import { createHash } from "crypto";
import { existsSync, readFileSync, writeFileSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";
import { parseSpanishDateRange, todayInDominicanRepublic } from "../dates";
import { fetchRemoteText } from "../fetch-html";
import type { Promotion } from "../types";

const POPULAR_CACHE_FILE = join(tmpdir(), "promotc-popular-items.json");

export const POPULAR_PROMOS_URL = "https://popularenlinea.com/beneficios";
const POPULAR_ORIGIN = "https://popularenlinea.com";

interface PopularFile {
  ServerRelativeUrl?: string;
}

interface PopularCategory {
  results?: string[];
}

interface PopularItem {
  Id?: number;
  Title?: string | null;
  Extracto?: string | null;
  Cuerpo?: string | null;
  imagenUrl?: string | null;
  textoValidez?: string | null;
  FechaCaducidad?: string | null;
  File?: PopularFile | null;
  categoriaBeneficio0?: PopularCategory | null;
}

interface PopularPayload {
  d?: {
    results?: PopularItem[];
    __next?: string;
  };
}

function cleanText(value: string): string {
  return value
    .replace(/&#(\d+);/g, (_, code: string) => String.fromCharCode(Number(code)))
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

function stripHtml(value: string): string {
  return cleanText(value.replace(/<br\s*\/?>/gi, " ").replace(/<[^>]+>/g, " "));
}

function makeId(parts: string[]): string {
  return createHash("sha1").update(parts.join("|")).digest("hex").slice(0, 12);
}

function extractDiscount(text: string): number | null {
  const match = text.match(/(\d+)\s*%/);
  return match ? Number(match[1]) : null;
}

function absoluteUrl(path: string | null | undefined): string | null {
  if (!path) return null;
  if (path.startsWith("http://") || path.startsWith("https://")) return path;
  const [pathname, query] = path.split("?");
  const encoded = pathname
    .split("/")
    .map((part) => encodeURIComponent(decodeURIComponent(part)))
    .join("/");
  return `${POPULAR_ORIGIN}${encoded}${query ? `?${query}` : ""}`;
}

/** Local DNS hijacks this host, so the browser loads assets through our proxy. */
function proxiedAsset(url: string | null): string | null {
  if (!url) return null;
  return `/api/proxy?url=${encodeURIComponent(url)}`;
}

function sanitizeDetailHtml(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<iframe[\s\S]*?<\/iframe>/gi, "")
    .replace(/\son\w+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, "")
    .replace(/javascript:/gi, "")
    .replace(/href=(["'])\/(?!\/)/gi, `href=$1${POPULAR_ORIGIN}/`)
    .replace(/src=(["'])\/(?!\/)/gi, `src=$1${POPULAR_ORIGIN}/`)
    .trim();
}

function expiryDay(value: string | null | undefined): string | null {
  if (!value) return null;
  const day = value.slice(0, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(day) ? day : null;
}

function itemsUrl(now: Date): string {
  const filter = `((ContentType eq 'Beneficio') and (mostrar0 eq 1) and (FechaCaducidad gt '${now.toISOString()}'))`;
  const select = [
    "Id",
    "Title",
    "Extracto",
    "Cuerpo",
    "imagenUrl",
    "textoValidez",
    "FechaCaducidad",
    "File",
    "categoriaBeneficio0",
  ].join(",");
  return (
    `${POPULAR_ORIGIN}/beneficios/_api/lists/getbytitle('Pages')/Items` +
    `?$top=100&$select=${select}` +
    `&$orderby=FechaCaducidad asc,Modified desc` +
    `&$expand=File&$filter=${encodeURIComponent(filter)}`
  );
}

export function parsePopularItems(items: PopularItem[]): Promotion[] {
  const openStartDate = `${todayInDominicanRepublic().slice(0, 4)}-01-01`;
  const promotions: Promotion[] = [];

  for (const item of items) {
    const title = cleanText(item.Title ?? "");
    const excerpt = cleanText(item.Extracto ?? "");
    const body = stripHtml(item.Cuerpo ?? "");
    const validity = cleanText(item.textoValidez ?? "");
    const imageUrl = proxiedAsset(absoluteUrl(item.imagenUrl));
    if (!title || !imageUrl) continue;

    const range =
      (validity
        ? parseSpanishDateRange(validity, {
            defaultYear: Number(openStartDate.slice(0, 4)),
            openStartDate,
          })
        : null) ??
      (() => {
        const endDate = expiryDay(item.FechaCaducidad);
        return endDate ? { startDate: openStartDate, endDate } : null;
      })();
    if (!range) continue;

    const discountPercent = extractDiscount(`${title} ${excerpt} ${body}`);
    const detailUrl = absoluteUrl(item.File?.ServerRelativeUrl);

    promotions.push({
      id: makeId([
        "popular",
        String(item.Id ?? title),
        range.startDate,
        range.endDate,
      ]),
      bankId: "popular",
      bankName: "Popular",
      merchant: title,
      title: excerpt || (discountPercent != null ? `${discountPercent}% de beneficio` : "Beneficio Popular"),
      discountPercent,
      description: body || excerpt || validity,
      dateLabel: validity || body,
      startDate: range.startDate,
      endDate: range.endDate,
      imageUrl,
      conditionsUrl: detailUrl ?? POPULAR_PROMOS_URL,
      conditionsLabel: "Ver beneficio",
      tag: item.categoriaBeneficio0?.results?.[0] ?? "Tarjetas Popular",
      detailHtml: body ? sanitizeDetailHtml(item.Cuerpo ?? "") : null,
    });
  }

  return promotions;
}

async function fetchPopularPage(url: string): Promise<PopularPayload> {
  const text = await fetchRemoteText(url, {
    headers: { Accept: "application/json;odata=verbose" },
  });
  try {
    return JSON.parse(text) as PopularPayload;
  } catch {
    throw new Error("Popular devolvió JSON inválido");
  }
}

function readCachedItems(): PopularItem[] | null {
  try {
    if (!existsSync(POPULAR_CACHE_FILE)) return null;
    const items = JSON.parse(readFileSync(POPULAR_CACHE_FILE, "utf8")) as PopularItem[];
    return Array.isArray(items) && items.length ? items : null;
  } catch {
    return null;
  }
}

export async function scrapePopularPromotions(
  now = new Date(),
): Promise<Promotion[]> {
  try {
    const items: PopularItem[] = [];
    let next: string | undefined = itemsUrl(now);

    for (let page = 0; page < 5 && next; page += 1) {
      const payload = await fetchPopularPage(next);
      items.push(...(payload.d?.results ?? []));
      next = payload.d?.__next;
    }

    if (!items.length) {
      throw new Error("Popular no devolvió beneficios");
    }

    writeFileSync(POPULAR_CACHE_FILE, JSON.stringify(items));
    return parsePopularItems(items);
  } catch (error) {
    const cached = readCachedItems();
    if (cached) return parsePopularItems(cached);
    throw error;
  }
}
