import type { DiscrepancyRecord } from "@/types/discrepancies";
import type {
  BolExtraction,
  DocumentRecord,
  ExtractedDataRecord,
  InvoiceExtraction,
  PodExtraction,
  RateConExtraction
} from "@/types/documents";
import type { AuditLogRecord, ShipmentDocumentLink, ShipmentRecord } from "@/types/shipments";

/* ---------- helpers ---------- */

function daysAgo(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString();
}

function dateStr(daysBack: number): string {
  const d = new Date();
  d.setDate(d.getDate() - daysBack);
  return d.toISOString().slice(0, 10);
}

let idCounter = 0;
function uid(prefix: string): string {
  idCounter += 1;
  return `${prefix}_${String(idCounter).padStart(3, "0")}`;
}

function extractedData<T extends ExtractedDataRecord["extracted_fields"]>(
  id: string,
  documentId: string,
  docType: ExtractedDataRecord["doc_type"],
  fields: T,
  confidence = 0.92,
  createdAt?: string
): ExtractedDataRecord {
  return {
    id,
    document_id: documentId,
    doc_type: docType,
    extracted_fields: fields,
    field_confidences: { overall: confidence },
    raw_llm_response: { provider: "demo-seed" },
    extraction_model: "heuristic-demo",
    extraction_cost_cents: 3.5,
    created_at: createdAt ?? daysAgo(0)
  };
}

function doc(
  id: string,
  docType: DocumentRecord["doc_type"],
  filename: string,
  source: DocumentRecord["source"],
  status: DocumentRecord["status"],
  confidence: number,
  ed: ExtractedDataRecord | null,
  createdAt: string
): DocumentRecord {
  return {
    id,
    organization_id: "org_demo",
    source,
    source_metadata: source === "email"
      ? { sender: `billing@carrier.com`, subject: filename }
      : { uploader: "ops@acmefreight.com" },
    original_filename: filename,
    storage_path: `.veriload-storage/raw/${id}/${filename}`,
    mime_type: filename.endsWith(".jpg") || filename.endsWith(".png") ? "image/jpeg" : "application/pdf",
    page_count: 1,
    status,
    doc_type: docType,
    doc_type_confidence: confidence,
    processing_error: status === "failed" ? "Timeout during extraction." : null,
    created_at: createdAt,
    processed_at: status === "extracted" || status === "needs_review" ? createdAt : null,
    extracted_data: ed
  };
}

/* ---------- Carriers ---------- */

const carriers = [
  { name: "Schneider National", scac: "SNLU" },
  { name: "J.B. Hunt Transport", scac: "JBHT" },
  { name: "Old Dominion Freight", scac: "ODFL" },
  { name: "FedEx Freight", scac: "FXFE" },
  { name: "XPO Logistics", scac: "CNWY" },
  { name: "Saia Inc", scac: "SAIA" },
  { name: "Estes Express Lines", scac: "EXLA" },
  { name: "Werner Enterprises", scac: "WERN" },
  { name: "Heartland Express", scac: "HTLD" },
  { name: "ABF Freight System", scac: "ABFS" },
  { name: "Redline Freight", scac: "RDLN" },
  { name: "Atlas Haul", scac: "ATLS" },
  { name: "Summit Transit", scac: "SMTT" },
  { name: "Central Transport", scac: "CTII" }
];

/* ---------- Lanes ---------- */

const lanes = [
  { origin: "Chicago, IL", destination: "Dallas, TX", shipper: "Midwest Industrial Supply", consignee: "Lone Star Distribution" },
  { origin: "Los Angeles, CA", destination: "Phoenix, AZ", shipper: "Pacific Coast Ingredients", consignee: "Desert Valley Foods" },
  { origin: "Atlanta, GA", destination: "Charlotte, NC", shipper: "Peachtree Manufacturing", consignee: "Carolina Components" },
  { origin: "Houston, TX", destination: "Memphis, TN", shipper: "Gulf Petrochemicals", consignee: "Bluff City Warehousing" },
  { origin: "Seattle, WA", destination: "Portland, OR", shipper: "Cascade Electronics", consignee: "Rose City Micro" },
  { origin: "Newark, NJ", destination: "Boston, MA", shipper: "Harbor Point Imports", consignee: "Bay State Retail" },
  { origin: "Detroit, MI", destination: "Columbus, OH", shipper: "Motor City Parts", consignee: "Buckeye Assembly" },
  { origin: "Savannah, GA", destination: "Nashville, TN", shipper: "Evergreen Foods", consignee: "Music City Cold Storage" },
  { origin: "Denver, CO", destination: "Salt Lake City, UT", shipper: "Rocky Mountain Materials", consignee: "Wasatch Building Supply" },
  { origin: "Minneapolis, MN", destination: "Milwaukee, WI", shipper: "Twin Cities Paper", consignee: "Brew City Printing" },
  { origin: "Tampa, FL", destination: "Miami, FL", shipper: "Sunshine Beverages", consignee: "South Beach Hospitality" },
  { origin: "Kansas City, MO", destination: "St. Louis, MO", shipper: "Heartland Grain Co.", consignee: "Gateway Flour Mills" },
  { origin: "Philadelphia, PA", destination: "Pittsburgh, PA", shipper: "Liberty Chemical Corp", consignee: "Steel City Plastics" },
  { origin: "San Antonio, TX", destination: "Austin, TX", shipper: "Alamo Auto Parts", consignee: "Capitol Motors" }
];

/* ---------- Shipment definitions ---------- */

interface ShipmentDef {
  bolNum: string;
  proNum: string;
  ref: string;
  carrier: typeof carriers[number];
  lane: typeof lanes[number];
  status: ShipmentRecord["status"];
  discrepancyLevel: ShipmentRecord["discrepancy_level"];
  matchConfidence: number;
  daysBack: number;
  weight: number;
  pieces: number;
  commodity: string;
  linehaul: number;
  fuelPct: number;
  agreedRate: number | null;
  invoiceTotal: number;
  accessorials: Array<{ code: string; description: string; amount: number }>;
  podReceiver: string | null;
  hasPod: boolean;
  hasRateCon: boolean;
  docStatuses?: Partial<Record<string, DocumentRecord["status"]>>;
}

const shipmentDefs: ShipmentDef[] = [
  // === GREEN shipments (5) ===
  {
    bolNum: "BOL-2024-00101", proNum: "PRO-441928001", ref: "LOAD-40101",
    carrier: carriers[0], lane: lanes[0],
    status: "approved", discrepancyLevel: "green", matchConfidence: 97, daysBack: 45,
    weight: 38000, pieces: 18, commodity: "Industrial machinery parts",
    linehaul: 3200, fuelPct: 0.065, agreedRate: 3408, invoiceTotal: 3408,
    accessorials: [], podReceiver: "T. Henderson", hasPod: true, hasRateCon: true
  },
  {
    bolNum: "BOL-2024-00102", proNum: "PRO-551839002", ref: "LOAD-40102",
    carrier: carriers[1], lane: lanes[1],
    status: "approved", discrepancyLevel: "green", matchConfidence: 96, daysBack: 40,
    weight: 22000, pieces: 44, commodity: "Organic food ingredients",
    linehaul: 1850, fuelPct: 0.07, agreedRate: 1979.50, invoiceTotal: 1979.50,
    accessorials: [], podReceiver: "M. Garcia", hasPod: true, hasRateCon: true
  },
  {
    bolNum: "BOL-2024-00103", proNum: "PRO-662740003", ref: "LOAD-40103",
    carrier: carriers[2], lane: lanes[2],
    status: "approved", discrepancyLevel: "green", matchConfidence: 98, daysBack: 35,
    weight: 8500, pieces: 12, commodity: "Precision machined components",
    linehaul: 980, fuelPct: 0.06, agreedRate: 1038.80, invoiceTotal: 1038.80,
    accessorials: [], podReceiver: "D. Robinson", hasPod: true, hasRateCon: true
  },
  {
    bolNum: "BOL-2024-00104", proNum: "PRO-773651004", ref: "LOAD-40104",
    carrier: carriers[3], lane: lanes[3],
    status: "paid", discrepancyLevel: "green", matchConfidence: 95, daysBack: 55,
    weight: 42000, pieces: 6, commodity: "Chemical drums — non-hazmat",
    linehaul: 2700, fuelPct: 0.08, agreedRate: 2916, invoiceTotal: 2916,
    accessorials: [], podReceiver: "J. Walker", hasPod: true, hasRateCon: true
  },
  {
    bolNum: "BOL-2024-00105", proNum: "PRO-884562005", ref: "LOAD-40105",
    carrier: carriers[4], lane: lanes[4],
    status: "approved", discrepancyLevel: "green", matchConfidence: 94, daysBack: 28,
    weight: 4200, pieces: 32, commodity: "Consumer electronics",
    linehaul: 620, fuelPct: 0.055, agreedRate: 654.10, invoiceTotal: 654.10,
    accessorials: [], podReceiver: "K. Tanaka", hasPod: false, hasRateCon: true
  },
  // === YELLOW shipments (4) ===
  {
    bolNum: "BOL-2024-00106", proNum: "PRO-995473006", ref: "LOAD-40106",
    carrier: carriers[5], lane: lanes[5],
    status: "matched", discrepancyLevel: "yellow", matchConfidence: 88, daysBack: 18,
    weight: 15000, pieces: 28, commodity: "Imported consumer goods",
    linehaul: 1400, fuelPct: 0.065, agreedRate: 1491, invoiceTotal: 1510.25,
    accessorials: [], podReceiver: "A. Sullivan", hasPod: true, hasRateCon: true
  },
  {
    bolNum: "BOL-2024-00107", proNum: "PRO-106384007", ref: "LOAD-40107",
    carrier: carriers[6], lane: lanes[6],
    status: "matched", discrepancyLevel: "yellow", matchConfidence: 85, daysBack: 14,
    weight: 26000, pieces: 8, commodity: "Automotive body panels",
    linehaul: 1100, fuelPct: 0.07, agreedRate: 1177, invoiceTotal: 1177,
    accessorials: [], podReceiver: null, hasPod: false, hasRateCon: true,
  },
  {
    bolNum: "BOL-2024-00108", proNum: "PRO-217295008", ref: "LOAD-40108",
    carrier: carriers[7], lane: lanes[7],
    status: "matched", discrepancyLevel: "yellow", matchConfidence: 86, daysBack: 10,
    weight: 36000, pieces: 20, commodity: "Frozen produce",
    linehaul: 2400, fuelPct: 0.075, agreedRate: 2580, invoiceTotal: 2580,
    accessorials: [{ code: "REEFER", description: "Reefer fuel surcharge", amount: 185 }],
    podReceiver: "L. Kim", hasPod: true, hasRateCon: true,
  },
  {
    bolNum: "BOL-2024-00109", proNum: "PRO-328106009", ref: "LOAD-40109",
    carrier: carriers[8], lane: lanes[8],
    status: "pending", discrepancyLevel: "yellow", matchConfidence: 78, daysBack: 5,
    weight: 18000, pieces: 40, commodity: "Construction materials",
    linehaul: 1650, fuelPct: 0.06, agreedRate: null, invoiceTotal: 1749,
    accessorials: [], podReceiver: null, hasPod: false, hasRateCon: false
  },
  // === RED shipments (3) ===
  {
    bolNum: "BOL-2024-00110", proNum: "PRO-439017010", ref: "LOAD-40110",
    carrier: carriers[9], lane: lanes[9],
    status: "disputed", discrepancyLevel: "red", matchConfidence: 82, daysBack: 22,
    weight: 12000, pieces: 16, commodity: "Printing paper rolls",
    linehaul: 850, fuelPct: 0.065, agreedRate: 905.25, invoiceTotal: 1040,
    accessorials: [{ code: "DET", description: "Detention — 3 hours", amount: 225 }],
    podReceiver: "R. Olsen", hasPod: true, hasRateCon: true,
  },
  {
    bolNum: "BOL-2024-00111", proNum: "PRO-540928011", ref: "LOAD-40111",
    carrier: carriers[10], lane: lanes[10],
    status: "disputed", discrepancyLevel: "red", matchConfidence: 79, daysBack: 12,
    weight: 30000, pieces: 48, commodity: "Bottled beverages",
    linehaul: 1100, fuelPct: 0.07, agreedRate: 1177, invoiceTotal: 1450,
    accessorials: [
      { code: "LFGT", description: "Liftgate delivery", amount: 125 },
      { code: "INSD", description: "Inside delivery", amount: 150 }
    ],
    podReceiver: "C. Morales", hasPod: true, hasRateCon: true,
  },
  {
    bolNum: "BOL-2024-00112", proNum: "PRO-651839012", ref: "LOAD-40112",
    carrier: carriers[11], lane: lanes[11],
    status: "disputed", discrepancyLevel: "red", matchConfidence: 75, daysBack: 8,
    weight: 44000, pieces: 10, commodity: "Bulk grain",
    linehaul: 780, fuelPct: 0.06, agreedRate: 826.80, invoiceTotal: 826.80,
    accessorials: [], podReceiver: "P. Nguyen", hasPod: true, hasRateCon: true,
  },
  // === PENDING shipments (2) — partial docs ===
  {
    bolNum: "BOL-2024-00113", proNum: "PRO-762740013", ref: "LOAD-40113",
    carrier: carriers[12], lane: lanes[12],
    status: "pending", discrepancyLevel: null, matchConfidence: 65, daysBack: 3,
    weight: 9000, pieces: 6, commodity: "Laboratory chemicals — non-hazmat",
    linehaul: 950, fuelPct: 0.065, agreedRate: null, invoiceTotal: 950,
    accessorials: [], podReceiver: null, hasPod: false, hasRateCon: false,
    docStatuses: { bol: "extracted", invoice: "pending" }
  },
  {
    bolNum: "BOL-2024-00114", proNum: "PRO-873651014", ref: "LOAD-40114",
    carrier: carriers[13], lane: lanes[13],
    status: "pending", discrepancyLevel: null, matchConfidence: 60, daysBack: 1,
    weight: 5500, pieces: 22, commodity: "Auto replacement parts",
    linehaul: 420, fuelPct: 0.06, agreedRate: null, invoiceTotal: 420,
    accessorials: [], podReceiver: null, hasPod: false, hasRateCon: false,
    docStatuses: { bol: "needs_review" }
  }
];

/* ---------- Build all entities ---------- */

const documents: DocumentRecord[] = [];
const shipments: ShipmentRecord[] = [];
const shipmentDocuments: ShipmentDocumentLink[] = [];
const discrepancies: DiscrepancyRecord[] = [];
const auditLog: AuditLogRecord[] = [];

for (let i = 0; i < shipmentDefs.length; i++) {
  const s = shipmentDefs[i];
  const shpId = uid("shp");
  const created = daysAgo(s.daysBack);
  const updated = daysAgo(Math.max(0, s.daysBack - 2));

  shipments.push({
    id: shpId,
    organization_id: "org_demo",
    shipment_ref: s.ref,
    bol_number: s.bolNum,
    pro_number: s.proNum,
    shipper_name: s.lane.shipper,
    consignee_name: s.lane.consignee,
    carrier_name: s.carrier.name,
    carrier_scac: s.carrier.scac,
    origin: s.lane.origin,
    destination: s.lane.destination,
    status: s.status,
    match_confidence: s.matchConfidence,
    discrepancy_level: s.discrepancyLevel,
    created_at: created,
    updated_at: updated
  });

  // --- BOL document ---
  const bolDocId = uid("doc");
  const bolEdId = uid("ed");
  const bolStatus = s.docStatuses?.bol ?? "extracted";
  const bolConfidence = bolStatus === "needs_review" ? 0.62 : 0.96;
  const bolFields: BolExtraction = {
    bol_number: s.bolNum,
    shipper_name: s.lane.shipper,
    shipper_address: `${s.lane.origin}`,
    consignee_name: s.lane.consignee,
    consignee_address: `${s.lane.destination}`,
    carrier_name: s.carrier.name,
    carrier_scac: s.carrier.scac,
    pickup_date: dateStr(s.daysBack),
    delivery_date: s.hasPod ? dateStr(s.daysBack - 2) : null,
    pieces: s.pieces,
    weight: s.weight,
    weight_unit: "lbs",
    commodity_description: s.commodity,
    reference_numbers: [s.ref],
    hazmat_flag: false,
    special_instructions: null,
    extraction_warnings: bolStatus === "needs_review" ? ["Low confidence classification."] : []
  };
  documents.push(doc(
    bolDocId, "bol",
    `${s.carrier.scac.toLowerCase()}_bol_${s.bolNum.replace(/[^0-9]/g, "")}.pdf`,
    i % 3 === 0 ? "email" : "upload", bolStatus, bolConfidence,
    bolStatus === "extracted" || bolStatus === "needs_review"
      ? extractedData(bolEdId, bolDocId, "bol", bolFields, bolConfidence * 0.95, created)
      : null,
    created
  ));
  shipmentDocuments.push({ shipment_id: shpId, document_id: bolDocId, role: "bol" });

  // --- Invoice document ---
  const invDocId = uid("doc");
  const invEdId = uid("ed");
  const invStatus = s.docStatuses?.invoice ?? "extracted";
  const fuelAmount = parseFloat((s.linehaul * s.fuelPct).toFixed(2));
  const accTotal = s.accessorials.reduce((sum, a) => sum + a.amount, 0);
  const invFields: InvoiceExtraction = {
    invoice_number: `INV-${90000 + i + 1}`,
    invoice_date: dateStr(s.daysBack - 1),
    carrier_name: s.carrier.name,
    carrier_scac: s.carrier.scac,
    bol_reference: s.bolNum,
    pro_number: s.proNum,
    shipper_reference: s.ref,
    origin: { city: s.lane.origin.split(",")[0], state: s.lane.origin.split(",")[1]?.trim() ?? null, zip: null },
    destination: { city: s.lane.destination.split(",")[0], state: s.lane.destination.split(",")[1]?.trim() ?? null, zip: null },
    line_items: [{
      description: "Linehaul",
      pieces: s.pieces,
      weight: s.weight,
      weight_unit: "lbs",
      rate: s.linehaul,
      amount: s.linehaul
    }],
    subtotal: s.linehaul,
    fuel_surcharge: fuelAmount,
    fuel_surcharge_pct: s.fuelPct,
    accessorials: s.accessorials,
    total_amount: s.invoiceTotal,
    payment_terms: "Net 30",
    remit_to: `${s.carrier.name}, PO Box ${1000 + i}, Dallas, TX`,
    notes: null,
    extraction_warnings: []
  };
  if (invStatus !== "pending") {
    documents.push(doc(
      invDocId, "invoice",
      `${s.carrier.scac.toLowerCase()}_invoice_${90000 + i + 1}.pdf`,
      "email", invStatus, 0.97,
      extractedData(invEdId, invDocId, "invoice", invFields, 0.94, created),
      created
    ));
    shipmentDocuments.push({ shipment_id: shpId, document_id: invDocId, role: "invoice" });
  }

  // --- Rate Confirmation ---
  if (s.hasRateCon && s.agreedRate != null) {
    const rcDocId = uid("doc");
    const rcEdId = uid("ed");
    const rcFields: RateConExtraction = {
      rate_con_number: `RC-2024-${5000 + i + 1}`,
      carrier_name: s.carrier.name,
      carrier_scac: s.carrier.scac,
      origin: { city: s.lane.origin.split(",")[0], state: s.lane.origin.split(",")[1]?.trim() ?? null, zip: null },
      destination: { city: s.lane.destination.split(",")[0], state: s.lane.destination.split(",")[1]?.trim() ?? null, zip: null },
      agreed_rate: s.agreedRate,
      fuel_surcharge_pct: s.fuelPct,
      accessorial_schedule: s.discrepancyLevel === "red" && s.accessorials.length > 0
        ? []
        : s.accessorials.map((a) => ({ code: a.code, description: a.description, amount: a.amount })),
      effective_date: dateStr(s.daysBack + 3),
      equipment_type: s.commodity.includes("Frozen") || s.commodity.includes("produce") ? "Reefer" : "Dry Van",
      extraction_warnings: []
    };
    documents.push(doc(
      rcDocId, "rate_con",
      `rc_${5000 + i + 1}.pdf`,
      "upload", "extracted", 0.95,
      extractedData(rcEdId, rcDocId, "rate_con", rcFields, 0.93, created),
      created
    ));
    shipmentDocuments.push({ shipment_id: shpId, document_id: rcDocId, role: "rate_con" });

    // Discrepancy: total_amount (invoice vs rate con)
    const amtVariance = s.invoiceTotal - s.agreedRate;
    const amtPct = s.agreedRate > 0 ? amtVariance / s.agreedRate : 0;
    const amtSeverity = Math.abs(amtPct) <= 0.001 ? "green" : Math.abs(amtPct) <= 0.02 ? "yellow" : "red";
    discrepancies.push({
      id: uid("disc"), shipment_id: shpId,
      field_name: "total_amount",
      source_doc_id: invDocId, compare_doc_id: rcDocId,
      source_value: s.invoiceTotal.toString(), compare_value: s.agreedRate.toString(),
      variance_amount: parseFloat(amtVariance.toFixed(2)),
      variance_pct: parseFloat(amtPct.toFixed(4)),
      severity: amtSeverity as "green" | "yellow" | "red",
      resolution: s.status === "approved" || s.status === "paid" ? "auto_approved"
        : s.status === "disputed" ? "disputed" : null,
      resolved_by: null,
      resolved_at: s.status === "approved" || s.status === "paid" || s.status === "disputed" ? updated : null,
      notes: amtSeverity === "red" ? `Invoice total exceeds agreed rate by ${(amtPct * 100).toFixed(1)}%.` : null,
      created_at: created
    });

    // Discrepancy: unapproved accessorials
    for (const acc of s.accessorials) {
      const approvedCodes = rcFields.accessorial_schedule.map((a) => a.code);
      const isApproved = approvedCodes.includes(acc.code);
      discrepancies.push({
        id: uid("disc"), shipment_id: shpId,
        field_name: "accessorials",
        source_doc_id: invDocId, compare_doc_id: rcDocId,
        source_value: `${acc.code} $${acc.amount}`,
        compare_value: isApproved ? "Approved" : "Not approved",
        variance_amount: acc.amount,
        variance_pct: null,
        severity: isApproved ? "green" : "red",
        resolution: s.status === "disputed" ? "disputed" : null,
        resolved_by: null,
        resolved_at: s.status === "disputed" ? updated : null,
        notes: isApproved ? null : `Accessorial ${acc.code} is not on the approved schedule.`,
        created_at: created
      });
    }
  }

  // --- BOL vs Invoice weight discrepancy ---
  if (invStatus !== "pending") {
    // For yellow shipments #7 (index 6): BOL weight differs from invoice weight
    const invoiceWeight = s.weight;
    let bolWeight = s.weight;
    if (i === 6) bolWeight = s.weight - 350;      // yellow: 350 lbs off
    if (i === 11) bolWeight = s.weight - 4400;     // red: 10% off on grain shipment

    if (bolWeight !== invoiceWeight) {
      const weightPct = (invoiceWeight - bolWeight) / bolWeight;
      discrepancies.push({
        id: uid("disc"), shipment_id: shpId,
        field_name: "weight",
        source_doc_id: invDocId, compare_doc_id: bolDocId,
        source_value: invoiceWeight.toString(), compare_value: bolWeight.toString(),
        variance_amount: null,
        variance_pct: parseFloat(weightPct.toFixed(4)),
        severity: Math.abs(weightPct) <= 0.02 ? "green" : Math.abs(weightPct) <= 0.05 ? "yellow" : "red",
        resolution: s.status === "disputed" ? "disputed" : null,
        resolved_by: null,
        resolved_at: s.status === "disputed" ? updated : null,
        notes: Math.abs(weightPct) > 0.05 ? `Weight variance ${(weightPct * 100).toFixed(1)}% exceeds tolerance.` : null,
        created_at: created
      });
    }
  }

  // --- POD document ---
  if (s.hasPod && s.podReceiver) {
    const podDocId = uid("doc");
    const podEdId = uid("ed");
    // For red shipment #12 (index 11): POD shows wrong destination
    const podDestMismatch = i === 11;
    const podFields: PodExtraction = {
      bol_reference: s.bolNum,
      delivery_date: dateStr(s.daysBack - 2),
      delivery_time: `${10 + (i % 8)}:${15 + (i * 7) % 45}`,
      receiver_signature: "present",
      receiver_name: s.podReceiver,
      exception_notes: podDestMismatch ? "Delivered to Gateway Flour Mills — Jefferson City facility, NOT St. Louis" : null,
      piece_count_confirmed: podDestMismatch ? s.pieces - 2 : s.pieces,
      damage_notes: i === 10 ? "Minor denting on 3 cases noted at delivery." : null,
      extraction_warnings: []
    };
    documents.push(doc(
      podDocId, "pod",
      `pod_${s.bolNum.replace(/[^0-9]/g, "")}.jpg`,
      "email", "extracted", 0.91,
      extractedData(podEdId, podDocId, "pod", podFields, 0.88, created),
      created
    ));
    shipmentDocuments.push({ shipment_id: shpId, document_id: podDocId, role: "pod" });

    // Piece count discrepancy from POD
    if (podDestMismatch) {
      discrepancies.push({
        id: uid("disc"), shipment_id: shpId,
        field_name: "pieces",
        source_doc_id: bolDocId, compare_doc_id: podDocId,
        source_value: s.pieces.toString(), compare_value: (s.pieces - 2).toString(),
        variance_amount: null, variance_pct: null,
        severity: "red",
        resolution: "disputed",
        resolved_by: null,
        resolved_at: updated,
        notes: "POD confirms 2 fewer pieces than BOL. Shortage claim initiated.",
        created_at: created
      });
    }
  }

  // --- Audit log entries ---
  // Document upload
  auditLog.push({
    id: uid("audit"), organization_id: "org_demo",
    user_id: "user_admin", shipment_id: shpId,
    action: "document_uploaded",
    details: { filename: `bol_${s.bolNum}`, docType: "bol" },
    created_at: created
  });

  // Status changes
  if (s.status === "matched" || s.status === "approved" || s.status === "paid" || s.status === "disputed") {
    auditLog.push({
      id: uid("audit"), organization_id: "org_demo",
      user_id: null, shipment_id: shpId,
      action: "status_changed",
      details: { from: "pending", to: "matched", trigger: "reconciliation" },
      created_at: daysAgo(s.daysBack - 1)
    });
  }

  if (s.status === "approved") {
    auditLog.push({
      id: uid("audit"), organization_id: "org_demo",
      user_id: null, shipment_id: shpId,
      action: "auto_approved",
      details: { confidence: s.matchConfidence, threshold: 90 },
      created_at: updated
    });
  }

  if (s.status === "paid") {
    auditLog.push({
      id: uid("audit"), organization_id: "org_demo",
      user_id: null, shipment_id: shpId,
      action: "auto_approved",
      details: { confidence: s.matchConfidence, threshold: 90 },
      created_at: daysAgo(s.daysBack - 3)
    });
    auditLog.push({
      id: uid("audit"), organization_id: "org_demo",
      user_id: "user_admin", shipment_id: shpId,
      action: "marked_paid",
      details: { paymentRef: `PAY-${70000 + i}` },
      created_at: daysAgo(s.daysBack - 5)
    });
  }

  if (s.status === "disputed") {
    auditLog.push({
      id: uid("audit"), organization_id: "org_demo",
      user_id: "user_analyst", shipment_id: shpId,
      action: "disputed",
      details: {
        reason: s.accessorials.length > 0
          ? "Unapproved accessorial charges on invoice."
          : "Invoice discrepancy exceeds acceptable tolerance."
      },
      created_at: updated
    });
  }
}

/* ---------- Export ---------- */

export const defaultDevStore = {
  organizations: [
    {
      id: "org_demo",
      name: "Acme Logistics Co.",
      slug: "acme-logistics",
      settings: {
        autoApproveEnabled: true,
        autoApproveConfidenceThreshold: 90,
        tolerances: {
          amount: { green: 0, yellow: 0.02 },
          weight: { green: 0.02, yellow: 0.05 }
        }
      },
      created_at: daysAgo(90),
      updated_at: daysAgo(0)
    }
  ],
  users: [
    {
      id: "user_admin",
      organization_id: "org_demo",
      email: "ops@acmefreight.com",
      name: "Maya Patel",
      role: "admin",
      created_at: daysAgo(90)
    },
    {
      id: "user_analyst",
      organization_id: "org_demo",
      email: "analyst@acmefreight.com",
      name: "James Chen",
      role: "analyst",
      created_at: daysAgo(60)
    },
    {
      id: "user_reviewer",
      organization_id: "org_demo",
      email: "reviewer@acmefreight.com",
      name: "Sarah Thompson",
      role: "viewer",
      created_at: daysAgo(45)
    }
  ],
  documents,
  shipments,
  shipment_documents: shipmentDocuments,
  discrepancies,
  audit_log: auditLog
};

export type DevStoreShape = typeof defaultDevStore;
