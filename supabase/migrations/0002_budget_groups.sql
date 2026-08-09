-- Adds 50/30/20 budgeting support: each category can optionally belong to
-- a "needs" / "wants" / "savings" group. Existing seeded categories get a
-- sensible default grouping; anything left null (Income, Other, and
-- whatever you've added yourself) just doesn't show up in the 50/30/20
-- breakdown until you assign it on the Categories page.

alter table public.categories
  add column if not exists budget_group text
    check (budget_group in ('needs', 'wants', 'savings'));

update public.categories
set budget_group = 'needs'
where user_id = '00000000-0000-0000-0000-000000000001'
  and name in ('Housing', 'Groceries', 'Utilities', 'Transportation', 'Health')
  and budget_group is null;

update public.categories
set budget_group = 'wants'
where user_id = '00000000-0000-0000-0000-000000000001'
  and name in ('Subscriptions', 'Dining Out', 'Shopping', 'Entertainment', 'Travel')
  and budget_group is null;

insert into public.categories (user_id, name, color, icon, kind, sort_order, budget_group)
select '00000000-0000-0000-0000-000000000001', 'Savings & Investments', '#059669', '🏦', 'expense', 12, 'savings'
where not exists (
  select 1 from public.categories
  where user_id = '00000000-0000-0000-0000-000000000001'
    and name = 'Savings & Investments'
);
