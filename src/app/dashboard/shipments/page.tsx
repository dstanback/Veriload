export const dynamic = "force-dynamic";

import { ShipmentsDataTable } from "@/components/dashboard/shipments-data-table";
import { PageHeader } from "@/components/PageHeader";
import { listShipments } from "@/lib/repository";

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

  return (
    <div className="space-y-6">
      <PageHeader
        title="Shipments"
        description="Review and manage freight bill reconciliation queue"
        breadcrumbs={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Shipments" }
        ]}
      />
      <ShipmentsDataTable
        shipments={shipments}
        initialQuery={filters.q}
        initialStatus={filters.status}
        initialDiscrepancy={filters.discrepancy}
      />
    </div>
  );
}
