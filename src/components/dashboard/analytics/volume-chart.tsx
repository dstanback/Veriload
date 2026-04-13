"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";

import type { StackedTimeSeriesPoint, DocTypeCount } from "@/lib/analytics";

const barColors: Record<string, string> = {
  bol: "#6366f1",      // indigo
  invoice: "#10b981",  // emerald
  rate_con: "#f59e0b", // amber
  pod: "#64748b",      // slate
  other: "#8b5cf6",    // violet
};

const barLabels: Record<string, string> = {
  bol: "BOL",
  invoice: "Invoice",
  rate_con: "Rate Con",
  pod: "POD",
  other: "Other",
};

function formatShortDate(label: unknown) {
  const d = new Date(String(label ?? "") + "T00:00:00");
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export function VolumeChart({ data }: { data: StackedTimeSeriesPoint[] }) {
  return (
    <div className="h-72 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
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
          {Object.keys(barColors).map((key) => (
            <Bar
              key={key}
              dataKey={key}
              stackId="docs"
              fill={barColors[key]}
              name={barLabels[key]}
              radius={key === "other" ? [3, 3, 0, 0] : undefined}
            />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function DocTypePills({ counts }: { counts: DocTypeCount[] }) {
  const pillColors: Record<string, string> = {
    bol: "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300",
    invoice: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300",
    rate_con: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300",
    pod: "bg-slate-100 text-slate-700 dark:bg-slate-700/40 dark:text-slate-300",
  };
  const defaultPill = "bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300";

  return (
    <div className="flex flex-wrap gap-2">
      {counts.map(({ docType, count }) => (
        <span
          key={docType}
          className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium ${pillColors[docType] ?? defaultPill}`}
        >
          {docType.toUpperCase()} <span className="font-bold">{count}</span>
        </span>
      ))}
    </div>
  );
}
