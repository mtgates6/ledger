import { createClient } from "@/lib/supabase/server";
import { getAccounts, getCategories, getCategoryRules } from "@/lib/data";
import { TopBar } from "@/components/top-bar";
import { CsvImportWizard } from "@/components/csv-import-wizard";

export default async function ImportPage() {
  const supabase = await createClient();
  const [categories, rules, accounts] = await Promise.all([
    getCategories(supabase),
    getCategoryRules(supabase),
    getAccounts(supabase),
  ]);

  return (
    <div>
      <TopBar title="Import CSV" />
      <CsvImportWizard categories={categories} rules={rules} accounts={accounts} />
    </div>
  );
}
