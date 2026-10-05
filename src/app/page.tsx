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
      <SiteHeader />

      <main className="flex flex-1 flex-col">
        <PromoExplorer data={data} errors={errors} />
      </main>

      <footer className="border-t border-[var(--line)] bg-[var(--surface)]">
        <div className="mx-auto flex w-full flex-col gap-2 px-4 py-8 text-sm text-[var(--muted)] sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8 xl:px-10">
          <FooterSources sources={sources} />
          <p>Actualizado: {fetchedLabel}</p>
        </div>
      </footer>
    </>
  );
}
