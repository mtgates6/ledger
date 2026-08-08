import { isValid, parse as parseDate } from "date-fns";

const DATE_FORMATS = [
  "MM/dd/yyyy",
  "M/d/yyyy",
  "MM/dd/yy",
  "M/d/yy",
  "yyyy-MM-dd",
  "MM-dd-yyyy",
];

/** Parse common bank-export date formats into an ISO yyyy-MM-dd string, or null. */
export function parseCsvDate(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return null;

  for (const fmt of DATE_FORMATS) {
    const parsed = parseDate(trimmed, fmt, new Date());
    if (isValid(parsed)) {
      return parsed.toISOString().slice(0, 10);
    }
  }

  const fallback = new Date(trimmed);
  if (isValid(fallback)) {
    return fallback.toISOString().slice(0, 10);
  }

  return null;
}

/** Parse a currency-ish string ("$1,234.56", "(12.00)", "-12.00") into a number. */
export function parseCsvAmount(value: string): number | null {
  const trimmed = value.trim();
  if (!trimmed) return null;

  const isParenNegative = /^\(.*\)$/.test(trimmed);
  const cleaned = trimmed.replace(/[()$,]/g, "");
  const num = parseFloat(cleaned);
  if (Number.isNaN(num)) return null;

  return isParenNegative ? -Math.abs(num) : num;
}

/** Stable-ish fingerprint for de-duplicating repeat CSV imports. */
export function externalIdFor(date: string, description: string, amount: number): string {
  const normalized = `${date}|${description.trim().toLowerCase()}|${amount.toFixed(2)}`;
  let hash = 0;
  for (let i = 0; i < normalized.length; i++) {
    hash = (hash * 31 + normalized.charCodeAt(i)) | 0;
  }
  return `csv_${Math.abs(hash)}_${normalized.length}`;
}
