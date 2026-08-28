import type { CurrencyCode, DateFormat, Language } from "./types.ts";
import { formatMajorNumber } from "./money.ts";

const localeByLang: Record<Language, string> = {
  ru: "ru-RU",
  en: "en-US",
};

const currencySymbol: Record<CurrencyCode, string> = {
  RUB: "₽",
  USD: "$",
  EUR: "€",
};

export function money(
  minor: number,
  currency: CurrencyCode,
  lang: Language,
): string {
  const amount = formatMajorNumber(minor, localeByLang[lang]);
  const symbol = currencySymbol[currency];
  if (currency === "USD" || currency === "EUR") return `${symbol}${amount}`;
  return `${amount} ${symbol}`;
}

export function formatDate(iso: string | null | undefined, format: DateFormat): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yyyy = d.getFullYear();
  if (format === "yyyy-MM-dd") return `${yyyy}-${mm}-${dd}`;
  if (format === "MM/dd/yyyy") return `${mm}/${dd}/${yyyy}`;
  return `${dd}.${mm}.${yyyy}`;
}

export function formatDateTime(iso: string | null | undefined, format: DateFormat): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  const hh = String(d.getHours()).padStart(2, "0");
  const min = String(d.getMinutes()).padStart(2, "0");
  return `${formatDate(iso, format)} ${hh}:${min}`;
}

export function formatCount(n: number, lang: Language): string {
  return new Intl.NumberFormat(localeByLang[lang]).format(n);
}

export function formatPercent(n: number, lang: Language): string {
  const sign = n > 0 ? "+" : "";
  return `${sign}${n.toFixed(1)}%`;
}

export function localeOf(lang: Language): string {
  return localeByLang[lang];
}
