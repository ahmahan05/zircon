import type { AnalyticsPeriodKey, Language, PeriodKey } from "./types.ts";

function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0);
}

function endOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999);
}

const MONTHS_RU = [
  "Январь",
  "Февраль",
  "Март",
  "Апрель",
  "Май",
  "Июнь",
  "Июль",
  "Август",
  "Сентябрь",
  "Октябрь",
  "Ноябрь",
  "Декабрь",
] as const;

const MONTHS_EN = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
] as const;

function monthLabel(index: number, language: Language): string {
  const names = language === "en" ? MONTHS_EN : MONTHS_RU;
  return names[index] ?? "";
}

export function periodRange(
  period: PeriodKey,
  now = new Date(),
  custom?: { from?: string; to?: string },
): { from: string; to: string } {
  if (period === "custom" && custom?.from && custom?.to) {
    return {
      from: new Date(custom.from).toISOString(),
      to: endOfDay(new Date(custom.to)).toISOString(),
    };
  }
  const today = startOfDay(now);
  if (period === "today") {
    return { from: today.toISOString(), to: endOfDay(now).toISOString() };
  }
  if (period === "week") {
    const day = today.getDay() || 7;
    const from = new Date(today);
    from.setDate(today.getDate() - day + 1);
    return { from: from.toISOString(), to: endOfDay(now).toISOString() };
  }
  if (period === "month") {
    const from = new Date(today.getFullYear(), today.getMonth(), 1);
    return { from: from.toISOString(), to: endOfDay(now).toISOString() };
  }
  if (period === "quarter") {
    const q = Math.floor(today.getMonth() / 3) * 3;
    const from = new Date(today.getFullYear(), q, 1);
    return { from: from.toISOString(), to: endOfDay(now).toISOString() };
  }
  const from = new Date(today.getFullYear(), 0, 1);
  return { from: from.toISOString(), to: endOfDay(now).toISOString() };
}

export function analyticsPeriodRange(
  period: AnalyticsPeriodKey,
  now = new Date(),
  custom?: { from?: string; to?: string },
  language: Language = "ru",
): {
  from: string;
  to: string;
  label: string;
  previousFrom: string;
  previousTo: string;
  previousLabel: string;
} {
  if (period === "custom" && custom?.from && custom?.to) {
    const from = new Date(custom.from);
    const to = endOfDay(new Date(custom.to));
    const span = to.getTime() - from.getTime();
    const previousTo = new Date(from.getTime() - 1);
    const previousFrom = new Date(previousTo.getTime() - span);
    return {
      from: from.toISOString(),
      to: to.toISOString(),
      label: `${custom.from} — ${custom.to}`,
      previousFrom: previousFrom.toISOString(),
      previousTo: previousTo.toISOString(),
      previousLabel: language === "en" ? "Previous period" : "Предыдущий период",
    };
  }
  if (period === "previous_month") {
    const from = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const to = endOfDay(new Date(now.getFullYear(), now.getMonth(), 0));
    const prevFrom = new Date(now.getFullYear(), now.getMonth() - 2, 1);
    const prevTo = endOfDay(new Date(now.getFullYear(), now.getMonth() - 1, 0));
    return {
      from: from.toISOString(),
      to: to.toISOString(),
      label: `${monthLabel(from.getMonth(), language)} ${from.getFullYear()}`,
      previousFrom: prevFrom.toISOString(),
      previousTo: prevTo.toISOString(),
      previousLabel: `${monthLabel(prevFrom.getMonth(), language)} ${prevFrom.getFullYear()}`,
    };
  }
  if (period === "current_year") {
    const from = new Date(now.getFullYear(), 0, 1);
    const to = endOfDay(now);
    const prevFrom = new Date(now.getFullYear() - 1, 0, 1);
    const prevTo = endOfDay(new Date(now.getFullYear() - 1, 11, 31));
    return {
      from: from.toISOString(),
      to: to.toISOString(),
      label: String(now.getFullYear()),
      previousFrom: prevFrom.toISOString(),
      previousTo: prevTo.toISOString(),
      previousLabel: String(now.getFullYear() - 1),
    };
  }
  const from = new Date(now.getFullYear(), now.getMonth(), 1);
  const to = endOfDay(now);
  const prevFrom = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const prevTo = endOfDay(new Date(now.getFullYear(), now.getMonth(), 0));
  return {
    from: from.toISOString(),
    to: to.toISOString(),
    label: `${monthLabel(from.getMonth(), language)} ${from.getFullYear()}`,
    previousFrom: prevFrom.toISOString(),
    previousTo: prevTo.toISOString(),
    previousLabel: `${monthLabel(prevFrom.getMonth(), language)} ${prevFrom.getFullYear()}`,
  };
}

export function monthRange(
  year: number,
  monthIndex: number,
  language: Language = "ru",
): { from: string; to: string; label: string } {
  const from = new Date(year, monthIndex, 1);
  const to = endOfDay(new Date(year, monthIndex + 1, 0));
  return {
    from: from.toISOString(),
    to: to.toISOString(),
    label: `${monthLabel(monthIndex, language)} ${year}`,
  };
}
