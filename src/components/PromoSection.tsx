"use client";

import { useState } from "react";
import type { Promotion, PromoStatus } from "@/lib/types";
import { PromoCard } from "./PromoCard";

interface PromoSectionProps {
  status: PromoStatus;
  title: string;
  subtitle: string;
  promotions: Promotion[];
  featured?: boolean;
  collapsible?: boolean;
}

const sectionMeta: Record<
  PromoStatus,
  { eyebrow: string; accent: string; empty: string }
> = {
  today: {
    eyebrow: "Vigentes ahora",
    accent: "var(--brand)",
    empty: "No hay promociones vigentes hoy.",
  },
  upcoming: {
    eyebrow: "Por comenzar",
    accent: "var(--coral)",
    empty: "No hay promociones próximas publicadas.",
  },
  past: {
    eyebrow: "Archivo",
    accent: "#98a2b3",
    empty: "Todavía no hay promociones vencidas en el listado.",
  },
};

export function PromoSection({
  status,
  title,
  subtitle,
  promotions,
  featured = false,
  collapsible = false,
}: PromoSectionProps) {
  const meta = sectionMeta[status];
  const [open, setOpen] = useState(false);
  const collapsed = collapsible && !open;

  return (
    <section
      className={`scroll-mt-24 ${
        featured
          ? "rounded-[2rem] bg-[var(--surface)] p-5 shadow-[0_20px_50px_-36px_rgba(30,77,255,0.45)] sm:p-8"
          : ""
      } ${status === "past" ? "rounded-[2rem] border border-dashed border-[var(--line)] bg-[var(--surface-muted)] p-5 sm:p-8" : ""}`}
      id={status}
      aria-labelledby={`${status}-heading`}
    >
      {collapsed ? (
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-expanded={false}
          className="flex w-full cursor-pointer items-center justify-between gap-4 text-left"
        >
          <h2
            id={`${status}-heading`}
            className="font-[family-name:var(--font-display)] text-3xl font-extrabold tracking-tight text-[var(--muted)] sm:text-4xl"
          >
            {title}
          </h2>
          <span className="text-2xl leading-none text-[#98a2b3]" aria-hidden>
            ▾
          </span>
        </button>
      ) : (
      <div className="mb-6 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          {!collapsible && (
            <p
              className="text-xs font-bold tracking-[0.16em] uppercase"
              style={{
                color: status === "today" ? "var(--brand-text)" : meta.accent,
              }}
            >
              {meta.eyebrow}
            </p>
          )}
          {collapsible ? (
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-expanded
              className="flex cursor-pointer items-center gap-3 text-left"
            >
              <h2
                id={`${status}-heading`}
                className="font-[family-name:var(--font-display)] text-3xl font-extrabold tracking-tight text-[var(--muted)] sm:text-4xl"
              >
                {title}
              </h2>
              <span className="text-2xl leading-none text-[#98a2b3]" aria-hidden>
                ▴
              </span>
            </button>
          ) : (
            <h2
              id={`${status}-heading`}
              className={`mt-1 font-[family-name:var(--font-display)] text-3xl font-extrabold tracking-tight sm:text-4xl ${
                status === "past" ? "text-[var(--muted)]" : "text-[var(--ink)]"
              }`}
              style={featured ? { color: "var(--brand-text)" } : undefined}
            >
              {title}
            </h2>
          )}
          <p className="mt-2 max-w-xl text-sm text-[var(--muted)] sm:text-base">
            {subtitle}
          </p>
        </div>
        <div
          className={`inline-flex w-fit items-center gap-2 rounded-full px-3 py-1.5 text-sm font-bold ${
            status === "past" ? "bg-[var(--surface)] text-[var(--muted)]" : ""
          }`}
          style={
            status === "past"
              ? undefined
              : {
                  background: meta.accent,
                  color: status === "upcoming" ? "var(--on-light)" : "#fff",
                }
          }
        >
          {promotions.length}{" "}
          {promotions.length === 1 ? "promoción" : "promociones"}
        </div>
      </div>
      )}

      {!collapsed &&
        (promotions.length === 0 ? (
          <div className="rounded-[1.5rem] border border-dashed border-[var(--line)] bg-[var(--background)] px-6 py-10 text-center text-[var(--muted)]">
            {meta.empty}
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-2 sm:gap-4 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
            {promotions.map((promo) => (
              <PromoCard key={promo.id} promo={promo} tone={status} />
            ))}
          </div>
        ))}
    </section>
  );
}
