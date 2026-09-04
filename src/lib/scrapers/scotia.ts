import { createHash } from "crypto";
import { parseSpanishDateRange, todayInDominicanRepublic } from "../dates";
import { fetchRemoteText } from "../fetch-html";
import type { Promotion } from "../types";

const SCOTIA_ORIGIN = "https://do.scotiabank.com";
const SCOTIA_FILTER_PATH =
  "/banca-personal/promociones/jcr:content/main-par/section_container_co/section-container-par/generic_filter_copy";
const PAGE_SIZE = 12;

export function scotiaPromosPageUrl(year = currentPromoYear()): string {
  return `${SCOTIA_ORIGIN}/banca-personal/promociones.1.all.all.${year}.html`;
}

export const SCOTIA_PROMOS_URL = scotiaPromosPageUrl();

interface ScotiaArticle {
  fragment_image?: string;
  fragment_url?: string;
  fragment_title?: string;
  fragment_description?: string;
  fragment_imageAltText?: string;
}

interface ScotiaPayload {
  jsonArticles?: ScotiaArticle[];
  total_results?: number;
}

function currentPromoYear(now = new Date()): number {
  return Number(todayInDominicanRepublic(now).slice(0, 4));
}

function servletUrl(offset: number, year: number): string {
  return `${SCOTIA_ORIGIN}${SCOTIA_FILTER_PATH}.economicfilterservlet.${offset}.all.all.${year}.html`;
}

function cleanText(value: string): string {
  return value
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/\s+/g, " ")
    .trim();
}

function stripHtml(value: string): string {
  return cleanText(value.replace(/<[^>]+>/g, " "));
}

function absoluteUrl(href: string | undefined): string | null {
  if (!href) return null;
  if (href.startsWith("http://") || href.startsWith("https://")) return href;
  if (href.startsWith("//")) return `https:${href}`;

  // AEM author paths → public vanity URLs
  const publicPath = href.replace(/^\/content\/scotiabank\/do\/es/, "");
  if (publicPath.startsWith("/")) return `${SCOTIA_ORIGIN}${publicPath}`;
  return `${SCOTIA_ORIGIN}/${publicPath}`;
}

function makeId(parts: string[]): string {
  return createHash("sha1").update(parts.join("|")).digest("hex").slice(0, 12);
}

function extractDiscount(title: string): number | null {
  const match = title.match(/(\d+)\s*%/);
  return match ? Number(match[1]) : null;
}

function extractMerchant(
  title: string,
  description: string,
  altText: string,
): string {
  const fromTitle = title.match(/\ben\s+(.+)$/i)?.[1]?.trim();
  if (fromTitle && fromTitle.length > 1) return fromTitle;

  const fromDesc = description.match(/\ben\s+(.+?)\s+del\s+\d/i)?.[1]?.trim();
  if (fromDesc && fromDesc.length > 1 && fromDesc.length < 80) return fromDesc;

  const alt = cleanText(altText);
  if (alt && !/^image$/i.test(alt)) {
    return alt.replace(/\b\w/g, (c) => c.toUpperCase());
  }

  return "Scotiabank";
}

function extractDateLabel(description: string): string {
  const match = description.match(
    /\b(?:valid[oa]\s+)?(?:del|desde el|hasta el)\s+.+$/i,
  );
  return match ? cleanText(match[0].replace(/\.$/, "")) : description;
}

export function parseScotiaPayload(payload: ScotiaPayload): Promotion[] {
  const promotions: Promotion[] = [];

  for (const item of payload.jsonArticles ?? []) {
    const title = stripHtml(item.fragment_title ?? "");
    const description = cleanText(item.fragment_description ?? "");
    const imageUrl = absoluteUrl(item.fragment_image);
    if (!title || !description || !imageUrl) continue;

    const range = parseSpanishDateRange(description);
    if (!range) continue;

    const merchant = extractMerchant(
      title,
      description,
      item.fragment_imageAltText ?? "",
    );
    const dateLabel = extractDateLabel(description);
    const conditionsUrl = absoluteUrl(item.fragment_url);

    promotions.push({
      id: makeId([
        "scotia",
        merchant,
        title,
        range.startDate,
        range.endDate,
      ]),
      bankId: "scotia",
      bankName: "Scotiabank",
      merchant,
      title,
      discountPercent: extractDiscount(title),
      description,
      dateLabel,
      startDate: range.startDate,
      endDate: range.endDate,
      imageUrl,
      conditionsUrl,
      conditionsLabel: conditionsUrl ? "Ver promoción" : null,
      tag: "Tarjetas Scotiabank",
    });
  }

  return promotions;
}

async function fetchScotiaPage(
  offset: number,
  year: number,
): Promise<ScotiaPayload> {
  const text = await fetchRemoteText(servletUrl(offset, year));
  try {
    return JSON.parse(text) as ScotiaPayload;
  } catch {
    throw new Error("Scotiabank devolvió JSON inválido");
  }
}

export async function scrapeScotiaPromotions(
  year = currentPromoYear(),
): Promise<Promotion[]> {
  const first = await fetchScotiaPage(0, year);
  const total = Number(first.total_results ?? 0);
  const firstArticles = first.jsonArticles ?? [];

  if (!firstArticles.length && total === 0) {
    throw new Error("Scotiabank no devolvió promociones");
  }

  const pages: ScotiaPayload[] = [first];
  const offsets: number[] = [];
  for (let offset = PAGE_SIZE; offset < total; offset += PAGE_SIZE) {
    offsets.push(offset);
  }

  if (offsets.length) {
    const rest = await Promise.all(
      offsets.map((offset) => fetchScotiaPage(offset, year)),
    );
    pages.push(...rest);
  }

  const merged: ScotiaPayload = {
    jsonArticles: pages.flatMap((page) => page.jsonArticles ?? []),
    total_results: total,
  };

  return parseScotiaPayload(merged);
}
