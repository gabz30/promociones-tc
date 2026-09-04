import { formatDisplayDate, todayInDominicanRepublic } from "@/lib/dates";
import { HeroVisual } from "./HeroVisual";

interface SiteHeaderProps {
  todayCount: number;
  upcomingCount: number;
  pastCount: number;
}

const stats = [
  {
    id: "today",
    label: "Hoy",
    hint: "vigentes ahora",
    color: "var(--brand)",
    icon: (
      <svg viewBox="0 0 24 24" className="size-7" fill="none" stroke="currentColor" strokeWidth="2">
        <rect x="3" y="5" width="18" height="16" rx="2" />
        <path d="M3 10h18M8 3v4M16 3v4" />
      </svg>
    ),
  },
  {
    id: "upcoming",
    label: "Próximas",
    hint: "por comenzar",
    color: "var(--coral)",
    icon: (
      <svg viewBox="0 0 24 24" className="size-7" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="12" cy="12" r="9" />
        <path d="M12 7v5l3 2" />
      </svg>
    ),
  },
  {
    id: "past",
    label: "Pasadas",
    hint: "ya vencidas",
    color: "var(--green)",
    icon: (
      <svg viewBox="0 0 24 24" className="size-7" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M4 7h12l4 4v9a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V8a1 1 0 0 1 1-1z" />
        <path d="M9 7V4h6v3" />
      </svg>
    ),
  },
] as const;

export function SiteHeader({ todayCount, upcomingCount, pastCount }: SiteHeaderProps) {
  const today = formatDisplayDate(todayInDominicanRepublic());
  const counts = { today: todayCount, upcoming: upcomingCount, past: pastCount };

  return (
    <header className="relative">
      <div className="bg-[var(--brand)] text-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-8">
          <p className="font-[family-name:var(--font-display)] text-xl font-extrabold tracking-tight sm:text-2xl">
            Promo<span className="text-[var(--yellow)]">TC</span>
          </p>
          <nav className="hidden items-center gap-6 text-sm font-semibold text-white/90 md:flex">
            <a href="#today" className="hover:text-white">
              Hoy
            </a>
            <a href="#upcoming" className="hover:text-white">
              Próximas
            </a>
            <a href="#past" className="hover:text-white">
              Pasadas
            </a>
            <a href="#bancos" className="hover:text-white">
              Bancos
            </a>
          </nav>
          <span className="rounded-full bg-[var(--yellow)] px-3 py-1.5 text-xs font-bold tracking-wide text-[var(--ink)] uppercase sm:text-sm">
            RD · {today}
          </span>
        </div>

        <div className="mx-auto grid max-w-6xl items-center gap-8 px-4 pt-4 pb-16 sm:px-6 lg:grid-cols-[1.15fr_0.85fr] lg:px-8 lg:pt-6 lg:pb-20">
          <div>
            <h1 className="font-[family-name:var(--font-display)] text-4xl leading-[1.05] font-extrabold tracking-tight sm:text-5xl lg:text-6xl">
              Más tarjetas.
              <br />
              <span className="text-[var(--yellow)]">Más beneficios.</span>
              <br />
              Para ti.
            </h1>
            <p className="mt-5 max-w-lg text-base leading-relaxed text-white/85 sm:text-lg">
              Descubre las promociones de tus tarjetas de crédito en un solo lugar.
            </p>
          </div>
          <HeroVisual />
        </div>
      </div>

      <div className="mx-auto -mt-10 max-w-6xl px-4 sm:-mt-12 sm:px-6 lg:px-8">
        <nav
          aria-label="Resumen por vigencia"
          className="grid gap-3 sm:grid-cols-3"
        >
          {stats.map((stat) => (
            <a
              key={stat.id}
              href={`#${stat.id}`}
              className="flex items-center justify-between gap-4 rounded-3xl px-5 py-5 text-white shadow-[0_18px_40px_-20px_rgba(16,24,40,0.45)] transition hover:-translate-y-1 sm:flex-col sm:items-start sm:justify-start"
              style={{ background: stat.color }}
            >
              <div className="order-2 sm:order-1 sm:mb-6 sm:self-end opacity-90">
                {stat.icon}
              </div>
              <div className="order-1 sm:order-2">
                <p className="text-xs font-bold tracking-[0.16em] uppercase opacity-90">
                  {stat.label}
                </p>
                <p className="mt-1 font-[family-name:var(--font-display)] text-4xl font-extrabold leading-none sm:text-5xl">
                  {counts[stat.id]}
                </p>
                <p className="mt-1 text-sm font-medium opacity-90">{stat.hint}</p>
              </div>
            </a>
          ))}
        </nav>
      </div>
    </header>
  );
}
