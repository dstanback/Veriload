import { cn } from "@/lib/utils";

const palette = {
  green: "bg-emerald-100 text-emerald-800",
  yellow: "bg-amber-100 text-amber-900",
  red: "bg-rose-100 text-rose-900",
  neutral: "bg-slate-100 text-slate-700",
  approved: "bg-emerald-700 text-white",
  disputed: "bg-rose-700 text-white",
  matched: "bg-slate-700 text-white",
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
    <span className={cn("inline-flex rounded-full px-3 py-1 text-xs font-semibold capitalize", palette[tone], className)}>
      {children}
    </span>
  );
}
