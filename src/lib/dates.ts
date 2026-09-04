const MONTHS: Record<string, number> = {
  enero: 0,
  febrero: 1,
  marzo: 2,
  abril: 3,
  mayo: 4,
  junio: 5,
  julio: 6,
  agosto: 7,
  septiembre: 8,
  setiembre: 8,
  octubre: 9,
  noviembre: 10,
  diciembre: 11,
};

export interface DateRange {
  startDate: string;
  endDate: string;
}

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

function toIso(year: number, monthIndex: number, day: number): string {
  return `${year}-${pad(monthIndex + 1)}-${pad(day)}`;
}

function lastDayOfMonth(year: number, monthIndex: number): number {
  return new Date(Date.UTC(year, monthIndex + 1, 0)).getUTCDate();
}

function normalizeText(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[📅🗓️]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Parses DD/MM/YYYY (LAFISE vencimiento). */
export function parseDdMmYyyy(raw: string): string | null {
  const match = raw.trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (!match) return null;
  const day = Number(match[1]);
  const month = Number(match[2]);
  const year = Number(match[3]);
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;
  return toIso(year, month - 1, day);
}

/**
 * Parses Spanish validity strings, e.g.:
 * - "Válido del 11 de junio al 19 de julio de 2026."
 * - "Promoción válida del 1 al 15 de julio de 2026"
 * - "Del 24 al 26 de julio" (year via defaultYear)
 * - "Válido para viajar desde el 16 al 24 de julio de 2026"
 * - "Válido todos los fines de semana de julio 2026"
 * - "hasta el 31 de julio de 2026" (open start via openStartDate)
 */
export function parseSpanishDateRange(
  raw: string,
  options?: { defaultYear?: number; openStartDate?: string },
): DateRange | null {
  const text = normalizeText(raw);
  const fallbackYear = options?.defaultYear;

  // Whole month / weekends: fines de semana de julio 2026
  const weekends = text.match(
    /fines de semana de ([a-z]+)(?:\s+de)?\s+(\d{4})/,
  );
  if (weekends && MONTHS[weekends[1]] !== undefined) {
    const month = MONTHS[weekends[1]];
    const year = Number(weekends[2]);
    return {
      startDate: toIso(year, month, 1),
      endDate: toIso(year, month, lastDayOfMonth(year, month)),
    };
  }

  // All weekdays in a month: todos los jueves de agosto de 2026
  const allWeekdays = text.match(
    /todos los (?:lunes|martes|miercoles|jueves|viernes|sabados?|domingos?) de ([a-z]+)(?:\s+de)?\s+(\d{4})/,
  );
  if (allWeekdays && MONTHS[allWeekdays[1]] !== undefined) {
    const month = MONTHS[allWeekdays[1]];
    const year = Number(allWeekdays[2]);
    return {
      startDate: toIso(year, month, 1),
      endDate: toIso(year, month, lastDayOfMonth(year, month)),
    };
  }

  // With weekday names (Cibao): del viernes 4 al domingo 6 de septiembre de 2026
  const weekdayRange = text.match(
    /del\s+(?:lunes|martes|miercoles|jueves|viernes|sabado|domingo)\s+(\d{1,2})\s+al\s+(?:lunes|martes|miercoles|jueves|viernes|sabado|domingo)\s+(\d{1,2})\s+de\s+([a-z]+)\s+(?:de\s+)?(\d{4})/,
  );
  if (weekdayRange) {
    const month = MONTHS[weekdayRange[3]];
    if (month !== undefined) {
      const year = Number(weekdayRange[4]);
      return {
        startDate: toIso(year, month, Number(weekdayRange[1])),
        endDate: toIso(year, month, Number(weekdayRange[2])),
      };
    }
  }

  // desde el 16 al 24 de julio de 2026
  const desde = text.match(
    /desde el\s+(\d{1,2})\s+al\s+(\d{1,2})\s+de\s+([a-z]+)\s+(?:de\s+)?(\d{4})/,
  );
  if (desde) {
    const month = MONTHS[desde[3]];
    if (month !== undefined) {
      const year = Number(desde[4]);
      return {
        startDate: toIso(year, month, Number(desde[1])),
        endDate: toIso(year, month, Number(desde[2])),
      };
    }
  }

  // Different months with year: del 11 de junio al 19 de julio de 2026
  const crossMonthWithYear =
    /(?:valid[oa](?:\s+del)?|del)\s+(\d{1,2})\s+de\s+([a-z]+)\s+al\s+(\d{1,2})\s+de\s+([a-z]+)\s+(?:de\s+)?(\d{4})/;
  const crossY = text.match(crossMonthWithYear);
  if (crossY) {
    const startMonth = MONTHS[crossY[2]];
    const endMonth = MONTHS[crossY[4]];
    if (startMonth === undefined || endMonth === undefined) return null;
    const year = Number(crossY[5]);
    const startYear = startMonth > endMonth ? year - 1 : year;
    return {
      startDate: toIso(startYear, startMonth, Number(crossY[1])),
      endDate: toIso(year, endMonth, Number(crossY[3])),
    };
  }

  // Same month with year: del 1 al 15 de julio de 2026 / 14 al 16 de julio de 2026
  const sameMonthWithYear =
    /(?:valid[oa](?:\s+del)?|del)?\s*(\d{1,2})\s+al\s+(\d{1,2})\s+de\s+([a-z]+)\s+(?:de\s+)?(\d{4})/;
  const sameY = text.match(sameMonthWithYear);
  if (sameY) {
    const month = MONTHS[sameY[3]];
    if (month === undefined) return null;
    const year = Number(sameY[4]);
    return {
      startDate: toIso(year, month, Number(sameY[1])),
      endDate: toIso(year, month, Number(sameY[2])),
    };
  }

  // Single day: el 17 de agosto 2026 / solo el 17 de agosto de 2026
  const singleDay = text.match(
    /(?:solo\s+)?(?:el\s+)?(\d{1,2})\s+de\s+([a-z]+)\s+(?:de\s+)?(\d{4})/,
  );
  if (singleDay && MONTHS[singleDay[2]] !== undefined) {
    // Avoid matching range fragments already handled above (e.g. "31 de octubre 2026")
    // when the string still contains "al" as a range connector.
    if (!/\bal\s+\d{1,2}\b/.test(text)) {
      const month = MONTHS[singleDay[2]];
      const year = Number(singleDay[3]);
      const day = Number(singleDay[1]);
      const iso = toIso(year, month, day);
      return { startDate: iso, endDate: iso };
    }
  }

  // Open-ended until: hasta el 31 de julio de 2026 / hasta el 31 de julio
  const until = text.match(
    /hasta el\s+(\d{1,2})\s+de\s+([a-z]+)(?:\s+(?:de\s+)?(\d{4}))?/,
  );
  if (until) {
    const month = MONTHS[until[2]];
    if (month !== undefined) {
      const year = until[3]
        ? Number(until[3])
        : (fallbackYear ?? new Date().getFullYear());
      const endDate = toIso(year, month, Number(until[1]));
      const startDate =
        options?.openStartDate ?? toIso(year, month, 1);
      return { startDate, endDate };
    }
  }

  if (fallbackYear == null) return null;

  // Different months without year: del 01 de junio al 07 de agosto
  const crossMonth =
    /(?:valid[oa](?:\s+del)?|del)\s+(\d{1,2})\s+de\s+([a-z]+)\s+al\s+(\d{1,2})\s+de\s+([a-z]+)/;
  const cross = text.match(crossMonth);
  if (cross) {
    const startMonth = MONTHS[cross[2]];
    const endMonth = MONTHS[cross[4]];
    if (startMonth === undefined || endMonth === undefined) return null;
    const endYear = fallbackYear;
    const startYear = startMonth > endMonth ? endYear - 1 : endYear;
    return {
      startDate: toIso(startYear, startMonth, Number(cross[1])),
      endDate: toIso(endYear, endMonth, Number(cross[3])),
    };
  }

  // Same month without year: del 24 al 26 de julio
  const sameMonth =
    /(?:valid[oa](?:\s+del)?|del)?\s*(\d{1,2})\s+al\s+(\d{1,2})\s+de\s+([a-z]+)/;
  const same = text.match(sameMonth);
  if (same) {
    const month = MONTHS[same[3]];
    if (month === undefined) return null;
    return {
      startDate: toIso(fallbackYear, month, Number(same[1])),
      endDate: toIso(fallbackYear, month, Number(same[2])),
    };
  }

  return null;
}

/** Today's date in America/Santo_Domingo as YYYY-MM-DD */
export function todayInDominicanRepublic(now = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Santo_Domingo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

export function compareIsoDates(a: string, b: string): number {
  return a.localeCompare(b);
}

export function formatDisplayDate(iso: string): string {
  const [year, month, day] = iso.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return new Intl.DateTimeFormat("es-DO", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(date);
}

/** Compact range for cards, e.g. "4 – 6 de septiembre de 2026". */
export function formatDisplayDateRange(startIso: string, endIso: string): string {
  if (startIso === endIso) return formatDisplayDate(startIso);

  const [sy, sm, sd] = startIso.split("-").map(Number);
  const [ey, em, ed] = endIso.split("-").map(Number);
  const start = new Date(Date.UTC(sy, sm - 1, sd));
  const end = new Date(Date.UTC(ey, em - 1, ed));

  if (sy === ey && sm === em) {
    const monthYear = new Intl.DateTimeFormat("es-DO", {
      month: "long",
      year: "numeric",
      timeZone: "UTC",
    }).format(end);
    return `${sd} – ${ed} de ${monthYear}`;
  }

  if (sy === ey) {
    const startPart = new Intl.DateTimeFormat("es-DO", {
      day: "numeric",
      month: "short",
      timeZone: "UTC",
    }).format(start);
    const endPart = new Intl.DateTimeFormat("es-DO", {
      day: "numeric",
      month: "short",
      year: "numeric",
      timeZone: "UTC",
    }).format(end);
    return `${startPart} – ${endPart}`;
  }

  return `${formatDisplayDate(startIso)} – ${formatDisplayDate(endIso)}`;
}
