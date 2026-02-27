export type DocumentSource = "email" | "upload" | "api";
export type DocumentStatus =
  | "pending"
  | "processing"
  | "extracted"
  | "failed"
  | "needs_review";
export type DocumentType = "bol" | "invoice" | "rate_con" | "pod" | "accessorial" | "unknown";

export interface DocConfidenceMap {
  [key: string]: number | DocConfidenceMap | null;
}

export interface LocationValue {
  city: string | null;
  state: string | null;
  zip: string | null;
}

export interface InvoiceLineItem {
  description: string;
  pieces: number | null;
  weight: number | null;
  weight_unit: string | null;
  rate: number | null;
  amount: number | null;
}

export interface AccessorialLine {
  code: string | null;
  description: string;
  amount: number;
}

export interface InvoiceExtraction {
  invoice_number: string | null;
  invoice_date: string | null;
  carrier_name: string | null;
  carrier_scac: string | null;
  bol_reference: string | null;
  pro_number: string | null;
  shipper_reference: string | null;
  origin: LocationValue;
  destination: LocationValue;
  line_items: InvoiceLineItem[];
  subtotal: number | null;
  fuel_surcharge: number | null;
  fuel_surcharge_pct: number | null;
  accessorials: AccessorialLine[];
  total_amount: number | null;
  payment_terms: string | null;
  remit_to: string | null;
  notes: string | null;
  extraction_warnings: string[];
}

export interface BolExtraction {
  bol_number: string | null;
  shipper_name: string | null;
  shipper_address: string | null;
  consignee_name: string | null;
  consignee_address: string | null;
  carrier_name: string | null;
  carrier_scac: string | null;
  pickup_date: string | null;
  delivery_date: string | null;
  pieces: number | null;
  weight: number | null;
  weight_unit: string | null;
  commodity_description: string | null;
  reference_numbers: string[];
  hazmat_flag: boolean | null;
  special_instructions: string | null;
  extraction_warnings: string[];
}

export interface RateConExtraction {
  rate_con_number: string | null;
  carrier_name: string | null;
  carrier_scac: string | null;
  origin: LocationValue;
  destination: LocationValue;
  agreed_rate: number | null;
  fuel_surcharge_pct: number | null;
  accessorial_schedule: Array<{
    code: string | null;
    description: string;
    amount: number | null;
  }>;
  effective_date: string | null;
  equipment_type: string | null;
  extraction_warnings: string[];
}

export interface PodExtraction {
  bol_reference: string | null;
  delivery_date: string | null;
  delivery_time: string | null;
  receiver_signature: "present" | "absent" | null;
  receiver_name: string | null;
  exception_notes: string | null;
  piece_count_confirmed: number | null;
  damage_notes: string | null;
  extraction_warnings: string[];
}

export interface UnknownExtraction {
  extraction_warnings: string[];
}

export type ExtractedFields =
  | InvoiceExtraction
  | BolExtraction
  | RateConExtraction
  | PodExtraction
  | UnknownExtraction;

export interface ExtractedDataRecord {
  id: string;
  document_id: string;
  doc_type: DocumentType;
  extracted_fields: ExtractedFields;
  field_confidences: DocConfidenceMap | null;
  raw_llm_response: Record<string, unknown> | null;
  extraction_model: string | null;
  extraction_cost_cents: number | null;
  created_at: string;
}

export interface DocumentRecord {
  id: string;
  organization_id: string;
  source: DocumentSource;
  source_metadata: Record<string, unknown>;
  original_filename: string | null;
  storage_path: string;
  mime_type: string;
  page_count: number | null;
  status: DocumentStatus;
  doc_type: DocumentType | null;
  doc_type_confidence: number | null;
  processing_error: string | null;
  created_at: string;
  processed_at: string | null;
  extracted_data?: ExtractedDataRecord | null;
}
