-- Ledger: personal expense tracker schema
-- Single-tenant-per-user tables, isolated with row level security.

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- categories
-- ---------------------------------------------------------------------------
create table if not exists public.categories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  color text not null default '#6b7280',
  icon text not null default '💸',
  kind text not null default 'expense' check (kind in ('expense', 'income')),
  is_archived boolean not null default false,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  unique (user_id, name)
);

alter table public.categories enable row level security;

create policy "categories_select_own" on public.categories
  for select using (auth.uid() = user_id);
create policy "categories_insert_own" on public.categories
  for insert with check (auth.uid() = user_id);
create policy "categories_update_own" on public.categories
  for update using (auth.uid() = user_id);
create policy "categories_delete_own" on public.categories
  for delete using (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- category_rules: keyword -> category, used for auto-categorization of
-- manual entries and CSV imports (and later, Plaid merchant names).
-- ---------------------------------------------------------------------------
create table if not exists public.category_rules (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  category_id uuid not null references public.categories (id) on delete cascade,
  keyword text not null,
  priority integer not null default 0,
  created_at timestamptz not null default now(),
  unique (user_id, keyword)
);

alter table public.category_rules enable row level security;

create policy "category_rules_select_own" on public.category_rules
  for select using (auth.uid() = user_id);
create policy "category_rules_insert_own" on public.category_rules
  for insert with check (auth.uid() = user_id);
create policy "category_rules_update_own" on public.category_rules
  for update using (auth.uid() = user_id);
create policy "category_rules_delete_own" on public.category_rules
  for delete using (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- accounts: where a transaction came from. 'manual' / 'csv' now,
-- 'plaid' reserved for the future bank-sync phase.
-- ---------------------------------------------------------------------------
create table if not exists public.accounts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  type text not null default 'manual' check (type in ('manual', 'csv', 'plaid')),
  plaid_item_id text,
  created_at timestamptz not null default now()
);

alter table public.accounts enable row level security;

create policy "accounts_select_own" on public.accounts
  for select using (auth.uid() = user_id);
create policy "accounts_insert_own" on public.accounts
  for insert with check (auth.uid() = user_id);
create policy "accounts_update_own" on public.accounts
  for update using (auth.uid() = user_id);
create policy "accounts_delete_own" on public.accounts
  for delete using (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- transactions
--
-- `date` is when the money actually moved (what your bank shows).
-- `budget_month` is the month it should count against for reporting -
-- these are intentionally decoupled so paying rent a few days early
-- doesn't blow up this month's numbers and hide next month's rent.
-- Defaults to the 1st of the month of `date` but is fully editable.
-- ---------------------------------------------------------------------------
create table if not exists public.transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  account_id uuid references public.accounts (id) on delete set null,
  category_id uuid references public.categories (id) on delete set null,
  type text not null default 'expense' check (type in ('expense', 'income')),
  amount numeric(12, 2) not null check (amount >= 0),
  description text not null,
  merchant text,
  date date not null,
  budget_month date not null,
  notes text,
  source text not null default 'manual' check (source in ('manual', 'csv', 'plaid')),
  external_id text,
  is_recurring boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, external_id)
);

create index if not exists transactions_user_budget_month_idx
  on public.transactions (user_id, budget_month);
create index if not exists transactions_user_date_idx
  on public.transactions (user_id, date);
create index if not exists transactions_user_category_idx
  on public.transactions (user_id, category_id);

alter table public.transactions enable row level security;

create policy "transactions_select_own" on public.transactions
  for select using (auth.uid() = user_id);
create policy "transactions_insert_own" on public.transactions
  for insert with check (auth.uid() = user_id);
create policy "transactions_update_own" on public.transactions
  for update using (auth.uid() = user_id);
create policy "transactions_delete_own" on public.transactions
  for delete using (auth.uid() = user_id);

create or replace function public.set_transaction_defaults()
returns trigger
language plpgsql
as $$
begin
  if new.budget_month is null then
    new.budget_month := date_trunc('month', new.date)::date;
  end if;
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists transactions_set_defaults on public.transactions;
create trigger transactions_set_defaults
  before insert or update on public.transactions
  for each row execute function public.set_transaction_defaults();

-- ---------------------------------------------------------------------------
-- budgets: optional target spend per category per budget month.
-- ---------------------------------------------------------------------------
create table if not exists public.budgets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  category_id uuid not null references public.categories (id) on delete cascade,
  month date not null,
  amount numeric(12, 2) not null check (amount >= 0),
  created_at timestamptz not null default now(),
  unique (user_id, category_id, month)
);

alter table public.budgets enable row level security;

create policy "budgets_select_own" on public.budgets
  for select using (auth.uid() = user_id);
create policy "budgets_insert_own" on public.budgets
  for insert with check (auth.uid() = user_id);
create policy "budgets_update_own" on public.budgets
  for update using (auth.uid() = user_id);
create policy "budgets_delete_own" on public.budgets
  for delete using (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- Seed sensible defaults for every new user: default categories, a starter
-- set of keyword rules, and a "Cash / Manual" account to log against.
-- ---------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  cat_housing uuid;
  cat_subscriptions uuid;
  cat_groceries uuid;
  cat_dining uuid;
  cat_transport uuid;
  cat_utilities uuid;
  cat_health uuid;
  cat_shopping uuid;
  cat_entertainment uuid;
  cat_travel uuid;
  cat_income uuid;
  cat_other uuid;
begin
  insert into public.accounts (user_id, name, type)
  values (new.id, 'Manual / Cash', 'manual');

  insert into public.categories (user_id, name, color, icon, kind, sort_order)
  values (new.id, 'Housing', '#f97316', '🏠', 'expense', 1)
  returning id into cat_housing;
  insert into public.categories (user_id, name, color, icon, kind, sort_order)
  values (new.id, 'Subscriptions', '#a855f7', '📺', 'expense', 2)
  returning id into cat_subscriptions;
  insert into public.categories (user_id, name, color, icon, kind, sort_order)
  values (new.id, 'Groceries', '#22c55e', '🛒', 'expense', 3)
  returning id into cat_groceries;
  insert into public.categories (user_id, name, color, icon, kind, sort_order)
  values (new.id, 'Dining Out', '#ef4444', '🍴', 'expense', 4)
  returning id into cat_dining;
  insert into public.categories (user_id, name, color, icon, kind, sort_order)
  values (new.id, 'Transportation', '#3b82f6', '🚗', 'expense', 5)
  returning id into cat_transport;
  insert into public.categories (user_id, name, color, icon, kind, sort_order)
  values (new.id, 'Utilities', '#eab308', '💡', 'expense', 6)
  returning id into cat_utilities;
  insert into public.categories (user_id, name, color, icon, kind, sort_order)
  values (new.id, 'Health', '#14b8a6', '🏥', 'expense', 7)
  returning id into cat_health;
  insert into public.categories (user_id, name, color, icon, kind, sort_order)
  values (new.id, 'Shopping', '#ec4899', '🛍️', 'expense', 8)
  returning id into cat_shopping;
  insert into public.categories (user_id, name, color, icon, kind, sort_order)
  values (new.id, 'Entertainment', '#8b5cf6', '🎮', 'expense', 9)
  returning id into cat_entertainment;
  insert into public.categories (user_id, name, color, icon, kind, sort_order)
  values (new.id, 'Travel', '#0ea5e9', '✈️', 'expense', 10)
  returning id into cat_travel;
  insert into public.categories (user_id, name, color, icon, kind, sort_order)
  values (new.id, 'Income', '#16a34a', '💰', 'income', 11)
  returning id into cat_income;
  insert into public.categories (user_id, name, color, icon, kind, sort_order)
  values (new.id, 'Other', '#6b7280', '📦', 'expense', 99)
  returning id into cat_other;

  insert into public.category_rules (user_id, category_id, keyword) values
    (new.id, cat_housing, 'rent'),
    (new.id, cat_housing, 'mortgage'),
    (new.id, cat_housing, 'landlord'),
    (new.id, cat_subscriptions, 'netflix'),
    (new.id, cat_subscriptions, 'spotify'),
    (new.id, cat_subscriptions, 'hulu'),
    (new.id, cat_subscriptions, 'disney+'),
    (new.id, cat_subscriptions, 'apple.com/bill'),
    (new.id, cat_subscriptions, 'icloud'),
    (new.id, cat_subscriptions, 'amazon prime'),
    (new.id, cat_groceries, 'whole foods'),
    (new.id, cat_groceries, 'trader joe'),
    (new.id, cat_groceries, 'safeway'),
    (new.id, cat_groceries, 'kroger'),
    (new.id, cat_groceries, 'grocery'),
    (new.id, cat_dining, 'doordash'),
    (new.id, cat_dining, 'uber eats'),
    (new.id, cat_dining, 'starbucks'),
    (new.id, cat_dining, 'restaurant'),
    (new.id, cat_dining, 'coffee'),
    (new.id, cat_transport, 'uber'),
    (new.id, cat_transport, 'lyft'),
    (new.id, cat_transport, 'shell'),
    (new.id, cat_transport, 'chevron'),
    (new.id, cat_transport, 'gas station'),
    (new.id, cat_transport, 'parking'),
    (new.id, cat_utilities, 'electric'),
    (new.id, cat_utilities, 'water bill'),
    (new.id, cat_utilities, 'comcast'),
    (new.id, cat_utilities, 'xfinity'),
    (new.id, cat_utilities, 'internet'),
    (new.id, cat_utilities, 'verizon'),
    (new.id, cat_utilities, 't-mobile'),
    (new.id, cat_health, 'pharmacy'),
    (new.id, cat_health, 'cvs'),
    (new.id, cat_health, 'walgreens'),
    (new.id, cat_health, 'doctor'),
    (new.id, cat_shopping, 'amazon'),
    (new.id, cat_shopping, 'target'),
    (new.id, cat_shopping, 'walmart'),
    (new.id, cat_entertainment, 'movie'),
    (new.id, cat_entertainment, 'amc'),
    (new.id, cat_entertainment, 'steam'),
    (new.id, cat_income, 'payroll'),
    (new.id, cat_income, 'direct deposit'),
    (new.id, cat_income, 'salary');

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
