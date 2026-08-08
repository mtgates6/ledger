-- Ledger: personal expense tracker schema
--
-- Single-user app: every row belongs to the fixed owner id below instead of
-- a Supabase Auth user. The whole app sits behind one passcode gate at the
-- edge (see proxy.ts / lib/session.ts); the app server talks to Postgres
-- with the service role key, which bypasses RLS. RLS is still enabled with
-- no policies as defense in depth, so the anon/publishable key -- if it were
-- ever exposed -- gets nothing.

create extension if not exists "pgcrypto";

-- The owner id below is repeated as a literal throughout this file instead
-- of a variable, since column defaults can't reference a function result at
-- create-table time. Keep it in sync with lib/constants.ts (OWNER_ID). It's
-- not a secret, just a stable id.

-- ---------------------------------------------------------------------------
-- categories
-- ---------------------------------------------------------------------------
create table if not exists public.categories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default '00000000-0000-0000-0000-000000000001',
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

-- ---------------------------------------------------------------------------
-- category_rules: keyword -> category, used for auto-categorization of
-- manual entries and CSV imports (and later, Plaid merchant names).
-- ---------------------------------------------------------------------------
create table if not exists public.category_rules (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default '00000000-0000-0000-0000-000000000001',
  category_id uuid not null references public.categories (id) on delete cascade,
  keyword text not null,
  priority integer not null default 0,
  created_at timestamptz not null default now(),
  unique (user_id, keyword)
);

alter table public.category_rules enable row level security;

-- ---------------------------------------------------------------------------
-- accounts: where a transaction came from. 'manual' / 'csv' now,
-- 'plaid' reserved for the future bank-sync phase.
-- ---------------------------------------------------------------------------
create table if not exists public.accounts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default '00000000-0000-0000-0000-000000000001',
  name text not null,
  type text not null default 'manual' check (type in ('manual', 'csv', 'plaid')),
  plaid_item_id text,
  created_at timestamptz not null default now()
);

alter table public.accounts enable row level security;

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
  user_id uuid not null default '00000000-0000-0000-0000-000000000001',
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
  user_id uuid not null default '00000000-0000-0000-0000-000000000001',
  category_id uuid not null references public.categories (id) on delete cascade,
  month date not null,
  amount numeric(12, 2) not null check (amount >= 0),
  created_at timestamptz not null default now(),
  unique (user_id, category_id, month)
);

alter table public.budgets enable row level security;

-- ---------------------------------------------------------------------------
-- Seed defaults once: starter categories, keyword rules, and a
-- "Manual / Cash" account, all owned by the fixed owner id above.
-- Safe to re-run -- every insert is guarded by the table's unique
-- constraints via ON CONFLICT DO NOTHING.
-- ---------------------------------------------------------------------------
do $$
declare
  owner uuid := '00000000-0000-0000-0000-000000000001';
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
  select owner, 'Manual / Cash', 'manual'
  where not exists (select 1 from public.accounts where user_id = owner);

  insert into public.categories (user_id, name, color, icon, kind, sort_order)
  values (owner, 'Housing', '#f97316', '🏠', 'expense', 1)
  on conflict (user_id, name) do update set name = excluded.name
  returning id into cat_housing;
  insert into public.categories (user_id, name, color, icon, kind, sort_order)
  values (owner, 'Subscriptions', '#a855f7', '📺', 'expense', 2)
  on conflict (user_id, name) do update set name = excluded.name
  returning id into cat_subscriptions;
  insert into public.categories (user_id, name, color, icon, kind, sort_order)
  values (owner, 'Groceries', '#22c55e', '🛒', 'expense', 3)
  on conflict (user_id, name) do update set name = excluded.name
  returning id into cat_groceries;
  insert into public.categories (user_id, name, color, icon, kind, sort_order)
  values (owner, 'Dining Out', '#ef4444', '🍴', 'expense', 4)
  on conflict (user_id, name) do update set name = excluded.name
  returning id into cat_dining;
  insert into public.categories (user_id, name, color, icon, kind, sort_order)
  values (owner, 'Transportation', '#3b82f6', '🚗', 'expense', 5)
  on conflict (user_id, name) do update set name = excluded.name
  returning id into cat_transport;
  insert into public.categories (user_id, name, color, icon, kind, sort_order)
  values (owner, 'Utilities', '#eab308', '💡', 'expense', 6)
  on conflict (user_id, name) do update set name = excluded.name
  returning id into cat_utilities;
  insert into public.categories (user_id, name, color, icon, kind, sort_order)
  values (owner, 'Health', '#14b8a6', '🏥', 'expense', 7)
  on conflict (user_id, name) do update set name = excluded.name
  returning id into cat_health;
  insert into public.categories (user_id, name, color, icon, kind, sort_order)
  values (owner, 'Shopping', '#ec4899', '🛍️', 'expense', 8)
  on conflict (user_id, name) do update set name = excluded.name
  returning id into cat_shopping;
  insert into public.categories (user_id, name, color, icon, kind, sort_order)
  values (owner, 'Entertainment', '#8b5cf6', '🎮', 'expense', 9)
  on conflict (user_id, name) do update set name = excluded.name
  returning id into cat_entertainment;
  insert into public.categories (user_id, name, color, icon, kind, sort_order)
  values (owner, 'Travel', '#0ea5e9', '✈️', 'expense', 10)
  on conflict (user_id, name) do update set name = excluded.name
  returning id into cat_travel;
  insert into public.categories (user_id, name, color, icon, kind, sort_order)
  values (owner, 'Income', '#16a34a', '💰', 'income', 11)
  on conflict (user_id, name) do update set name = excluded.name
  returning id into cat_income;
  insert into public.categories (user_id, name, color, icon, kind, sort_order)
  values (owner, 'Other', '#6b7280', '📦', 'expense', 99)
  on conflict (user_id, name) do update set name = excluded.name
  returning id into cat_other;

  insert into public.category_rules (user_id, category_id, keyword) values
    (owner, cat_housing, 'rent'),
    (owner, cat_housing, 'mortgage'),
    (owner, cat_housing, 'landlord'),
    (owner, cat_subscriptions, 'netflix'),
    (owner, cat_subscriptions, 'spotify'),
    (owner, cat_subscriptions, 'hulu'),
    (owner, cat_subscriptions, 'disney+'),
    (owner, cat_subscriptions, 'apple.com/bill'),
    (owner, cat_subscriptions, 'icloud'),
    (owner, cat_subscriptions, 'amazon prime'),
    (owner, cat_groceries, 'whole foods'),
    (owner, cat_groceries, 'trader joe'),
    (owner, cat_groceries, 'safeway'),
    (owner, cat_groceries, 'kroger'),
    (owner, cat_groceries, 'grocery'),
    (owner, cat_dining, 'doordash'),
    (owner, cat_dining, 'uber eats'),
    (owner, cat_dining, 'starbucks'),
    (owner, cat_dining, 'restaurant'),
    (owner, cat_dining, 'coffee'),
    (owner, cat_transport, 'uber'),
    (owner, cat_transport, 'lyft'),
    (owner, cat_transport, 'shell'),
    (owner, cat_transport, 'chevron'),
    (owner, cat_transport, 'gas station'),
    (owner, cat_transport, 'parking'),
    (owner, cat_utilities, 'electric'),
    (owner, cat_utilities, 'water bill'),
    (owner, cat_utilities, 'comcast'),
    (owner, cat_utilities, 'xfinity'),
    (owner, cat_utilities, 'internet'),
    (owner, cat_utilities, 'verizon'),
    (owner, cat_utilities, 't-mobile'),
    (owner, cat_health, 'pharmacy'),
    (owner, cat_health, 'cvs'),
    (owner, cat_health, 'walgreens'),
    (owner, cat_health, 'doctor'),
    (owner, cat_shopping, 'amazon'),
    (owner, cat_shopping, 'target'),
    (owner, cat_shopping, 'walmart'),
    (owner, cat_entertainment, 'movie'),
    (owner, cat_entertainment, 'amc'),
    (owner, cat_entertainment, 'steam'),
    (owner, cat_income, 'payroll'),
    (owner, cat_income, 'direct deposit'),
    (owner, cat_income, 'salary')
  on conflict (user_id, keyword) do nothing;
end $$;
