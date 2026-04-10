"use client";

import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";

interface DiscrepancyChartProps {
  green: number;
  yellow: number;
  red: number;
}

const COLORS = {
  green: "#2d7a5b",
  yellow: "#d28b22",
  red: "#a33f2f"
};

export function DiscrepancyChart({ green, yellow, red }: DiscrepancyChartProps) {
  const data = [
    { name: "Green", value: green, color: COLORS.green },
    { name: "Yellow", value: yellow, color: COLORS.yellow },
    { name: "Red", value: red, color: COLORS.red }
  ].filter((d) => d.value > 0);

  const total = green + yellow + red;

  if (total === 0) {
    return (
      <div className="flex h-48 items-center justify-center text-sm text-white/50">
        No discrepancy data yet
      </div>
    );
  }

  return (
    <div className="flex items-center gap-6">
      <div className="relative h-44 w-44">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={42}
              outerRadius={68}
              paddingAngle={3}
              dataKey="value"
              strokeWidth={0}
            >
              {data.map((entry) => (
                <Cell key={entry.name} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip
              contentStyle={{
                backgroundColor: "#1e293b",
                border: "none",
                borderRadius: "12px",
                color: "#fff",
                fontSize: "13px",
                padding: "8px 14px"
              }}
              formatter={(value, name) => [`${value} shipments`, String(name)]}
            />
          </PieChart>
        </ResponsiveContainer>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-xs text-white/50">Total</span>
          <span className="text-2xl font-bold">{total}</span>
        </div>
      </div>
      <div className="space-y-3 text-sm">
        {[
          { label: "Green", value: green, color: COLORS.green },
          { label: "Yellow", value: yellow, color: COLORS.yellow },
          { label: "Red", value: red, color: COLORS.red }
        ].map((item) => (
          <div key={item.label} className="flex items-center gap-3">
            <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: item.color }} />
            <span className="text-white/70">{item.label}</span>
            <span className="font-semibold">{item.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
