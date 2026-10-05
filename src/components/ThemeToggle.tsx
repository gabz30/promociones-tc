"use client";

import { useEffect, useState } from "react";

const STORAGE_KEY = "promotc-theme";

export function ThemeToggle() {
  const [dark, setDark] = useState(false);

  useEffect(() => {
    setDark(document.documentElement.classList.contains("dark"));
  }, []);

  function toggle() {
    const next = !document.documentElement.classList.contains("dark");
    document.documentElement.classList.toggle("dark", next);
    localStorage.setItem(STORAGE_KEY, next ? "dark" : "light");
    setDark(next);
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-pressed={dark}
      aria-label={dark ? "Activar modo claro" : "Activar modo oscuro"}
      title={dark ? "Modo claro" : "Modo oscuro"}
      className="flex size-9 shrink-0 cursor-pointer items-center justify-center rounded-full bg-white/15 text-white transition hover:bg-white/25"
    >
      {dark ? (
        <svg viewBox="0 0 24 24" className="size-4" fill="none" aria-hidden="true">
          <circle cx="12" cy="12" r="4" stroke="currentColor" strokeWidth="1.8" />
          <path
            d="M12 2.5v2.2M12 19.3v2.2M2.5 12h2.2M19.3 12h2.2M5.1 5.1l1.6 1.6M17.3 17.3l1.6 1.6M18.9 5.1l-1.6 1.6M6.7 17.3l-1.6 1.6"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
          />
        </svg>
      ) : (
        <svg viewBox="0 0 24 24" className="size-4" fill="none" aria-hidden="true">
          <path
            d="M16.5 14.2A6.2 6.2 0 0 1 9.8 7.5 6.2 6.2 0 1 0 16.5 14.2Z"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinejoin="round"
          />
        </svg>
      )}
    </button>
  );
}
