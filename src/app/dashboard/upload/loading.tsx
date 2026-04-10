function Skeleton({ className }: { className?: string }) {
  return <div className={`animate-pulse rounded-2xl bg-black/[0.06] ${className ?? ""}`} />;
}

export default function UploadLoading() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="space-y-2">
        <Skeleton className="h-4 w-40" />
        <Skeleton className="h-8 w-56" />
        <Skeleton className="h-4 w-96" />
      </div>

      {/* Drop zone */}
      <div className="rounded-[1.75rem] border-2 border-dashed border-[color:var(--border)] p-8">
        <div className="flex flex-col items-center">
          <Skeleton className="h-16 w-16" />
          <Skeleton className="mt-4 h-6 w-48" />
          <Skeleton className="mt-2 h-4 w-64" />
        </div>
      </div>

      {/* Recent uploads */}
      <div className="rounded-[1.75rem] border border-[color:var(--border)] bg-[color:var(--surface)] p-6 shadow-card">
        <Skeleton className="h-4 w-28" />
        <Skeleton className="mt-2 h-6 w-36" />
        <div className="mt-4 space-y-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3 rounded-2xl border border-[color:var(--border)] p-4">
              <Skeleton className="h-10 w-10" />
              <div className="flex-1 space-y-1">
                <Skeleton className="h-4 w-40" />
                <Skeleton className="h-3 w-28" />
              </div>
              <Skeleton className="h-6 w-20 !rounded-full" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
