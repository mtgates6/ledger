"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Papa from "papaparse";
import { bulkImportTransactions, createAccount } from "@/app/actions";
import { suggestCategoryId } from "@/lib/categorize";
import { externalIdFor, parseCsvAmount, parseCsvDate } from "@/lib/csv";
import { toBudgetMonth } from "@/lib/budget-month";
import type { Account, Category, CategoryRule } from "@/lib/types";

type Step = "upload" | "map" | "preview";
type SignConvention = "negative_expense" | "positive_expense";

interface StagedRow {
  key: string;
  include: boolean;
  date: string | null;
  description: string;
  amount: number | null;
  type: "expense" | "income";
  budgetMonth: string;
  categoryId: string | null;
}

export function CsvImportWizard({
  categories,
  rules,
  accounts,
}: {
  categories: Category[];
  rules: CategoryRule[];
  accounts: Account[];
}) {
  const router = useRouter();
  const [step, setStep] = useState<Step>("upload");
  const [fileRows, setFileRows] = useState<Record<string, string>[]>([]);
  const [headers, setHeaders] = useState<string[]>([]);
  const [dateCol, setDateCol] = useState("");
  const [descCol, setDescCol] = useState("");
  const [amountCol, setAmountCol] = useState("");
  const [sign, setSign] = useState<SignConvention>("negative_expense");
  const [staged, setStaged] = useState<StagedRow[]>([]);
  const [accountId, setAccountId] = useState<string>(accounts[0]?.id ?? "");
  const [newAccountName, setNewAccountName] = useState("");
  const [isImporting, setIsImporting] = useState(false);
  const [error, setError] = useState("");
  const [resultCount, setResultCount] = useState<number | null>(null);

  function handleFile(file: File) {
    setError("");
    Papa.parse<Record<string, string>>(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const rows = results.data.filter((r) => Object.keys(r).length > 0);
        if (rows.length === 0) {
          setError("Couldn't find any rows in that file.");
          return;
        }
        const cols = results.meta.fields ?? [];
        setHeaders(cols);
        setFileRows(rows);

        const guess = (needle: string[]) =>
          cols.find((c) => needle.some((n) => c.toLowerCase().includes(n))) ?? "";
        setDateCol(guess(["date"]));
        setDescCol(guess(["description", "memo", "merchant", "name"]));
        setAmountCol(guess(["amount"]));

        setStep("map");
      },
      error: (err) => setError(err.message),
    });
  }

  function buildPreview() {
    const rows: StagedRow[] = fileRows.map((row, i) => {
      const date = parseCsvDate(row[dateCol] ?? "");
      const rawAmount = parseCsvAmount(row[amountCol] ?? "");
      const description = (row[descCol] ?? "").trim();

      let type: "expense" | "income" = "expense";
      let amount = rawAmount ?? 0;
      if (rawAmount !== null) {
        const isExpense =
          sign === "negative_expense" ? rawAmount < 0 : rawAmount > 0;
        type = isExpense ? "expense" : "income";
        amount = Math.abs(rawAmount);
      }

      const categoryId = description
        ? suggestCategoryId(description, rules)
        : null;

      return {
        key: `${i}`,
        include: Boolean(date && description && rawAmount !== null),
        date,
        description,
        amount,
        type,
        budgetMonth: date ? toBudgetMonth(date) : "",
        categoryId,
      };
    });

    setStaged(rows);
    setStep("preview");
  }

  function updateRow(key: string, patch: Partial<StagedRow>) {
    setStaged((prev) =>
      prev.map((r) => (r.key === key ? { ...r, ...patch } : r))
    );
  }

  async function handleImport() {
    setError("");
    setIsImporting(true);
    try {
      let finalAccountId = accountId || null;
      if (!finalAccountId && newAccountName.trim()) {
        const account = await createAccount(newAccountName.trim(), "csv");
        finalAccountId = account.id;
      }

      const rowsToImport = staged.filter(
        (r) => r.include && r.date && r.description && r.amount !== null
      );

      const count = await bulkImportTransactions(
        finalAccountId,
        rowsToImport.map((r) => ({
          amount: r.amount as number,
          type: r.type,
          description: r.description,
          date: r.date as string,
          budgetMonth: r.budgetMonth,
          categoryId: r.categoryId,
          externalId: externalIdFor(r.date as string, r.description, r.amount as number),
        }))
      );

      setResultCount(count);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Import failed.");
    } finally {
      setIsImporting(false);
    }
  }

  if (resultCount !== null) {
    return (
      <div className="flex flex-col gap-4 px-4 py-5">
        <div className="rounded-xl border border-emerald-900 bg-emerald-950/50 p-5 text-sm text-emerald-300">
          Imported {resultCount} transaction{resultCount === 1 ? "" : "s"}.
          {resultCount < staged.filter((r) => r.include).length && (
            <span className="block text-emerald-400/70 mt-1">
              The rest were skipped as likely duplicates of transactions
              already in your ledger.
            </span>
          )}
        </div>
        <button
          onClick={() => router.push("/transactions")}
          className="rounded-xl bg-sky-500 px-4 py-3 font-medium text-white"
        >
          View transactions
        </button>
      </div>
    );
  }

  if (step === "upload") {
    return (
      <div className="flex flex-col gap-4 px-4 py-5">
        <p className="text-sm text-slate-400">
          Export a CSV statement from your bank or card, then upload it here.
          Nothing leaves your browser except what you choose to import.
        </p>
        <label className="flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-slate-800 px-4 py-10 text-center">
          <span className="text-sm text-slate-400">Tap to choose a CSV file</span>
          <input
            type="file"
            accept=".csv,text/csv"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleFile(file);
            }}
          />
        </label>
        {error && <p className="text-sm text-red-400">{error}</p>}
      </div>
    );
  }

  if (step === "map") {
    return (
      <div className="flex flex-col gap-5 px-4 py-5">
        <p className="text-sm text-slate-400">
          Match your file&apos;s columns ({fileRows.length} rows found).
        </p>

        <ColumnSelect label="Date column" value={dateCol} onChange={setDateCol} headers={headers} />
        <ColumnSelect label="Description column" value={descCol} onChange={setDescCol} headers={headers} />
        <ColumnSelect label="Amount column" value={amountCol} onChange={setAmountCol} headers={headers} />

        <label className="flex flex-col gap-1.5">
          <span className="text-xs text-slate-400">Sign convention</span>
          <select
            value={sign}
            onChange={(e) => setSign(e.target.value as SignConvention)}
            className="rounded-xl border border-slate-800 bg-slate-900 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-sky-500"
          >
            <option value="negative_expense">Negative amounts are expenses (most common)</option>
            <option value="positive_expense">Positive amounts are expenses</option>
          </select>
        </label>

        {error && <p className="text-sm text-red-400">{error}</p>}

        <button
          onClick={buildPreview}
          disabled={!dateCol || !descCol || !amountCol}
          className="rounded-xl bg-sky-500 px-4 py-3 font-medium text-white disabled:opacity-50"
        >
          Preview import
        </button>
      </div>
    );
  }

  // step === "preview"
  const includedCount = staged.filter((r) => r.include).length;

  return (
    <div className="flex flex-col gap-4 px-4 py-5">
      <div className="flex flex-col gap-2">
        <label className="flex flex-col gap-1.5">
          <span className="text-xs text-slate-400">Import into account</span>
          <select
            value={accountId}
            onChange={(e) => setAccountId(e.target.value)}
            className="rounded-xl border border-slate-800 bg-slate-900 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-sky-500"
          >
            {accounts.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
            <option value="">+ New account…</option>
          </select>
        </label>
        {!accountId && (
          <input
            type="text"
            placeholder="e.g. Chase Checking"
            value={newAccountName}
            onChange={(e) => setNewAccountName(e.target.value)}
            className="rounded-xl border border-slate-800 bg-slate-900 px-4 py-3 placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-sky-500"
          />
        )}
      </div>

      <p className="text-sm text-slate-400">
        {includedCount} of {staged.length} rows will be imported. Uncheck any
        you want to skip, and fix up categories or budget months inline.
      </p>

      <ul className="flex flex-col gap-2">
        {staged.map((row) => (
          <li
            key={row.key}
            className={`rounded-xl border p-3 ${
              row.include ? "border-slate-800 bg-slate-900" : "border-slate-900 bg-slate-950 opacity-50"
            }`}
          >
            <div className="flex items-start gap-3">
              <input
                type="checkbox"
                checked={row.include}
                onChange={(e) => updateRow(row.key, { include: e.target.checked })}
                className="mt-1"
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <span className="truncate text-sm font-medium">
                    {row.description || "(no description)"}
                  </span>
                  <span className="shrink-0 text-sm tabular-nums">
                    {row.type === "income" ? "+" : "-"}${row.amount?.toFixed(2) ?? "?"}
                  </span>
                </div>
                {!row.date && (
                  <p className="mt-1 text-xs text-red-400">Couldn&apos;t parse a date for this row.</p>
                )}
                <div className="mt-2 flex flex-wrap gap-2">
                  <select
                    value={row.categoryId ?? ""}
                    onChange={(e) => updateRow(row.key, { categoryId: e.target.value || null })}
                    className="rounded-lg border border-slate-800 bg-slate-950 px-2 py-1 text-xs"
                  >
                    <option value="">Uncategorized</option>
                    {categories
                      .filter((c) => c.kind === row.type)
                      .map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.icon} {c.name}
                        </option>
                      ))}
                  </select>
                  {row.date && (
                    <input
                      type="month"
                      value={row.budgetMonth.slice(0, 7)}
                      onChange={(e) => updateRow(row.key, { budgetMonth: `${e.target.value}-01` })}
                      className="rounded-lg border border-slate-800 bg-slate-950 px-2 py-1 text-xs"
                    />
                  )}
                </div>
              </div>
            </div>
          </li>
        ))}
      </ul>

      {error && <p className="text-sm text-red-400">{error}</p>}

      <button
        onClick={handleImport}
        disabled={isImporting || includedCount === 0 || (!accountId && !newAccountName.trim())}
        className="sticky bottom-24 rounded-xl bg-sky-500 px-4 py-3.5 font-medium text-white disabled:opacity-50"
      >
        {isImporting ? "Importing…" : `Import ${includedCount} transaction${includedCount === 1 ? "" : "s"}`}
      </button>
    </div>
  );
}

function ColumnSelect({
  label,
  value,
  onChange,
  headers,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  headers: string[];
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-xs text-slate-400">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="rounded-xl border border-slate-800 bg-slate-900 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-sky-500"
      >
        <option value="">Select column…</option>
        {headers.map((h) => (
          <option key={h} value={h}>
            {h}
          </option>
        ))}
      </select>
    </label>
  );
}
