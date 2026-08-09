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
- **Supabase** — just the Postgres database (no Supabase Auth), free tier
- **Recharts** for the spending charts, **PapaParse** for CSV parsing

## How access works

This is a single-user app, so there's no login system, no email, no
account — just one passcode you set yourself that gates the whole thing.
Enter it once on a device (phone, laptop, whatever) and it stays unlocked
there for a year via a signed cookie; a **Lock** button in the top bar clears
it on demand.

Behind that gate, the app talks to Supabase Postgres using the **service
role key** — never the anon/public key, and never from the browser — so
there's no per-user auth or row-level-security matching to manage. Every row
in the database just belongs to one fixed id (`OWNER_ID` in
`lib/constants.ts`). Row-level security is still turned on for every table
as a backstop: if the service role key ever leaked, that's a real problem
regardless, but it means the public/anon key genuinely can't read or write
anything even if it were somehow exposed.

## 1. Create the Supabase project

1. Go to [supabase.com](https://supabase.com), create a free project.
2. In **Project Settings → API**, copy the **Project URL** and the
   **service_role key** (not the anon/publishable key — keep this one
   secret, it has full database access).
3. Open the **SQL Editor** and run each file in
   [`supabase/migrations/`](./supabase/migrations/), in filename order
   (`0001_init.sql`, then `0002_budget_groups.sql`, etc.). `0001` creates the
   tables (categories, transactions, category rules, accounts, budgets) and
   seeds a starter set of default categories and keyword rules, all owned by
   the app's one fixed user id. Later files are additive — safe to re-run,
   and safe to run against a database that already has data in it.

   Alternatively, if you use the [Supabase CLI](https://supabase.com/docs/guides/cli):
   ```bash
   supabase link --project-ref <your-project-ref>
   supabase db push
   ```

## 2. Configure environment variables

Copy `.env.local.example` to `.env.local` and fill in the values:

```bash
cp .env.local.example .env.local
```

```
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJ...          # from step 1
APP_PASSCODE=pick-something-only-you-know
APP_SESSION_SECRET=                        # generate with: openssl rand -hex 32
```

## 3. Run locally

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000), enter the passcode you
set, and you're in — no email, no sign-up. You'll land on the dashboard with
a "Manual / Cash" account and a starter set of categories already in place.

## 4. Deploy to Vercel

1. Push this repo to GitHub.
2. In Vercel, **Import Project** from that repo.
3. Add the four environment variables from step 2
   (`SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `APP_PASSCODE`,
   `APP_SESSION_SECRET`) in **Project Settings → Environment Variables**.
   None of them are prefixed `NEXT_PUBLIC_`, so none of them ship to the
   browser.
4. Deploy.

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

## 50/30/20 budgeting

Every expense category can optionally belong to a group — **Needs**,
**Wants**, or **Savings** — set on the **Categories** page (tap a category to
expand it). The dashboard then shows actual spending in each group as a
percentage, next to the classic 50/30/20 targets, with a tick mark on each
bar showing where the target sits.

That percentage is measured against your logged **income** for the month
when there is any; if you haven't logged income, it falls back to measuring
against your total tracked needs+wants+savings spending instead, so the
breakdown still means something even if you only track outflow. Categories
without a group (by default: Income, Other) are left out of the breakdown
until you assign them.

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
  unlock/                 passcode gate (page, form, unlock/lock actions)
  (app)/dashboard/        month + year overview, charts, budget progress
  (app)/transactions/     browse/filter, manual entry, edit, CSV import
  (app)/categories/       category + keyword-rule management
  actions.ts              server actions (all writes go through here)
lib/
  session.ts               passcode check + signed session cookie
  constants.ts              the app's one fixed owner id
  data.ts                 read queries
  summary.ts              category/month/group aggregation
  budget-groups.ts          50/30/20 group labels, colors, targets
  categorize.ts            keyword auto-categorization
  budget-month.ts          budget-month date helpers
  csv.ts                   CSV date/amount parsing + de-dupe fingerprint
supabase/migrations/       schema, RLS (enabled, no policies), default-category seed
proxy.ts                  checks the session cookie on every request
```
