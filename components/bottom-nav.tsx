"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { href: "/dashboard", label: "Overview", icon: "📊" },
  { href: "/transactions", label: "Activity", icon: "📋" },
  { href: "/transactions/new", label: "Add", icon: "➕" },
  { href: "/categories", label: "Categories", icon: "🏷️" },
];

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 border-t border-slate-800 bg-slate-950/95 backdrop-blur safe-bottom">
      <ul className="mx-auto flex max-w-lg items-stretch justify-between">
        {TABS.map((tab) => {
          const active =
            tab.href === "/dashboard"
              ? pathname === "/dashboard"
              : pathname.startsWith(tab.href) &&
                (tab.href !== "/transactions" ||
                  pathname === "/transactions");
          return (
            <li key={tab.href} className="flex-1">
              <Link
                href={tab.href}
                className={`flex flex-col items-center gap-1 py-2.5 text-xs ${
                  active ? "text-sky-400" : "text-slate-500"
                }`}
              >
                <span className="text-lg leading-none">{tab.icon}</span>
                {tab.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
