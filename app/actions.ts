"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { toBudgetMonth } from "@/lib/budget-month";
import type { TransactionType } from "@/lib/types";

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
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { error } = await supabase.from("transactions").insert({
    user_id: user.id,
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
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const payload = rows.map((row) => ({
    user_id: user.id,
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
}

export async function createCategory(input: CategoryInput) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { error } = await supabase.from("categories").insert({
    user_id: user.id,
    name: input.name,
    color: input.color,
    icon: input.icon,
    kind: input.kind,
  });

  if (error) throw error;
  revalidatePath("/categories");
}

export async function updateCategory(
  id: string,
  input: Partial<CategoryInput>
) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("categories")
    .update(input)
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
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { error } = await supabase.from("category_rules").insert({
    user_id: user.id,
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
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { error } = await supabase
    .from("budgets")
    .upsert(
      { user_id: user.id, category_id: categoryId, month, amount },
      { onConflict: "user_id,category_id,month" }
    );

  if (error) throw error;
  revalidatePath("/dashboard");
}

export async function createAccount(name: string, type: "manual" | "csv" = "csv") {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { data, error } = await supabase
    .from("accounts")
    .insert({ user_id: user.id, name, type })
    .select()
    .single();

  if (error) throw error;
  revalidatePath("/transactions/import");
  return data;
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
