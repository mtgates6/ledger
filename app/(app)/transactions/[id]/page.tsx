import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  getAccounts,
  getCategories,
  getCategoryRules,
  getTransactionById,
} from "@/lib/data";
import { TopBar } from "@/components/top-bar";
import { TransactionForm } from "@/components/transaction-form";

export default async function EditTransactionPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const [transaction, categories, accounts, rules] = await Promise.all([
    getTransactionById(supabase, id),
    getCategories(supabase),
    getAccounts(supabase),
    getCategoryRules(supabase),
  ]);

  if (!transaction) notFound();

  return (
    <div>
      <TopBar title="Edit transaction" />
      <TransactionForm
        categories={categories}
        accounts={accounts}
        rules={rules}
        transaction={transaction}
      />
    </div>
  );
}
