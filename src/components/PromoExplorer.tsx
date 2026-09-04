"use client";

import { useMemo, useState } from "react";
import type { BankId, CategorizedPromotions, Promotion } from "@/lib/types";
import { BankFilters } from "./BankFilters";
import { PromoSection } from "./PromoSection";

interface PromoExplorerProps {
  data: CategorizedPromotions;
  errors: string[];
}

function filterByBank(list: Promotion[], bank: BankId | "all") {
  if (bank === "all") return list;
  return list.filter((promo) => promo.bankId === bank);
}

export function PromoExplorer({ data, errors }: PromoExplorerProps) {
  const [bank, setBank] = useState<BankId | "all">("all");

  const today = useMemo(() => filterByBank(data.today, bank), [data.today, bank]);
  const upcoming = useMemo(
    () => filterByBank(data.upcoming, bank),
    [data.upcoming, bank],
  );
  const past = useMemo(() => filterByBank(data.past, bank), [data.past, bank]);

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-12 px-4 py-10 sm:px-6 lg:gap-14 lg:px-8 lg:py-12">
      {errors.length > 0 && (
        <div
          role="alert"
          className="rounded-2xl border border-[var(--coral)]/30 bg-[var(--coral)]/10 px-5 py-4 text-[var(--ink)]"
        >
          Algunas fuentes no cargaron: {errors.join(" · ")}
        </div>
      )}

      <BankFilters
        sources={data.sources ?? []}
        active={bank}
        onChange={setBank}
      />

      <PromoSection
        status="today"
        title="Hoy (vigentes ahora)"
        subtitle="Aprovecha estas ofertas antes de que cierren."
        promotions={today}
        featured
      />

      <PromoSection
        status="upcoming"
        title="Próximas"
        subtitle="Ofertas publicadas que todavía no arrancan."
        promotions={upcoming}
      />

      <PromoSection
        status="past"
        title="Pasadas"
        subtitle="Beneficios que ya cerraron su vigencia."
        promotions={past}
      />
    </div>
  );
}
