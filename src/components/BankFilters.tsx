"use client";

import { getBankTheme } from "@/lib/banks";
import type { BankId, PromoSource } from "@/lib/types";

interface BankFiltersProps {
  sources: PromoSource[];
  active: BankId | "all";
  onChange: (value: BankId | "all") => void;
}

export function BankFilters({ sources, active, onChange }: BankFiltersProps) {
  return (
    <section id="bancos" className="scroll-mt-24" aria-labelledby="bancos-heading">
      <div className="mb-5 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-bold tracking-[0.16em] text-[var(--brand)] uppercase">
            Fuentes
          </p>
          <h2
            id="bancos-heading"
            className="mt-1 font-[family-name:var(--font-display)] text-2xl font-extrabold tracking-tight text-[var(--ink)] sm:text-3xl"
          >
            Bancos que conoces
          </h2>
        </div>
        <button
          type="button"
          onClick={() => onChange("all")}
          className={`self-start rounded-full px-4 py-2 text-sm font-bold transition ${
            active === "all"
              ? "bg-[var(--ink)] text-white"
              : "bg-white text-[var(--muted)] ring-1 ring-black/10 hover:text-[var(--ink)]"
          }`}
        >
          Todos
        </button>
      </div>

      <div className="-mx-4 flex gap-3 overflow-x-auto px-4 pb-2 sm:mx-0 sm:grid sm:grid-cols-3 sm:overflow-visible sm:px-0 sm:pb-0">
        {sources.map((source) => {
          const theme = getBankTheme(source.id);
          const isActive = active === source.id || active === "all";
          return (
            <button
              key={source.id}
              type="button"
              onClick={() => onChange(active === source.id ? "all" : source.id)}
              className={`min-w-[220px] flex-shrink-0 rounded-3xl px-5 py-5 text-left transition sm:min-w-0 ${
                active !== "all" && !isActive ? "opacity-45 grayscale" : ""
              } ${active === source.id ? "ring-4 ring-black/10" : ""}`}
              style={{ background: theme.color, color: theme.onColor }}
            >
              <p className="font-[family-name:var(--font-display)] text-2xl font-extrabold">
                {theme.name}
              </p>
              <p className="mt-1 text-sm font-medium opacity-90">{theme.slogan}</p>
            </button>
          );
        })}
      </div>
    </section>
  );
}
