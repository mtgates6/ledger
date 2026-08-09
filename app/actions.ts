"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { toBudgetMonth } from "@/lib/budget-month";
import { OWNER_ID } from "@/lib/constants";
import type { BudgetGroup, TransactionType } from "@/lib/types";

function revalidateTransactionViews() {
  revalidatePath("/dashboard");
  revalidatePath("/transactions");
}

export interface TransactionInput {
  amount: number;
  type: TransactionType;
  description: string;
  date: string;
  budgetMonth?: string;
  categoryId: string | null;
  accountId: string | null;
  notes?: string;
}

export async function createTransaction(input: TransactionInput) {
  const supabase = await createClient();

  const { error } = await supabase.from("transactions").insert({
    user_id: OWNER_ID,
    amount: input.amount,
    type: input.type,
    description: input.description,
    date: input.date,
    budget_month: input.budgetMonth ?? toBudgetMonth(input.date),
    category_id: input.categoryId,
    account_id: input.accountId,
    notes: input.notes || null,
    source: "manual",
  });

  if (error) throw error;
  revalidateTransactionViews();
}

export async function updateTransaction(
  id: string,
  input: Partial<TransactionInput>
) {
  const supabase = await createClient();

  const patch: Record<string, unknown> = {};
  if (input.amount !== undefined) patch.amount = input.amount;
  if (input.type !== undefined) patch.type = input.type;
  if (input.description !== undefined) patch.description = input.description;
  if (input.date !== undefined) patch.date = input.date;
  if (input.budgetMonth !== undefined) patch.budget_month = input.budgetMonth;
  if (input.categoryId !== undefined) patch.category_id = input.categoryId;
  if (input.accountId !== undefined) patch.account_id = input.accountId;
  if (input.notes !== undefined) patch.notes = input.notes || null;

  const { error } = await supabase
    .from("transactions")
    .update(patch)
    .eq("id", id);

  if (error) throw error;
  revalidateTransactionViews();
}

export async function deleteTransaction(id: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("transactions").delete().eq("id", id);
  if (error) throw error;
  revalidateTransactionViews();
}

export interface ImportRow {
  amount: number;
  type: TransactionType;
  description: string;
  date: string;
  budgetMonth: string;
  categoryId: string | null;
  externalId: string;
}

export async function bulkImportTransactions(
  accountId: string | null,
  rows: ImportRow[]
) {
  const supabase = await createClient();

  const payload = rows.map((row) => ({
    user_id: OWNER_ID,
    account_id: accountId,
    amount: row.amount,
    type: row.type,
    description: row.description,
    date: row.date,
    budget_month: row.budgetMonth,
    category_id: row.categoryId,
    source: "csv" as const,
    external_id: row.externalId,
  }));

  const { error, count } = await supabase
    .from("transactions")
    .upsert(payload, { onConflict: "user_id,external_id", ignoreDuplicates: true, count: "exact" });

  if (error) throw error;
  revalidateTransactionViews();
  return count ?? 0;
}

export interface CategoryInput {
  name: string;
  color: string;
  icon: string;
  kind: "expense" | "income";
  budgetGroup?: BudgetGroup | null;
}

export async function createCategory(input: CategoryInput) {
  const supabase = await createClient();

  const { error } = await supabase.from("categories").insert({
    user_id: OWNER_ID,
    name: input.name,
    color: input.color,
    icon: input.icon,
    kind: input.kind,
    budget_group: input.budgetGroup ?? null,
  });

  if (error) throw error;
  revalidatePath("/categories");
}

export async function updateCategory(
  id: string,
  input: Partial<CategoryInput>
) {
  const supabase = await createClient();

  const patch: Record<string, unknown> = {};
  if (input.name !== undefined) patch.name = input.name;
  if (input.color !== undefined) patch.color = input.color;
  if (input.icon !== undefined) patch.icon = input.icon;
  if (input.kind !== undefined) patch.kind = input.kind;
  if (input.budgetGroup !== undefined) patch.budget_group = input.budgetGroup;

  const { error } = await supabase
    .from("categories")
    .update(patch)
    .eq("id", id);
  if (error) throw error;
  revalidatePath("/categories");
  revalidateTransactionViews();
}

export async function archiveCategory(id: string) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("categories")
    .update({ is_archived: true })
    .eq("id", id);
  if (error) throw error;
  revalidatePath("/categories");
}

export async function createCategoryRule(categoryId: string, keyword: string) {
  const supabase = await createClient();

  const { error } = await supabase.from("category_rules").insert({
    user_id: OWNER_ID,
    category_id: categoryId,
    keyword: keyword.toLowerCase(),
  });

  if (error) throw error;
  revalidatePath("/categories");
}

export async function deleteCategoryRule(id: string) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("category_rules")
    .delete()
    .eq("id", id);
  if (error) throw error;
  revalidatePath("/categories");
}

export async function setBudget(
  categoryId: string,
  month: string,
  amount: number
) {
  const supabase = await createClient();

  const { error } = await supabase
    .from("budgets")
    .upsert(
      { user_id: OWNER_ID, category_id: categoryId, month, amount },
      { onConflict: "user_id,category_id,month" }
    );

  if (error) throw error;
  revalidatePath("/dashboard");
}

export async function createAccount(name: string, type: "manual" | "csv" = "csv") {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("accounts")
    .insert({ user_id: OWNER_ID, name, type })
    .select()
    .single();

  if (error) throw error;
  revalidatePath("/transactions/import");
  return data;
}
