import type { LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";

interface StatCardProps {
  icon: LucideIcon;
  label: string;
  value: number | string;
  trend?: { value: number; label: string } | null;
  accentColor?: string;
  className?: string;
}

export function StatCard({ icon: Icon, label, value, trend, accentColor, className }: StatCardProps) {
  return (
    <div
      className={cn(
        "group relative overflow-hidden rounded-[1.75rem] border border-[color:var(--border)] bg-[color:var(--surface)] p-6 shadow-card transition-shadow hover:shadow-lg",
        className
      )}
    >
      <div
        className="absolute -right-4 -top-4 h-24 w-24 rounded-full opacity-[0.07]"
        style={{ backgroundColor: accentColor ?? "var(--accent)" }}
      />
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-[color:var(--muted)]">{label}</p>
          <p className="mt-2 text-4xl font-bold tracking-tight" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
            {value}
          </p>
          {trend && (
            <p
              className={cn(
                "mt-2 text-xs font-medium",
                trend.value >= 0 ? "text-emerald-600" : "text-rose-600"
              )}
            >
              {trend.value >= 0 ? "+" : ""}
              {trend.value}% {trend.label}
            </p>
          )}
        </div>
        <div
          className="flex h-11 w-11 items-center justify-center rounded-2xl"
          style={{ backgroundColor: accentColor ? `${accentColor}15` : "rgba(172,79,35,0.08)" }}
        >
          <Icon
            size={20}
            style={{ color: accentColor ?? "var(--accent)" }}
          />
        </div>
      </div>
    </div>
  );
}
