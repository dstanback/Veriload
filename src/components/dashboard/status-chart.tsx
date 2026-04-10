"use client";

import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

interface StatusChartProps {
  statusCounts: Record<string, number>;
}

const STATUS_COLORS: Record<string, string> = {
  pending: "#d28b22",
  matched: "#6366f1",
  approved: "#2d7a5b",
  disputed: "#a33f2f",
  paid: "#8b5cf6"
};

export function StatusChart({ statusCounts }: StatusChartProps) {
  const data = Object.entries(statusCounts)
    .filter(([key]) => key !== "total")
    .map(([status, count]) => ({
      status: status.charAt(0).toUpperCase() + status.slice(1),
      count,
      fill: STATUS_COLORS[status] ?? "#64748b"
    }));

  const hasData = data.some((d) => d.count > 0);

  if (!hasData) {
    return (
      <div className="flex h-48 items-center justify-center text-sm text-[color:var(--muted)]">
        No shipment data yet
      </div>
    );
  }

  return (
    <div className="h-52">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} barCategoryGap="25%">
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.06)" vertical={false} />
          <XAxis
            dataKey="status"
            tick={{ fontSize: 12, fill: "var(--muted)" }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            tick={{ fontSize: 12, fill: "var(--muted)" }}
            axisLine={false}
            tickLine={false}
            allowDecimals={false}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: "#1e293b",
              border: "none",
              borderRadius: "12px",
              color: "#fff",
              fontSize: "13px",
              padding: "8px 14px"
            }}
            formatter={(value) => [`${value} shipments`, "Count"]}
            cursor={{ fill: "rgba(0,0,0,0.04)" }}
          />
          <Bar dataKey="count" radius={[8, 8, 0, 0]}>
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.fill} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
