"use client";

import Image from "next/image";
import type { Promotion } from "@/lib/types";
import { formatDisplayDateRange } from "@/lib/dates";
import { getBankTheme } from "@/lib/banks";
import { ExternalLinkButton } from "./ExternalViewer";

interface PromoCardProps {
  promo: Promotion;
  tone: "today" | "upcoming" | "past";
}

export function PromoCard({ promo, tone }: PromoCardProps) {
  const bank = getBankTheme(promo.bankId);
  const isPhoto =
    promo.bankId === "lafise" ||
    promo.bankId === "bhd" ||
    promo.bankId === "scotia";
  const isPast = tone === "past";
  const dateRange = formatDisplayDateRange(promo.startDate, promo.endDate);

  return (
    <article
      className={
        isPast
          ? "group relative flex h-full flex-col overflow-hidden rounded-[1.5rem] border border-black/8 bg-[#f3f4f6]"
          : "group flex h-full flex-col overflow-hidden rounded-[1.5rem] border-2 bg-white transition duration-300 hover:-translate-y-1 hover:shadow-[0_24px_50px_-28px_rgba(16,24,40,0.35)]"
      }
      style={isPast ? undefined : { borderColor: bank.color }}
    >
      <div
        className={
          isPhoto
            ? `relative overflow-hidden${isPast ? " grayscale" : ""}`
            : `relative flex h-28 items-center justify-center px-4${isPast ? " grayscale" : ""}`
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
              ? `aspect-[773/400] h-auto w-full object-cover${isPast ? " opacity-70" : ""}`
              : `max-h-16 w-auto object-contain${isPast ? " opacity-60" : ""}`
          }
          unoptimized
        />
        {isPast && (
          <span className="absolute top-3 left-3 rounded-full bg-black/55 px-2.5 py-1 text-[0.65rem] font-bold tracking-[0.08em] text-white uppercase">
            Vencida
          </span>
        )}
        {promo.discountPercent != null && (
          <span
            className={
              isPast
                ? "absolute top-3 right-3 rounded-xl bg-black/35 px-2.5 py-1 font-[family-name:var(--font-display)] text-lg font-extrabold text-white/90"
                : "absolute top-3 right-3 rounded-xl px-2.5 py-1 font-[family-name:var(--font-display)] text-lg font-extrabold text-white shadow-md"
            }
            style={isPast ? undefined : { background: bank.color }}
          >
            {promo.discountPercent}%
          </span>
        )}
      </div>

      <div
        className="flex items-center gap-2 px-4 py-2.5"
        style={{
          background: isPast ? "#d0d5dd" : bank.color,
          color: isPast ? "#475467" : bank.onColor,
        }}
      >
        <span
          className="font-[family-name:var(--font-display)] text-base leading-none font-extrabold tracking-[0.06em] uppercase sm:text-lg"
          style={{ color: "inherit" }}
        >
          {bank.name}
        </span>
      </div>

      <div className="flex flex-1 flex-col p-5">
        <h3
          className={
            isPast
              ? "font-[family-name:var(--font-display)] text-lg leading-tight font-bold text-[#667085]"
              : "font-[family-name:var(--font-display)] text-xl leading-tight font-extrabold text-[var(--ink)]"
          }
        >
          {promo.merchant}
        </h3>
        <p
          className={
            isPast
              ? "mt-1 text-sm font-semibold text-[#98a2b3]"
              : "mt-1 text-sm font-bold"
          }
          style={isPast ? undefined : { color: bank.color }}
        >
          {promo.title}
        </p>
        <p
          className={
            isPast
              ? "mt-2 line-clamp-2 flex-1 text-sm leading-relaxed text-[#98a2b3]"
              : "mt-2 line-clamp-2 flex-1 text-sm leading-relaxed text-[var(--muted)]"
          }
        >
          {promo.description}
        </p>

        <div className="mt-4 flex flex-col gap-3 border-t border-black/5 pt-4">
          <p
            className={
              isPast
                ? "w-fit max-w-full rounded-lg bg-[#e4e7ec] px-3 py-2 font-[family-name:var(--font-display)] text-sm leading-snug font-bold text-[#475467]"
                : "w-fit max-w-full rounded-lg bg-[var(--yellow)]/90 px-3 py-2 font-[family-name:var(--font-display)] text-sm leading-snug font-extrabold text-[var(--ink)] shadow-[inset_0_-2px_0_rgba(16,24,40,0.08)]"
            }
          >
            {dateRange}
          </p>
          {promo.conditionsUrl && (
            <ExternalLinkButton
              href={promo.conditionsUrl}
              title={
                promo.conditionsLabel ||
                `${promo.merchant} · ${bank.name}`
              }
              className={
                isPast
                  ? "self-start text-left text-sm font-bold text-[#667085] underline-offset-2 hover:underline"
                  : "self-start text-left text-sm font-extrabold transition group-hover:translate-x-0.5"
              }
              style={isPast ? undefined : { color: bank.color }}
            >
              {promo.conditionsLabel || "Ver oferta"} →
            </ExternalLinkButton>
          )}
        </div>
      </div>
    </article>
  );
}
