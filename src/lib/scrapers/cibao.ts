import * as cheerio from "cheerio";
import { createHash } from "crypto";
import {
  parseSpanishDateRange,
  todayInDominicanRepublic,
} from "../dates";
import { fetchRemoteText } from "../fetch-html";
import type { Promotion } from "../types";

const CIBAO_ORIGIN = "https://www.cibao.com.do";
const CIBAO_LOGO_URL = `${CIBAO_ORIGIN}/media/c2mepk1b/logo-transicion-9-1.png`;

const MONTH_SLUGS = [
  "enero",
  "febrero",
  "marzo",
  "abril",
  "mayo",
  "junio",
  "julio",
  "agosto",
  "septiembre",
  "octubre",
  "noviembre",
  "diciembre",
] as const;

export function cibaoPromosPageUrl(now = new Date()): string {
  const today = todayInDominicanRepublic(now);
  const year = Number(today.slice(0, 4));
  const monthIndex = Number(today.slice(5, 7)) - 1;
  const monthSlug = MONTH_SLUGS[monthIndex];
  return `${CIBAO_ORIGIN}/banca-personal/ofertas-y-promociones/ofertas-de-${monthSlug}-${year}/`;
}

export const CIBAO_PROMOS_URL = cibaoPromosPageUrl();

function cleanText(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

function makeId(parts: string[]): string {
  return createHash("sha1").update(parts.join("|")).digest("hex").slice(0, 12);
}

function extractDiscount(cashbackLabel: string): number | null {
  const match = cashbackLabel.match(/(\d+)\s*%/);
  return match ? Number(match[1]) : null;
}

function extractPeriod(listText: string): string | null {
  const match = listText.match(/Per[ií]odo\s*:\s*(.+?)(?:\.|$)/i);
  return match ? cleanText(match[1].replace(/\.$/, "")) : null;
}

export function parseCibaoHtml(
  html: string,
  pageUrl: string,
): Promotion[] {
  const $ = cheerio.load(html);
  const panel = $(".container-panel.gray-Acap").first();
  const root = panel.length ? panel : $("#tab-0").first();
  if (!root.length) {
    throw new Error("No se encontró el listado de ofertas de Cibao");
  }

  const promotions: Promotion[] = [];
  const children = root.children().toArray();

  for (let i = 0; i < children.length; i++) {
    const node = children[i];
    if (node.type !== "tag" || node.name !== "p") continue;

    const merchant = cleanText($(node).text());
    if (!merchant || /^cashback\s*:/i.test(merchant) || merchant === "\u00a0") {
      continue;
    }

    let j = i + 1;
    while (j < children.length && !cleanText($(children[j]).text())) j++;

    const cashbackNode = children[j];
    if (
      !cashbackNode ||
      cashbackNode.type !== "tag" ||
      cashbackNode.name !== "p"
    ) {
      continue;
    }

    const cashbackLabel = cleanText($(cashbackNode).text());
    if (!/^cashback\s*:/i.test(cashbackLabel)) continue;

    j += 1;
    while (j < children.length && !cleanText($(children[j]).text())) j++;

    const listNode = children[j];
    if (!listNode || listNode.type !== "tag" || listNode.name !== "ul") {
      continue;
    }

    const bullets = $(listNode)
      .find("li")
      .map((_, li) => cleanText($(li).text()))
      .get()
      .filter(Boolean);

    const listText = bullets.join(" ");
    const dateLabel = extractPeriod(listText);
    if (!dateLabel) continue;

    const range = parseSpanishDateRange(dateLabel);
    if (!range) continue;

    const discountPercent = extractDiscount(cashbackLabel);
    const title =
      discountPercent != null
        ? `${discountPercent}% cashback en ${merchant}`
        : `${cashbackLabel} — ${merchant}`;
    const description = cleanText(
      [cashbackLabel, ...bullets.filter((b) => !/^Per[ií]odo\s*:/i.test(b))].join(
        " ",
      ),
    );

    promotions.push({
      id: makeId(["cibao", merchant, title, range.startDate, range.endDate]),
      bankId: "cibao",
      bankName: "Cibao",
      merchant,
      title,
      discountPercent,
      description,
      dateLabel,
      startDate: range.startDate,
      endDate: range.endDate,
      imageUrl: CIBAO_LOGO_URL,
      conditionsUrl: pageUrl,
      conditionsLabel: "Ver ofertas del mes",
      tag: "Tarjetas Cibao",
    });
  }

  return promotions;
}

export async function scrapeCibaoPromotions(
  now = new Date(),
): Promise<Promotion[]> {
  const pageUrl = cibaoPromosPageUrl(now);
  const html = await fetchRemoteText(pageUrl);
  if (!/cashback/i.test(html)) {
    throw new Error(`Respuesta inesperada de Cibao (${pageUrl})`);
  }
  return parseCibaoHtml(html, pageUrl);
}
