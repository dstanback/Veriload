import {
  CheckCircle,
  XCircle,
  Pencil,
  Upload,
  RefreshCw,
  Mail,
  FileBarChart,
  Download,
  type LucideIcon,
} from "lucide-react";

export interface AuditActionMeta {
  label: string;
  icon: LucideIcon;
  /** Tailwind text-color class */
  color: string;
  /** Tailwind bg-color class for the icon badge */
  bgColor: string;
}

const actionMap: Record<string, AuditActionMeta> = {
  shipment_approved: {
    label: "Shipment Approved",
    icon: CheckCircle,
    color: "text-emerald-600 dark:text-emerald-400",
    bgColor: "bg-emerald-100 dark:bg-emerald-900/30",
  },
  auto_approved: {
    label: "Auto-Approved",
    icon: CheckCircle,
    color: "text-emerald-600 dark:text-emerald-400",
    bgColor: "bg-emerald-100 dark:bg-emerald-900/30",
  },
  shipment_disputed: {
    label: "Shipment Disputed",
    icon: XCircle,
    color: "text-red-600 dark:text-red-400",
    bgColor: "bg-red-100 dark:bg-red-900/30",
  },
  disputed: {
    label: "Disputed",
    icon: XCircle,
    color: "text-red-600 dark:text-red-400",
    bgColor: "bg-red-100 dark:bg-red-900/30",
  },
  shipment_edit_approved: {
    label: "Edited & Approved",
    icon: Pencil,
    color: "text-indigo-600 dark:text-indigo-400",
    bgColor: "bg-indigo-100 dark:bg-indigo-900/30",
  },
  document_reprocessed: {
    label: "Document Reprocessed",
    icon: RefreshCw,
    color: "text-slate-600 dark:text-slate-400",
    bgColor: "bg-slate-100 dark:bg-slate-700/40",
  },
  email_ingested: {
    label: "Email Ingested",
    icon: Mail,
    color: "text-slate-600 dark:text-slate-400",
    bgColor: "bg-slate-100 dark:bg-slate-700/40",
  },
  daily_summary_generated: {
    label: "Summary Generated",
    icon: FileBarChart,
    color: "text-slate-600 dark:text-slate-400",
    bgColor: "bg-slate-100 dark:bg-slate-700/40",
  },
  data_exported: {
    label: "Data Exported",
    icon: Download,
    color: "text-slate-600 dark:text-slate-400",
    bgColor: "bg-slate-100 dark:bg-slate-700/40",
  },
};

const fallbackMeta: AuditActionMeta = {
  label: "Unknown Action",
  icon: RefreshCw,
  color: "text-slate-500 dark:text-slate-400",
  bgColor: "bg-slate-100 dark:bg-slate-700/40",
};

export function getAuditActionMeta(action: string): AuditActionMeta {
  const meta = actionMap[action];
  if (meta) return meta;

  // Fallback: convert snake_case to Title Case
  return {
    ...fallbackMeta,
    label: action
      .split("_")
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(" "),
  };
}

/** All known action keys for filter UI. */
export const KNOWN_ACTIONS = Object.keys(actionMap);
