"use client";

import { cn } from "@/lib/utils";

function Skeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "animate-pulse rounded-2xl bg-[color:var(--border)]",
        className,
      )}
    />
  );
}

function CardSkeleton({ className, children }: { className?: string; children?: React.ReactNode }) {
  return (
    <div
      className={cn(
        "rounded-[1.75rem] border border-[color:var(--border)] bg-[color:var(--surface)] p-6 shadow-card dark:shadow-none",
        className,
      )}
    >
      {children}
    </div>
  );
}

export function AnalyticsSkeleton() {
  return (
    <div className="space-y-6">
      {/* Date range selector placeholder */}
      <div className="flex gap-2">
        <Skeleton className="h-8 w-20" />
        <Skeleton className="h-8 w-20" />
        <Skeleton className="h-8 w-20" />
        <Skeleton className="h-8 w-20" />
      </div>

      {/* Hero savings card */}
      <CardSkeleton>
        <Skeleton className="h-4 w-32" />
        <Skeleton className="mt-4 h-12 w-48" />
        <div className="mt-6 grid gap-4 md:grid-cols-3">
          <Skeleton className="h-16" />
          <Skeleton className="h-16" />
          <Skeleton className="h-16" />
        </div>
        <Skeleton className="mt-6 h-72" />
      </CardSkeleton>

      {/* Two-column charts */}
      <div className="grid gap-6 xl:grid-cols-2">
        <CardSkeleton>
          <Skeleton className="h-4 w-40" />
          <Skeleton className="mt-4 h-72" />
          <div className="mt-4 flex gap-2">
            <Skeleton className="h-7 w-20 rounded-full" />
            <Skeleton className="h-7 w-20 rounded-full" />
            <Skeleton className="h-7 w-20 rounded-full" />
          </div>
        </CardSkeleton>
        <CardSkeleton>
          <Skeleton className="h-4 w-40" />
          <Skeleton className="mt-4 h-72" />
        </CardSkeleton>
      </div>

      {/* Tables */}
      <div className="grid gap-6 xl:grid-cols-2">
        <CardSkeleton>
          <Skeleton className="h-4 w-40" />
          <div className="mt-4 space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-10" />
            ))}
          </div>
        </CardSkeleton>
        <CardSkeleton>
          <Skeleton className="h-4 w-40" />
          <div className="mt-4 space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-10" />
            ))}
          </div>
        </CardSkeleton>
      </div>
    </div>
  );
}
