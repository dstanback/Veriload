import { cn } from "@/lib/utils";

export function Card({
  className,
  children
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={cn("rounded-[1.75rem] border border-[color:var(--border)] bg-[color:var(--surface)] p-6 shadow-card", className)}>
      {children}
    </div>
  );
}
