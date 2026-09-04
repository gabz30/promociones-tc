import * as cheerio from "cheerio";
import { createHash } from "crypto";
import { parseSpanishDateRange } from "../dates";
import { fetchRemoteText } from "../fetch-html";
import type { Promotion } from "../types";

export const QIK_PROMOS_URL = "https://qik.do/promociones/tarjetaqik/";
const QIK_ORIGIN = "https://qik.do";

function absoluteUrl(href: string | undefined): string | null {
  if (!href) return null;
  if (href.startsWith("http://") || href.startsWith("https://")) return href;
  if (href.startsWith("//")) return `https:${href}`;
  if (href.startsWith("/")) return `${QIK_ORIGIN}${href}`;
  return `${QIK_ORIGIN}/${href}`;
}

function extractMerchant(imageSrc: string, description: string): string {
  const file = imageSrc.split("/").pop()?.split("?")[0] ?? "";
  const fromFile = file
    .replace(/\.(png|jpe?g|webp|svg|gif)$/i, "")
    .replace(/^(Icono[_-]?|Logo[_-]?)/i, "")
    .replace(/[_-]+/g, " ")
    .trim();

  if (fromFile && !/mundial|futbol|priceless/i.test(fromFile)) {
    return fromFile.replace(/\b\w/g, (c) => c.toUpperCase());
  }

  const fromDesc =
    description.match(
      /(?:de|en)\s+([A-ZÁÉÍÓÚÑ][\wÁÉÍÓÚÑáéíóúñ& ]+?)\s+(?:en\s+la\s+Rep|la\s+República)/i,
    )?.[1] ??
    description.match(
      /(?:página web de|tiendas? (?:físicas y digitales )?de)\s+([^.,]+)/i,
    )?.[1];

  if (fromDesc) return fromDesc.trim().replace(/\s+/g, " ");
  if (fromFile) return fromFile.replace(/\b\w/g, (c) => c.toUpperCase());
  return "Comercio";
}

function extractDiscount(title: string): number | null {
  const match = title.match(/(\d+)\s*%/);
  return match ? Number(match[1]) : null;
}

function cleanText(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

function makeId(parts: string[]): string {
  return createHash("sha1").update(parts.join("|")).digest("hex").slice(0, 12);
}

export function parseQikHtml(html: string): Promotion[] {
  const $ = cheerio.load(html);
  const promotions: Promotion[] = [];

  $(".promo-cards__card").each((_, el) => {
    const card = $(el);
    const title = cleanText(card.find(".promo-cards__card__title").first().text());
    const description = cleanText(
      card.find(".promo-cards__card__description").first().text(),
    );
    const dateLabel = cleanText(
      card.find(".promo-cards__card__date").first().text(),
    );
    const tag = cleanText(card.find(".promo-cards__card__tag").first().text()) || null;
    const imageSrc = card.find("img.promo-cards__card__logo").attr("src") ?? "";
    const imageUrl = absoluteUrl(imageSrc);
    const link = card.find("a.cmp-button").first();
    const conditionsHref = absoluteUrl(link.attr("href"));
    const conditionsLabel = cleanText(link.text()) || null;

    if (!title || !dateLabel || !imageUrl) return;

    const range = parseSpanishDateRange(dateLabel);
    if (!range) return;

    const merchant = extractMerchant(imageSrc, description);
    const discountPercent = extractDiscount(title);

    promotions.push({
      id: makeId(["qik", merchant, title, range.startDate, range.endDate]),
      bankId: "qik",
      bankName: "Qik",
      merchant,
      title,
      discountPercent,
      description,
      dateLabel,
      startDate: range.startDate,
      endDate: range.endDate,
      imageUrl,
      conditionsUrl: conditionsHref,
      conditionsLabel,
      tag,
    });
  });

  return promotions;
}

export async function scrapeQikPromotions(): Promise<Promotion[]> {
  const html = await fetchRemoteText(QIK_PROMOS_URL);
  if (!html.includes("promo-cards")) {
    throw new Error("Respuesta inesperada de Qik (sin promo-cards)");
  }
  return parseQikHtml(html);
}
