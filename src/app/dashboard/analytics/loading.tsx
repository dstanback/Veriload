import { AnalyticsSkeleton } from "@/components/dashboard/analytics/analytics-skeleton";

export default function AnalyticsLoading() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-[color:var(--muted)]">
            Analytics
          </p>
          <h1 className="mt-1 text-2xl font-semibold">Reports &amp; Insights</h1>
        </div>
      </div>
      <AnalyticsSkeleton />
    </div>
  );
}
