"use client";

import { AnimatePresence, motion } from "framer-motion";
import {
  ChevronLeft,
  ChevronRight,
  FileText,
  Info,
  Mail,
  Minus,
  Plus,
  X,
  ZoomIn,
} from "lucide-react";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn, formatDate } from "@/lib/utils";
import type { DiscrepancyRecord } from "@/types/discrepancies";
import type { DocumentRecord, DocumentType } from "@/types/documents";

/* ------------------------------------------------------------------ */
/*  Types                                                             */
/* ------------------------------------------------------------------ */

interface DocumentViewerModalProps {
  document: DocumentRecord & { role: string };
  discrepancies: DiscrepancyRecord[];
  onClose: () => void;
}

interface DocumentApiResponse {
  document: DocumentRecord;
  extractedData: DocumentRecord["extracted_data"];
  pageImageUrls: string[];
}

/* ------------------------------------------------------------------ */
/*  Field category definitions                                        */
/* ------------------------------------------------------------------ */

interface FieldDef {
  key: string;
  label: string;
}

const BOL_FIELDS: FieldDef[] = [
  { key: "shipper_name", label: "Shipper" },
  { key: "consignee_name", label: "Consignee" },
  { key: "carrier_name", label: "Carrier" },
  { key: "carrier_scac", label: "SCAC" },
  { key: "bol_number", label: "BOL #" },
  { key: "weight", label: "Weight" },
  { key: "pieces", label: "Pieces" },
  { key: "commodity_description", label: "Commodity" },
  { key: "shipper_address", label: "Origin" },
  { key: "consignee_address", label: "Destination" },
];

const INVOICE_FIELDS: FieldDef[] = [
  { key: "carrier_name", label: "Carrier" },
  { key: "invoice_number", label: "Invoice #" },
  { key: "bol_reference", label: "BOL Reference" },
  { key: "line_items", label: "Line Items" },
  { key: "fuel_surcharge", label: "Fuel Surcharge" },
  { key: "total_amount", label: "Total" },
];

const RATE_CON_FIELDS: FieldDef[] = [
  { key: "agreed_rate", label: "Agreed Rate" },
  { key: "fuel_surcharge_pct", label: "Fuel Surcharge" },
  { key: "accessorial_schedule", label: "Accessorials" },
  { key: "effective_date", label: "Effective Date" },
];

const POD_FIELDS: FieldDef[] = [
  { key: "delivery_date", label: "Delivery Date" },
  { key: "receiver_name", label: "Receiver" },
  { key: "receiver_signature", label: "Signature Status" },
  { key: "exception_notes", label: "Condition Notes" },
];

const FIELD_MAP: Record<string, FieldDef[]> = {
  bol: BOL_FIELDS,
  invoice: INVOICE_FIELDS,
  rate_con: RATE_CON_FIELDS,
  pod: POD_FIELDS,
};

/* ------------------------------------------------------------------ */
/*  Helpers                                                           */
/* ------------------------------------------------------------------ */

function getConfidenceColor(score: number | undefined | null): string {
  if (score == null) return "bg-slate-300";
  if (score >= 80) return "bg-emerald-500";
  if (score >= 50) return "bg-amber-500";
  return "bg-rose-500";
}

function getSeverityBorderColor(severity: string): string {
  if (severity === "red") return "border-l-rose-500";
  if (severity === "yellow") return "border-l-amber-500";
  return "border-l-emerald-500";
}

function formatFieldValue(value: unknown): string {
  if (value == null) return "—";
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (typeof value === "number") return String(value);
  if (typeof value === "string") return value || "—";
  if (Array.isArray(value)) {
    if (value.length === 0) return "—";
    return `${value.length} item${value.length === 1 ? "" : "s"}`;
  }
  if (typeof value === "object") {
    const obj = value as Record<string, unknown>;
    const parts = Object.values(obj).filter(Boolean);
    return parts.length > 0 ? parts.join(", ") : "—";
  }
  return String(value);
}

function getFieldConfidence(
  fieldConfidences: Record<string, unknown> | null | undefined,
  key: string
): number | null {
  if (!fieldConfidences) return null;
  const val = fieldConfidences[key];
  if (typeof val === "number") return val;
  return null;
}

const docTypeLabel: Record<string, string> = {
  bol: "Bill of Lading",
  invoice: "Carrier Invoice",
  rate_con: "Rate Confirmation",
  pod: "Proof of Delivery",
  accessorial: "Accessorial",
  unknown: "Unknown",
};

/* ------------------------------------------------------------------ */
/*  Document Image Viewer (Left Panel)                                */
/* ------------------------------------------------------------------ */

function DocumentImageViewer({
  pageImageUrls,
}: {
  pageImageUrls: string[];
}) {
  const [currentPage, setCurrentPage] = useState(0);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const panStartRef = useRef({ x: 0, y: 0 });
  const panOffsetRef = useRef({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);

  const hasPages = pageImageUrls.length > 0;
  const totalPages = pageImageUrls.length;

  const handleZoomIn = useCallback(() => {
    setZoom((z) => Math.min(z + 0.25, 4));
  }, []);

  const handleZoomOut = useCallback(() => {
    setZoom((z) => {
      const next = Math.max(z - 0.25, 0.5);
      if (next <= 1) setPan({ x: 0, y: 0 });
      return next;
    });
  }, []);

  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    if (e.deltaY < 0) {
      setZoom((z) => Math.min(z + 0.15, 4));
    } else {
      setZoom((z) => {
        const next = Math.max(z - 0.15, 0.5);
        if (next <= 1) setPan({ x: 0, y: 0 });
        return next;
      });
    }
  }, []);

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (zoom <= 1) return;
      e.preventDefault();
      setIsPanning(true);
      panStartRef.current = { x: e.clientX, y: e.clientY };
      panOffsetRef.current = { ...pan };
    },
    [zoom, pan]
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (!isPanning) return;
      const dx = e.clientX - panStartRef.current.x;
      const dy = e.clientY - panStartRef.current.y;
      setPan({
        x: panOffsetRef.current.x + dx,
        y: panOffsetRef.current.y + dy,
      });
    },
    [isPanning]
  );

  const handleMouseUp = useCallback(() => {
    setIsPanning(false);
  }, []);

  const goToPrev = useCallback(() => {
    setCurrentPage((p) => Math.max(0, p - 1));
    setZoom(1);
    setPan({ x: 0, y: 0 });
  }, []);

  const goToNext = useCallback(() => {
    setCurrentPage((p) => Math.min(totalPages - 1, p + 1));
    setZoom(1);
    setPan({ x: 0, y: 0 });
  }, [totalPages]);

  return (
    <div className="flex h-full flex-col">
      {/* Image area */}
      <div
        ref={containerRef}
        className={cn(
          "relative flex flex-1 items-center justify-center overflow-hidden rounded-lg bg-slate-100",
          zoom > 1 ? "cursor-grab" : "cursor-default",
          isPanning && "cursor-grabbing"
        )}
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        {hasPages ? (
          <img
            src={pageImageUrls[currentPage]}
            alt={`Document page ${currentPage + 1}`}
            className="max-h-full max-w-full object-contain select-none"
            style={{
              transform: `scale(${zoom}) translate(${pan.x / zoom}px, ${pan.y / zoom}px)`,
              transition: isPanning ? "none" : "transform 0.15s ease-out",
            }}
            draggable={false}
          />
        ) : (
          <div className="flex flex-col items-center gap-4 text-slate-400">
            <FileText className="h-20 w-20 stroke-[1]" />
            <div className="text-center">
              <p className="text-sm font-medium text-slate-500">
                Document Preview
              </p>
              <p className="mt-1 text-xs text-slate-400">
                Page images not available for seeded data
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Controls bar */}
      <div className="mt-3 flex items-center justify-between">
        {/* Page navigation */}
        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            className="h-8 w-8 p-0"
            disabled={!hasPages || currentPage === 0}
            onClick={goToPrev}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="min-w-[5rem] text-center text-xs text-[color:var(--muted)]">
            {hasPages ? `Page ${currentPage + 1} of ${totalPages}` : "No pages"}
          </span>
          <Button
            variant="secondary"
            className="h-8 w-8 p-0"
            disabled={!hasPages || currentPage >= totalPages - 1}
            onClick={goToNext}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        {/* Zoom controls */}
        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            className="h-8 w-8 p-0"
            disabled={!hasPages}
            onClick={handleZoomOut}
          >
            <Minus className="h-4 w-4" />
          </Button>
          <span className="min-w-[3rem] text-center text-xs text-[color:var(--muted)]">
            {Math.round(zoom * 100)}%
          </span>
          <Button
            variant="secondary"
            className="h-8 w-8 p-0"
            disabled={!hasPages}
            onClick={handleZoomIn}
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Extracted Data Panel (Right Panel)                                 */
/* ------------------------------------------------------------------ */

function ExtractedDataPanel({
  document,
  discrepancies,
}: {
  document: DocumentRecord;
  discrepancies: DiscrepancyRecord[];
}) {
  const extraction = document.extracted_data;
  const docType = (extraction?.doc_type ?? document.doc_type ?? "unknown") as DocumentType;
  const fields = extraction?.extracted_fields;
  const fieldConfidences = extraction?.field_confidences as Record<string, unknown> | null;
  const fieldDefs = FIELD_MAP[docType] ?? [];

  const discrepancyFieldNames = new Set(
    discrepancies.map((d) => d.field_name.toLowerCase())
  );

  const getDiscrepancySeverity = (fieldKey: string): string | null => {
    const match = discrepancies.find(
      (d) => d.field_name.toLowerCase() === fieldKey.toLowerCase()
    );
    return match?.severity ?? null;
  };

  return (
    <div className="flex h-full flex-col overflow-hidden">
      {/* Document type + confidence header */}
      <div className="flex items-center gap-3 border-b border-[color:var(--border)] pb-4">
        <Badge
          tone={
            docType === "invoice"
              ? "neutral"
              : docType === "bol"
                ? "matched"
                : docType === "rate_con"
                  ? "pending"
                  : "neutral"
          }
        >
          {docTypeLabel[docType] ?? docType}
        </Badge>
        {document.doc_type_confidence != null && (
          <span className="text-xs text-[color:var(--muted)]">
            {document.doc_type_confidence.toFixed(0)}% confidence
          </span>
        )}
      </div>

      {/* Scrollable field list */}
      <div className="flex-1 overflow-y-auto py-4">
        {!fields || fieldDefs.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-8 text-slate-400">
            <Info className="h-8 w-8" />
            <p className="text-sm">No extracted data available</p>
          </div>
        ) : (
          <div className="space-y-1.5">
            {fieldDefs.map((def) => {
              const value = (fields as unknown as Record<string, unknown>)[def.key];
              const confidence = getFieldConfidence(fieldConfidences, def.key);
              const severity = getDiscrepancySeverity(def.key);
              const isDiscrepancy = discrepancyFieldNames.has(def.key.toLowerCase());

              return (
                <div
                  key={def.key}
                  className={cn(
                    "flex items-start justify-between gap-3 rounded-xl px-3 py-2.5",
                    isDiscrepancy && severity
                      ? `border-l-[3px] ${getSeverityBorderColor(severity)} bg-slate-50`
                      : "hover:bg-slate-50/50"
                  )}
                >
                  <div className="flex items-center gap-2">
                    <span
                      className={cn(
                        "mt-0.5 h-2 w-2 shrink-0 rounded-full",
                        getConfidenceColor(confidence)
                      )}
                      title={
                        confidence != null
                          ? `${confidence}% confidence`
                          : "No confidence data"
                      }
                    />
                    <span className="text-xs text-[color:var(--muted)]">
                      {def.label}
                    </span>
                  </div>
                  <span
                    className="max-w-[60%] text-right text-xs font-medium"
                    style={{ fontFamily: "var(--font-code)" }}
                  >
                    {formatFieldValue(value)}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Overlay Toggle (future-ready)                                     */
/* ------------------------------------------------------------------ */

function OverlayToggle() {
  return (
    <div className="group relative">
      <Button variant="ghost" className="h-8 gap-1.5 px-2.5 text-xs" disabled>
        <ZoomIn className="h-3.5 w-3.5" />
        Extraction Overlay
      </Button>
      <span className="pointer-events-none absolute -bottom-9 left-1/2 z-10 -translate-x-1/2 whitespace-nowrap rounded-lg bg-[color:var(--foreground)] px-3 py-1.5 text-xs text-white opacity-0 shadow-lg transition group-hover:opacity-100">
        Overlay available for AI-processed documents
      </span>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Main Modal                                                        */
/* ------------------------------------------------------------------ */

export function DocumentViewerModal({
  document,
  discrepancies,
  onClose,
}: DocumentViewerModalProps) {
  const [pageImageUrls, setPageImageUrls] = useState<string[]>([]);
  const [loadedDoc, setLoadedDoc] = useState<DocumentRecord>(document);
  const backdropRef = useRef<HTMLDivElement>(null);

  // Fetch document details + page URLs
  useEffect(() => {
    let cancelled = false;

    async function fetchDoc() {
      try {
        const res = await fetch(`/api/documents/${document.id}`);
        if (!res.ok) return;
        const data = (await res.json()) as DocumentApiResponse;
        if (cancelled) return;
        setPageImageUrls(data.pageImageUrls);
        setLoadedDoc(data.document);
      } catch {
        // Silently handle — we still show the data we have
      }
    }

    fetchDoc();
    return () => {
      cancelled = true;
    };
  }, [document.id]);

  // Escape key handler
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  // Lock body scroll
  useEffect(() => {
    const body = window.document.body;
    const prev = body.style.overflow;
    body.style.overflow = "hidden";
    return () => {
      body.style.overflow = prev;
    };
  }, []);

  const docType = loadedDoc.doc_type ?? "unknown";

  // Filter discrepancies relevant to this document
  const relevantDiscrepancies = discrepancies.filter(
    (d) => d.source_doc_id === document.id || d.compare_doc_id === document.id
  );

  return (
    <>
      {/* Backdrop */}
      <motion.div
        ref={backdropRef}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm"
        onClick={(e) => {
          if (e.target === backdropRef.current) onClose();
        }}
      />

      {/* Modal content */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 10 }}
        transition={{ type: "spring", damping: 30, stiffness: 300 }}
        className="fixed inset-4 z-50 flex flex-col overflow-hidden rounded-[1.75rem] border border-[color:var(--border)] bg-white shadow-2xl lg:inset-8"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[color:var(--border)] px-6 py-4">
          <div className="flex items-center gap-4 overflow-hidden">
            <FileText className="h-5 w-5 shrink-0 text-[color:var(--muted)]" />
            <div className="min-w-0">
              <h2 className="truncate text-base font-semibold">
                {loadedDoc.original_filename ?? loadedDoc.id}
              </h2>
              <div className="mt-0.5 flex items-center gap-2">
                <Badge
                  tone={
                    docType === "invoice"
                      ? "neutral"
                      : docType === "bol"
                        ? "matched"
                        : docType === "rate_con"
                          ? "pending"
                          : "neutral"
                  }
                  className="text-[10px]"
                >
                  {docTypeLabel[docType] ?? docType}
                </Badge>
                {loadedDoc.source === "email" && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-medium text-blue-700">
                    <Mail className="h-3 w-3" />
                    Email
                  </span>
                )}
                <span className="text-xs text-[color:var(--muted)]">
                  {loadedDoc.source === "email"
                    ? `From ${(loadedDoc.source_metadata?.sender as string) ?? "unknown"} — ${formatDate(loadedDoc.created_at)}`
                    : `Uploaded ${formatDate(loadedDoc.created_at)}`}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <OverlayToggle />
            <button
              onClick={onClose}
              className="rounded-full p-2 text-[color:var(--muted)] transition hover:bg-black/5"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Two-panel layout */}
        <div className="flex flex-1 overflow-hidden">
          {/* Left panel: Document image viewer (60%) */}
          <div className="flex-[0.6] border-r border-[color:var(--border)] p-5">
            <DocumentImageViewer pageImageUrls={pageImageUrls} />
          </div>

          {/* Right panel: Extracted data (40%) */}
          <div className="flex-[0.4] p-5">
            <ExtractedDataPanel
              document={loadedDoc}
              discrepancies={relevantDiscrepancies}
            />
          </div>
        </div>
      </motion.div>
    </>
  );
}
