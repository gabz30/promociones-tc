"use client";

import Image from "next/image";
import type { Promotion } from "@/lib/types";
import { formatDisplayDate } from "@/lib/dates";
import { getBankTheme } from "@/lib/banks";
import { ExternalLinkButton } from "./ExternalViewer";

interface PromoCardProps {
  promo: Promotion;
  tone: "today" | "upcoming" | "past";
}

export function PromoCard({ promo, tone }: PromoCardProps) {
  const bank = getBankTheme(promo.bankId);
  const isPhoto = promo.bankId === "lafise" || promo.bankId === "bhd";
  const isPast = tone === "past";

  if (isPast) {
    return (
      <article className="group relative flex h-full flex-col overflow-hidden rounded-[1.5rem] border border-black/8 bg-[#f3f4f6]">
        <div
          className={
            isPhoto
              ? "relative overflow-hidden grayscale"
              : "relative flex h-24 items-center justify-center bg-[#e8eaed] px-4 grayscale"
          }
        >
          <Image
            src={promo.imageUrl}
            alt={promo.merchant}
            width={isPhoto ? 386 : 160}
            height={isPhoto ? 200 : 64}
            className={
              isPhoto
                ? "aspect-[773/400] h-auto w-full object-cover opacity-70"
                : "max-h-14 w-auto object-contain opacity-60"
            }
            unoptimized
          />
          <span className="absolute top-3 left-3 rounded-full bg-black/55 px-2.5 py-1 text-[0.65rem] font-bold tracking-[0.08em] text-white uppercase">
            Vencida
          </span>
          {promo.discountPercent != null && (
            <span className="absolute top-3 right-3 rounded-xl bg-black/35 px-2.5 py-1 font-[family-name:var(--font-display)] text-lg font-extrabold text-white/90">
              {promo.discountPercent}%
            </span>
          )}
        </div>

        <div className="flex flex-1 flex-col p-5">
          <span className="w-fit rounded-full bg-black/5 px-2.5 py-1 text-[0.68rem] font-bold tracking-[0.04em] text-[#667085] uppercase">
            {bank.name}
          </span>

          <h3 className="mt-3 font-[family-name:var(--font-display)] text-lg leading-tight font-bold text-[#667085]">
            {promo.merchant}
          </h3>
          <p className="mt-1 text-sm font-semibold text-[#98a2b3]">{promo.title}</p>
          <p className="mt-2 line-clamp-2 flex-1 text-sm leading-relaxed text-[#98a2b3]">
            {promo.description}
          </p>

          <div className="mt-4 flex flex-col gap-2 border-t border-black/5 pt-4">
            <p className="text-xs leading-relaxed font-medium text-[#98a2b3]">
              {formatDisplayDate(promo.startDate)} —{" "}
              {formatDisplayDate(promo.endDate)}
            </p>
            {promo.conditionsUrl && (
              <ExternalLinkButton
                href={promo.conditionsUrl}
                title={
                  promo.conditionsLabel ||
                  `${promo.merchant} · ${bank.name}`
                }
                className="self-start text-left text-sm font-bold text-[#667085] underline-offset-2 hover:underline"
              >
                {promo.conditionsLabel || "Ver oferta"} →
              </ExternalLinkButton>
            )}
          </div>
        </div>
      </article>
    );
  }

  return (
    <article
      className="group flex h-full flex-col overflow-hidden rounded-[1.5rem] border-2 bg-white transition duration-300 hover:-translate-y-1 hover:shadow-[0_24px_50px_-28px_rgba(16,24,40,0.35)]"
      style={{ borderColor: bank.color }}
    >
      <div
        className={
          isPhoto
            ? "relative overflow-hidden"
            : "relative flex h-28 items-center justify-center px-4"
        }
        style={{ background: bank.soft }}
      >
        <Image
          src={promo.imageUrl}
          alt={promo.merchant}
          width={isPhoto ? 386 : 160}
          height={isPhoto ? 200 : 64}
          className={
            isPhoto
              ? "aspect-[773/400] h-auto w-full object-cover"
              : "max-h-16 w-auto object-contain"
          }
          unoptimized
        />
        {promo.discountPercent != null && (
          <span
            className="absolute top-3 right-3 rounded-xl px-2.5 py-1 font-[family-name:var(--font-display)] text-lg font-extrabold text-white shadow-md"
            style={{ background: bank.color }}
          >
            {promo.discountPercent}%
          </span>
        )}
      </div>

      <div className="flex flex-1 flex-col p-5">
        <span
          className="w-fit rounded-full px-2.5 py-1 text-[0.68rem] font-bold tracking-[0.04em] uppercase"
          style={{ background: bank.soft, color: bank.color }}
        >
          {bank.name}
        </span>

        <h3 className="mt-3 font-[family-name:var(--font-display)] text-xl leading-tight font-extrabold text-[var(--ink)]">
          {promo.merchant}
        </h3>
        <p className="mt-1 text-sm font-bold" style={{ color: bank.color }}>
          {promo.title}
        </p>
        <p className="mt-2 line-clamp-2 flex-1 text-sm leading-relaxed text-[var(--muted)]">
          {promo.description}
        </p>

        <div className="mt-4 flex flex-col gap-2 border-t border-black/5 pt-4">
          <p className="text-xs leading-relaxed font-medium text-[var(--muted)]">
            {formatDisplayDate(promo.startDate)} —{" "}
            {formatDisplayDate(promo.endDate)}
          </p>
          {promo.conditionsUrl && (
            <ExternalLinkButton
              href={promo.conditionsUrl}
              title={
                promo.conditionsLabel ||
                `${promo.merchant} · ${bank.name}`
              }
              className="self-start text-left text-sm font-extrabold transition group-hover:translate-x-0.5"
              style={{ color: bank.color }}
            >
              {promo.conditionsLabel || "Ver oferta"} →
            </ExternalLinkButton>
          )}
        </div>
      </div>
    </article>
  );
}
