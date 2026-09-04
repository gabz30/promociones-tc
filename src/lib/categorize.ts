import { compareIsoDates, todayInDominicanRepublic } from "./dates";
import type {
  CategorizedPromotions,
  Promotion,
  PromoSource,
  PromoStatus,
} from "./types";

export function getPromoStatus(
  promo: Promotion,
  today = todayInDominicanRepublic(),
): PromoStatus {
  if (compareIsoDates(promo.endDate, today) < 0) return "past";
  if (compareIsoDates(promo.startDate, today) > 0) return "upcoming";
  return "today";
}

export function categorizePromotions(
  promotions: Promotion[],
  options?: {
    today?: string;
    sources?: PromoSource[];
    fetchedAt?: string;
  },
): CategorizedPromotions {
  const today = options?.today ?? todayInDominicanRepublic();
  const todayList: Promotion[] = [];
  const upcoming: Promotion[] = [];
  const past: Promotion[] = [];

  for (const promo of promotions) {
    const status = getPromoStatus(promo, today);
    if (status === "today") todayList.push(promo);
    else if (status === "upcoming") upcoming.push(promo);
    else past.push(promo);
  }

  todayList.sort(
    (a, b) =>
      compareIsoDates(a.endDate, b.endDate) ||
      (b.discountPercent ?? 0) - (a.discountPercent ?? 0),
  );
  upcoming.sort(
    (a, b) =>
      compareIsoDates(a.startDate, b.startDate) ||
      (b.discountPercent ?? 0) - (a.discountPercent ?? 0),
  );
  past.sort(
    (a, b) =>
      compareIsoDates(b.endDate, a.endDate) ||
      (b.discountPercent ?? 0) - (a.discountPercent ?? 0),
  );

  return {
    today: todayList,
    upcoming,
    past,
    fetchedAt: options?.fetchedAt ?? new Date().toISOString(),
    sources: options?.sources ?? [],
  };
}
