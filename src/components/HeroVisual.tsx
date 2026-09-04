/** Decorative shopping / offers composition for the hero (CSS + SVG, not stock AI art). */
export function HeroVisual() {
  return (
    <div
      className="relative mx-auto aspect-square w-full max-w-[320px] lg:max-w-[380px]"
      aria-hidden
    >
      <div className="absolute top-[8%] right-[12%] size-16 rotate-12 rounded-2xl bg-[var(--yellow)] shadow-lg" />
      <div className="absolute top-[18%] left-[8%] flex size-20 -rotate-6 items-center justify-center rounded-full bg-[var(--green)] text-3xl font-extrabold text-white shadow-lg">
        %
      </div>
      <div className="absolute top-[42%] left-[18%] h-28 w-20 rotate-[-8deg] rounded-t-lg rounded-b-md bg-[#ffd54a] shadow-xl">
        <div className="mx-auto mt-2 h-3 w-10 rounded-full bg-[#f0b400]" />
        <div className="mx-auto mt-3 h-14 w-14 rounded-md bg-white/35" />
      </div>
      <div className="absolute top-[38%] right-[14%] h-32 w-24 rotate-[10deg] rounded-t-lg rounded-b-md bg-[var(--brand)] shadow-xl">
        <div className="mx-auto mt-2 h-3 w-12 rounded-full bg-white/40" />
        <div className="mx-auto mt-4 h-16 w-16 rounded-md bg-white/25" />
      </div>
      <div className="absolute right-[28%] bottom-[22%] h-24 w-20 rotate-[-4deg] rounded-t-lg rounded-b-md bg-[var(--green)] shadow-xl">
        <div className="mx-auto mt-2 h-3 w-10 rounded-full bg-white/35" />
        <div className="mx-auto mt-3 h-12 w-12 rounded-md bg-white/25" />
      </div>
      <div className="absolute bottom-[12%] left-[28%] h-16 w-28 rotate-[-6deg] rounded-2xl border border-white/60 bg-white shadow-2xl">
        <div className="m-3 h-2 w-10 rounded bg-[var(--brand)]/30" />
        <div className="mx-3 h-2 w-16 rounded bg-[var(--brand)]/20" />
        <div className="absolute right-3 bottom-3 size-6 rounded-full bg-[var(--yellow)]" />
      </div>
      <svg
        className="absolute top-[55%] left-[6%] h-16 w-16 text-[var(--green)]"
        viewBox="0 0 64 64"
        fill="currentColor"
      >
        <path
          d="M32 4c-2 10-10 16-18 20 8 2 14 10 18 22 4-12 10-20 18-22-8-4-16-10-18-20z"
          opacity="0.9"
        />
      </svg>
      <svg
        className="absolute top-[8%] left-[42%] h-12 w-12 text-[var(--green)]"
        viewBox="0 0 64 64"
        fill="currentColor"
      >
        <path
          d="M32 4c-2 10-10 16-18 20 8 2 14 10 18 22 4-12 10-20 18-22-8-4-16-10-18-20z"
          opacity="0.75"
        />
      </svg>
      <div className="absolute top-[28%] right-[4%] flex size-14 rotate-6 items-center justify-center rounded-2xl bg-[var(--coral)] text-2xl font-black text-white shadow-lg">
        %
      </div>
    </div>
  );
}
