import Link from "next/link";
import { formatCurrency } from "@/lib/budget-month";
import { CategoryBadge } from "@/components/category-badge";
import type { Category, Transaction } from "@/lib/types";

export function TransactionList({
  transactions,
  categories,
}: {
  transactions: Transaction[];
  categories: Category[];
}) {
  if (transactions.length === 0) {
    return (
      <p className="py-10 text-center text-sm text-slate-500">
        No transactions match.
      </p>
    );
  }

  const categoryMap = new Map(categories.map((c) => [c.id, c]));

  return (
    <ul className="flex flex-col divide-y divide-slate-800 overflow-hidden rounded-xl border border-slate-800">
      {transactions.map((txn) => (
        <li key={txn.id}>
          <Link
            href={`/transactions/${txn.id}`}
            className="flex items-center justify-between gap-3 bg-slate-900 px-4 py-3.5"
          >
            <div className="flex min-w-0 flex-col gap-1">
              <span className="truncate text-sm font-medium">
                {txn.description}
              </span>
              <div className="flex items-center gap-2">
                <CategoryBadge category={categoryMap.get(txn.category_id ?? "") ?? null} />
                <span className="text-xs text-slate-500">
                  {new Date(txn.date + "T00:00:00").toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                  })}
                </span>
              </div>
            </div>
            <span
              className={`shrink-0 tabular-nums font-medium ${
                txn.type === "income" ? "text-emerald-400" : "text-slate-100"
              }`}
            >
              {txn.type === "income" ? "+" : "-"}
              {formatCurrency(txn.amount)}
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
