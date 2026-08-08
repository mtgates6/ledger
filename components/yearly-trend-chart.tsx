"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { budgetMonthShortLabel, formatCurrency } from "@/lib/budget-month";
import type { MonthTotals } from "@/lib/summary";

export function YearlyTrendChart({ data }: { data: MonthTotals[] }) {
  const chartData = data.map((d) => ({
    month: budgetMonthShortLabel(d.budgetMonth).replace(" " + d.budgetMonth.slice(0, 4), ""),
    Expenses: d.expenses,
    Income: d.income,
  }));

  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
          <XAxis
            dataKey="month"
            stroke="#64748b"
            fontSize={12}
            tickLine={false}
            axisLine={false}
          />
          <YAxis
            stroke="#64748b"
            fontSize={12}
            tickLine={false}
            axisLine={false}
            width={40}
            tickFormatter={(v) => `$${v}`}
          />
          <Tooltip
            formatter={(value) => formatCurrency(Number(value))}
            contentStyle={{
              background: "#0f172a",
              border: "1px solid #1e293b",
              borderRadius: 8,
              fontSize: 13,
            }}
          />
          <Bar dataKey="Expenses" fill="#f97316" radius={[4, 4, 0, 0]} />
          <Bar dataKey="Income" fill="#22c55e" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
