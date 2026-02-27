export const dynamic = "force-dynamic";

import { StatsCards } from "@/components/dashboard/stats-cards";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { getDashboardSummary, getShipmentDetail, listShipments } from "@/lib/repository";

export default async function DashboardPage() {
  const [summary, shipments] = await Promise.all([getDashboardSummary(), listShipments()]);
  const focusShipments = await Promise.all(shipments.slice(0, 5).map((shipment) => getShipmentDetail(shipment.id)));

  return (
    <div className="space-y-6">
      <StatsCards summary={summary} />
      <section className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
        <Card className="bg-[#17202a] text-white">
          <p className="text-xs uppercase tracking-[0.2em] text-white/65">Current mix</p>
          <div className="mt-8 flex items-center gap-6">
            <div className="grid h-44 w-44 place-items-center rounded-full bg-[conic-gradient(#2d7a5b_0_120deg,#d28b22_120deg_240deg,#a33f2f_240deg_360deg)]">
              <div className="grid h-24 w-24 place-items-center rounded-full bg-[#17202a] text-center">
                <span className="text-xs text-white/60">Shipments</span>
                <span className="text-2xl font-semibold">{shipments.length}</span>
              </div>
            </div>
            <div className="space-y-4 text-sm">
              <div className="flex items-center gap-3"><span className="h-3 w-3 rounded-full bg-[color:var(--success)]" /> Green {summary.discrepancyDistribution.green}</div>
              <div className="flex items-center gap-3"><span className="h-3 w-3 rounded-full bg-[color:var(--warning)]" /> Yellow {summary.discrepancyDistribution.yellow}</div>
              <div className="flex items-center gap-3"><span className="h-3 w-3 rounded-full bg-[color:var(--danger)]" /> Red {summary.discrepancyDistribution.red}</div>
            </div>
          </div>
        </Card>

        <Card className="bg-white/90">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-[color:var(--muted)]">Recent activity</p>
              <h2 className="mt-2 text-2xl font-semibold">Operator feed</h2>
            </div>
            <Badge tone="neutral">{summary.recentActivity.length} entries</Badge>
          </div>
          <div className="mt-6 space-y-4">
            {summary.recentActivity.map((item) => (
              <div key={item.id} className="rounded-2xl border border-[color:var(--border)] bg-[#f7f4ee] px-4 py-3">
                <p className="font-medium capitalize">{item.action.replace(/_/g, " ")}</p>
                <p className="mt-1 text-sm text-[color:var(--muted)]">
                  Shipment {item.shipment_id ?? "n/a"} at {new Date(item.created_at).toLocaleString()}
                </p>
              </div>
            ))}
          </div>
        </Card>
      </section>

      <Card className="bg-white/90">
        <p className="text-xs uppercase tracking-[0.2em] text-[color:var(--muted)]">Priority queue</p>
        <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {focusShipments.map((shipment) =>
            shipment ? (
              <div key={shipment.id} className="rounded-[1.5rem] border border-[color:var(--border)] p-4">
                <div className="flex items-center justify-between">
                  <p className="font-semibold">{shipment.shipment_ref ?? shipment.bol_number ?? shipment.id}</p>
                  <Badge tone={(shipment.discrepancy_level ?? "neutral") as "green" | "yellow" | "red" | "neutral"}>
                    {shipment.discrepancy_level ?? "none"}
                  </Badge>
                </div>
                <p className="mt-2 text-sm text-[color:var(--muted)]">{shipment.carrier_name ?? "Unknown carrier"}</p>
                <p className="mt-4 text-sm">{shipment.origin ?? "Unknown origin"} to {shipment.destination ?? "Unknown destination"}</p>
              </div>
            ) : null
          )}
        </div>
      </Card>
    </div>
  );
}
