import type { Promotion, PromoStatus } from "@/lib/types";
import { PromoCard } from "./PromoCard";

interface PromoSectionProps {
  status: PromoStatus;
  title: string;
  subtitle: string;
  promotions: Promotion[];
  featured?: boolean;
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
}: PromoSectionProps) {
  const meta = sectionMeta[status];

  return (
    <section
      className={`scroll-mt-24 ${
        featured
          ? "rounded-[2rem] bg-white p-5 shadow-[0_20px_50px_-36px_rgba(30,77,255,0.45)] sm:p-8"
          : ""
      } ${status === "past" ? "rounded-[2rem] border border-dashed border-black/10 bg-[#f8f9fb] p-5 sm:p-8" : ""}`}
      id={status}
      aria-labelledby={`${status}-heading`}
    >
      <div className="mb-6 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p
            className="text-xs font-bold tracking-[0.16em] uppercase"
            style={{ color: meta.accent }}
          >
            {meta.eyebrow}
          </p>
          <h2
            id={`${status}-heading`}
            className={`mt-1 font-[family-name:var(--font-display)] text-3xl font-extrabold tracking-tight sm:text-4xl ${
              status === "past" ? "text-[#667085]" : "text-[var(--ink)]"
            }`}
            style={featured ? { color: "var(--brand)" } : undefined}
          >
            {title}
          </h2>
          <p className="mt-2 max-w-xl text-sm text-[var(--muted)] sm:text-base">
            {subtitle}
          </p>
        </div>
        <div
          className={`inline-flex w-fit items-center gap-2 rounded-full px-3 py-1.5 text-sm font-bold ${
            status === "past" ? "bg-[#e4e7ec] text-[#667085]" : "text-white"
          }`}
          style={status === "past" ? undefined : { background: meta.accent }}
        >
          {promotions.length}{" "}
          {promotions.length === 1 ? "promoción" : "promociones"}
        </div>
      </div>

      {promotions.length === 0 ? (
        <div className="rounded-[1.5rem] border border-dashed border-black/10 bg-[var(--background)] px-6 py-10 text-center text-[var(--muted)]">
          {meta.empty}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {promotions.map((promo) => (
            <PromoCard key={promo.id} promo={promo} tone={status} />
          ))}
        </div>
      )}
    </section>
  );
}
