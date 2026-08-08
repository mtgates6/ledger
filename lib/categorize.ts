import type { CategoryRule } from "@/lib/types";

/**
 * Best-guess category for a transaction description, using the user's
 * keyword rules. Longer keywords win when multiple match (so "amazon prime"
 * beats "amazon"), then rule priority, so more specific rules are easy to
 * add without reordering everything else.
 */
export function suggestCategoryId(
  description: string,
  rules: CategoryRule[]
): string | null {
  const haystack = description.toLowerCase();

  const matches = rules.filter((rule) =>
    haystack.includes(rule.keyword.toLowerCase())
  );

  if (matches.length === 0) return null;

  matches.sort((a, b) => {
    if (b.priority !== a.priority) return b.priority - a.priority;
    return b.keyword.length - a.keyword.length;
  });

  return matches[0].category_id;
}
