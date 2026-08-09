"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  createTransaction,
  deleteTransaction,
  updateTransaction,
} from "@/app/actions";
import { suggestCategoryId } from "@/lib/categorize";
import { toBudgetMonth, todayISO } from "@/lib/budget-month";
import type { Account, Category, CategoryRule, Transaction, TransactionType } from "@/lib/types";

export function TransactionForm({
  categories,
  accounts,
  rules,
  transaction,
}: {
  categories: Category[];
  accounts: Account[];
  rules: CategoryRule[];
  transaction?: Transaction;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState("");

  const [type, setType] = useState<TransactionType>(transaction?.type ?? "expense");
  const [amount, setAmount] = useState(transaction ? String(transaction.amount) : "");
  const [description, setDescription] = useState(transaction?.description ?? "");
  const [date, setDate] = useState(transaction?.date ?? todayISO());
  const [budgetMonth, setBudgetMonth] = useState(
    transaction?.budget_month ?? toBudgetMonth(transaction?.date ?? todayISO())
  );
  const [budgetMonthTouched, setBudgetMonthTouched] = useState(Boolean(transaction));
  const [categoryId, setCategoryId] = useState<string | null>(
    transaction?.category_id ?? null
  );
  const [categoryTouched, setCategoryTouched] = useState(Boolean(transaction?.category_id));
  const [accountId, setAccountId] = useState<string | null>(
    transaction?.account_id ?? accounts[0]?.id ?? null
  );
  const [notes, setNotes] = useState(transaction?.notes ?? "");

  const visibleCategories = useMemo(
    () => categories.filter((c) => c.kind === type),
    [categories, type]
  );

  function handleDescriptionChange(value: string) {
    setDescription(value);
    if (!categoryTouched && value.trim().length > 1) {
      const guess = suggestCategoryId(value, rules);
      if (guess) setCategoryId(guess);
    }
  }

  function handleDateChange(value: string) {
    setDate(value);
    if (!budgetMonthTouched) {
      setBudgetMonth(toBudgetMonth(value));
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    const parsedAmount = parseFloat(amount);
    if (!parsedAmount || parsedAmount <= 0) {
      setError("Enter an amount greater than 0.");
      return;
    }
    if (!description.trim()) {
      setError("Enter a description.");
      return;
    }

    const input = {
      amount: parsedAmount,
      type,
      description: description.trim(),
      date,
      budgetMonth,
      categoryId,
      accountId,
      notes,
    };

    startTransition(async () => {
      try {
        if (transaction) {
          await updateTransaction(transaction.id, input);
        } else {
          await createTransaction(input);
        }
        router.push("/transactions");
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Something went wrong.");
      }
    });
  }

  function handleDelete() {
    if (!transaction) return;
    if (!confirm("Delete this transaction?")) return;
    startTransition(async () => {
      await deleteTransaction(transaction.id);
      router.push("/transactions");
      router.refresh();
    });
  }

  const dateMonthLabel = new Date(date + "T00:00:00").toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });
  const budgetMonthLabel = new Date(budgetMonth + "T00:00:00").toLocaleDateString(
    "en-US",
    { month: "long", year: "numeric" }
  );
  const monthsDiffer = dateMonthLabel !== budgetMonthLabel;

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5 px-4 pb-5 header-offset">
      <div className="flex gap-2 rounded-xl bg-slate-900 p-1 text-sm">
        <button
          type="button"
          onClick={() => setType("expense")}
          className={`flex-1 rounded-lg py-2 ${
            type === "expense" ? "bg-slate-800 text-slate-100" : "text-slate-400"
          }`}
        >
          Expense
        </button>
        <button
          type="button"
          onClick={() => setType("income")}
          className={`flex-1 rounded-lg py-2 ${
            type === "income" ? "bg-slate-800 text-slate-100" : "text-slate-400"
          }`}
        >
          Income
        </button>
      </div>

      <label className="flex flex-col gap-1.5">
        <span className="text-xs text-slate-400">Amount</span>
        <input
          type="number"
          inputMode="decimal"
          step="0.01"
          min="0"
          required
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="0.00"
          className="rounded-xl border border-slate-800 bg-slate-900 px-4 py-3 text-lg placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-sky-500"
        />
      </label>

      <label className="flex flex-col gap-1.5">
        <span className="text-xs text-slate-400">Description</span>
        <input
          type="text"
          required
          value={description}
          onChange={(e) => handleDescriptionChange(e.target.value)}
          placeholder="e.g. Rent, Trader Joe's, Netflix"
          className="rounded-xl border border-slate-800 bg-slate-900 px-4 py-3 placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-sky-500"
        />
      </label>

      <label className="flex flex-col gap-1.5">
        <span className="text-xs text-slate-400">Category</span>
        <select
          value={categoryId ?? ""}
          onChange={(e) => {
            setCategoryTouched(true);
            setCategoryId(e.target.value || null);
          }}
          className="rounded-xl border border-slate-800 bg-slate-900 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-sky-500"
        >
          <option value="">Uncategorized</option>
          {visibleCategories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.icon} {c.name}
            </option>
          ))}
        </select>
      </label>

      <label className="flex flex-col gap-1.5">
        <span className="text-xs text-slate-400">Date paid</span>
        <input
          type="date"
          required
          value={date}
          onChange={(e) => handleDateChange(e.target.value)}
          className="rounded-xl border border-slate-800 bg-slate-900 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-sky-500"
        />
      </label>

      <label className="flex flex-col gap-1.5">
        <span className="text-xs text-slate-400">
          Counts toward budget month
        </span>
        <input
          type="month"
          required
          value={budgetMonth.slice(0, 7)}
          onChange={(e) => {
            setBudgetMonthTouched(true);
            setBudgetMonth(`${e.target.value}-01`);
          }}
          className="rounded-xl border border-slate-800 bg-slate-900 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-sky-500"
        />
        {monthsDiffer && (
          <span className="text-xs text-amber-400">
            Paid in {dateMonthLabel}, counted toward {budgetMonthLabel}. Handy
            for rent paid a few days early or bills paid late.
          </span>
        )}
      </label>

      {accounts.length > 0 && (
        <label className="flex flex-col gap-1.5">
          <span className="text-xs text-slate-400">Account</span>
          <select
            value={accountId ?? ""}
            onChange={(e) => setAccountId(e.target.value || null)}
            className="rounded-xl border border-slate-800 bg-slate-900 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-sky-500"
          >
            {accounts.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </select>
        </label>
      )}

      <label className="flex flex-col gap-1.5">
        <span className="text-xs text-slate-400">Notes (optional)</span>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={2}
          className="rounded-xl border border-slate-800 bg-slate-900 px-4 py-3 placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-sky-500"
        />
      </label>

      {error && <p className="text-sm text-red-400">{error}</p>}

      <button
        type="submit"
        disabled={isPending}
        className="rounded-xl bg-sky-500 px-4 py-3.5 font-medium text-white disabled:opacity-60"
      >
        {isPending ? "Saving…" : transaction ? "Save changes" : "Add transaction"}
      </button>

      {transaction && (
        <button
          type="button"
          onClick={handleDelete}
          disabled={isPending}
          className="rounded-xl border border-red-900 px-4 py-3 font-medium text-red-400"
        >
          Delete
        </button>
      )}
    </form>
  );
}
