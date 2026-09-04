import { SiteHeader } from "@/components/SiteHeader";
import { PromoExplorer } from "@/components/PromoExplorer";
import { FooterSources } from "@/components/FooterSources";
import { getAllPromotions } from "@/lib/scrapers";

// Re-render often so Hoy / Próximas / Pasadas always use today's date.
// Scraping stays cached separately inside getAllPromotions.
export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function HomePage() {
  const data = await getAllPromotions();
  const errors = data.errors ?? [];
  const sources = data.sources ?? [];

  const fetchedLabel = new Intl.DateTimeFormat("es-DO", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "America/Santo_Domingo",
  }).format(new Date(data.fetchedAt));

  return (
    <>
      <SiteHeader
        todayCount={data.today.length}
        upcomingCount={data.upcoming.length}
        pastCount={data.past.length}
      />

      <main className="flex flex-1 flex-col">
        <PromoExplorer data={data} errors={errors} />
      </main>

      <footer className="border-t border-black/5 bg-white">
        <div className="mx-auto flex max-w-6xl flex-col gap-2 px-4 py-8 text-sm text-[var(--muted)] sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
          <FooterSources sources={sources} />
          <p>Actualizado: {fetchedLabel}</p>
        </div>
      </footer>
    </>
  );
}
