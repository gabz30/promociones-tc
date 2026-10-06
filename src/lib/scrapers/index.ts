import { unstable_cache } from "next/cache";
import { categorizePromotions } from "../categorize";
import type { CategorizedPromotions, Promotion, PromoSource } from "../types";
import { BHD_PROMOS_URL, scrapeBhdPromotions } from "./bhd";
import { BSC_PROMOS_URL, scrapeBscPromotions } from "./bsc";
import {
  CIBAO_PROMOS_URL,
  cibaoPromosPageUrl,
  scrapeCibaoPromotions,
} from "./cibao";
import { LAFISE_PROMOS_URL, scrapeLafisePromotions } from "./lafise";
import { QIK_PROMOS_URL, scrapeQikPromotions } from "./qik";
import {
  SCOTIA_PROMOS_URL,
  scrapeScotiaPromotions,
  scotiaPromosPageUrl,
} from "./scotia";

const SOURCES: PromoSource[] = [
  { id: "qik", name: "Qik", url: QIK_PROMOS_URL },
  { id: "lafise", name: "LAFISE", url: LAFISE_PROMOS_URL },
  { id: "bhd", name: "BHD", url: BHD_PROMOS_URL },
  { id: "scotia", name: "Scotiabank", url: scotiaPromosPageUrl() },
  { id: "cibao", name: "Cibao", url: cibaoPromosPageUrl() },
  { id: "bsc", name: "Santa Cruz", url: BSC_PROMOS_URL },
];

async function scrapeBank(
  name: string,
  scraper: () => Promise<Promotion[]>,
): Promise<{ promotions: Promotion[]; error?: string }> {
  try {
    return { promotions: await scraper() };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`[${name}] scrape failed:`, message);
    return { promotions: [], error: `${name}: ${message}` };
  }
}

/** Cache raw promos only — never cache "today/upcoming/past" buckets. */
const getCachedPromotions = unstable_cache(
  async (): Promise<{ promotions: Promotion[]; errors: string[] }> => {
    const [qik, lafise, bhd, scotia, cibao, bsc] = await Promise.all([
      scrapeBank("Qik", scrapeQikPromotions),
      scrapeBank("LAFISE", scrapeLafisePromotions),
      scrapeBank("BHD", scrapeBhdPromotions),
      scrapeBank("Scotiabank", scrapeScotiaPromotions),
      scrapeBank("Cibao", scrapeCibaoPromotions),
      scrapeBank("Santa Cruz", scrapeBscPromotions),
    ]);

    return {
      promotions: [
        ...qik.promotions,
        ...lafise.promotions,
        ...bhd.promotions,
        ...scotia.promotions,
        ...cibao.promotions,
        ...bsc.promotions,
      ],
      errors: [
        qik.error,
        lafise.error,
        bhd.error,
        scotia.error,
        cibao.error,
        bsc.error,
      ].filter(Boolean) as string[],
    };
  },
  ["promotions-raw-v6"],
  {
    revalidate: 3600,
    tags: ["promotions"],
  },
);

export async function getAllPromotions(): Promise<
  CategorizedPromotions & { errors: string[] }
> {
  const { promotions, errors } = await getCachedPromotions();

  // Always classify with the current Dominican Republic date.
  const categorized = categorizePromotions(promotions, {
    sources: SOURCES,
    fetchedAt: new Date().toISOString(),
  });

  return {
    ...categorized,
    errors,
  };
}

export {
  scrapeQikPromotions,
  QIK_PROMOS_URL,
  scrapeLafisePromotions,
  LAFISE_PROMOS_URL,
  scrapeBhdPromotions,
  BHD_PROMOS_URL,
  scrapeScotiaPromotions,
  SCOTIA_PROMOS_URL,
  scotiaPromosPageUrl,
  scrapeCibaoPromotions,
  CIBAO_PROMOS_URL,
  cibaoPromosPageUrl,
  scrapeBscPromotions,
  BSC_PROMOS_URL,
};
