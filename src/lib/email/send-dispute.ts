import "server-only";

import type { ShipmentDetail } from "@/types/shipments";

export function buildDisputeEmail(shipment: ShipmentDetail, notes: string) {
  return {
    subject: `Dispute for shipment ${shipment.shipment_ref ?? shipment.id}`,
    text: [
      `Carrier: ${shipment.carrier_name ?? "Unknown"}`,
      `Shipment reference: ${shipment.shipment_ref ?? shipment.id}`,
      "",
      "We identified discrepancies in the submitted invoice and are requesting review before payment approval.",
      notes
    ].join("\n")
  };
}
