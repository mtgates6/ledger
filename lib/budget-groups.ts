import type { BudgetGroup } from "@/lib/types";

export const BUDGET_GROUPS: BudgetGroup[] = ["needs", "wants", "savings"];

export const BUDGET_GROUP_META: Record<
  BudgetGroup,
  { label: string; color: string; targetPct: number }
> = {
  needs: { label: "Needs", color: "#38bdf8", targetPct: 50 },
  wants: { label: "Wants", color: "#fbbf24", targetPct: 30 },
  savings: { label: "Savings", color: "#34d399", targetPct: 20 },
};
