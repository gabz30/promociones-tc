"use client";

import type { PromoSource } from "@/lib/types";
import { ExternalLinkButton } from "./ExternalViewer";

export function FooterSources({ sources }: { sources: PromoSource[] }) {
  return (
    <p>
      Fuentes:{" "}
      {sources.map((source, index) => (
        <span key={source.id}>
          {index > 0 && ", "}
          <ExternalLinkButton
            href={source.url}
            title={`Promociones ${source.name}`}
            className="font-bold text-[var(--brand-text)] underline-offset-4 hover:underline"
          >
            {source.name}
          </ExternalLinkButton>
        </span>
      ))}
      . Próximamente más bancos.
    </p>
  );
}
