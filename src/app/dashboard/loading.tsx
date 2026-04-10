function Skeleton({ className }: { className?: string }) {
  return <div className={`animate-pulse rounded-2xl bg-black/[0.06] ${className ?? ""}`} />;
}

export default function DashboardLoading() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="space-y-2">
        <Skeleton className="h-5 w-48" />
        <Skeleton className="h-8 w-64" />
      </div>

      {/* Stat Cards */}
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="rounded-[1.75rem] border border-[color:var(--border)] bg-[color:var(--surface)] p-6 shadow-card">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="mt-3 h-10 w-16" />
          </div>
        ))}
      </div>

      {/* Charts */}
      <div className="grid gap-6 xl:grid-cols-2">
        <div className="rounded-[1.75rem] bg-[#17202a] p-6 shadow-card">
          <Skeleton className="h-4 w-40 !bg-white/10" />
          <Skeleton className="mt-2 h-6 w-48 !bg-white/10" />
          <Skeleton className="mt-6 h-44 w-full !bg-white/10" />
        </div>
        <div className="rounded-[1.75rem] border border-[color:var(--border)] bg-[color:var(--surface)] p-6 shadow-card">
          <Skeleton className="h-4 w-40" />
          <Skeleton className="mt-2 h-6 w-48" />
          <Skeleton className="mt-6 h-44 w-full" />
        </div>
      </div>

      {/* Bottom row */}
      <div className="grid gap-6 xl:grid-cols-2">
        {Array.from({ length: 2 }).map((_, i) => (
          <div key={i} className="space-y-3 rounded-[1.75rem] border border-[color:var(--border)] bg-[color:var(--surface)] p-6 shadow-card">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-6 w-40" />
            <div className="mt-4 space-y-3">
              {Array.from({ length: 4 }).map((_, j) => (
                <Skeleton key={j} className="h-16 w-full" />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
