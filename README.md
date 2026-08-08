# Ledger

A personal expense tracker built to replace paid budgeting apps: manual entry,
CSV bank-statement import, auto-categorization with one-tap overrides, and a
budget month that's decoupled from the calendar date — so paying rent a few
days early doesn't make the current month look like you have cash to spare.

Installs to your iPhone home screen as a PWA (no App Store, no $99/year
developer account). Bank auto-sync via Plaid is a documented future phase,
not built yet — see [Adding Plaid later](#adding-plaid-later).

## Stack

- **Next.js 16** (App Router, TypeScript, Tailwind) — hosted on **Vercel**
- **Supabase** — Postgres database + auth (magic-link email sign-in), free tier
- **Recharts** for the spending charts, **PapaParse** for CSV parsing

## 1. Create the Supabase project

1. Go to [supabase.com](https://supabase.com), create a free project.
2. In **Project Settings → API**, copy the **Project URL** and **anon public
   key**.
3. In **Project Settings → Authentication → URL Configuration**, add your
   local and production URLs to **Redirect URLs**:
   - `http://localhost:3000/auth/callback`
   - `https://<your-vercel-domain>/auth/callback`
4. Open the **SQL Editor** and run the migration in
   [`supabase/migrations/0001_init.sql`](./supabase/migrations/0001_init.sql).
   This creates the tables (categories, transactions, category rules,
   accounts, budgets), row-level security policies so your data is only ever
   readable by you, and a trigger that seeds sensible default categories and
   keyword rules the moment you sign up.

   Alternatively, if you use the [Supabase CLI](https://supabase.com/docs/guides/cli):
   ```bash
   supabase link --project-ref <your-project-ref>
   supabase db push
   ```

## 2. Configure environment variables

Copy `.env.local.example` to `.env.local` and fill in the values from step 1:

```bash
cp .env.local.example .env.local
```

```
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
```

## 3. Run locally

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000), enter your email, and
click the magic link Supabase emails you. You'll land on the dashboard with
a "Manual / Cash" account and a starter set of categories already in place.

## 4. Deploy to Vercel

1. Push this repo to GitHub.
2. In Vercel, **Import Project** from that repo.
3. Add the same two environment variables (`NEXT_PUBLIC_SUPABASE_URL`,
   `NEXT_PUBLIC_SUPABASE_ANON_KEY`) in **Project Settings → Environment
   Variables**.
4. Deploy. Then add the deployed URL's `/auth/callback` to Supabase's
   Redirect URLs (step 1.3) if you haven't already.

## 5. Install on iOS

1. Open the deployed URL in **Safari** on your iPhone (must be Safari, not
   Chrome, for the install prompt to work).
2. Tap the **Share** icon → **Add to Home Screen**.
3. Launch it from the home screen icon — it opens full-screen, no browser
   chrome, like a native app.

## How the budget-month fix works

Every transaction has two dates:

- **Date paid** — when the money actually moved, exactly what your bank
  shows.
- **Counts toward budget month** — which month it's reported against.

These default to the same month, but the second one is a plain editable
field on the transaction form. Pay rent on July 28th for August? Set its
budget month to August, and July's spending total won't include it — August's
will, right where you'd expect it whether or not the calendar cooperated.

## Auto-categorization

Every category has a set of keywords (editable on the **Categories** page).
When you type a description — manually or via CSV import — the first
matching keyword's category is pre-filled; longer/more specific keywords win
over shorter ones (e.g. "amazon prime" beats "amazon"). You can always
override the suggestion with one tap.

## Importing a bank CSV

**Transactions → Import CSV** walks through: upload → map your file's
date/description/amount columns → preview every row (auto-categorized, with
budget month pre-filled) → import. Rows are fingerprinted by
date + description + amount, so re-importing the same statement (e.g. an
overlapping date range) won't create duplicates.

## Adding Plaid later

Live bank sync wasn't built in this pass, to avoid blocking on Plaid's
Production-access approval before you have a working tracker. When you're
ready:

1. Sign up at [plaid.com](https://plaid.com) and request Production access
   (personal use is normally approved within a day or two).
2. Add a `plaid_access_token` column to the `accounts` table (already has
   `plaid_item_id` as a placeholder) and wire up Plaid Link + the
   `/transactions/sync` endpoint of the Transactions API.
3. Feed synced transactions through the same `bulkImportTransactions` path
   used by CSV import (`app/actions.ts`) — it already handles
   auto-categorization, budget-month defaulting, and de-duplication.

## Project structure

```
app/
  (app)/dashboard/        month + year overview, charts, budget progress
  (app)/transactions/     browse/filter, manual entry, edit, CSV import
  (app)/categories/       category + keyword-rule management
  actions.ts              server actions (all writes go through here)
lib/
  data.ts                 read queries
  summary.ts              category/month aggregation
  categorize.ts            keyword auto-categorization
  budget-month.ts          budget-month date helpers
  csv.ts                   CSV date/amount parsing + de-dupe fingerprint
supabase/migrations/       schema, RLS policies, default-category seed
```
