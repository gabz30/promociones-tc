"use client";

import { useEffect, useRef, useState } from "react";

interface CategoryOption {
  id: string;
  label: string;
  count: number;
}

interface CategoryFilterProps {
  options: CategoryOption[];
  value: string;
  onChange: (value: string) => void;
}

export function CategoryFilter({ options, value, onChange }: CategoryFilterProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const selected = options.find((option) => option.id === value);
  const selectedLabel = selected?.label ?? "Todas";

  useEffect(() => {
    if (!open) return;

    function onPointerDown(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    }

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }

    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  function choose(next: string) {
    onChange(next);
    setOpen(false);
  }

  return (
    <div ref={rootRef} className="relative w-full xl:w-auto">
      <button
        type="button"
        id="categoria"
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
        className="flex h-11 w-full cursor-pointer items-center gap-2.5 rounded-full bg-white px-4 text-left xl:w-auto"
      >
        <span className="shrink-0 text-[0.65rem] font-extrabold tracking-[0.14em] text-[var(--brand)] uppercase">
          Categoría
        </span>
        <span className="min-w-0 truncate text-sm font-extrabold text-[var(--on-light)]">
          {selectedLabel}
        </span>
        <svg
          viewBox="0 0 20 20"
          className={`ml-auto size-4 shrink-0 text-[var(--on-light)] transition ${open ? "rotate-180" : ""}`}
          aria-hidden="true"
        >
          <path
            d="M5.5 7.5 10 12l4.5-4.5"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>

      {open && (
        <ul
          role="listbox"
          aria-label="Categoría"
          className="absolute right-0 z-50 mt-2 w-full max-w-[min(18rem,calc(100vw-2.5rem))] rounded-2xl bg-[var(--surface)] p-1.5 shadow-[0_24px_50px_-18px_rgba(16,24,40,0.45)] ring-1 ring-[var(--line)] xl:w-64"
        >
          <li>
            <button
              type="button"
              role="option"
              aria-selected={value === "all"}
              onClick={() => choose("all")}
              className={`flex w-full cursor-pointer items-center justify-between rounded-xl px-3 py-2.5 text-left text-sm font-bold ${
                value === "all"
                  ? "bg-[var(--brand)] text-white"
                  : "text-[var(--ink)] hover:bg-[var(--brand)]/8"
              }`}
            >
              Todas
            </button>
          </li>
          {options.map((option) => {
            const active = option.id === value;
            return (
              <li key={option.id}>
                <button
                  type="button"
                  role="option"
                  aria-selected={active}
                  onClick={() => choose(option.id)}
                  className={`flex w-full cursor-pointer items-center justify-between gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-bold ${
                    active
                      ? "bg-[var(--brand)] text-white"
                      : "text-[var(--ink)] hover:bg-[var(--brand)]/8"
                  }`}
                >
                  <span className="truncate">{option.label}</span>
                  <span className={active ? "text-white/75" : "text-[var(--muted)]"}>
                    {option.count}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
