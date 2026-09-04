export type PromoStatus = "today" | "upcoming" | "past";

export type BankId = "qik" | "lafise" | "bhd" | "scotia" | "cibao" | "bsc";

export interface Promotion {
  id: string;
  bankId: BankId;
  bankName: string;
  merchant: string;
  title: string;
  discountPercent: number | null;
  description: string;
  dateLabel: string;
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
  imageUrl: string;
  conditionsUrl: string | null;
  conditionsLabel: string | null;
  tag: string | null;
}

export interface PromoSource {
  id: BankId;
  name: string;
  url: string;
}

export interface CategorizedPromotions {
  today: Promotion[];
  upcoming: Promotion[];
  past: Promotion[];
  fetchedAt: string;
  sources: PromoSource[];
  errors?: string[];
}
