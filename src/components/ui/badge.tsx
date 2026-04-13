import { cn } from "@/lib/utils";

const palette = {
  green: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300",
  yellow: "bg-amber-100 text-amber-900 dark:bg-amber-900/40 dark:text-amber-300",
  red: "bg-rose-100 text-rose-900 dark:bg-rose-900/40 dark:text-rose-300",
  neutral: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
  approved: "bg-emerald-700 text-white",
  disputed: "bg-rose-700 text-white",
  matched: "bg-slate-700 text-white dark:bg-slate-600",
  pending: "bg-amber-700 text-white"
} as const;

export function Badge({
  children,
  tone = "neutral",
  className
}: {
  children: React.ReactNode;
  tone?: keyof typeof palette;
  className?: string;
}) {
  return (
    <span
      role="status"
      className={cn("inline-flex rounded-full px-3 py-1 text-xs font-semibold capitalize", palette[tone], className)}
    >
      {children}
    </span>
  );
}
