"use client";

import { useMemo, useState } from "react";
import { categoryLabel, getPromoCategoryId } from "@/lib/categories";
import type { BankId, CategorizedPromotions, Promotion, PromoStatus } from "@/lib/types";
import { BankFilters } from "./BankFilters";
import { CategoryFilter } from "./CategoryFilter";
import { PromoSection } from "./PromoSection";

interface PromoExplorerProps {
  data: CategorizedPromotions;
  errors: string[];
}

function applyFilters(
  list: Promotion[],
  banks: BankId[],
  category: string,
) {
  return list.filter((promo) => {
    if (banks.length > 0 && !banks.includes(promo.bankId)) return false;
    if (category !== "all" && getPromoCategoryId(promo) !== category) return false;
    return true;
  });
}

type ViewFilter = "all" | PromoStatus;

const viewPills: { id: ViewFilter; label: string }[] = [
  { id: "all", label: "Todos" },
  { id: "today", label: "Hoy" },
  { id: "upcoming", label: "Próximas" },
  { id: "past", label: "Pasadas" },
];

function ViewIcon({ id }: { id: ViewFilter }) {
  const common = "size-4 shrink-0";
  if (id === "all") {
    return (
      <svg viewBox="0 0 24 24" className={common} aria-hidden="true">
        <path
          fill="currentColor"
          d="M4 4h7v7H4V4Zm9 0h7v7h-7V4ZM4 13h7v7H4v-7Zm9 0h7v7h-7v-7Z"
        />
      </svg>
    );
  }
  if (id === "today") {
    return (
      <svg viewBox="0 0 24 24" className={common} aria-hidden="true">
        <path
          fill="currentColor"
          d="M13 2 4.5 13.5H11l-1 8.5L19.5 10H13l0-8Z"
        />
      </svg>
    );
  }
  if (id === "upcoming") {
    return (
      <svg viewBox="0 0 24 24" className={common} fill="none" aria-hidden="true">
        <rect x="3.5" y="5" width="17" height="15.5" rx="2.5" stroke="currentColor" strokeWidth="1.8" />
        <path d="M3.5 9.5h17M8 3.5v3M16 3.5v3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 24 24" className={common} fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="8" stroke="currentColor" strokeWidth="1.8" />
      <path d="M12 8v4.5l3 2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

export function PromoExplorer({ data, errors }: PromoExplorerProps) {
  const [banks, setBanks] = useState<BankId[]>([]);
  const [category, setCategory] = useState("all");
  const [view, setView] = useState<ViewFilter>("all");

  const bankScoped = useMemo(() => {
    const all = [...data.today, ...data.upcoming, ...data.past];
    return banks.length === 0
      ? all
      : all.filter((promo) => banks.includes(promo.bankId));
  }, [banks, data.past, data.today, data.upcoming]);

  const categoryOptions = useMemo(() => {
    const counts = new Map<string, number>();
    for (const promo of bankScoped) {
      const id = getPromoCategoryId(promo);
      counts.set(id, (counts.get(id) ?? 0) + 1);
    }
    return [...counts.entries()]
      .map(([id, count]) => ({ id, label: categoryLabel(id), count }))
      .sort((a, b) => a.label.localeCompare(b.label, "es"));
  }, [bankScoped]);

  const today = useMemo(
    () => applyFilters(data.today, banks, category),
    [banks, category, data.today],
  );
  const upcoming = useMemo(
    () => applyFilters(data.upcoming, banks, category),
    [banks, category, data.upcoming],
  );
  const past = useMemo(
    () => applyFilters(data.past, banks, category),
    [banks, category, data.past],
  );

  function toggleBank(id: BankId) {
    setBanks((current) =>
      current.includes(id)
        ? current.filter((bankId) => bankId !== id)
        : [...current, id],
    );
  }

  const counts = {
    all: today.length + upcoming.length + past.length,
    today: today.length,
    upcoming: upcoming.length,
    past: past.length,
  };

  return (
    <div className="mx-auto flex w-full flex-1 flex-col gap-6 px-4 py-4 sm:px-6 sm:py-6 lg:gap-10 lg:px-8 lg:py-8 xl:px-10">
      {errors.length > 0 && (
        <div
          role="alert"
          className="rounded-2xl border border-[var(--coral)]/30 bg-[var(--coral)]/10 px-5 py-4 text-[var(--ink)]"
        >
          Algunas fuentes no cargaron: {errors.join(" · ")}
        </div>
      )}

      <div
        id="bancos"
        className="flex flex-col items-stretch gap-2.5 rounded-[1.75rem] bg-[var(--brand)] p-2.5 shadow-[0_16px_40px_-24px_rgba(30,77,255,0.85)] sm:p-3 xl:flex-row xl:flex-nowrap xl:items-center xl:gap-3 xl:rounded-full xl:px-3 xl:py-2"
      >
        <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap xl:shrink-0 xl:flex-nowrap">
          {viewPills.map((pill) => {
            const active = view === pill.id;
            const offerCount = counts[pill.id];
            const todosActive = pill.id === "all" && active;
            return (
              <button
                key={pill.id}
                type="button"
                onClick={() => setView(pill.id)}
                className={`flex cursor-pointer items-center gap-2 rounded-full py-1.5 pr-3 pl-2.5 text-left transition sm:pr-4 sm:pl-3 ${
                  todosActive
                    ? "bg-[var(--on-light)] text-white"
                    : active
                      ? "bg-[var(--yellow)] text-[var(--on-light)]"
                      : "bg-white text-[var(--on-light)] hover:bg-white/90"
                }`}
              >
                <span
                  className={
                    todosActive
                      ? "text-white"
                      : active
                        ? "text-[var(--on-light)]"
                        : "text-[var(--brand)]"
                  }
                >
                  <ViewIcon id={pill.id} />
                </span>
                <span className="leading-tight">
                  <span className="block text-sm font-extrabold">{pill.label}</span>
                  <span
                    className={`block text-[0.68rem] font-semibold sm:text-[0.7rem] ${
                      todosActive ? "text-white/70" : "text-[var(--muted-on-light)]"
                    }`}
                  >
                    {offerCount} {offerCount === 1 ? "oferta" : "ofertas"}
                  </span>
                </span>
              </button>
            );
          })}
        </div>

        <div className="w-full overflow-x-auto xl:flex xl:min-w-0 xl:flex-1 xl:justify-center xl:overflow-visible [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <BankFilters
            sources={data.sources ?? []}
            selected={banks}
            onToggle={toggleBank}
          />
        </div>

        <CategoryFilter
          options={categoryOptions}
          value={category}
          onChange={setCategory}
        />
      </div>

      {(view === "all" || view === "today") && (
        <PromoSection
          status="today"
          title="Hoy (vigentes ahora)"
          subtitle="Aprovecha estas ofertas antes de que cierren."
          promotions={today}
          featured
        />
      )}

      {(view === "all" || view === "upcoming") && (
        <PromoSection
          status="upcoming"
          title="Próximas"
          subtitle="Ofertas publicadas que todavía no arrancan."
          promotions={upcoming}
        />
      )}

      {(view === "all" || view === "past") && (
        <PromoSection
          status="past"
          title="Pasadas"
          subtitle="Beneficios que ya cerraron su vigencia."
          promotions={past}
          collapsible={view === "all"}
        />
      )}
    </div>
  );
}
