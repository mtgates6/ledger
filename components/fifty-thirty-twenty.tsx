import Link from "next/link";
import { BUDGET_GROUP_META } from "@/lib/budget-groups";
import { formatCurrency } from "@/lib/budget-month";
import type { FiftyThirtyTwentySummary } from "@/lib/summary";

export function FiftyThirtyTwenty({
  summary,
}: {
  summary: FiftyThirtyTwentySummary;
}) {
  const { groups, basis, basisAmount, ungroupedTotal } = summary;

  if (basisAmount === 0) {
    return (
      <div className="rounded-xl border border-slate-800 bg-slate-900 p-4 text-sm text-slate-500">
        Log some income, or assign your categories to Needs / Wants / Savings
        on the{" "}
        <Link href="/categories" className="text-sky-400">
          Categories
        </Link>{" "}
        page, to see your 50/30/20 breakdown.
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900 p-4">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-medium text-slate-400">50/30/20</h2>
        <span className="text-xs text-slate-500">
          % of {basis === "income" ? "income" : "tracked spending"}
        </span>
      </div>

      <ul className="flex flex-col gap-3">
        {groups.map(({ group, total, pct, targetPct }) => {
          const meta = BUDGET_GROUP_META[group];
          const over = pct > targetPct + 0.5;
          return (
            <li key={group}>
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium">{meta.label}</span>
                <span className="tabular-nums text-slate-300">
                  {formatCurrency(total)}{" "}
                  <span className={over ? "text-amber-400" : "text-slate-500"}>
                    ({pct.toFixed(0)}% vs {targetPct}% target)
                  </span>
                </span>
              </div>
              <div className="relative mt-2 h-1.5 w-full overflow-hidden rounded-full bg-slate-800">
                <div
                  className="absolute inset-y-0 left-0 rounded-full"
                  style={{
                    width: `${Math.min(100, pct)}%`,
                    backgroundColor: over ? "#f59e0b" : meta.color,
                  }}
                />
                <div
                  className="absolute inset-y-0 w-px bg-slate-500"
                  style={{ left: `${Math.min(100, targetPct)}%` }}
                />
              </div>
            </li>
          );
        })}
      </ul>

      {ungroupedTotal > 0 && (
        <p className="mt-3 text-xs text-slate-500">
          {formatCurrency(ungroupedTotal)} spent in categories without a
          group —{" "}
          <Link href="/categories" className="text-sky-400">
            assign them
          </Link>{" "}
          to include in this breakdown.
        </p>
      )}
    </div>
  );
}
