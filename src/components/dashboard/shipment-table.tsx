import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { formatCurrency } from "@/lib/utils";
import type { ShipmentDetail, ShipmentRecord } from "@/types/shipments";

function badgeTone(level: ShipmentRecord["discrepancy_level"]) {
  if (level === "green") {
    return "green";
  }
  if (level === "yellow") {
    return "yellow";
  }
  if (level === "red") {
    return "red";
  }
  return "neutral";
}

export function ShipmentTable({
  shipments,
  detailMap
}: {
  shipments: ShipmentRecord[];
  detailMap?: Record<string, ShipmentDetail | null>;
}) {
  return (
    <Card className="overflow-hidden p-0">
      <div className="overflow-x-auto">
        <table className="min-w-full border-collapse text-left text-sm">
          <thead className="bg-black/5 text-[color:var(--muted)]">
            <tr>
              <th className="px-6 py-4 font-medium">Shipment</th>
              <th className="px-6 py-4 font-medium">Carrier</th>
              <th className="px-6 py-4 font-medium">Lane</th>
              <th className="px-6 py-4 font-medium">Invoice</th>
              <th className="px-6 py-4 font-medium">Status</th>
              <th className="px-6 py-4 font-medium">Discrepancy</th>
              <th className="px-6 py-4 font-medium">Confidence</th>
            </tr>
          </thead>
          <tbody>
            {shipments.map((shipment) => {
              const detail = detailMap?.[shipment.id];
              const invoice = detail?.documents.find((document) => document.doc_type === "invoice")?.extracted_data?.extracted_fields;
              const invoiceAmount =
                invoice && "total_amount" in invoice ? invoice.total_amount : null;

              return (
                <tr key={shipment.id} className="border-t border-[color:var(--border)]">
                  <td className="px-6 py-4">
                    <Link className="font-semibold hover:text-[color:var(--accent)]" href={`/dashboard/shipments/${shipment.id}`}>
                      {shipment.shipment_ref ?? shipment.bol_number ?? shipment.id}
                    </Link>
                    <p className="mt-1 text-xs text-[color:var(--muted)]">BoL {shipment.bol_number ?? "Pending"}</p>
                  </td>
                  <td className="px-6 py-4">
                    <p>{shipment.carrier_name ?? "Unknown carrier"}</p>
                    <p className="mt-1 text-xs text-[color:var(--muted)]">{shipment.carrier_scac ?? "No SCAC"}</p>
                  </td>
                  <td className="px-6 py-4">
                    <p>{shipment.origin ?? "Unknown origin"}</p>
                    <p className="mt-1 text-xs text-[color:var(--muted)]">{shipment.destination ?? "Unknown destination"}</p>
                  </td>
                  <td className="px-6 py-4">{formatCurrency(invoiceAmount)}</td>
                  <td className="px-6 py-4">
                    <Badge tone={shipment.status as "approved" | "disputed" | "matched" | "pending"}>{shipment.status}</Badge>
                  </td>
                  <td className="px-6 py-4">
                    <Badge tone={badgeTone(shipment.discrepancy_level)}>{shipment.discrepancy_level ?? "none"}</Badge>
                  </td>
                  <td className="px-6 py-4">{shipment.match_confidence?.toFixed(0) ?? "—"}%</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
