"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useId,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";

interface ViewerState {
  url: string;
  title: string;
}

interface ExternalViewerContextValue {
  open: (url: string, title?: string) => void;
  close: () => void;
}

const ExternalViewerContext = createContext<ExternalViewerContextValue | null>(
  null,
);

export function useExternalViewer() {
  const ctx = useContext(ExternalViewerContext);
  if (!ctx) {
    throw new Error("useExternalViewer debe usarse dentro de ExternalViewerProvider");
  }
  return ctx;
}

function isPdf(url: string) {
  try {
    return /\.pdf($|\?)/i.test(new URL(url).pathname);
  } catch {
    return /\.pdf($|\?)/i.test(url);
  }
}

function proxyUrl(url: string) {
  return `/api/proxy?url=${encodeURIComponent(url)}`;
}

function ExternalViewerModal({
  state,
  onClose,
}: {
  state: ViewerState;
  onClose: () => void;
}) {
  const titleId = useId();
  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [blocked, setBlocked] = useState(false);
  const embedSrc = useMemo(() => proxyUrl(state.url), [state.url]);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    setLoading(true);
    setBlocked(false);
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);

    // If the iframe never settles, show fallback (some banks still break).
    const timeout = window.setTimeout(() => {
      setLoading((stillLoading) => {
        if (stillLoading) setBlocked(true);
        return false;
      });
    }, 10000);

    return () => {
      document.body.style.overflow = previous;
      window.removeEventListener("keydown", onKey);
      window.clearTimeout(timeout);
    };
  }, [state.url, onClose]);

  if (!mounted) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex flex-col bg-black/55 p-2 sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      onClick={onClose}
    >
      <div
        className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-[1.25rem] bg-white shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <header className="flex shrink-0 items-center gap-3 border-b border-black/8 bg-[var(--brand)] px-4 py-3 text-white sm:px-5">
          <div className="min-w-0 flex-1">
            <p className="text-[0.65rem] font-bold tracking-[0.14em] text-white/70 uppercase">
              {isPdf(state.url) ? "Documento" : "Página externa"}
            </p>
            <h2
              id={titleId}
              className="truncate font-[family-name:var(--font-display)] text-sm font-bold sm:text-base"
            >
              {state.title}
            </h2>
          </div>

          <a
            href={state.url}
            target="_blank"
            rel="noopener noreferrer"
            className="shrink-0 rounded-full bg-white/15 px-3 py-1.5 text-xs font-bold hover:bg-white/25 sm:text-sm"
          >
            Abrir afuera
          </a>
          <button
            type="button"
            onClick={onClose}
            className="flex size-9 shrink-0 items-center justify-center rounded-full bg-[var(--yellow)] text-lg font-black text-[var(--ink)] hover:brightness-95"
            aria-label="Cerrar"
          >
            ×
          </button>
        </header>

        <div className="relative min-h-0 flex-1 bg-[#f0f3fa]">
          {loading && !blocked && (
            <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 bg-[#f0f3fa] text-[var(--muted)]">
              <div className="size-9 animate-spin rounded-full border-4 border-[var(--brand)] border-t-transparent" />
              <p className="text-sm font-medium">Cargando contenido…</p>
            </div>
          )}

          {blocked ? (
            <div className="flex h-full flex-col items-center justify-center gap-4 px-6 text-center">
              <div className="flex size-16 items-center justify-center rounded-2xl bg-[var(--brand)]/10 text-3xl">
                ↗
              </div>
              <div>
                <p className="font-[family-name:var(--font-display)] text-xl font-extrabold text-[var(--ink)]">
                  Este banco no permite vista embebida
                </p>
                <p className="mt-2 max-w-md text-sm text-[var(--muted)]">
                  Puedes ver el documento o la página en una pestaña nueva sin
                  perder PromoTC.
                </p>
              </div>
              <a
                href={state.url}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-full bg-[var(--brand)] px-5 py-3 text-sm font-extrabold text-white hover:brightness-110"
              >
                Abrir contenido
              </a>
              <button
                type="button"
                onClick={() => {
                  setBlocked(false);
                  setLoading(true);
                }}
                className="text-sm font-bold text-[var(--brand)] underline-offset-2 hover:underline"
              >
                Reintentar aquí
              </button>
            </div>
          ) : (
            <iframe
              key={embedSrc}
              src={embedSrc}
              title={state.title}
              className="h-full w-full border-0 bg-white"
              onLoad={() => {
                setLoading(false);
                setBlocked(false);
              }}
              onError={() => {
                setLoading(false);
                setBlocked(true);
              }}
            />
          )}
        </div>

        <footer className="shrink-0 border-t border-black/8 bg-white px-4 py-2 text-center text-xs text-[var(--muted)] sm:px-5">
          Vista segura dentro de PromoTC ·{" "}
          <a
            href={state.url}
            target="_blank"
            rel="noopener noreferrer"
            className="font-bold text-[var(--brand)] underline-offset-2 hover:underline"
          >
            Abrir afuera
          </a>
        </footer>
      </div>
    </div>,
    document.body,
  );
}

export function ExternalViewerProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<ViewerState | null>(null);

  const open = useCallback((url: string, title = "Documento") => {
    setState({ url, title });
  }, []);

  const close = useCallback(() => setState(null), []);

  return (
    <ExternalViewerContext.Provider value={{ open, close }}>
      {children}
      {state && <ExternalViewerModal state={state} onClose={close} />}
    </ExternalViewerContext.Provider>
  );
}

interface ExternalLinkButtonProps {
  href: string;
  title?: string;
  className?: string;
  style?: React.CSSProperties;
  children: ReactNode;
}

export function ExternalLinkButton({
  href,
  title,
  className,
  style,
  children,
}: ExternalLinkButtonProps) {
  const { open } = useExternalViewer();

  return (
    <button
      type="button"
      onClick={() => open(href, title)}
      className={className}
      style={style}
    >
      {children}
    </button>
  );
}
