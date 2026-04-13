export const dynamic = "force-dynamic";

import { Suspense } from "react";
import { TrendingUp, FileText, Ship, DollarSign, Clock } from "lucide-react";

import { Card } from "@/components/ui/card";
import { getAnalyticsData } from "@/lib/analytics";
import { formatCurrency } from "@/lib/utils";
import { DateRangeSelector } from "@/components/dashboard/analytics/date-range-selector";
import { SavingsChart } from "@/components/dashboard/analytics/savings-chart";
import { VolumeChart, DocTypePills } from "@/components/dashboard/analytics/volume-chart";
import {
  DiscrepancyTrendsChart,
  TopDiscrepancyTable,
} from "@/components/dashboard/analytics/discrepancy-trends";
import { CarrierPerformanceTable } from "@/components/dashboard/analytics/carrier-performance";
import {
  ConfidenceHistogram,
  ClassificationPie,
} from "@/components/dashboard/analytics/processing-accuracy";
import { AnalyticsSkeleton } from "@/components/dashboard/analytics/analytics-skeleton";

interface PageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

function parseDateRange(params: Record<string, string | string[] | undefined>) {
  const range = (typeof params.range === "string" ? params.range : "30") as string;
  const now = new Date();

  if (range === "custom") {
    const from = typeof params.from === "string" ? params.from : "";
    const to = typeof params.to === "string" ? params.to : "";
    if (from && to) {
      const startDate = new Date(from + "T00:00:00");
      const endDate = new Date(to + "T23:59:59.999");
      if (!isNaN(startDate.getTime()) && !isNaN(endDate.getTime())) {
        return { startDate, endDate };
      }
    }
  }

  const days = parseInt(range, 10) || 30;
  const endDate = new Date(now);
  endDate.setHours(23, 59, 59, 999);
  const startDate = new Date(now);
  startDate.setDate(startDate.getDate() - days);
  startDate.setHours(0, 0, 0, 0);
  return { startDate, endDate };
}

export default async function AnalyticsPage({ searchParams }: PageProps) {
  const params = await searchParams;
  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-[color:var(--muted)]">
            Analytics
          </p>
          <h1 className="mt-1 text-2xl font-semibold">Reports &amp; Insights</h1>
        </div>
        <Suspense>
          <DateRangeSelector />
        </Suspense>
      </div>

      <Suspense fallback={<AnalyticsSkeleton />}>
        <AnalyticsContent params={params} />
      </Suspense>
    </div>
  );
}

async function AnalyticsContent({
  params,
}: {
  params: Record<string, string | string[] | undefined>;
}) {
  const { startDate, endDate } = parseDateRange(params);
  const carrierFilter =
    typeof params.carrier === "string" ? params.carrier : undefined;

  const data = await getAnalyticsData(startDate, endDate, carrierFilter);

  const hasConfidenceData = data.confidenceDistribution.some((b) => b.count > 0);

  return (
    <div className="space-y-6">
      {/* ── Hero: Total Savings ──────────────────────────────────────── */}
      <Card>
        <div className="flex items-start gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-2xl bg-emerald-100 dark:bg-emerald-900/30">
            <DollarSign size={20} className="text-[color:var(--success)]" />
          </div>
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-[color:var(--muted)]">
              Total Savings
            </p>
            <p className="mt-1 text-4xl font-semibold text-[color:var(--success)] font-[family-name:var(--font-code)]">
              {formatCurrency(data.totalSavings)}
            </p>
          </div>
        </div>

        {/* Secondary stats */}
        <div className="mt-6 grid gap-4 md:grid-cols-3">
          <div className="rounded-2xl border border-[color:var(--border)] bg-[color:var(--background)] p-4">
            <div className="flex items-center gap-2 text-[color:var(--muted)]">
              <TrendingUp size={14} />
              <p className="text-xs">Avg savings / shipment</p>
            </div>
            <p className="mt-2 text-lg font-semibold font-[family-name:var(--font-code)]">
              {formatCurrency(data.avgSavingsPerShipment)}
            </p>
          </div>
          <div className="rounded-2xl border border-[color:var(--border)] bg-[color:var(--background)] p-4">
            <div className="flex items-center gap-2 text-[color:var(--muted)]">
              <Ship size={14} />
              <p className="text-xs">Shipments processed</p>
            </div>
            <p className="mt-2 text-lg font-semibold font-[family-name:var(--font-code)]">
              {data.totalShipmentsProcessed.toLocaleString()}
            </p>
          </div>
          <div className="rounded-2xl border border-[color:var(--border)] bg-[color:var(--background)] p-4">
            <div className="flex items-center gap-2 text-[color:var(--muted)]">
              <FileText size={14} />
              <p className="text-xs">Documents processed</p>
            </div>
            <p className="mt-2 text-lg font-semibold font-[family-name:var(--font-code)]">
              {data.totalDocumentsProcessed.toLocaleString()}
            </p>
          </div>
        </div>

        {/* Savings chart */}
        <div className="mt-6">
          <p className="mb-3 text-xs uppercase tracking-[0.2em] text-[color:var(--muted)]">
            Cumulative Savings Over Time
          </p>
          <SavingsChart data={data.savingsOverTime} />
        </div>
      </Card>

      {/* ── Processing Volume + Discrepancy Trends ───────────────────── */}
      <div className="grid gap-6 xl:grid-cols-2">
        <Card>
          <p className="text-xs uppercase tracking-[0.2em] text-[color:var(--muted)]">
            Processing Volume
          </p>
          <h2 className="mt-1 text-lg font-semibold">Documents by Type</h2>
          <div className="mt-4">
            <VolumeChart data={data.volumeOverTime} />
          </div>
          <div className="mt-4">
            <DocTypePills counts={data.docTypeCounts} />
          </div>
        </Card>

        <Card>
          <p className="text-xs uppercase tracking-[0.2em] text-[color:var(--muted)]">
            Discrepancy Trends
          </p>
          <h2 className="mt-1 text-lg font-semibold">Severity Over Time</h2>
          <div className="mt-4">
            <DiscrepancyTrendsChart data={data.discrepancyTrends} />
          </div>
        </Card>
      </div>

      {/* ── Top Discrepancy Types + Carrier Performance ──────────────── */}
      <div className="grid gap-6 xl:grid-cols-2">
        <Card>
          <p className="text-xs uppercase tracking-[0.2em] text-[color:var(--muted)]">
            Top Discrepancy Types
          </p>
          <div className="mt-4">
            <TopDiscrepancyTable data={data.topDiscrepancyTypes} />
          </div>
        </Card>

        <Card>
          <p className="text-xs uppercase tracking-[0.2em] text-[color:var(--muted)]">
            Carrier Performance
          </p>
          <p className="mt-1 text-xs text-[color:var(--muted)]">
            Click a carrier to filter this page
          </p>
          <div className="mt-4">
            <CarrierPerformanceTable
              data={data.carrierPerformance}
              activeCarrier={carrierFilter ?? null}
            />
          </div>
        </Card>
      </div>

      {/* ── Processing Accuracy ──────────────────────────────────────── */}
      {hasConfidenceData && (
        <Card>
          <p className="text-xs uppercase tracking-[0.2em] text-[color:var(--muted)]">
            Processing Accuracy
          </p>
          <h2 className="mt-1 text-lg font-semibold">AI Extraction Metrics</h2>
          <div className="mt-6 grid gap-6 xl:grid-cols-3">
            <div>
              <p className="mb-2 text-xs font-medium text-[color:var(--muted)]">
                Confidence Distribution
              </p>
              <ConfidenceHistogram data={data.confidenceDistribution} />
            </div>
            <div>
              <p className="mb-2 text-xs font-medium text-[color:var(--muted)]">
                Classification by Type
              </p>
              <ClassificationPie data={data.classificationCounts} />
            </div>
            <div className="flex flex-col items-center justify-center">
              <div className="grid h-10 w-10 place-items-center rounded-2xl bg-indigo-100 dark:bg-indigo-900/30">
                <Clock size={20} className="text-indigo-500" />
              </div>
              <p className="mt-3 text-xs text-[color:var(--muted)]">
                Avg Processing Time
              </p>
              <p className="mt-1 text-3xl font-semibold font-[family-name:var(--font-code)]">
                {data.avgProcessingTimeSecs != null
                  ? `${data.avgProcessingTimeSecs}s`
                  : "\u2014"}
              </p>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}
