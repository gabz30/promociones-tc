import { createHash } from "crypto";
import { parseSpanishDateRange } from "../dates";
import { fetchRemoteText } from "../fetch-html";
import type { Promotion } from "../types";

export const BHD_PROMOS_URL =
  "https://bhd.com.do/homepage-personal/products/259";
export const BHD_PROMOS_API =
  "https://backend.bhd.com.do/api/t-3-s/259?populate=deep";
const BHD_ORIGIN = "https://bhd.com.do";

interface StrapiImage {
  data?: {
    attributes?: {
      url?: string;
      alternativeText?: string | null;
    };
  } | null;
}

interface LinkedT4 {
  __component?: string;
  t_4?: {
    data?: {
      id?: number;
      attributes?: {
        heading?: string | null;
      };
    } | null;
  };
}

interface BhdProductCard {
  id: number;
  attributes?: {
    title?: string | null;
    description?: string | null;
    publishedAt?: string | null;
    image?: StrapiImage;
    linked_page?: LinkedT4[];
  };
}

interface BhdPayload {
  data?: {
    attributes?: {
      product_cards?: {
        data?: BhdProductCard[];
      };
    };
  };
}

function cleanText(value: string): string {
  return value
    .replace(/[📅🗓️]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function makeId(parts: string[]): string {
  return createHash("sha1").update(parts.join("|")).digest("hex").slice(0, 12);
}

function extractDiscount(text: string): number | null {
  const match = text.match(/(\d+)\s*%/);
  return match ? Number(match[1]) : null;
}

function detailUrl(t4Id: number | undefined): string | null {
  if (!t4Id) return null;
  return `${BHD_ORIGIN}/homepage-personal/product-detail/${t4Id}`;
}

function publishedIsoDay(publishedAt: string | null | undefined): string | undefined {
  if (!publishedAt) return undefined;
  return publishedAt.slice(0, 10);
}

export function parseBhdPayload(payload: BhdPayload): Promotion[] {
  const cards = payload.data?.attributes?.product_cards?.data ?? [];
  const promotions: Promotion[] = [];

  for (const card of cards) {
    const attrs = card.attributes;
    if (!attrs) continue;

    const title = cleanText(attrs.title ?? "");
    const description = cleanText(attrs.description ?? "");
    const imageUrl = attrs.image?.data?.attributes?.url?.trim() ?? "";
    if (!title || !description || !imageUrl) continue;

    const openStart = publishedIsoDay(attrs.publishedAt);
    const range = parseSpanishDateRange(description, {
      defaultYear: openStart
        ? Number(openStart.slice(0, 4))
        : new Date().getFullYear(),
      openStartDate: openStart,
    });
    if (!range) continue;

    const t4Id = attrs.linked_page?.find((p) => p.t_4?.data?.id)?.t_4?.data?.id;
    const conditionsUrl = detailUrl(t4Id);
    const discountPercent =
      extractDiscount(title) ?? extractDiscount(description);

    promotions.push({
      id: makeId(["bhd", String(card.id), title, range.startDate, range.endDate]),
      bankId: "bhd",
      bankName: "BHD",
      merchant: title,
      title:
        discountPercent != null
          ? `${discountPercent}% de beneficio`
          : "Promoción tarjetas",
      discountPercent,
      description,
      dateLabel: description,
      startDate: range.startDate,
      endDate: range.endDate,
      imageUrl,
      conditionsUrl,
      conditionsLabel: "Ver oferta",
      tag: "Tarjetas BHD",
    });
  }

  return promotions;
}

export async function scrapeBhdPromotions(): Promise<Promotion[]> {
  const text = await fetchRemoteText(BHD_PROMOS_API);
  let payload: BhdPayload;
  try {
    payload = JSON.parse(text) as BhdPayload;
  } catch {
    throw new Error("BHD devolvió JSON inválido");
  }
  return parseBhdPayload(payload);
}
