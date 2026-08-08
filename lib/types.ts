export type TransactionType = "expense" | "income";
export type TransactionSource = "manual" | "csv" | "plaid";
export type CategoryKind = "expense" | "income";

export interface Category {
  id: string;
  user_id: string;
  name: string;
  color: string;
  icon: string;
  kind: CategoryKind;
  is_archived: boolean;
  sort_order: number;
  created_at: string;
}

export interface CategoryRule {
  id: string;
  user_id: string;
  category_id: string;
  keyword: string;
  priority: number;
  created_at: string;
}

export interface Account {
  id: string;
  user_id: string;
  name: string;
  type: TransactionSource;
  plaid_item_id: string | null;
  created_at: string;
}

export interface Transaction {
  id: string;
  user_id: string;
  account_id: string | null;
  category_id: string | null;
  type: TransactionType;
  amount: number;
  description: string;
  merchant: string | null;
  date: string; // YYYY-MM-DD
  budget_month: string; // YYYY-MM-01
  notes: string | null;
  source: TransactionSource;
  external_id: string | null;
  is_recurring: boolean;
  created_at: string;
  updated_at: string;
}

export interface Budget {
  id: string;
  user_id: string;
  category_id: string;
  month: string; // YYYY-MM-01
  amount: number;
  created_at: string;
}

// Minimal Database type placeholder so @supabase/ssr generics have
// something to bind to without generating a full Supabase CLI schema.
// Swap for `supabase gen types typescript` output if you want full
// query-level type safety later.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type Database = any;
