import "server-only";

import { randomUUID } from "node:crypto";

import { applyDocumentToShipment, buildShipmentLinks, matchDocumentToShipment } from "@/lib/pipeline/match-shipment";
import { weightedConfidence } from "@/lib/utils/confidence";
import { compareExactValues, compareNumericValues, worstSeverity } from "@/lib/utils/tolerances";
import type { DiscrepancyRecord } from "@/types/discrepancies";
import type { DocumentRecord, InvoiceExtraction } from "@/types/documents";
import type { DashboardSummary, ShipmentDocumentLink, ShipmentRecord } from "@/types/shipments";
import type { DevStoreShape } from "@/lib/demo-data";

function sumInvoiceWeight(invoice: InvoiceExtraction) {
  return invoice.line_items.reduce((sum, item) => sum + (item.weight ?? 0), 0) || null;
}

function sumInvoicePieces(invoice: InvoiceExtraction) {
  return invoice.line_items.reduce((sum, item) => sum + (item.pieces ?? 0), 0) || null;
}

function getLinkedDocuments(
  shipmentId: string,
  links: ShipmentDocumentLink[],
  documents: DocumentRecord[]
): DocumentRecord[] {
  return links
    .filter((link) => link.shipment_id === shipmentId)
    .map((link) => documents.find((document) => document.id === link.document_id))
    .filter(Boolean) as DocumentRecord[];
}

function createDiscrepancy(params: Omit<DiscrepancyRecord, "id" | "created_at">): DiscrepancyRecord {
  return {
    id: randomUUID(),
    created_at: new Date().toISOString(),
    ...params
  };
}

function computeDiscrepancies(shipment: ShipmentRecord, documents: DocumentRecord[]): DiscrepancyRecord[] {
  const invoice = documents.find((document) => document.doc_type === "invoice")?.extracted_data?.extracted_fields;
  const bol = documents.find((document) => document.doc_type === "bol")?.extracted_data?.extracted_fields;
  const rateCon = documents.find((document) => document.doc_type === "rate_con")?.extracted_data?.extracted_fields;

  if (!invoice || !("invoice_number" in invoice)) {
    return [];
  }

  const discrepancies: DiscrepancyRecord[] = [];
  const invoiceDocId = documents.find((document) => document.doc_type === "invoice")?.id ?? null;
  const bolDocId = documents.find((document) => document.doc_type === "bol")?.id ?? null;
  const rateDocId = documents.find((document) => document.doc_type === "rate_con")?.id ?? null;

  if (rateCon && "agreed_rate" in rateCon) {
    const amountResult = compareNumericValues({
      left: invoice.total_amount,
      right: rateCon.agreed_rate,
      greenTolerance: 0,
      yellowTolerance: 0.02
    });
    discrepancies.push(
      createDiscrepancy({
        shipment_id: shipment.id,
        field_name: "total_amount",
        source_doc_id: invoiceDocId,
        compare_doc_id: rateDocId,
        source_value: invoice.total_amount?.toString() ?? null,
        compare_value: rateCon.agreed_rate?.toString() ?? null,
        variance_amount: amountResult.varianceAmount,
        variance_pct: amountResult.variancePct,
        severity: amountResult.severity,
        resolution: null,
        resolved_by: null,
        resolved_at: null,
        notes: amountResult.severity === "red" ? "Invoice total exceeds agreed rate." : null
      })
    );
  }

  if (bol && "weight" in bol) {
    const weightResult = compareNumericValues({
      left: sumInvoiceWeight(invoice),
      right: bol.weight,
      greenTolerance: 0.02,
      yellowTolerance: 0.05
    });
    discrepancies.push(
      createDiscrepancy({
        shipment_id: shipment.id,
        field_name: "weight",
        source_doc_id: invoiceDocId,
        compare_doc_id: bolDocId,
        source_value: sumInvoiceWeight(invoice)?.toString() ?? null,
        compare_value: bol.weight?.toString() ?? null,
        variance_amount: null,
        variance_pct: weightResult.variancePct,
        severity: weightResult.severity,
        resolution: null,
        resolved_by: null,
        resolved_at: null,
        notes: weightResult.severity === "red" ? "Invoice weight is outside allowed tolerance." : null
      })
    );

    const piecesSeverity = compareExactValues(sumInvoicePieces(invoice), bol.pieces);
    discrepancies.push(
      createDiscrepancy({
        shipment_id: shipment.id,
        field_name: "pieces",
        source_doc_id: invoiceDocId,
        compare_doc_id: bolDocId,
        source_value: sumInvoicePieces(invoice)?.toString() ?? null,
        compare_value: bol.pieces?.toString() ?? null,
        variance_amount: null,
        variance_pct: null,
        severity: piecesSeverity,
        resolution: null,
        resolved_by: null,
        resolved_at: null,
        notes: piecesSeverity === "red" ? "Piece count mismatch across invoice and BoL." : null
      })
    );
  }

  if (rateCon && "rate_con_number" in rateCon) {
    const fuelResult = compareNumericValues({
      left: invoice.fuel_surcharge_pct,
      right: rateCon.fuel_surcharge_pct,
      greenTolerance: 0.001,
      yellowTolerance: 0.01
    });
    discrepancies.push(
      createDiscrepancy({
        shipment_id: shipment.id,
        field_name: "fuel_surcharge",
        source_doc_id: invoiceDocId,
        compare_doc_id: rateDocId,
        source_value: invoice.fuel_surcharge_pct?.toString() ?? null,
        compare_value: rateCon.fuel_surcharge_pct?.toString() ?? null,
        variance_amount: fuelResult.varianceAmount,
        variance_pct: fuelResult.variancePct,
        severity: fuelResult.severity,
        resolution: null,
        resolved_by: null,
        resolved_at: null,
        notes: null
      })
    );

    const approvedCodes = new Set(rateCon.accessorial_schedule.map((item) => item.code ?? item.description));
    for (const item of invoice.accessorials) {
      const isApproved = approvedCodes.has(item.code ?? item.description);
      discrepancies.push(
        createDiscrepancy({
          shipment_id: shipment.id,
          field_name: "accessorials",
          source_doc_id: invoiceDocId,
          compare_doc_id: rateDocId,
          source_value: `${item.code ?? item.description} ${item.amount}`,
          compare_value: isApproved ? "Approved" : "Not approved",
          variance_amount: item.amount,
          variance_pct: null,
          severity: isApproved ? "green" : "red",
          resolution: null,
          resolved_by: null,
          resolved_at: null,
          notes: isApproved ? null : "Accessorial is not on the approved schedule."
        })
      );
    }
  } else {
    for (const item of invoice.accessorials) {
      discrepancies.push(
        createDiscrepancy({
          shipment_id: shipment.id,
          field_name: "accessorials",
          source_doc_id: invoiceDocId,
          compare_doc_id: null,
          source_value: `${item.code ?? item.description} ${item.amount}`,
          compare_value: "No approved schedule",
          variance_amount: item.amount,
          variance_pct: null,
          severity: "red",
          resolution: null,
          resolved_by: null,
          resolved_at: null,
          notes: "Invoiced accessorial has no matching rate confirmation schedule."
        })
      );
    }
  }

  return discrepancies;
}

export function reconcileShipment(params: {
  organizationId: string;
  existingShipments: ShipmentRecord[];
  existingLinks: ShipmentDocumentLink[];
  existingDocuments: DocumentRecord[];
  existingDiscrepancies: DiscrepancyRecord[];
  document: DocumentRecord;
}) {
  const matched = matchDocumentToShipment({
    document: params.document,
    existingShipments: params.existingShipments.filter(
      (shipment) => shipment.organization_id === params.organizationId && shipment.id !== params.document.id
    )
  });

  const shipment = applyDocumentToShipment(matched.shipment, params.document);
  const links = buildShipmentLinks({
    shipmentId: shipment.id,
    document: params.document,
    existingLinks: params.existingLinks
  });
  const linkedDocuments = getLinkedDocuments(
    shipment.id,
    links,
    params.existingDocuments.some((existing) => existing.id === params.document.id)
      ? params.existingDocuments
      : [...params.existingDocuments, params.document]
  );
  const discrepancies = computeDiscrepancies(shipment, linkedDocuments);
  const discrepancyLevel = discrepancies.length > 0 ? worstSeverity(discrepancies.map((item) => item.severity)) : null;
  const matchConfidence = weightedConfidence([
    { score: matched.confidence, weight: 0.5 },
    { score: (params.document.doc_type_confidence ?? 0) * 100, weight: 0.25 },
    {
      score:
        discrepancies.length === 0
          ? 70
          : discrepancyLevel === "green"
            ? 98
            : discrepancyLevel === "yellow"
              ? 84
              : 65,
      weight: 0.25
    }
  ]);

  const updatedShipment: ShipmentRecord = {
    ...shipment,
    match_confidence: matchConfidence,
    discrepancy_level: discrepancyLevel,
    status:
      discrepancyLevel === "red" ? "disputed" : linkedDocuments.length > 1 ? "matched" : "pending"
  };

  return {
    shipment: updatedShipment,
    links,
    discrepancies
  };
}

export function buildDashboardSummary(store: DevStoreShape): DashboardSummary {
  const today = new Date().toISOString().slice(0, 10);

  return {
    documentsProcessedToday: store.documents.filter((document) => document.processed_at?.startsWith(today)).length,
    pendingReview: store.shipments.filter(
      (shipment) => shipment.status === "matched" || shipment.discrepancy_level === "yellow"
    ).length,
    autoApproved: store.audit_log.filter((item) => item.action === "auto_approved").length,
    disputesOpen: store.shipments.filter((shipment) => shipment.status === "disputed").length,
    discrepancyDistribution: {
      green: store.shipments.filter((shipment) => shipment.discrepancy_level === "green").length,
      yellow: store.shipments.filter((shipment) => shipment.discrepancy_level === "yellow").length,
      red: store.shipments.filter((shipment) => shipment.discrepancy_level === "red").length
    },
    recentActivity: [...store.audit_log]
      .sort((left, right) => right.created_at.localeCompare(left.created_at))
      .slice(0, 20)
  };
}
