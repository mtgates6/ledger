import {
  addMonths,
  endOfMonth,
  format,
  parseISO,
  startOfMonth,
} from "date-fns";

/** Normalize any date to the first-of-month string a `budget_month` column stores. */
export function toBudgetMonth(date: Date | string): string {
  const d = typeof date === "string" ? parseISO(date) : date;
  return format(startOfMonth(d), "yyyy-MM-dd");
}

export function currentBudgetMonth(): string {
  return toBudgetMonth(new Date());
}

export function shiftBudgetMonth(budgetMonth: string, delta: number): string {
  return toBudgetMonth(addMonths(parseISO(budgetMonth), delta));
}

export function budgetMonthLabel(budgetMonth: string): string {
  return format(parseISO(budgetMonth), "MMMM yyyy");
}

export function budgetMonthShortLabel(budgetMonth: string): string {
  return format(parseISO(budgetMonth), "MMM yyyy");
}

export function budgetMonthRange(budgetMonth: string): { start: string; end: string } {
  const start = parseISO(budgetMonth);
  return {
    start: format(startOfMonth(start), "yyyy-MM-dd"),
    end: format(endOfMonth(start), "yyyy-MM-dd"),
  };
}

export function todayISO(): string {
  return format(new Date(), "yyyy-MM-dd");
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(amount);
}

export function yearsForBudgetMonths(budgetMonths: string[]): number[] {
  const years = new Set(budgetMonths.map((m) => parseISO(m).getFullYear()));
  return Array.from(years).sort((a, b) => b - a);
}
