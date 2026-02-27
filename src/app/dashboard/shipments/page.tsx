export const dynamic = "force-dynamic";

import { ShipmentTable } from "@/components/dashboard/shipment-table";
import { Card } from "@/components/ui/card";
import { getShipmentDetail, listShipments } from "@/lib/repository";

export default async function ShipmentsPage({
  searchParams
}: {
  searchParams: Promise<{
    q?: string;
    discrepancy?: string;
    status?: string;
  }>;
}) {
  const filters = await searchParams;
  const shipments = await listShipments({
    query: filters.q,
    discrepancyLevel: filters.discrepancy ?? null,
    status: filters.status ?? null
  });
  const detailMap = Object.fromEntries(
    await Promise.all(shipments.map(async (shipment) => [shipment.id, await getShipmentDetail(shipment.id)]))
  );

  return (
    <div className="space-y-6">
      <Card className="bg-white/90">
        <p className="text-xs uppercase tracking-[0.2em] text-[color:var(--muted)]">Shipment queue</p>
        <h2 className="mt-2 text-2xl font-semibold">Reconciliation review list</h2>
        <p className="mt-2 text-sm text-[color:var(--muted)]">
          Filters are supported through query params: `?q=atlas&discrepancy=red&status=disputed`
        </p>
      </Card>
      <ShipmentTable shipments={shipments} detailMap={detailMap} />
    </div>
  );
}
