"use client";

import { useState } from "react";
import Image from "next/image";
import { getBankTheme } from "@/lib/banks";
import type { BankId, PromoSource } from "@/lib/types";

interface BankFiltersProps {
  sources: PromoSource[];
  selected: BankId[];
  onToggle: (id: BankId) => void;
}

function BankIcon({ id }: { id: BankId }) {
  const theme = getBankTheme(id);
  const [failed, setFailed] = useState(false);

  if (failed) {
    return (
      <span
        className="font-[family-name:var(--font-display)] text-[0.65rem] font-extrabold"
        style={{ color: theme.color }}
      >
        {theme.name.slice(0, 2)}
      </span>
    );
  }

  return (
    <Image
      src={theme.logo}
      alt=""
      width={72}
      height={28}
      className="max-h-5 max-w-[4.25rem] object-contain"
      style={{ height: "1.15rem", width: "auto", maxWidth: "4.25rem" }}
      unoptimized
      onError={() => setFailed(true)}
    />
  );
}

export function BankFilters({ sources, selected, onToggle }: BankFiltersProps) {
  const showingAll = selected.length === 0;

  return (
    <div className="flex flex-nowrap items-center justify-start gap-1.5 xl:flex-wrap xl:justify-center">
      {sources.map((source) => {
        const theme = getBankTheme(source.id);
        const picked = selected.includes(source.id);
        return (
          <button
            key={source.id}
            type="button"
            title={theme.name}
            aria-label={theme.name}
            aria-pressed={picked}
            onClick={() => onToggle(source.id)}
            className={`flex h-10 max-w-[5.25rem] shrink-0 cursor-pointer items-center justify-center overflow-hidden rounded-full bg-white px-3 transition ${
              picked
                ? "ring-2 ring-[var(--yellow)]"
                : showingAll
                  ? ""
                  : "opacity-45 grayscale"
            }`}
          >
            <BankIcon id={source.id} />
          </button>
        );
      })}
    </div>
  );
}
