import { formatCurrency } from "@/lib/budget-month";
import type { CategorySummary } from "@/lib/summary";

export function CategoryBreakdownList({ data }: { data: CategorySummary[] }) {
  if (data.length === 0) {
    return null;
  }

  const grandTotal = data.reduce((sum, d) => sum + d.total, 0);

  return (
    <ul className="flex flex-col gap-3">
      {data.map((summary) => {
        const name = summary.category?.name ?? "Uncategorized";
        const color = summary.category?.color ?? "#6b7280";
        const icon = summary.category?.icon ?? "📦";
        const pctOfTotal = grandTotal > 0 ? (summary.total / grandTotal) * 100 : 0;
        const pctOfBudget = summary.budget
          ? Math.min(100, (summary.total / summary.budget) * 100)
          : null;
        const overBudget = summary.budget !== null && summary.total > summary.budget;

        return (
          <li
            key={name}
            className="rounded-xl border border-slate-800 bg-slate-900 p-3.5"
          >
            <div className="flex items-center justify-between text-sm">
              <span className="flex items-center gap-2 font-medium">
                <span>{icon}</span>
                {name}
              </span>
              <span className="tabular-nums">
                {formatCurrency(summary.total)}
                {summary.budget && (
                  <span className="text-slate-500">
                    {" "}
                    / {formatCurrency(summary.budget)}
                  </span>
                )}
              </span>
            </div>
            <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-slate-800">
              <div
                className="h-full rounded-full"
                style={{
                  width: `${pctOfBudget ?? pctOfTotal}%`,
                  backgroundColor: overBudget ? "#ef4444" : color,
                }}
              />
            </div>
            {overBudget && (
              <p className="mt-1.5 text-xs text-red-400">
                {formatCurrency(summary.total - (summary.budget ?? 0))} over budget
              </p>
            )}
          </li>
        );
      })}
    </ul>
  );
}
