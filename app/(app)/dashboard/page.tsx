import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import {
  getAllBudgetMonths,
  getBudgetsForMonth,
  getCategories,
  getTransactionsForBudgetMonth,
  getTransactionsForYear,
} from "@/lib/data";
import { currentBudgetMonth, formatCurrency } from "@/lib/budget-month";
import { summarizeByCategory, summarizeByMonth, totalByType } from "@/lib/summary";
import { MonthPicker } from "@/components/month-picker";
import { CategoryPieChart } from "@/components/category-pie-chart";
import { CategoryBreakdownList } from "@/components/category-breakdown-list";
import { YearlyTrendChart } from "@/components/yearly-trend-chart";
import { TopBar } from "@/components/top-bar";

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string; view?: string }>;
}) {
  const params = await searchParams;
  const budgetMonth = params.month ?? currentBudgetMonth();
  const view = params.view === "year" ? "year" : "month";
  const year = parseInt(budgetMonth.slice(0, 4), 10);

  const supabase = await createClient();
  const [categories, monthTransactions, budgets, budgetMonths] =
    await Promise.all([
      getCategories(supabase),
      getTransactionsForBudgetMonth(supabase, budgetMonth),
      getBudgetsForMonth(supabase, budgetMonth),
      getAllBudgetMonths(supabase),
    ]);

  const expenseTotal = totalByType(monthTransactions, "expense");
  const incomeTotal = totalByType(monthTransactions, "income");
  const categorySummary = summarizeByCategory(
    monthTransactions,
    categories,
    budgets
  );

  const yearTransactions =
    view === "year" ? await getTransactionsForYear(supabase, year) : [];
  const monthTotals = summarizeByMonth(yearTransactions);

  return (
    <div>
      <TopBar title="Overview" />
      <div className="flex flex-col gap-6 px-4 py-5">
        <div className="flex gap-2 rounded-xl bg-slate-900 p-1 text-sm">
          <Link
            href={`/dashboard?month=${budgetMonth}&view=month`}
            className={`flex-1 rounded-lg py-2 text-center ${
              view === "month" ? "bg-slate-800 text-slate-100" : "text-slate-400"
            }`}
          >
            This Month
          </Link>
          <Link
            href={`/dashboard?month=${budgetMonth}&view=year`}
            className={`flex-1 rounded-lg py-2 text-center ${
              view === "year" ? "bg-slate-800 text-slate-100" : "text-slate-400"
            }`}
          >
            Year
          </Link>
        </div>

        {view === "month" ? (
          <>
            <MonthPicker budgetMonth={budgetMonth} />

            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-xl border border-slate-800 bg-slate-900 p-4">
                <p className="text-xs text-slate-500">Spent</p>
                <p className="mt-1 text-2xl font-semibold tabular-nums">
                  {formatCurrency(expenseTotal)}
                </p>
              </div>
              <div className="rounded-xl border border-slate-800 bg-slate-900 p-4">
                <p className="text-xs text-slate-500">Income</p>
                <p className="mt-1 text-2xl font-semibold tabular-nums text-emerald-400">
                  {formatCurrency(incomeTotal)}
                </p>
              </div>
            </div>

            <div className="rounded-xl border border-slate-800 bg-slate-900 p-4">
              <CategoryPieChart data={categorySummary} />
            </div>

            <div>
              <h2 className="mb-3 text-sm font-medium text-slate-400">
                By category
              </h2>
              {categorySummary.length === 0 ? (
                <p className="text-sm text-slate-500">
                  No expenses logged for this budget month yet.
                </p>
              ) : (
                <CategoryBreakdownList data={categorySummary} />
              )}
            </div>
          </>
        ) : (
          <>
            <div className="flex items-center justify-between">
              <Link
                href={`/dashboard?month=${budgetMonth.slice(0, 4)}-01-01&view=year`}
                className="text-sm text-slate-500"
              >
                {year}
              </Link>
            </div>
            <div className="rounded-xl border border-slate-800 bg-slate-900 p-4">
              <YearlyTrendChart data={monthTotals} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-xl border border-slate-800 bg-slate-900 p-4">
                <p className="text-xs text-slate-500">Total spent</p>
                <p className="mt-1 text-2xl font-semibold tabular-nums">
                  {formatCurrency(totalByType(yearTransactions, "expense"))}
                </p>
              </div>
              <div className="rounded-xl border border-slate-800 bg-slate-900 p-4">
                <p className="text-xs text-slate-500">Total income</p>
                <p className="mt-1 text-2xl font-semibold tabular-nums text-emerald-400">
                  {formatCurrency(totalByType(yearTransactions, "income"))}
                </p>
              </div>
            </div>
          </>
        )}

        {budgetMonths.length === 0 && (
          <div className="rounded-xl border border-dashed border-slate-800 p-5 text-center text-sm text-slate-500">
            Nothing logged yet.{" "}
            <Link href="/transactions/new" className="text-sky-400">
              Add your first expense
            </Link>
            .
          </div>
        )}
      </div>
    </div>
  );
}
