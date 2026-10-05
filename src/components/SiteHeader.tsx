import { formatDisplayDate, todayInDominicanRepublic } from "@/lib/dates";
import { HeroVisual } from "./HeroVisual";
import { ThemeToggle } from "./ThemeToggle";

export function SiteHeader() {
  const today = formatDisplayDate(todayInDominicanRepublic());

  return (
    <header className="relative">
      <div className="bg-[var(--brand)] text-white">
        <div className="mx-auto flex w-full items-center justify-between gap-4 px-4 py-3 sm:px-6 sm:py-4 lg:px-8 xl:px-10">
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
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <span className="rounded-full bg-[var(--yellow)] px-3 py-1.5 text-xs font-bold tracking-wide text-[var(--on-light)] uppercase sm:text-sm">
              RD · {today}
            </span>
          </div>
        </div>

        <div className="mx-auto grid w-full items-center gap-6 px-4 pt-1 pb-5 sm:px-6 sm:pt-4 sm:pb-8 lg:grid-cols-[1.15fr_0.85fr] lg:gap-8 lg:px-8 lg:pt-6 lg:pb-14 xl:px-10">
          <div>
            <h1 className="font-[family-name:var(--font-display)] text-[1.65rem] leading-[1.1] font-extrabold tracking-tight sm:text-5xl lg:text-6xl">
              Más tarjetas.
              <br />
              <span className="text-[var(--yellow)]">Más beneficios.</span>
              <br />
              Para ti.
            </h1>
            <p className="mt-2 max-w-lg text-sm leading-relaxed text-white/85 sm:mt-5 sm:text-lg">
              Descubre las promociones de tus tarjetas de crédito en un solo lugar.
            </p>
          </div>
          <div className="hidden md:block">
            <HeroVisual />
          </div>
        </div>
      </div>
    </header>
  );
}
