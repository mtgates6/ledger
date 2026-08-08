import { createClient } from "@/lib/supabase/server";
import { getAccounts, getCategories, getCategoryRules } from "@/lib/data";
import { TopBar } from "@/components/top-bar";
import { TransactionForm } from "@/components/transaction-form";

export default async function NewTransactionPage() {
  const supabase = await createClient();
  const [categories, accounts, rules] = await Promise.all([
    getCategories(supabase),
    getAccounts(supabase),
    getCategoryRules(supabase),
  ]);

  return (
    <div>
      <TopBar title="Add transaction" />
      <TransactionForm categories={categories} accounts={accounts} rules={rules} />
    </div>
  );
}
