"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";

import type { ConfidenceBucket, DocTypeCount } from "@/lib/analytics";

const PIE_COLORS = ["#6366f1", "#10b981", "#f59e0b", "#64748b", "#8b5cf6", "#ec4899"];

export function ConfidenceHistogram({ data }: { data: ConfidenceBucket[] }) {
  const hasData = data.some((b) => b.count > 0);

  if (!hasData) {
    return (
      <div className="grid h-52 place-items-center text-sm text-[color:var(--muted)]">
        No confidence data available
      </div>
    );
  }

  return (
    <div className="h-52 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid
            strokeDasharray="3 3"
            stroke="var(--border)"
            vertical={false}
          />
          <XAxis
            dataKey="range"
            tick={{ fontSize: 10, fill: "var(--muted)" }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            tick={{ fontSize: 11, fill: "var(--muted)" }}
            axisLine={false}
            tickLine={false}
            width={30}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: "var(--surface)",
              border: "1px solid var(--border)",
              borderRadius: "1rem",
              fontSize: 12,
              color: "var(--foreground)",
            }}
          />
          <Bar dataKey="count" fill="#6366f1" radius={[4, 4, 0, 0]} name="Documents" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function ClassificationPie({ data }: { data: DocTypeCount[] }) {
  if (data.length === 0) {
    return (
      <div className="grid h-52 place-items-center text-sm text-[color:var(--muted)]">
        No classification data available
      </div>
    );
  }

  return (
    <div className="h-52 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            dataKey="count"
            nameKey="docType"
            cx="50%"
            cy="50%"
            innerRadius={40}
            outerRadius={70}
            paddingAngle={2}
            label={({ name, value }: { name?: string; value?: number }) =>
              `${(name ?? "").toUpperCase()} (${value ?? 0})`
            }
          >
            {data.map((_, i) => (
              <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
            ))}
          </Pie>
          <Tooltip
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
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
