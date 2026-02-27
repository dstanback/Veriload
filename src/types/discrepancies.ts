export type DiscrepancySeverity = "green" | "yellow" | "red";
export type DiscrepancyResolution = "auto_approved" | "manually_approved" | "disputed" | null;

export interface DiscrepancyRecord {
  id: string;
  shipment_id: string;
  field_name: string;
  source_doc_id: string | null;
  compare_doc_id: string | null;
  source_value: string | null;
  compare_value: string | null;
  variance_amount: number | null;
  variance_pct: number | null;
  severity: DiscrepancySeverity;
  resolution: DiscrepancyResolution;
  resolved_by: string | null;
  resolved_at: string | null;
  notes: string | null;
  created_at: string;
}
