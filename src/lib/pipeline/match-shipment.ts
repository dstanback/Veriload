import "server-only";

import { randomUUID } from "node:crypto";

import { weightedConfidence } from "@/lib/utils/confidence";
import { normalizeReference, normalizeScac, normalizeText } from "@/lib/utils/normalize";
import type { DocumentRecord, ExtractedFields } from "@/types/documents";
import type { ShipmentDocumentLink, ShipmentRecord } from "@/types/shipments";

function getExtracted(document: DocumentRecord): ExtractedFields | null {
  return document.extracted_data?.extracted_fields ?? null;
}

function getReferences(document: DocumentRecord) {
  const extracted = getExtracted(document);
  if (!extracted) {
    return {
      bol: null,
      pro: null,
      shipmentRef: null,
      carrierScac: null,
      origin: null,
      destination: null
    };
  }

  if ("bol_number" in extracted) {
    return {
      bol: normalizeReference(extracted.bol_number),
      pro: null,
      shipmentRef: normalizeReference(extracted.reference_numbers[0] ?? extracted.bol_number),
      carrierScac: normalizeScac(extracted.carrier_scac),
      origin: normalizeText(extracted.shipper_name),
      destination: normalizeText(extracted.consignee_name)
    };
  }

  if ("invoice_number" in extracted) {
    return {
      bol: normalizeReference(extracted.bol_reference),
      pro: normalizeReference(extracted.pro_number),
      shipmentRef: normalizeReference(extracted.shipper_reference ?? extracted.bol_reference),
      carrierScac: normalizeScac(extracted.carrier_scac),
      origin: normalizeText(extracted.origin.city),
      destination: normalizeText(extracted.destination.city)
    };
  }

  if ("rate_con_number" in extracted) {
    return {
      bol: null,
      pro: null,
      shipmentRef: normalizeReference(extracted.rate_con_number),
      carrierScac: normalizeScac(extracted.carrier_scac),
      origin: normalizeText(extracted.origin.city),
      destination: normalizeText(extracted.destination.city)
    };
  }

  if ("bol_reference" in extracted) {
    return {
      bol: normalizeReference(extracted.bol_reference),
      pro: null,
      shipmentRef: normalizeReference(extracted.bol_reference),
      carrierScac: null,
      origin: null,
      destination: null
    };
  }

  return {
    bol: null,
    pro: null,
    shipmentRef: null,
    carrierScac: null,
    origin: null,
    destination: null
  };
}

export function matchDocumentToShipment(params: {
  document: DocumentRecord;
  existingShipments: ShipmentRecord[];
}): { shipment: ShipmentRecord; confidence: number; created: boolean } {
  const references = getReferences(params.document);

  for (const shipment of params.existingShipments) {
    if (references.bol && normalizeReference(shipment.bol_number) === references.bol) {
      return { shipment, confidence: 98, created: false };
    }
    if (references.pro && normalizeReference(shipment.pro_number) === references.pro) {
      return { shipment, confidence: 94, created: false };
    }
    if (references.shipmentRef && normalizeReference(shipment.shipment_ref) === references.shipmentRef) {
      return { shipment, confidence: 90, created: false };
    }
  }

  const fuzzyMatch = params.existingShipments.find((shipment) => {
    const scores = [
      shipment.carrier_scac && references.carrierScac && normalizeScac(shipment.carrier_scac) === references.carrierScac
        ? 1
        : 0,
      shipment.origin && references.origin && normalizeText(shipment.origin)?.includes(references.origin) ? 1 : 0,
      shipment.destination && references.destination && normalizeText(shipment.destination)?.includes(references.destination)
        ? 1
        : 0
    ];

    return scores.filter(Boolean).length >= 2;
  });

  if (fuzzyMatch) {
    return {
      shipment: fuzzyMatch,
      confidence: weightedConfidence([
        { score: 80, weight: 0.6 },
        { score: 72, weight: 0.4 }
      ]),
      created: false
    };
  }

  return {
    shipment: {
      id: randomUUID(),
      organization_id: params.document.organization_id,
      shipment_ref: references.shipmentRef,
      bol_number: references.bol,
      pro_number: references.pro,
      shipper_name: null,
      consignee_name: null,
      carrier_name: null,
      carrier_scac: references.carrierScac,
      origin: null,
      destination: null,
      status: "pending",
      match_confidence: 60,
      discrepancy_level: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    },
    confidence: 60,
    created: true
  };
}

export function buildShipmentLinks(params: {
  shipmentId: string;
  document: DocumentRecord;
  existingLinks: ShipmentDocumentLink[];
}) {
  const links = params.existingLinks.filter((link) => link.shipment_id === params.shipmentId);
  const hasLink = links.some((link) => link.document_id === params.document.id);

  return hasLink
    ? links
    : [
        ...links,
        {
          shipment_id: params.shipmentId,
          document_id: params.document.id,
          role: params.document.doc_type ?? "unknown"
        }
      ];
}

export function applyDocumentToShipment(shipment: ShipmentRecord, document: DocumentRecord): ShipmentRecord {
  const extracted = getExtracted(document);
  const nextShipment = { ...shipment, updated_at: new Date().toISOString() };

  if (!extracted) {
    return nextShipment;
  }

  if ("bol_number" in extracted) {
    nextShipment.bol_number = nextShipment.bol_number ?? extracted.bol_number;
    nextShipment.shipment_ref = nextShipment.shipment_ref ?? extracted.reference_numbers[0] ?? extracted.bol_number;
    nextShipment.shipper_name = nextShipment.shipper_name ?? extracted.shipper_name;
    nextShipment.consignee_name = nextShipment.consignee_name ?? extracted.consignee_name;
    nextShipment.carrier_name = nextShipment.carrier_name ?? extracted.carrier_name;
    nextShipment.carrier_scac = nextShipment.carrier_scac ?? extracted.carrier_scac;
    nextShipment.origin = nextShipment.origin ?? extracted.shipper_address;
    nextShipment.destination = nextShipment.destination ?? extracted.consignee_address;
  }

  if ("invoice_number" in extracted) {
    const originLabel = [extracted.origin.city, extracted.origin.state].filter(Boolean).join(", ");
    const destinationLabel = [extracted.destination.city, extracted.destination.state].filter(Boolean).join(", ");
    nextShipment.bol_number = nextShipment.bol_number ?? extracted.bol_reference;
    nextShipment.pro_number = nextShipment.pro_number ?? extracted.pro_number;
    nextShipment.shipment_ref = nextShipment.shipment_ref ?? extracted.shipper_reference ?? extracted.bol_reference;
    nextShipment.carrier_name = nextShipment.carrier_name ?? extracted.carrier_name;
    nextShipment.carrier_scac = nextShipment.carrier_scac ?? extracted.carrier_scac;
    nextShipment.origin = nextShipment.origin ?? (originLabel || null);
    nextShipment.destination = nextShipment.destination ?? (destinationLabel || null);
  }

  if ("rate_con_number" in extracted) {
    const originLabel = [extracted.origin.city, extracted.origin.state].filter(Boolean).join(", ");
    const destinationLabel = [extracted.destination.city, extracted.destination.state].filter(Boolean).join(", ");
    nextShipment.shipment_ref = nextShipment.shipment_ref ?? extracted.rate_con_number;
    nextShipment.carrier_name = nextShipment.carrier_name ?? extracted.carrier_name;
    nextShipment.carrier_scac = nextShipment.carrier_scac ?? extracted.carrier_scac;
    nextShipment.origin = nextShipment.origin ?? (originLabel || null);
    nextShipment.destination = nextShipment.destination ?? (destinationLabel || null);
  }

  if ("bol_reference" in extracted) {
    nextShipment.bol_number = nextShipment.bol_number ?? extracted.bol_reference;
  }

  return nextShipment;
}
