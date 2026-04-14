"use client";

import { useState } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { ArrowUpDown } from "lucide-react";

import type { DiscrepancyTrendPoint, TopDiscrepancyType } from "@/lib/analytics";
import { cn, formatCurrency } from "@/lib/utils";

function formatShortDate(label: unknown) {
  const d = new Date(String(label ?? "") + "T00:00:00");
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export function DiscrepancyTrendsChart({ data }: { data: DiscrepancyTrendPoint[] }) {
  return (
    <div className="h-72 w-full">
      <ResponsiveContainer width="100%" height="100%" minWidth={0}>
        <LineChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid
            strokeDasharray="3 3"
            stroke="var(--border)"
            vertical={false}
          />
          <XAxis
            dataKey="date"
            tickFormatter={formatShortDate}
            tick={{ fontSize: 11, fill: "var(--muted)" }}
            axisLine={false}
            tickLine={false}
            interval="preserveStartEnd"
          />
          <YAxis
            tick={{ fontSize: 11, fill: "var(--muted)" }}
            axisLine={false}
            tickLine={false}
            width={36}
          />
          <Tooltip
            labelFormatter={formatShortDate}
            contentStyle={{
              backgroundColor: "var(--surface)",
              border: "1px solid var(--border)",
              borderRadius: "1rem",
              fontSize: 12,
              color: "var(--foreground)",
            }}
          />
          <Legend
            wrapperStyle={{ fontSize: 11, color: "var(--muted)" }}
            iconType="circle"
            iconSize={8}
          />
          <Line
            type="monotone"
            dataKey="green"
            stroke="var(--success)"
            strokeWidth={2}
            dot={false}
            name="Green"
          />
          <Line
            type="monotone"
            dataKey="yellow"
            stroke="var(--warning)"
            strokeWidth={2}
            dot={false}
            name="Yellow"
          />
          <Line
            type="monotone"
            dataKey="red"
            stroke="var(--danger)"
            strokeWidth={2}
            dot={false}
            name="Red"
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

type SortKey = "fieldName" | "count" | "avgVariancePct" | "totalVarianceAmount";

export function TopDiscrepancyTable({ data }: { data: TopDiscrepancyType[] }) {
  const [sortKey, setSortKey] = useState<SortKey>("count");
  const [sortAsc, setSortAsc] = useState(false);

  function handleSort(key: SortKey) {
    if (sortKey === key) {
      setSortAsc(!sortAsc);
    } else {
      setSortKey(key);
      setSortAsc(false);
    }
  }

  const sorted = [...data].sort((a, b) => {
    const av = a[sortKey];
    const bv = b[sortKey];
    if (typeof av === "string" && typeof bv === "string") {
      return sortAsc ? av.localeCompare(bv) : bv.localeCompare(av);
    }
    return sortAsc ? (av as number) - (bv as number) : (bv as number) - (av as number);
  });

  const columns: { key: SortKey; label: string; align?: "right" }[] = [
    { key: "fieldName", label: "Field" },
    { key: "count", label: "Count", align: "right" },
    { key: "avgVariancePct", label: "Avg Variance %", align: "right" },
    { key: "totalVarianceAmount", label: "Total Variance", align: "right" },
  ];

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-[color:var(--border)]">
            {columns.map((col) => (
              <th
                key={col.key}
                className={cn(
                  "pb-3 pt-1 font-medium text-[color:var(--muted)]",
                  col.align === "right" ? "text-right" : "text-left",
                )}
              >
                <button
                  type="button"
                  onClick={() => handleSort(col.key)}
                  className="inline-flex items-center gap-1 hover:text-[color:var(--foreground)] transition"
                >
                  {col.label}
                  <ArrowUpDown size={12} className={sortKey === col.key ? "opacity-100" : "opacity-30"} />
                </button>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {sorted.map((row) => (
            <tr
              key={row.fieldName}
              className="border-b border-[color:var(--border)] last:border-0"
            >
              <td className="py-2.5 font-medium">{row.fieldName}</td>
              <td className="py-2.5 text-right font-[family-name:var(--font-code)] tabular-nums">
                {row.count}
              </td>
              <td className="py-2.5 text-right font-[family-name:var(--font-code)] tabular-nums">
                {(row.avgVariancePct * 100).toFixed(1)}%
              </td>
              <td className="py-2.5 text-right font-[family-name:var(--font-code)] tabular-nums">
                {formatCurrency(row.totalVarianceAmount)}
              </td>
            </tr>
          ))}
          {sorted.length === 0 && (
            <tr>
              <td colSpan={4} className="py-8 text-center text-[color:var(--muted)]">
                No discrepancy data in this period
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
