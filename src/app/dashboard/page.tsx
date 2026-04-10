export const dynamic = "force-dynamic";

import Link from "next/link";
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Clock,
  FileText,
  ShieldAlert
} from "lucide-react";

import { DiscrepancyChart } from "@/components/dashboard/discrepancy-chart";
import { StatusChart } from "@/components/dashboard/status-chart";
import { PageHeader } from "@/components/PageHeader";
import { StatCard } from "@/components/StatCard";
import { StatusBadge } from "@/components/StatusBadge";
import { Card } from "@/components/ui/card";
import { formatDate } from "@/lib/utils";
import { getDashboardSummary, getShipmentStatusCounts, listShipments } from "@/lib/repository";

export default async function DashboardPage() {
  const [summary, statusCounts, shipments] = await Promise.all([
    getDashboardSummary(),
    getShipmentStatusCounts(),
    listShipments()
  ]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Dashboard"
        description="Real-time overview of your freight reconciliation pipeline"
      />

      {/* Stat Cards */}
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard
          icon={FileText}
          label="Total Shipments"
          value={statusCounts.total}
          accentColor="#6366f1"
        />
        <StatCard
          icon={Clock}
          label="Pending Review"
          value={summary.pendingReview}
          accentColor="#d28b22"
        />
        <StatCard
          icon={CheckCircle2}
          label="Auto-Approved"
          value={summary.autoApproved}
          accentColor="#2d7a5b"
        />
        <StatCard
          icon={ShieldAlert}
          label="Open Disputes"
          value={summary.disputesOpen}
          accentColor="#a33f2f"
        />
      </div>

      {/* Charts row */}
      <section className="grid gap-6 xl:grid-cols-2">
        <Card className="bg-[#17202a] text-white">
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-white/55">
            Discrepancy Breakdown
          </p>
          <h2 className="mt-1 text-lg font-semibold">Severity Distribution</h2>
          <div className="mt-6">
            <DiscrepancyChart
              green={summary.discrepancyDistribution.green}
              yellow={summary.discrepancyDistribution.yellow}
              red={summary.discrepancyDistribution.red}
            />
          </div>
        </Card>

        <Card className="bg-white/90">
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-[color:var(--muted)]">
            Shipment Pipeline
          </p>
          <h2 className="mt-1 text-lg font-semibold">Status Distribution</h2>
          <div className="mt-6">
            <StatusChart statusCounts={statusCounts} />
          </div>
        </Card>
      </section>

      {/* Recent Activity + Priority Queue */}
      <section className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        {/* Recent Activity */}
        <Card className="bg-white/90">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-xs font-medium uppercase tracking-[0.2em] text-[color:var(--muted)]">
                Recent activity
              </p>
              <h2 className="mt-1 text-lg font-semibold">Audit Feed</h2>
            </div>
            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">
              {summary.recentActivity.length} entries
            </span>
          </div>
          <div className="mt-5 space-y-3">
            {summary.recentActivity.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-center">
                <Clock size={32} className="text-[color:var(--muted)]/40" />
                <p className="mt-3 text-sm text-[color:var(--muted)]">No activity yet</p>
              </div>
            ) : (
              summary.recentActivity.slice(0, 8).map((item) => (
                <div
                  key={item.id}
                  className="flex items-start gap-3 rounded-2xl border border-[color:var(--border)] bg-[color:var(--background)]/50 px-4 py-3"
                >
                  <div className="mt-0.5 flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg bg-[color:var(--accent)]/10">
                    {item.action.includes("approved") ? (
                      <CheckCircle2 size={14} className="text-[color:var(--success)]" />
                    ) : item.action.includes("disputed") ? (
                      <AlertTriangle size={14} className="text-[color:var(--danger)]" />
                    ) : (
                      <FileText size={14} className="text-[color:var(--accent)]" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium capitalize">
                      {item.action.replace(/_/g, " ")}
                    </p>
                    <p className="mt-0.5 truncate text-xs text-[color:var(--muted)]">
                      {formatDate(item.created_at)} {item.shipment_id ? ` \u00b7 ${item.shipment_id.slice(0, 8)}...` : ""}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </Card>

        {/* Priority Queue */}
        <Card className="bg-white/90">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-xs font-medium uppercase tracking-[0.2em] text-[color:var(--muted)]">
                Needs attention
              </p>
              <h2 className="mt-1 text-lg font-semibold">Priority Queue</h2>
            </div>
            <Link
              href="/dashboard/shipments"
              className="flex items-center gap-1 text-xs font-medium text-[color:var(--accent)] transition-colors hover:underline"
            >
              View all <ArrowRight size={12} />
            </Link>
          </div>
          <div className="mt-5 space-y-3">
            {shipments.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-center">
                <CheckCircle2 size={32} className="text-[color:var(--success)]/40" />
                <p className="mt-3 text-sm text-[color:var(--muted)]">All clear! No shipments to review.</p>
              </div>
            ) : (
              shipments.slice(0, 5).map((shipment) => (
                <Link
                  key={shipment.id}
                  href={`/dashboard/shipments/${shipment.id}`}
                  className="block rounded-2xl border border-[color:var(--border)] p-4 transition-all hover:border-[color:var(--accent)]/30 hover:shadow-md"
                >
                  <div className="flex items-center justify-between gap-3">
                    <p className="font-semibold">
                      {shipment.shipment_ref ?? shipment.bol_number ?? shipment.id.slice(0, 8)}
                    </p>
                    <StatusBadge variant="severity" value={shipment.discrepancy_level} />
                  </div>
                  <div className="mt-2 flex items-center gap-2 text-sm text-[color:var(--muted)]">
                    <span>{shipment.carrier_name ?? "Unknown carrier"}</span>
                    <span className="text-[color:var(--muted)]/40">\u00b7</span>
                    <StatusBadge variant="status" value={shipment.status} />
                  </div>
                  <p className="mt-2 text-xs text-[color:var(--muted)]">
                    {shipment.origin ?? "?"} &rarr; {shipment.destination ?? "?"}
                  </p>
                </Link>
              ))
            )}
          </div>
        </Card>
      </section>
    </div>
  );
}
