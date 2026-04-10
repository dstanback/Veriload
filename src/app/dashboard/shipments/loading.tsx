function Skeleton({ className }: { className?: string }) {
  return <div className={`animate-pulse rounded-2xl bg-black/[0.06] ${className ?? ""}`} />;
}

export default function ShipmentsLoading() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="space-y-2">
        <Skeleton className="h-4 w-40" />
        <Skeleton className="h-8 w-56" />
        <Skeleton className="h-4 w-72" />
      </div>

      {/* Search bar */}
      <div className="flex gap-3">
        <Skeleton className="h-10 w-80" />
        <Skeleton className="h-10 w-24" />
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-[1.75rem] border border-[color:var(--border)] bg-[color:var(--surface)] shadow-card">
        <div className="border-b border-[color:var(--border)] bg-black/[0.03] px-5 py-4">
          <div className="flex gap-12">
            {Array.from({ length: 7 }).map((_, i) => (
              <Skeleton key={i} className="h-4 w-20" />
            ))}
          </div>
        </div>
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="border-t border-[color:var(--border)] px-5 py-4">
            <div className="flex gap-12">
              {Array.from({ length: 7 }).map((_, j) => (
                <Skeleton key={j} className="h-5 w-20" />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
