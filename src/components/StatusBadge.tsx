import { cn } from "@/lib/utils";

const severityStyles = {
  green: "bg-emerald-50 text-emerald-700 ring-emerald-600/20",
  yellow: "bg-amber-50 text-amber-700 ring-amber-600/20",
  red: "bg-rose-50 text-rose-700 ring-rose-600/20"
} as const;

const statusStyles = {
  pending: "bg-amber-50 text-amber-700 ring-amber-600/20",
  matched: "bg-sky-50 text-sky-700 ring-sky-600/20",
  approved: "bg-emerald-50 text-emerald-700 ring-emerald-600/20",
  disputed: "bg-rose-50 text-rose-700 ring-rose-600/20",
  paid: "bg-violet-50 text-violet-700 ring-violet-600/20"
} as const;

const resolutionStyles = {
  auto_approved: "bg-emerald-50 text-emerald-700 ring-emerald-600/20",
  manually_approved: "bg-emerald-50 text-emerald-700 ring-emerald-600/20",
  disputed: "bg-rose-50 text-rose-700 ring-rose-600/20",
  unresolved: "bg-slate-50 text-slate-600 ring-slate-500/20"
} as const;

type SeverityValue = keyof typeof severityStyles;
type StatusValue = keyof typeof statusStyles;
type ResolutionValue = keyof typeof resolutionStyles;

interface StatusBadgeProps {
  variant?: "severity" | "status" | "resolution";
  value: string | null;
  className?: string;
}

export function StatusBadge({ variant = "status", value, className }: StatusBadgeProps) {
  const label = value ?? "none";

  let style: string;
  if (variant === "severity") {
    style = severityStyles[label as SeverityValue] ?? "bg-slate-50 text-slate-600 ring-slate-500/20";
  } else if (variant === "resolution") {
    style = resolutionStyles[label as ResolutionValue] ?? resolutionStyles.unresolved;
  } else {
    style = statusStyles[label as StatusValue] ?? "bg-slate-50 text-slate-600 ring-slate-500/20";
  }

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize ring-1 ring-inset",
        style,
        className
      )}
    >
      {label.replace(/_/g, " ")}
    </span>
  );
}
