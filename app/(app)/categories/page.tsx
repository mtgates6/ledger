import { createClient } from "@/lib/supabase/server";
import { getCategories, getCategoryRules } from "@/lib/data";
import { TopBar } from "@/components/top-bar";
import { CategoryManager } from "@/components/category-manager";

export default async function CategoriesPage() {
  const supabase = await createClient();
  const [categories, rules] = await Promise.all([
    getCategories(supabase),
    getCategoryRules(supabase),
  ]);

  return (
    <div>
      <TopBar title="Categories" />
      <CategoryManager categories={categories} rules={rules} />
    </div>
  );
}
