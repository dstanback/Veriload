import type { ShipmentDetail } from "@/types/shipments";

/* ------------------------------------------------------------------ */
/*  CSV column definitions                                             */
/* ------------------------------------------------------------------ */

const CSV_COLUMNS = [
  "Shipment Ref",
  "BOL#",
  "PRO#",
  "Carrier",
  "SCAC",
  "Origin",
  "Destination",
  "Shipper",
  "Consignee",
  "Invoice Total",
  "Rate Con Total",
  "Variance Amount",
  "Variance %",
  "Status",
  "Discrepancy Level",
  "Match Confidence",
  "Document Count",
  "Created Date",
  "Resolved Date",
] as const;

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

/**
 * Escape a value for CSV. Wraps in double-quotes if the value contains
 * a comma, double-quote, or newline. Internal double-quotes are doubled.
 */
export function escapeCsvValue(value: string | null | undefined): string {
  if (value == null || value === "") return "";
  const str = String(value);
  if (str.includes(",") || str.includes('"') || str.includes("\n") || str.includes("\r")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function extractAmount(
  shipment: ShipmentDetail,
  docType: string,
  field: string,
): number | null {
  const doc = shipment.documents.find((d) => d.doc_type === docType);
  const fields = doc?.extracted_data?.extracted_fields;
  if (fields && typeof fields === "object" && field in fields) {
    const val = (fields as unknown as Record<string, unknown>)[field];
    return typeof val === "number" ? val : null;
  }
  return null;
}

function getLatestResolvedDate(shipment: ShipmentDetail): string | null {
  let latest: string | null = null;
  for (const d of shipment.discrepancies) {
    if (d.resolved_at) {
      if (!latest || d.resolved_at > latest) {
        latest = d.resolved_at;
      }
    }
  }
  return latest;
}

function formatDateForCsv(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "";
  return d.toISOString().slice(0, 10);
}

function totalVariance(shipment: ShipmentDetail): { amount: number; pct: number | null } {
  let amount = 0;
  let pctSum = 0;
  let pctCount = 0;
  for (const d of shipment.discrepancies) {
    if (d.variance_amount != null) {
      amount += Math.abs(d.variance_amount);
    }
    if (d.variance_pct != null) {
      pctSum += d.variance_pct;
      pctCount++;
    }
  }
  return {
    amount: Math.round(amount * 100) / 100,
    pct: pctCount > 0 ? Math.round((pctSum / pctCount) * 10000) / 10000 : null,
  };
}

/* ------------------------------------------------------------------ */
/*  Public API                                                         */
/* ------------------------------------------------------------------ */

/** Returns the CSV header row (with CRLF line ending per RFC 4180). */
export function buildCsvHeader(): string {
  return CSV_COLUMNS.map(escapeCsvValue).join(",") + "\r\n";
}

/** Formats a single shipment detail into a CSV data row. */
export function formatShipmentCsvRow(shipment: ShipmentDetail): string {
  const invoiceTotal = extractAmount(shipment, "invoice", "total_amount");
  const rateConTotal = extractAmount(shipment, "rate_con", "total_amount");
  const variance = totalVariance(shipment);
  const resolvedDate = getLatestResolvedDate(shipment);

  const values: (string | number | null)[] = [
    shipment.shipment_ref,
    shipment.bol_number,
    shipment.pro_number,
    shipment.carrier_name,
    shipment.carrier_scac,
    shipment.origin,
    shipment.destination,
    shipment.shipper_name,
    shipment.consignee_name,
    invoiceTotal != null ? invoiceTotal.toFixed(2) : null,
    rateConTotal != null ? rateConTotal.toFixed(2) : null,
    variance.amount > 0 ? variance.amount.toFixed(2) : null,
    variance.pct != null ? `${(variance.pct * 100).toFixed(1)}%` : null,
    shipment.status,
    shipment.discrepancy_level,
    shipment.match_confidence != null ? `${shipment.match_confidence.toFixed(0)}%` : null,
    shipment.documents.length,
    formatDateForCsv(shipment.created_at),
    formatDateForCsv(resolvedDate),
  ];

  return values.map((v) => escapeCsvValue(v == null ? null : String(v))).join(",") + "\r\n";
}
