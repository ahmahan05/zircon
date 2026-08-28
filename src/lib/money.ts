/** Money is stored as integer minor units (kopecks / cents). 600 ₽ = 60000. */

export const MINOR_PER_MAJOR = 100;

export function majorToMinor(major: number): number {
  if (!Number.isFinite(major)) return 0;
  return Math.round(major * MINOR_PER_MAJOR);
}

export function minorToMajor(minor: number): number {
  if (!Number.isFinite(minor)) return 0;
  return minor / MINOR_PER_MAJOR;
}

export function parseMajorInput(raw: string): number | null {
  const normalized = raw.replace(/\s/g, "").replace(",", ".").trim();
  if (!normalized) return null;
  const n = Number(normalized);
  if (!Number.isFinite(n) || n < 0) return null;
  return majorToMinor(n);
}

export function formatMajorNumber(minor: number, locale: string): string {
  const major = minorToMajor(minor);
  const formatted = new Intl.NumberFormat(locale, {
    minimumFractionDigits: Number.isInteger(major) ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(major);
  return formatted;
}
