import type { Category } from "@/lib/types";

export function CategoryBadge({ category }: { category: Category | null }) {
  if (!category) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-slate-800 px-2.5 py-1 text-xs text-slate-400">
        📦 Uncategorized
      </span>
    );
  }

  return (
    <span
      className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs"
      style={{ backgroundColor: `${category.color}26`, color: category.color }}
    >
      {category.icon} {category.name}
    </span>
  );
}
