function Skeleton({ className }: { className?: string }) {
  return <div className={`animate-pulse rounded-2xl bg-black/[0.06] ${className ?? ""}`} />;
}

export default function ShipmentDetailLoading() {
  return (
    <div className="space-y-6">
      {/* Breadcrumb + Header */}
      <div className="space-y-2">
        <Skeleton className="h-4 w-60" />
        <div className="flex items-center justify-between">
          <Skeleton className="h-8 w-48" />
          <div className="flex gap-3">
            <Skeleton className="h-9 w-24 !rounded-full" />
            <Skeleton className="h-9 w-24 !rounded-full" />
          </div>
        </div>
      </div>

      {/* Status header */}
      <div className="rounded-[1.75rem] border border-[color:var(--border)] bg-[color:var(--surface)] p-6 shadow-card">
        <div className="flex flex-col gap-5 lg:flex-row lg:justify-between">
          <div className="space-y-4">
            <div className="flex gap-2">
              <Skeleton className="h-6 w-20 !rounded-full" />
              <Skeleton className="h-6 w-16 !rounded-full" />
            </div>
            <div className="grid gap-4 sm:grid-cols-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="space-y-2">
                  <Skeleton className="h-3 w-16" />
                  <Skeleton className="h-5 w-28" />
                </div>
              ))}
            </div>
          </div>
          <div className="space-y-2 text-right">
            <Skeleton className="ml-auto h-3 w-20" />
            <Skeleton className="ml-auto h-10 w-32" />
          </div>
        </div>
      </div>

      {/* Main grid */}
      <div className="grid gap-6 xl:grid-cols-[1fr_0.55fr]">
        {/* Left column */}
        <div className="space-y-6">
          {/* Documents */}
          <div className="rounded-[1.75rem] border border-[color:var(--border)] bg-[color:var(--surface)] p-6 shadow-card">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="mt-2 h-6 w-28" />
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-28 w-full" />
              ))}
            </div>
          </div>

          {/* Discrepancies */}
          <div className="rounded-[1.75rem] border border-[color:var(--border)] bg-[color:var(--surface)] p-6 shadow-card">
            <Skeleton className="h-4 w-28" />
            <Skeleton className="mt-2 h-6 w-36" />
            <div className="mt-4 space-y-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          </div>
        </div>

        {/* Right column */}
        <div className="space-y-6">
          <div className="rounded-[2rem] bg-[#17202a] p-6 shadow-card">
            <Skeleton className="h-4 w-24 !bg-white/10" />
            <Skeleton className="mt-2 h-6 w-32 !bg-white/10" />
            <div className="mt-4 space-y-4">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="space-y-1">
                  <Skeleton className="h-3 w-16 !bg-white/10" />
                  <Skeleton className="h-5 w-32 !bg-white/10" />
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-[1.75rem] border border-[color:var(--border)] bg-[color:var(--surface)] p-6 shadow-card">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="mt-2 h-6 w-24" />
            <div className="mt-4 space-y-4">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="flex gap-3">
                  <Skeleton className="h-6 w-6 !rounded-full" />
                  <div className="flex-1 space-y-1">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-3 w-20" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
