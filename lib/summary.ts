import { BUDGET_GROUPS, BUDGET_GROUP_META } from "@/lib/budget-groups";
import type { Budget, BudgetGroup, Category, Transaction } from "@/lib/types";

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

export interface GroupSummary {
  group: BudgetGroup;
  total: number;
  pct: number; // 0-100, share of basisAmount
  targetPct: number;
}

export interface FiftyThirtyTwentySummary {
  groups: GroupSummary[];
  basis: "income" | "tracked";
  basisAmount: number;
  ungroupedTotal: number;
}

/**
 * The textbook 50/30/20 rule measures against take-home income. If no
 * income was logged for the month, fall back to measuring against total
 * tracked needs+wants+savings spending instead, so the breakdown is still
 * useful for someone who only logs expenses.
 */
export function summarizeByGroup(
  transactions: Transaction[],
  categories: Category[]
): FiftyThirtyTwentySummary {
  const categoryMap = new Map(categories.map((c) => [c.id, c]));
  const groupTotals: Record<BudgetGroup, number> = {
    needs: 0,
    wants: 0,
    savings: 0,
  };
  let ungroupedTotal = 0;
  let incomeTotal = 0;

  for (const txn of transactions) {
    const amount = Number(txn.amount);
    if (txn.type === "income") {
      incomeTotal += amount;
      continue;
    }
    const category = txn.category_id ? categoryMap.get(txn.category_id) : null;
    const group = category?.budget_group ?? null;
    if (group) {
      groupTotals[group] += amount;
    } else {
      ungroupedTotal += amount;
    }
  }

  const trackedTotal = groupTotals.needs + groupTotals.wants + groupTotals.savings;
  const basis: "income" | "tracked" = incomeTotal > 0 ? "income" : "tracked";
  const basisAmount = basis === "income" ? incomeTotal : trackedTotal;

  const groups: GroupSummary[] = BUDGET_GROUPS.map((group) => ({
    group,
    total: groupTotals[group],
    pct: basisAmount > 0 ? (groupTotals[group] / basisAmount) * 100 : 0,
    targetPct: BUDGET_GROUP_META[group].targetPct,
  }));

  return { groups, basis, basisAmount, ungroupedTotal };
}

export function totalByType(
  transactions: Transaction[],
  type: "expense" | "income"
): number {
  return transactions
    .filter((t) => t.type === type)
    .reduce((sum, t) => sum + Number(t.amount), 0);
}
