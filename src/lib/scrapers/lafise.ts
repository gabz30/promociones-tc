import { createHash } from "crypto";
import { parseDdMmYyyy, parseSpanishDateRange } from "../dates";
import { fetchRemoteText } from "../fetch-html";
import type { Promotion } from "../types";

export const LAFISE_PROMOS_URL =
  "https://www.lafise.com/blrd/banca-personal/promociones/";
export const LAFISE_PROMOS_JSON =
  "https://www.lafise.com/blrd/web-resources/widgets/promociones.json";

interface LafiseImage {
  alt?: string;
  src?: string;
  title?: string;
}

interface LafisePromo {
  img?: LafiseImage;
  title?: string;
  conector?: string;
  sub_title?: string;
  descuento?: number;
  tipo?: string;
  fecha?: string;
  vencimiento?: string;
  url_reglamento?: string;
  labelLink?: string;
  categoria?: string;
}

interface LafisePayload {
  promos?: LafisePromo[];
}

function cleanText(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

function makeId(parts: string[]): string {
  return createHash("sha1").update(parts.join("|")).digest("hex").slice(0, 12);
}

function yearFromIso(iso: string): number {
  return Number(iso.slice(0, 4));
}

export function parseLafisePromos(payload: LafisePayload): Promotion[] {
  const promotions: Promotion[] = [];

  for (const item of payload.promos ?? []) {
    const title = cleanText(item.title ?? "");
    const merchant = cleanText(item.sub_title ?? "");
    const dateLabel = cleanText(item.fecha ?? "");
    const imageUrl = item.img?.src?.trim() ?? "";
    if (!title || !merchant || !dateLabel || !imageUrl) continue;

    const endFromVencimiento = item.vencimiento
      ? parseDdMmYyyy(item.vencimiento)
      : null;
    const defaultYear = endFromVencimiento
      ? yearFromIso(endFromVencimiento)
      : new Date().getFullYear();

    const range = parseSpanishDateRange(dateLabel, { defaultYear });
    if (!range) continue;

    // Prefer explicit end date from vencimiento when available
    const endDate = endFromVencimiento ?? range.endDate;
    const startDate = range.startDate;

    const connector = cleanText(item.conector ?? "en");
    const description = cleanText(`${title} ${connector} ${merchant}`);
    const conditionsUrl = item.url_reglamento?.trim() || null;
    const conditionsLabel = item.labelLink?.trim() || "Ver Reglamento";
    const discountPercent =
      typeof item.descuento === "number"
        ? item.descuento
        : (title.match(/(\d+)\s*%/)?.[1] ? Number(title.match(/(\d+)\s*%/)?.[1]) : null);

    promotions.push({
      id: makeId(["lafise", merchant, title, startDate, endDate]),
      bankId: "lafise",
      bankName: "LAFISE",
      merchant,
      title,
      discountPercent,
      description,
      dateLabel,
      startDate,
      endDate,
      imageUrl,
      conditionsUrl,
      conditionsLabel,
      tag: cleanText(item.tipo ?? "") || cleanText(item.categoria ?? "") || null,
    });
  }

  return promotions;
}

export async function scrapeLafisePromotions(): Promise<Promotion[]> {
  const text = await fetchRemoteText(LAFISE_PROMOS_JSON);
  let payload: LafisePayload;
  try {
    payload = JSON.parse(text) as LafisePayload;
  } catch {
    throw new Error("LAFISE devolvió JSON inválido");
  }
  return parseLafisePromos(payload);
}
