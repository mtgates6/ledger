"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  archiveCategory,
  createCategory,
  createCategoryRule,
  deleteCategoryRule,
  updateCategory,
} from "@/app/actions";
import { BUDGET_GROUPS, BUDGET_GROUP_META } from "@/lib/budget-groups";
import type { BudgetGroup, Category, CategoryRule } from "@/lib/types";

const COLORS = [
  "#f97316",
  "#a855f7",
  "#22c55e",
  "#ef4444",
  "#3b82f6",
  "#eab308",
  "#14b8a6",
  "#ec4899",
  "#8b5cf6",
  "#0ea5e9",
  "#6b7280",
];

export function CategoryManager({
  categories,
  rules,
}: {
  categories: Category[];
  rules: CategoryRule[];
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [expanded, setExpanded] = useState<string | null>(null);
  const [showNew, setShowNew] = useState(false);

  const [name, setName] = useState("");
  const [icon, setIcon] = useState("🏷️");
  const [color, setColor] = useState(COLORS[0]);
  const [kind, setKind] = useState<"expense" | "income">("expense");
  const [budgetGroup, setBudgetGroup] = useState<BudgetGroup | null>(null);

  function refresh() {
    router.refresh();
  }

  function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    startTransition(async () => {
      await createCategory({ name: name.trim(), icon, color, kind, budgetGroup });
      setName("");
      setBudgetGroup(null);
      setShowNew(false);
      refresh();
    });
  }

  function handleArchive(id: string) {
    if (!confirm("Archive this category? Past transactions keep it, but it won't show up for new ones.")) return;
    startTransition(async () => {
      await archiveCategory(id);
      refresh();
    });
  }

  function handleGroupChange(id: string, group: BudgetGroup | null) {
    startTransition(async () => {
      await updateCategory(id, { budgetGroup: group });
      refresh();
    });
  }

  return (
    <div className="flex flex-col gap-3 px-4 pb-5 header-offset">
      {categories.map((category) => {
        const categoryRules = rules.filter((r) => r.category_id === category.id);
        const isOpen = expanded === category.id;
        return (
          <div key={category.id} className="rounded-xl border border-slate-800 bg-slate-900">
            <button
              onClick={() => setExpanded(isOpen ? null : category.id)}
              className="flex w-full items-center justify-between px-4 py-3.5"
            >
              <span className="flex items-center gap-2 text-sm font-medium">
                <span>{category.icon}</span>
                {category.name}
                {category.budget_group && (
                  <span
                    className="rounded-full px-2 py-0.5 text-[10px] font-normal"
                    style={{
                      backgroundColor: `${BUDGET_GROUP_META[category.budget_group].color}26`,
                      color: BUDGET_GROUP_META[category.budget_group].color,
                    }}
                  >
                    {BUDGET_GROUP_META[category.budget_group].label}
                  </span>
                )}
                <span className="text-xs text-slate-500">
                  ({categoryRules.length} rule{categoryRules.length === 1 ? "" : "s"})
                </span>
              </span>
              <span className="text-slate-500 text-xs">{isOpen ? "▲" : "▼"}</span>
            </button>

            {isOpen && (
              <div className="border-t border-slate-800 px-4 py-3">
                {category.kind === "expense" && (
                  <div className="mb-3">
                    <p className="mb-1.5 text-xs text-slate-500">
                      50/30/20 group
                    </p>
                    <div className="flex gap-1.5 text-xs">
                      <button
                        type="button"
                        onClick={() => handleGroupChange(category.id, null)}
                        disabled={isPending}
                        className={`rounded-lg px-2.5 py-1.5 ${
                          !category.budget_group ? "bg-slate-800" : "bg-slate-950 text-slate-500"
                        }`}
                      >
                        None
                      </button>
                      {BUDGET_GROUPS.map((group) => (
                        <button
                          type="button"
                          key={group}
                          onClick={() => handleGroupChange(category.id, group)}
                          disabled={isPending}
                          className={`rounded-lg px-2.5 py-1.5 ${
                            category.budget_group === group
                              ? "bg-slate-800"
                              : "bg-slate-950 text-slate-500"
                          }`}
                          style={
                            category.budget_group === group
                              ? { color: BUDGET_GROUP_META[group].color }
                              : undefined
                          }
                        >
                          {BUDGET_GROUP_META[group].label}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                <RuleEditor categoryId={category.id} rules={categoryRules} onChange={refresh} />
                <button
                  onClick={() => handleArchive(category.id)}
                  disabled={isPending}
                  className="mt-3 text-xs text-red-400"
                >
                  Archive category
                </button>
              </div>
            )}
          </div>
        );
      })}

      {!showNew ? (
        <button
          onClick={() => setShowNew(true)}
          className="rounded-xl border border-dashed border-slate-800 px-4 py-3 text-sm text-slate-400"
        >
          + New category
        </button>
      ) : (
        <form
          onSubmit={handleCreate}
          className="flex flex-col gap-3 rounded-xl border border-slate-800 bg-slate-900 p-4"
        >
          <div className="flex gap-2">
            <input
              type="text"
              value={icon}
              onChange={(e) => setIcon(e.target.value)}
              className="w-16 rounded-xl border border-slate-800 bg-slate-950 px-3 py-3 text-center"
              maxLength={2}
            />
            <input
              type="text"
              required
              placeholder="Category name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="flex-1 rounded-xl border border-slate-800 bg-slate-950 px-4 py-3 placeholder:text-slate-600"
            />
          </div>

          <div className="flex gap-2">
            {COLORS.map((c) => (
              <button
                type="button"
                key={c}
                onClick={() => setColor(c)}
                className={`h-7 w-7 rounded-full ${color === c ? "ring-2 ring-offset-2 ring-offset-slate-900 ring-white" : ""}`}
                style={{ backgroundColor: c }}
                aria-label={c}
              />
            ))}
          </div>

          <div className="flex gap-2 text-sm">
            <button
              type="button"
              onClick={() => setKind("expense")}
              className={`flex-1 rounded-lg py-2 ${kind === "expense" ? "bg-slate-800" : "bg-slate-950"}`}
            >
              Expense
            </button>
            <button
              type="button"
              onClick={() => setKind("income")}
              className={`flex-1 rounded-lg py-2 ${kind === "income" ? "bg-slate-800" : "bg-slate-950"}`}
            >
              Income
            </button>
          </div>

          {kind === "expense" && (
            <div>
              <p className="mb-1.5 text-xs text-slate-500">
                50/30/20 group (optional)
              </p>
              <div className="flex gap-1.5 text-xs">
                <button
                  type="button"
                  onClick={() => setBudgetGroup(null)}
                  className={`rounded-lg px-2.5 py-1.5 ${
                    !budgetGroup ? "bg-slate-800" : "bg-slate-950 text-slate-500"
                  }`}
                >
                  None
                </button>
                {BUDGET_GROUPS.map((group) => (
                  <button
                    type="button"
                    key={group}
                    onClick={() => setBudgetGroup(group)}
                    className={`rounded-lg px-2.5 py-1.5 ${
                      budgetGroup === group ? "bg-slate-800" : "bg-slate-950 text-slate-500"
                    }`}
                    style={budgetGroup === group ? { color: BUDGET_GROUP_META[group].color } : undefined}
                  >
                    {BUDGET_GROUP_META[group].label}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="flex gap-2">
            <button
              type="submit"
              disabled={isPending}
              className="flex-1 rounded-xl bg-sky-500 px-4 py-2.5 font-medium text-white disabled:opacity-60"
            >
              Add
            </button>
            <button
              type="button"
              onClick={() => setShowNew(false)}
              className="rounded-xl border border-slate-800 px-4 py-2.5 text-slate-400"
            >
              Cancel
            </button>
          </div>
        </form>
      )}
    </div>
  );
}

function RuleEditor({
  categoryId,
  rules,
  onChange,
}: {
  categoryId: string;
  rules: CategoryRule[];
  onChange: () => void;
}) {
  const [keyword, setKeyword] = useState("");
  const [isPending, startTransition] = useTransition();

  function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!keyword.trim()) return;
    startTransition(async () => {
      await createCategoryRule(categoryId, keyword.trim());
      setKeyword("");
      onChange();
    });
  }

  function handleDelete(id: string) {
    startTransition(async () => {
      await deleteCategoryRule(id);
      onChange();
    });
  }

  return (
    <div className="flex flex-col gap-2">
      <p className="text-xs text-slate-500">
        Transactions whose description contains any of these are
        auto-categorized here.
      </p>
      <div className="flex flex-wrap gap-1.5">
        {rules.map((rule) => (
          <span
            key={rule.id}
            className="flex items-center gap-1 rounded-full bg-slate-800 px-2.5 py-1 text-xs"
          >
            {rule.keyword}
            <button
              onClick={() => handleDelete(rule.id)}
              disabled={isPending}
              className="text-slate-500 hover:text-red-400"
              aria-label={`Remove ${rule.keyword}`}
            >
              ×
            </button>
          </span>
        ))}
      </div>
      <form onSubmit={handleAdd} className="flex gap-2">
        <input
          type="text"
          placeholder="add keyword…"
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
          className="flex-1 rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-sm placeholder:text-slate-600"
        />
        <button
          type="submit"
          disabled={isPending}
          className="rounded-lg bg-slate-800 px-3 py-2 text-sm"
        >
          Add
        </button>
      </form>
    </div>
  );
}
