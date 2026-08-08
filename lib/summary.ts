import type { Budget, Category, Transaction } from "@/lib/types";

export interface CategorySummary {
  category: Category | null;
  total: number;
  budget: number | null;
  count: number;
}

export function summarizeByCategory(
  transactions: Transaction[],
  categories: Category[],
  budgets: Budget[] = []
): CategorySummary[] {
  const categoryMap = new Map(categories.map((c) => [c.id, c]));
  const budgetMap = new Map(budgets.map((b) => [b.category_id, b.amount]));
  const totals = new Map<string, { total: number; count: number }>();

  for (const txn of transactions) {
    if (txn.type !== "expense") continue;
    const key = txn.category_id ?? "uncategorized";
    const existing = totals.get(key) ?? { total: 0, count: 0 };
    existing.total += Number(txn.amount);
    existing.count += 1;
    totals.set(key, existing);
  }

  const summaries: CategorySummary[] = Array.from(totals.entries()).map(
    ([categoryId, { total, count }]) => ({
      category: categoryMap.get(categoryId) ?? null,
      total,
      budget: budgetMap.get(categoryId) ?? null,
      count,
    })
  );

  return summaries.sort((a, b) => b.total - a.total);
}

export interface MonthTotals {
  budgetMonth: string;
  expenses: number;
  income: number;
}

export function summarizeByMonth(transactions: Transaction[]): MonthTotals[] {
  const totals = new Map<string, MonthTotals>();

  for (const txn of transactions) {
    const existing = totals.get(txn.budget_month) ?? {
      budgetMonth: txn.budget_month,
      expenses: 0,
      income: 0,
    };
    if (txn.type === "expense") {
      existing.expenses += Number(txn.amount);
    } else {
      existing.income += Number(txn.amount);
    }
    totals.set(txn.budget_month, existing);
  }

  return Array.from(totals.values()).sort((a, b) =>
    a.budgetMonth.localeCompare(b.budgetMonth)
  );
}

export function totalByType(
  transactions: Transaction[],
  type: "expense" | "income"
): number {
  return transactions
    .filter((t) => t.type === type)
    .reduce((sum, t) => sum + Number(t.amount), 0);
}
