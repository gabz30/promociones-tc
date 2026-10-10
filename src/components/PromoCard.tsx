"use client";

import { useCallback, useEffect, useId, useState } from "react";
import { createPortal } from "react-dom";
import Image from "next/image";
import type { Promotion } from "@/lib/types";
import { formatDisplayDateRange } from "@/lib/dates";
import { getBankTheme } from "@/lib/banks";
import { ExternalLinkButton } from "./ExternalViewer";

interface PromoCardProps {
  promo: Promotion;
  tone: "today" | "upcoming" | "past";
}

function BenefitDetail({
  promo,
  onClose,
}: {
  promo: Promotion;
  onClose: () => void;
}) {
  const titleId = useId();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = previous;
      window.removeEventListener("keydown", onKey);
    };
  }, [onClose]);

  if (!mounted) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-end justify-center bg-black/55 p-2 sm:items-center sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      onClick={onClose}
    >
      <div
        className="flex max-h-[92vh] w-full max-w-lg flex-col overflow-hidden rounded-[1.25rem] bg-[var(--surface)] shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="relative aspect-[16/10] w-full shrink-0 bg-[var(--surface-muted)]">
          <Image
            src={promo.imageUrl}
            alt=""
            width={650}
            height={350}
            className="absolute inset-0 h-full w-full object-cover"
            unoptimized
          />
          <button
            type="button"
            onClick={onClose}
            className="absolute top-3 right-3 flex size-9 items-center justify-center rounded-full bg-[var(--yellow)] text-lg font-black text-[var(--on-light)]"
            aria-label="Cerrar"
          >
            ×
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
          <h2
            id={titleId}
            className="font-[family-name:var(--font-display)] text-xl leading-tight font-extrabold text-[var(--ink)]"
          >
            {promo.merchant}
          </h2>
          {promo.title && (
            <p className="mt-2 text-sm leading-relaxed text-[var(--ink)]">{promo.title}</p>
          )}
          {promo.detailHtml && (
            <div
              className="mt-4 space-y-2 text-sm leading-relaxed text-[var(--ink)] [&_a]:font-bold [&_a]:text-[var(--brand-text)] [&_a]:underline [&_strong]:font-extrabold"
              dangerouslySetInnerHTML={{ __html: promo.detailHtml }}
            />
          )}
          {promo.dateLabel && (
            <p className="mt-4 text-sm text-[var(--muted)]">{promo.dateLabel}</p>
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}

export function PromoCard({ promo, tone }: PromoCardProps) {
  const bank = getBankTheme(promo.bankId);
  const isPhoto =
    promo.bankId === "lafise" ||
    promo.bankId === "bhd" ||
    promo.bankId === "scotia" ||
    promo.bankId === "popular";
  const isPast = tone === "past";
  const dateRange = formatDisplayDateRange(promo.startDate, promo.endDate);
  const [logoFailed, setLogoFailed] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const closeDetail = useCallback(() => setDetailOpen(false), []);

  return (
    <article
      className={
        isPast
          ? "group relative flex h-full min-w-0 flex-col overflow-hidden rounded-2xl border border-[var(--line)] bg-[var(--surface-muted)] sm:rounded-[1.5rem]"
          : "group flex h-full min-w-0 flex-col overflow-hidden rounded-2xl border-2 bg-[var(--surface)] transition-[transform,box-shadow] duration-300 hover:-translate-y-1 hover:shadow-[0_24px_50px_-28px_rgba(16,24,40,0.35)] sm:rounded-[1.5rem]"
      }
      style={isPast ? undefined : { borderColor: bank.color }}
    >
      <div
        className="flex h-14 shrink-0 items-center justify-center overflow-hidden px-3"
        style={{ background: isPast ? "#d0d5dd" : bank.color }}
      >
        <span className="flex h-9 max-w-[78%] items-center justify-center overflow-hidden rounded-lg bg-white px-3">
          {logoFailed ? (
            <span
              className="font-[family-name:var(--font-display)] text-sm font-extrabold tracking-wide uppercase"
              style={{ color: isPast ? "var(--on-light)" : bank.color }}
            >
              {bank.name}
            </span>
          ) : (
            <Image
              src={bank.logo}
              alt={bank.name}
              width={140}
              height={36}
              className={`max-w-full object-contain${isPast ? " grayscale" : ""}`}
              style={{ height: "1.75rem", width: "auto" }}
              unoptimized
              onError={() => setLogoFailed(true)}
            />
          )}
        </span>
      </div>

      <div
        className={
          isPhoto
            ? `relative aspect-[16/10] w-full shrink-0 overflow-hidden${isPast ? " grayscale" : ""}`
            : `relative flex h-24 w-full shrink-0 items-center justify-center overflow-hidden px-4${isPast ? " grayscale" : ""}`
        }
        style={{ background: isPast ? "#e8eaed" : bank.soft }}
      >
        <Image
          src={promo.imageUrl}
          alt={promo.merchant}
          width={isPhoto ? 386 : 160}
          height={isPhoto ? 200 : 64}
          className={
            isPhoto
              ? `absolute inset-0 h-full w-full object-cover${isPast ? " opacity-70" : ""}`
              : `object-contain${isPast ? " opacity-60" : ""}`
          }
          style={
            isPhoto
              ? undefined
              : { width: "auto", height: "4rem", objectFit: "contain" }
          }
          unoptimized
        />
        {isPast && (
          <span className="absolute top-1.5 left-1.5 rounded-full bg-black/55 px-1.5 py-0.5 text-[0.55rem] font-bold tracking-[0.08em] text-white uppercase sm:top-3 sm:left-3 sm:px-2.5 sm:py-1 sm:text-[0.65rem]">
            Vencida
          </span>
        )}
        {promo.discountPercent != null && (
          <span
            className={
              isPast
                ? "absolute top-1.5 right-1.5 rounded-lg bg-black/35 px-1.5 py-0.5 font-[family-name:var(--font-display)] text-xs font-extrabold text-white/90 sm:top-3 sm:right-3 sm:rounded-xl sm:px-2.5 sm:py-1 sm:text-lg"
                : "absolute top-1.5 right-1.5 rounded-lg px-1.5 py-0.5 font-[family-name:var(--font-display)] text-xs font-extrabold text-white shadow-md sm:top-3 sm:right-3 sm:rounded-xl sm:px-2.5 sm:py-1 sm:text-lg"
            }
            style={isPast ? undefined : { background: bank.color }}
          >
            {promo.discountPercent}%
          </span>
        )}
      </div>

      <div className="flex min-w-0 flex-1 flex-col overflow-hidden p-3 sm:p-5">
        <h3
          className={
            isPast
              ? "line-clamp-2 break-words font-[family-name:var(--font-display)] text-sm leading-tight font-bold text-[var(--muted)] sm:text-lg"
              : "line-clamp-2 break-words font-[family-name:var(--font-display)] text-sm leading-tight font-extrabold text-[var(--ink)] sm:text-xl"
          }
        >
          {promo.merchant}
        </h3>
        <p
          className={
            isPast
              ? "mt-1 line-clamp-2 break-words text-xs font-semibold text-[var(--muted)] sm:text-sm"
              : "accent-text mt-1 line-clamp-2 break-words text-xs font-bold sm:text-sm"
          }
          style={isPast ? undefined : ({ "--accent": bank.color } as React.CSSProperties)}
        >
          {promo.title}
        </p>
        <p
          className={
            isPast
              ? "mt-2 line-clamp-3 break-words text-sm leading-relaxed text-[var(--muted)]"
              : "mt-2 line-clamp-3 break-words text-sm leading-relaxed text-[var(--muted)]"
          }
        >
          {promo.description}
        </p>

        <div className="mt-2 flex flex-col gap-2 border-t border-[var(--line)] pt-2 sm:mt-4 sm:gap-3 sm:pt-4">
          <p
            className={
              isPast
                ? "w-fit max-w-full rounded-md bg-[var(--surface)] px-2 py-1 font-[family-name:var(--font-display)] text-[0.65rem] leading-snug font-bold text-[var(--muted)] sm:rounded-lg sm:px-3 sm:py-2 sm:text-sm"
                : "w-fit max-w-full rounded-md bg-[var(--yellow)]/90 px-2 py-1 font-[family-name:var(--font-display)] text-[0.65rem] leading-snug font-extrabold text-[var(--on-light)] shadow-[inset_0_-2px_0_rgba(16,24,40,0.08)] sm:rounded-lg sm:px-3 sm:py-2 sm:text-sm"
            }
          >
            {dateRange}
          </p>
          {promo.detailHtml ? (
            <button
              type="button"
              onClick={() => setDetailOpen(true)}
              className={
                isPast
                  ? "cursor-pointer self-start text-left text-xs font-bold text-[var(--muted)] underline-offset-2 hover:underline sm:text-sm"
                  : "accent-text cursor-pointer self-start text-left text-xs font-extrabold transition group-hover:translate-x-0.5 sm:text-sm"
              }
              style={isPast ? undefined : ({ "--accent": bank.color } as React.CSSProperties)}
            >
              {promo.conditionsLabel || "Ver beneficio"} →
            </button>
          ) : (
            promo.conditionsUrl && (
              <ExternalLinkButton
                href={promo.conditionsUrl}
                title={
                  promo.conditionsLabel ||
                  `${promo.merchant} · ${bank.name}`
                }
                className={
                  isPast
                    ? "self-start text-left text-xs font-bold text-[var(--muted)] underline-offset-2 hover:underline sm:text-sm"
                    : "accent-text self-start text-left text-xs font-extrabold transition group-hover:translate-x-0.5 sm:text-sm"
                }
                style={isPast ? undefined : ({ "--accent": bank.color } as React.CSSProperties)}
              >
                {promo.conditionsLabel || "Ver oferta"} →
              </ExternalLinkButton>
            )
          )}
          {detailOpen && promo.detailHtml && (
            <BenefitDetail promo={promo} onClose={closeDetail} />
          )}
        </div>
      </div>
    </article>
  );
}
