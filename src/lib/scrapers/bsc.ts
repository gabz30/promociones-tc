import { createHash } from "crypto";
import { todayInDominicanRepublic } from "../dates";
import { fetchRemoteText } from "../fetch-html";
import type { Promotion } from "../types";

export const BSC_PROMOS_URL = "https://bsc.com.do/promociones";
export const BSC_GRAPHQL_URL = "https://bsc.com.do/graphql";
const BSC_ORIGIN = "https://bsc.com.do";
const BSC_LOGO_URL = `${BSC_ORIGIN}/logo.svg`;

const FIND_PROMOTIONS_QUERY = `
  query FindPromotionByDate($paramsByDate: ParamsByDate!) {
    findPromotionByDate(ParamsByDate: $paramsByDate) {
      _id
      name
      percent
      devolution
      condition
      extract
      disabled
      picture
      pictureImageDetail {
        _id
        image
        altText
      }
      date {
        start
        end
      }
    }
  }
`;

interface BscDateRange {
  start?: string | null;
  end?: string | null;
}

interface BscPictureDetail {
  image?: string | null;
  altText?: string | null;
}

interface BscPromotion {
  _id?: string;
  name?: string;
  percent?: string | number | null;
  devolution?: string | null;
  condition?: string | null;
  extract?: string | null;
  disabled?: boolean | null;
  picture?: string | null;
  pictureImageDetail?: BscPictureDetail | null;
  date?: BscDateRange | null;
}

interface BscGraphqlPayload {
  data?: {
    findPromotionByDate?: BscPromotion[];
  };
  errors?: { message?: string }[];
}

function cleanText(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

function makeId(parts: string[]): string {
  return createHash("sha1").update(parts.join("|")).digest("hex").slice(0, 12);
}

/** Convert API timestamps (UTC) to YYYY-MM-DD in America/Santo_Domingo. */
function toDrIsoDate(iso: string): string | null {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Santo_Domingo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

function monthBounds(now = new Date()): { start: string; end: string } {
  const today = todayInDominicanRepublic(now);
  const [year, month] = today.split("-").map(Number);
  const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const pad = (n: number) => String(n).padStart(2, "0");
  return {
    start: `${year}-${pad(month)}-01T00:00:00.000Z`,
    end: `${year}-${pad(month)}-${pad(lastDay)}T23:59:59.999Z`,
  };
}

function absoluteUrl(href: string | null | undefined): string | null {
  if (!href) return null;
  if (href.startsWith("http://") || href.startsWith("https://")) return href;
  if (href.startsWith("//")) return `https:${href}`;
  if (href.startsWith("/")) return `${BSC_ORIGIN}${href}`;
  return `${BSC_ORIGIN}/${href}`;
}

function parsePercent(value: string | number | null | undefined): number | null {
  if (value == null || value === "") return null;
  const n = typeof value === "number" ? value : Number(String(value).replace(",", "."));
  return Number.isFinite(n) ? n : null;
}

function formatDevolution(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const cleaned = cleanText(raw);
  if (!cleaned) return null;
  if (/^rd\$/i.test(cleaned)) return cleaned;
  return `RD$${cleaned}`;
}

export function parseBscPromotions(payload: BscGraphqlPayload): Promotion[] {
  const promotions: Promotion[] = [];

  for (const item of payload.data?.findPromotionByDate ?? []) {
    if (item.disabled) continue;

    const merchant = cleanText(item.name ?? "");
    const startDate = item.date?.start ? toDrIsoDate(item.date.start) : null;
    const endDate = item.date?.end ? toDrIsoDate(item.date.end) : null;
    if (!merchant || !startDate || !endDate) continue;

    const discountPercent = parsePercent(item.percent);
    const devolution = formatDevolution(item.devolution);
    const title =
      discountPercent != null
        ? `${discountPercent}% de devolución en ${merchant}`
        : `Promoción en ${merchant}`;
    const description = cleanText(
      [
        devolution ? `Devolución: ${devolution}` : null,
        discountPercent != null ? `Porcentaje: ${discountPercent}%` : null,
        item.extract || item.condition || null,
      ]
        .filter(Boolean)
        .join(". "),
    );
    const dateLabel = `${startDate} – ${endDate}`;
    const imageUrl =
      absoluteUrl(item.pictureImageDetail?.image) ||
      absoluteUrl(item.picture) ||
      BSC_LOGO_URL;

    promotions.push({
      id: makeId([
        "bsc",
        item._id ?? merchant,
        title,
        startDate,
        endDate,
      ]),
      bankId: "bsc",
      bankName: "Santa Cruz",
      merchant,
      title,
      discountPercent,
      description,
      dateLabel,
      startDate,
      endDate,
      imageUrl,
      conditionsUrl: BSC_PROMOS_URL,
      conditionsLabel: "Ver promociones",
      tag: "Tarjetas Santa Cruz",
    });
  }

  return promotions;
}

export async function scrapeBscPromotions(now = new Date()): Promise<Promotion[]> {
  const bounds = monthBounds(now);
  const body = JSON.stringify({
    query: FIND_PROMOTIONS_QUERY,
    variables: {
      paramsByDate: {
        search: "",
        start: bounds.start,
        end: bounds.end,
      },
    },
  });

  const text = await fetchRemoteText(BSC_GRAPHQL_URL, {
    method: "POST",
    body,
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
  });

  let payload: BscGraphqlPayload;
  try {
    payload = JSON.parse(text) as BscGraphqlPayload;
  } catch {
    throw new Error("Banco Santa Cruz devolvió JSON inválido");
  }

  if (payload.errors?.length) {
    throw new Error(
      payload.errors[0]?.message || "Error GraphQL de Banco Santa Cruz",
    );
  }

  const promotions = parseBscPromotions(payload);
  if (!promotions.length) {
    throw new Error("Banco Santa Cruz no devolvió promociones del mes");
  }
  return promotions;
}
