"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { budgetMonthLabel, shiftBudgetMonth } from "@/lib/budget-month";

export function MonthPicker({ budgetMonth }: { budgetMonth: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function goTo(month: string) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("month", month);
    router.push(`${pathname}?${params.toString()}`);
  }

  return (
    <div className="flex items-center justify-between gap-3">
      <button
        onClick={() => goTo(shiftBudgetMonth(budgetMonth, -1))}
        aria-label="Previous month"
        className="rounded-lg border border-slate-800 px-3 py-2 text-slate-300"
      >
        ←
      </button>
      <span className="text-base font-medium">
        {budgetMonthLabel(budgetMonth)}
      </span>
      <button
        onClick={() => goTo(shiftBudgetMonth(budgetMonth, 1))}
        aria-label="Next month"
        className="rounded-lg border border-slate-800 px-3 py-2 text-slate-300"
      >
        →
      </button>
    </div>
  );
}
