import { ApprovalActions } from "@/components/dashboard/approval-actions";
import { DiscrepancyCard } from "@/components/dashboard/discrepancy-card";
import { DocumentViewer } from "@/components/dashboard/document-viewer";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { formatCurrency } from "@/lib/utils";
import type { ShipmentDetail as ShipmentDetailType } from "@/types/shipments";

export function ShipmentDetail({ shipment }: { shipment: ShipmentDetailType }) {
  const invoice = shipment.documents.find((document) => document.doc_type === "invoice")?.extracted_data?.extracted_fields;
  const invoiceTotal = invoice && "total_amount" in invoice ? invoice.total_amount : null;

  return (
    <div className="space-y-6">
      <Card className="bg-white/90">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-[color:var(--muted)]">Shipment summary</p>
            <h2 className="mt-2 text-3xl font-semibold">{shipment.shipment_ref ?? shipment.bol_number ?? shipment.id}</h2>
            <div className="mt-4 flex flex-wrap items-center gap-3">
              <Badge tone={shipment.status as "approved" | "disputed" | "matched" | "pending"}>{shipment.status}</Badge>
              <Badge tone={(shipment.discrepancy_level ?? "neutral") as "green" | "yellow" | "red" | "neutral"}>
                {shipment.discrepancy_level ?? "no discrepancy"}
              </Badge>
              <span className="text-sm text-[color:var(--muted)]">
                Match confidence {shipment.match_confidence?.toFixed(0) ?? "—"}%
              </span>
            </div>
          </div>
          <div className="space-y-3">
            <p className="text-right text-sm text-[color:var(--muted)]">Invoice total</p>
            <p className="text-right text-4xl font-semibold">{formatCurrency(invoiceTotal)}</p>
            <ApprovalActions shipmentId={shipment.id} canApprove={shipment.discrepancy_level !== "red"} />
          </div>
        </div>
      </Card>

      <section className="grid gap-6 xl:grid-cols-[1.4fr_0.6fr]">
        <DocumentViewer documents={shipment.documents} />
        <div className="space-y-4">
          <Card className="bg-[#17202a] text-white">
            <p className="text-xs uppercase tracking-[0.2em] text-white/65">Lane</p>
            <p className="mt-2 text-lg font-semibold">{shipment.origin ?? "Unknown origin"}</p>
            <p className="text-sm text-white/75">{shipment.destination ?? "Unknown destination"}</p>
            <div className="mt-6 grid gap-4 text-sm text-white/80">
              <div>
                <p className="text-white/55">Carrier</p>
                <p>{shipment.carrier_name ?? "Unknown"} {shipment.carrier_scac ? `(${shipment.carrier_scac})` : ""}</p>
              </div>
              <div>
                <p className="text-white/55">BoL</p>
                <p>{shipment.bol_number ?? "Pending"}</p>
              </div>
              <div>
                <p className="text-white/55">PRO</p>
                <p>{shipment.pro_number ?? "Pending"}</p>
              </div>
            </div>
          </Card>

          <div className="space-y-4">
            {shipment.discrepancies.length > 0 ? (
              shipment.discrepancies.map((discrepancy) => (
                <DiscrepancyCard key={discrepancy.id} discrepancy={discrepancy} />
              ))
            ) : (
              <Card>
                <p className="text-sm text-[color:var(--muted)]">No discrepancy cards yet. Upload the paired invoice or rate confirmation to trigger reconciliation.</p>
              </Card>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
