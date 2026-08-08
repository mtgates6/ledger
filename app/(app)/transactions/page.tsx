import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getCategories, searchTransactions } from "@/lib/data";
import { currentBudgetMonth, formatCurrency } from "@/lib/budget-month";
import { totalByType } from "@/lib/summary";
import { MonthPicker } from "@/components/month-picker";
import { TopBar } from "@/components/top-bar";
import { TransactionFilters } from "@/components/transaction-filters";
import { TransactionList } from "@/components/transaction-list";

export default async function TransactionsPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string; category?: string; q?: string }>;
}) {
  const params = await searchParams;
  const budgetMonth = params.month ?? currentBudgetMonth();

  const supabase = await createClient();
  const categories = await getCategories(supabase);
  const transactions = await searchTransactions(supabase, {
    budgetMonth,
    categoryId: params.category,
    query: params.q,
  });

  const expenseTotal = totalByType(transactions, "expense");
  const incomeTotal = totalByType(transactions, "income");

  return (
    <div>
      <TopBar title="Activity" />
      <div className="flex flex-col gap-4 px-4 py-5">
        <MonthPicker budgetMonth={budgetMonth} />

        <div className="flex justify-between text-sm text-slate-400">
          <span>
            Spent <span className="text-slate-100">{formatCurrency(expenseTotal)}</span>
          </span>
          <span>
            Income{" "}
            <span className="text-emerald-400">{formatCurrency(incomeTotal)}</span>
          </span>
        </div>

        <TransactionFilters categories={categories} />

        <TransactionList transactions={transactions} categories={categories} />

        <div className="flex justify-center gap-4 pt-2 text-sm">
          <Link href="/transactions/new" className="text-sky-400">
            + Add manually
          </Link>
          <Link href="/transactions/import" className="text-sky-400">
            Import CSV
          </Link>
        </div>
      </div>
    </div>
  );
}
