import type { SupabaseClient } from "@supabase/supabase-js";
import { budgetMonthRange } from "@/lib/budget-month";
import type { Account, Budget, Category, CategoryRule, Transaction } from "@/lib/types";

export async function getCategories(
  supabase: SupabaseClient
): Promise<Category[]> {
  const { data, error } = await supabase
    .from("categories")
    .select("*")
    .eq("is_archived", false)
    .order("sort_order", { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export async function getCategoryRules(
  supabase: SupabaseClient
): Promise<CategoryRule[]> {
  const { data, error } = await supabase
    .from("category_rules")
    .select("*")
    .order("priority", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function getAccounts(
  supabase: SupabaseClient
): Promise<Account[]> {
  const { data, error } = await supabase
    .from("accounts")
    .select("*")
    .order("created_at", { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export async function getTransactionsForBudgetMonth(
  supabase: SupabaseClient,
  budgetMonth: string
): Promise<Transaction[]> {
  const { data, error } = await supabase
    .from("transactions")
    .select("*")
    .eq("budget_month", budgetMonth)
    .order("date", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function getTransactionsForYear(
  supabase: SupabaseClient,
  year: number
): Promise<Transaction[]> {
  const { data, error } = await supabase
    .from("transactions")
    .select("*")
    .gte("budget_month", `${year}-01-01`)
    .lte("budget_month", `${year}-12-31`)
    .order("budget_month", { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export async function getAllBudgetMonths(
  supabase: SupabaseClient
): Promise<string[]> {
  const { data, error } = await supabase
    .from("transactions")
    .select("budget_month")
    .order("budget_month", { ascending: false });
  if (error) throw error;
  return Array.from(new Set((data ?? []).map((row) => row.budget_month)));
}

export async function getBudgetsForMonth(
  supabase: SupabaseClient,
  month: string
): Promise<Budget[]> {
  const { data, error } = await supabase
    .from("budgets")
    .select("*")
    .eq("month", month);
  if (error) throw error;
  return data ?? [];
}

export async function getTransactionById(
  supabase: SupabaseClient,
  id: string
): Promise<Transaction | null> {
  const { data, error } = await supabase
    .from("transactions")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function searchTransactions(
  supabase: SupabaseClient,
  opts: {
    budgetMonth?: string;
    categoryId?: string;
    query?: string;
    startDate?: string;
    endDate?: string;
  }
): Promise<Transaction[]> {
  let q = supabase.from("transactions").select("*");

  if (opts.budgetMonth) {
    q = q.eq("budget_month", opts.budgetMonth);
  }
  if (opts.categoryId) {
    q = q.eq("category_id", opts.categoryId);
  }
  if (opts.query) {
    q = q.ilike("description", `%${opts.query}%`);
  }
  if (opts.startDate) {
    q = q.gte("date", opts.startDate);
  }
  if (opts.endDate) {
    q = q.lte("date", opts.endDate);
  }

  const { data, error } = await q.order("date", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export function monthDateRange(budgetMonth: string) {
  return budgetMonthRange(budgetMonth);
}
