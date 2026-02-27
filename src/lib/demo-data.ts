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

const now = new Date().toISOString();

const bolExtraction: BolExtraction = {
  bol_number: "BOL-482910",
  shipper_name: "Evergreen Foods",
  shipper_address: "12 Wharf Street, Savannah, GA 31401",
  consignee_name: "Metro Cold Storage",
  consignee_address: "992 Harbor Blvd, Newark, NJ 07114",
  carrier_name: "Redline Freight",
  carrier_scac: "RDLN",
  pickup_date: "2026-02-24",
  delivery_date: "2026-02-26",
  pieces: 22,
  weight: 42000,
  weight_unit: "lbs",
  commodity_description: "Frozen produce",
  reference_numbers: ["PO-88421", "LOAD-22911"],
  hazmat_flag: false,
  special_instructions: "Keep trailer set to -10F.",
  extraction_warnings: []
};

const invoiceExtraction: InvoiceExtraction = {
  invoice_number: "INV-90022",
  invoice_date: "2026-02-26",
  carrier_name: "Redline Freight",
  carrier_scac: "RDLN",
  bol_reference: "BOL-482910",
  pro_number: "PRO-88191",
  shipper_reference: "PO-88421",
  origin: {
    city: "Savannah",
    state: "GA",
    zip: "31401"
  },
  destination: {
    city: "Newark",
    state: "NJ",
    zip: "07114"
  },
  line_items: [
    {
      description: "Linehaul",
      pieces: 22,
      weight: 42000,
      weight_unit: "lbs",
      rate: 2550,
      amount: 2550
    }
  ],
  subtotal: 2550,
  fuel_surcharge: 191.25,
  fuel_surcharge_pct: 0.075,
  accessorials: [],
  total_amount: 2741.25,
  payment_terms: "Net 30",
  remit_to: "Redline Freight, PO Box 2208, Dallas, TX",
  notes: null,
  extraction_warnings: []
};

const rateConExtraction: RateConExtraction = {
  rate_con_number: "RC-2026-1188",
  carrier_name: "Redline Freight",
  carrier_scac: "RDLN",
  origin: {
    city: "Savannah",
    state: "GA",
    zip: "31401"
  },
  destination: {
    city: "Newark",
    state: "NJ",
    zip: "07114"
  },
  agreed_rate: 2741.25,
  fuel_surcharge_pct: 0.075,
  accessorial_schedule: [],
  effective_date: "2026-02-23",
  equipment_type: "Reefer",
  extraction_warnings: []
};

const podExtraction: PodExtraction = {
  bol_reference: "BOL-482910",
  delivery_date: "2026-02-26",
  delivery_time: "14:10",
  receiver_signature: "present",
  receiver_name: "J. Ramirez",
  exception_notes: null,
  piece_count_confirmed: 22,
  damage_notes: null,
  extraction_warnings: []
};

const discrepancyShipment2: InvoiceExtraction = {
  invoice_number: "INV-91104",
  invoice_date: "2026-02-25",
  carrier_name: "Atlas Haul",
  carrier_scac: "ATLS",
  bol_reference: "BOL-77104",
  pro_number: "PRO-21031",
  shipper_reference: "SO-1902",
  origin: {
    city: "Chicago",
    state: "IL",
    zip: "60607"
  },
  destination: {
    city: "Cleveland",
    state: "OH",
    zip: "44114"
  },
  line_items: [
    {
      description: "Linehaul",
      pieces: 16,
      weight: 18000,
      weight_unit: "lbs",
      rate: 1950,
      amount: 1950
    }
  ],
  subtotal: 1950,
  fuel_surcharge: 90,
  fuel_surcharge_pct: 0.05,
  accessorials: [
    {
      code: "DET",
      description: "Detention",
      amount: 200
    }
  ],
  total_amount: 2240,
  payment_terms: "Net 21",
  remit_to: "Atlas Haul, 100 Grant Ave, Chicago, IL",
  notes: "Driver delayed by consignee.",
  extraction_warnings: ["Unapproved detention charge detected."]
};

const bolShipment2: BolExtraction = {
  bol_number: "BOL-77104",
  shipper_name: "Midwest Plastics",
  shipper_address: "210 River Drive, Chicago, IL 60607",
  consignee_name: "Lakefront Fabrication",
  consignee_address: "88 Euclid Ave, Cleveland, OH 44114",
  carrier_name: "Atlas Haul",
  carrier_scac: "ATLS",
  pickup_date: "2026-02-23",
  delivery_date: "2026-02-24",
  pieces: 16,
  weight: 16500,
  weight_unit: "lbs",
  commodity_description: "Plastic pellets",
  reference_numbers: ["SO-1902"],
  hazmat_flag: false,
  special_instructions: null,
  extraction_warnings: []
};

function createExtractedData<T extends ExtractedDataRecord["extracted_fields"]>(
  id: string,
  documentId: string,
  docType: ExtractedDataRecord["doc_type"],
  extractedFields: T
): ExtractedDataRecord {
  return {
    id,
    document_id: documentId,
    doc_type: docType,
    extracted_fields: extractedFields,
    field_confidences: {
      overall: 0.92
    },
    raw_llm_response: {
      provider: "demo"
    },
    extraction_model: "heuristic-demo",
    extraction_cost_cents: 4,
    created_at: now
  };
}

const documents: DocumentRecord[] = [
  {
    id: "doc_bol_1",
    organization_id: "org_demo",
    source: "upload",
    source_metadata: {
      uploader: "ops@acmefreight.com"
    },
    original_filename: "evergreen_bol_482910.pdf",
    storage_path: ".veriload-storage/raw/doc_bol_1/evergreen_bol_482910.pdf",
    mime_type: "application/pdf",
    page_count: 1,
    status: "extracted",
    doc_type: "bol",
    doc_type_confidence: 0.98,
    processing_error: null,
    created_at: now,
    processed_at: now,
    extracted_data: createExtractedData("ed_bol_1", "doc_bol_1", "bol", bolExtraction)
  },
  {
    id: "doc_invoice_1",
    organization_id: "org_demo",
    source: "email",
    source_metadata: {
      sender: "billing@redlinefreight.com",
      subject: "Invoice INV-90022"
    },
    original_filename: "redline_invoice_90022.pdf",
    storage_path: ".veriload-storage/raw/doc_invoice_1/redline_invoice_90022.pdf",
    mime_type: "application/pdf",
    page_count: 1,
    status: "extracted",
    doc_type: "invoice",
    doc_type_confidence: 0.97,
    processing_error: null,
    created_at: now,
    processed_at: now,
    extracted_data: createExtractedData("ed_invoice_1", "doc_invoice_1", "invoice", invoiceExtraction)
  },
  {
    id: "doc_rate_1",
    organization_id: "org_demo",
    source: "upload",
    source_metadata: {
      uploader: "pricing@acmefreight.com"
    },
    original_filename: "rc_2026_1188.pdf",
    storage_path: ".veriload-storage/raw/doc_rate_1/rc_2026_1188.pdf",
    mime_type: "application/pdf",
    page_count: 1,
    status: "extracted",
    doc_type: "rate_con",
    doc_type_confidence: 0.95,
    processing_error: null,
    created_at: now,
    processed_at: now,
    extracted_data: createExtractedData("ed_rate_1", "doc_rate_1", "rate_con", rateConExtraction)
  },
  {
    id: "doc_pod_1",
    organization_id: "org_demo",
    source: "email",
    source_metadata: {
      sender: "dispatch@redlinefreight.com",
      subject: "POD - BOL-482910"
    },
    original_filename: "pod_bol_482910.jpg",
    storage_path: ".veriload-storage/raw/doc_pod_1/pod_bol_482910.jpg",
    mime_type: "image/jpeg",
    page_count: 1,
    status: "extracted",
    doc_type: "pod",
    doc_type_confidence: 0.93,
    processing_error: null,
    created_at: now,
    processed_at: now,
    extracted_data: createExtractedData("ed_pod_1", "doc_pod_1", "pod", podExtraction)
  },
  {
    id: "doc_bol_2",
    organization_id: "org_demo",
    source: "email",
    source_metadata: {
      sender: "loads@atlashaul.com",
      subject: "Load paperwork"
    },
    original_filename: "atlas_bol_77104.pdf",
    storage_path: ".veriload-storage/raw/doc_bol_2/atlas_bol_77104.pdf",
    mime_type: "application/pdf",
    page_count: 1,
    status: "extracted",
    doc_type: "bol",
    doc_type_confidence: 0.95,
    processing_error: null,
    created_at: now,
    processed_at: now,
    extracted_data: createExtractedData("ed_bol_2", "doc_bol_2", "bol", bolShipment2)
  },
  {
    id: "doc_invoice_2",
    organization_id: "org_demo",
    source: "email",
    source_metadata: {
      sender: "billing@atlashaul.com",
      subject: "Invoice INV-91104"
    },
    original_filename: "atlas_invoice_91104.pdf",
    storage_path: ".veriload-storage/raw/doc_invoice_2/atlas_invoice_91104.pdf",
    mime_type: "application/pdf",
    page_count: 1,
    status: "extracted",
    doc_type: "invoice",
    doc_type_confidence: 0.96,
    processing_error: null,
    created_at: now,
    processed_at: now,
    extracted_data: createExtractedData("ed_invoice_2", "doc_invoice_2", "invoice", discrepancyShipment2)
  }
];

const shipments: ShipmentRecord[] = [
  {
    id: "shp_1",
    organization_id: "org_demo",
    shipment_ref: "LOAD-22911",
    bol_number: "BOL-482910",
    pro_number: "PRO-88191",
    shipper_name: "Evergreen Foods",
    consignee_name: "Metro Cold Storage",
    carrier_name: "Redline Freight",
    carrier_scac: "RDLN",
    origin: "Savannah, GA",
    destination: "Newark, NJ",
    status: "approved",
    match_confidence: 96,
    discrepancy_level: "green",
    created_at: now,
    updated_at: now
  },
  {
    id: "shp_2",
    organization_id: "org_demo",
    shipment_ref: "SO-1902",
    bol_number: "BOL-77104",
    pro_number: "PRO-21031",
    shipper_name: "Midwest Plastics",
    consignee_name: "Lakefront Fabrication",
    carrier_name: "Atlas Haul",
    carrier_scac: "ATLS",
    origin: "Chicago, IL",
    destination: "Cleveland, OH",
    status: "disputed",
    match_confidence: 82,
    discrepancy_level: "red",
    created_at: now,
    updated_at: now
  },
  {
    id: "shp_3",
    organization_id: "org_demo",
    shipment_ref: "NEW-REVIEW-14",
    bol_number: null,
    pro_number: null,
    shipper_name: "Northline Beverage",
    consignee_name: "Portside Markets",
    carrier_name: "Summit Transit",
    carrier_scac: "SMTT",
    origin: "Memphis, TN",
    destination: "Birmingham, AL",
    status: "matched",
    match_confidence: 88,
    discrepancy_level: "yellow",
    created_at: now,
    updated_at: now
  }
];

const shipmentDocuments: ShipmentDocumentLink[] = [
  { shipment_id: "shp_1", document_id: "doc_bol_1", role: "bol" },
  { shipment_id: "shp_1", document_id: "doc_invoice_1", role: "invoice" },
  { shipment_id: "shp_1", document_id: "doc_rate_1", role: "rate_con" },
  { shipment_id: "shp_1", document_id: "doc_pod_1", role: "pod" },
  { shipment_id: "shp_2", document_id: "doc_bol_2", role: "bol" },
  { shipment_id: "shp_2", document_id: "doc_invoice_2", role: "invoice" }
];

const discrepancies: DiscrepancyRecord[] = [
  {
    id: "disc_1",
    shipment_id: "shp_1",
    field_name: "total_amount",
    source_doc_id: "doc_invoice_1",
    compare_doc_id: "doc_rate_1",
    source_value: "2741.25",
    compare_value: "2741.25",
    variance_amount: 0,
    variance_pct: 0,
    severity: "green",
    resolution: "auto_approved",
    resolved_by: null,
    resolved_at: now,
    notes: null,
    created_at: now
  },
  {
    id: "disc_2",
    shipment_id: "shp_2",
    field_name: "weight",
    source_doc_id: "doc_invoice_2",
    compare_doc_id: "doc_bol_2",
    source_value: "18000",
    compare_value: "16500",
    variance_amount: null,
    variance_pct: 0.0909,
    severity: "red",
    resolution: "disputed",
    resolved_by: null,
    resolved_at: null,
    notes: "Invoice weight is 9.1% above BoL.",
    created_at: now
  },
  {
    id: "disc_3",
    shipment_id: "shp_2",
    field_name: "accessorials",
    source_doc_id: "doc_invoice_2",
    compare_doc_id: null,
    source_value: "DET $200",
    compare_value: "Not approved",
    variance_amount: 200,
    variance_pct: null,
    severity: "red",
    resolution: "disputed",
    resolved_by: null,
    resolved_at: null,
    notes: "Detention is not on the rate confirmation.",
    created_at: now
  },
  {
    id: "disc_4",
    shipment_id: "shp_3",
    field_name: "dates",
    source_doc_id: null,
    compare_doc_id: null,
    source_value: "2026-02-24",
    compare_value: "2026-02-25",
    variance_amount: null,
    variance_pct: null,
    severity: "yellow",
    resolution: null,
    resolved_by: null,
    resolved_at: null,
    notes: "Delivery date differs by one day across documents.",
    created_at: now
  }
];

const auditLog: AuditLogRecord[] = [
  {
    id: "audit_1",
    organization_id: "org_demo",
    user_id: "user_demo",
    shipment_id: "shp_1",
    action: "auto_approved",
    details: {
      confidence: 96
    },
    created_at: now
  },
  {
    id: "audit_2",
    organization_id: "org_demo",
    user_id: "user_demo",
    shipment_id: "shp_2",
    action: "disputed",
    details: {
      reason: "Invoice exceeds approved charges."
    },
    created_at: now
  }
];

export const defaultDevStore = {
  organizations: [
    {
      id: "org_demo",
      name: "Acme Logistics",
      slug: "acme-logistics",
      settings: {
        autoApproveEnabled: true,
        autoApproveConfidenceThreshold: 90,
        tolerances: {
          amount: { green: 0, yellow: 0.02 },
          weight: { green: 0.02, yellow: 0.05 }
        }
      },
      created_at: now,
      updated_at: now
    }
  ],
  users: [
    {
      id: "user_demo",
      organization_id: "org_demo",
      email: "ops@acmefreight.com",
      name: "Maya Patel",
      role: "manager",
      created_at: now
    }
  ],
  documents,
  shipments,
  shipment_documents: shipmentDocuments,
  discrepancies,
  audit_log: auditLog
};

export type DevStoreShape = typeof defaultDevStore;
