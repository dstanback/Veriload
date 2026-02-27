import type { DiscrepancyRecord } from "@/types/discrepancies";
import type { DocumentRecord } from "@/types/documents";

export type ShipmentStatus = "pending" | "matched" | "approved" | "disputed" | "paid";
export type DiscrepancyLevel = "green" | "yellow" | "red" | null;

export interface ShipmentRecord {
  id: string;
  organization_id: string;
  shipment_ref: string | null;
  bol_number: string | null;
  pro_number: string | null;
  shipper_name: string | null;
  consignee_name: string | null;
  carrier_name: string | null;
  carrier_scac: string | null;
  origin: string | null;
  destination: string | null;
  status: ShipmentStatus;
  match_confidence: number | null;
  discrepancy_level: DiscrepancyLevel;
  created_at: string;
  updated_at: string;
}

export interface ShipmentDocumentLink {
  shipment_id: string;
  document_id: string;
  role: "bol" | "invoice" | "rate_con" | "pod" | "accessorial" | "unknown";
}

export interface AuditLogRecord {
  id: string;
  organization_id: string;
  user_id: string | null;
  shipment_id: string | null;
  action: string;
  details: Record<string, unknown>;
  created_at: string;
}

export interface ShipmentDetail extends ShipmentRecord {
  documents: Array<DocumentRecord & { role: ShipmentDocumentLink["role"] }>;
  discrepancies: DiscrepancyRecord[];
}

export interface DashboardSummary {
  documentsProcessedToday: number;
  pendingReview: number;
  autoApproved: number;
  disputesOpen: number;
  discrepancyDistribution: {
    green: number;
    yellow: number;
    red: number;
  };
  recentActivity: AuditLogRecord[];
}
