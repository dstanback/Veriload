"use client";

import { AnimatePresence, motion } from "framer-motion";
import { CheckCircle, Loader2, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { startTransition, useCallback, useState } from "react";

import { ApprovalActions } from "@/components/dashboard/approval-actions";
import { DiscrepancyCard } from "@/components/dashboard/discrepancy-card";
import type { DiscrepancyEdit } from "@/components/dashboard/discrepancy-card";
import { DocumentViewer } from "@/components/dashboard/document-viewer";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useToast } from "@/components/ui/toast";
import { formatCurrency } from "@/lib/utils";
import type { ShipmentDetail as ShipmentDetailType } from "@/types/shipments";

/* ------------------------------------------------------------------ */
/*  Edit tracking helpers                                              */
/* ------------------------------------------------------------------ */

function editKey(documentId: string, fieldName: string) {
  return `${documentId}::${fieldName}`;
}

/* ------------------------------------------------------------------ */
/*  ShipmentDetail                                                     */
/* ------------------------------------------------------------------ */

export function ShipmentDetail({ shipment }: { shipment: ShipmentDetailType }) {
  const router = useRouter();
  const { toast } = useToast();
  const [editMode, setEditMode] = useState(false);
  const [edits, setEdits] = useState<Map<string, DiscrepancyEdit>>(new Map());
  const [saving, setSaving] = useState(false);

  const invoice = shipment.documents.find(
    (document) => document.doc_type === "invoice"
  )?.extracted_data?.extracted_fields;
  const invoiceTotal =
    invoice && "total_amount" in invoice ? invoice.total_amount : null;

  const toggleEditMode = useCallback(() => {
    setEditMode((prev) => {
      if (prev) {
        // Exiting edit mode — clear edits
        setEdits(new Map());
      }
      return !prev;
    });
  }, []);

  const handleEditValue = useCallback(
    (
      documentId: string,
      fieldName: string,
      originalValue: string,
      newValue: string,
      side: "source" | "compare"
    ) => {
      setEdits((prev) => {
        const next = new Map(prev);
        const key = editKey(documentId, `${fieldName}::${side}`);

        if (newValue === originalValue) {
          next.delete(key);
        } else {
          next.set(key, {
            documentId,
            fieldName,
            originalValue,
            newValue,
          });
        }
        return next;
      });
    },
    []
  );

  const handleSaveAndApprove = useCallback(async () => {
    if (edits.size === 0) return;
    setSaving(true);

    // Convert the edits map into the API format
    const apiEdits = Array.from(edits.values()).map((edit) => ({
      documentId: edit.documentId,
      fieldName: edit.fieldName,
      newValue: edit.newValue,
    }));

    try {
      const res = await fetch(
        `/api/shipments/${shipment.id}/edit-approve`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ edits: apiEdits }),
        }
      );
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? "Failed to save edits and approve.");
      }
      toast("Edits saved and shipment approved.", "success");
      setEditMode(false);
      setEdits(new Map());
      startTransition(() => {
        router.refresh();
      });
    } catch (err) {
      toast(
        err instanceof Error ? err.message : "Failed to save edits.",
        "error"
      );
    } finally {
      setSaving(false);
    }
  }, [edits, shipment.id, toast, router]);

  const handleCancel = useCallback(() => {
    setEditMode(false);
    setEdits(new Map());
  }, []);

  // Build a lookup of current edit values by discrepancy
  const getEditedValue = (
    documentId: string | null,
    fieldName: string,
    side: "source" | "compare"
  ): string | undefined => {
    if (!documentId) return undefined;
    const key = editKey(documentId, `${fieldName}::${side}`);
    return edits.get(key)?.newValue;
  };

  return (
    <div className="space-y-6 pb-24">
      <Card className="bg-white/90">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-[color:var(--muted)]">
              Shipment summary
            </p>
            <h2 className="mt-2 text-3xl font-semibold">
              {shipment.shipment_ref ?? shipment.bol_number ?? shipment.id}
            </h2>
            <div className="mt-4 flex flex-wrap items-center gap-3">
              <Badge
                tone={
                  shipment.status as
                    | "approved"
                    | "disputed"
                    | "matched"
                    | "pending"
                }
              >
                {shipment.status}
              </Badge>
              <Badge
                tone={
                  (shipment.discrepancy_level ?? "neutral") as
                    | "green"
                    | "yellow"
                    | "red"
                    | "neutral"
                }
              >
                {shipment.discrepancy_level ?? "no discrepancy"}
              </Badge>
              <span className="text-sm text-[color:var(--muted)]">
                Match confidence{" "}
                {shipment.match_confidence?.toFixed(0) ?? "—"}%
              </span>
              {editMode && (
                <Badge tone="neutral" className="border border-indigo-200 bg-indigo-50 text-indigo-700">
                  Edit Mode
                </Badge>
              )}
            </div>
          </div>
          <div className="space-y-3">
            <p className="text-right text-sm text-[color:var(--muted)]">
              Invoice total
            </p>
            <p className="text-right text-4xl font-semibold">
              {formatCurrency(invoiceTotal)}
            </p>
            <ApprovalActions
              shipmentId={shipment.id}
              status={shipment.status}
              carrierName={shipment.carrier_name}
              shipmentRef={shipment.shipment_ref}
              discrepancies={shipment.discrepancies}
              editMode={editMode}
              onToggleEditMode={toggleEditMode}
            />
          </div>
        </div>
      </Card>

      <section className="grid gap-6 xl:grid-cols-[1.4fr_0.6fr]">
        <DocumentViewer
          documents={shipment.documents}
          discrepancies={shipment.discrepancies}
        />
        <div className="space-y-4">
          <Card className="bg-[#17202a] text-white">
            <p className="text-xs uppercase tracking-[0.2em] text-white/65">
              Lane
            </p>
            <p className="mt-2 text-lg font-semibold">
              {shipment.origin ?? "Unknown origin"}
            </p>
            <p className="text-sm text-white/75">
              {shipment.destination ?? "Unknown destination"}
            </p>
            <div className="mt-6 grid gap-4 text-sm text-white/80">
              <div>
                <p className="text-white/55">Carrier</p>
                <p>
                  {shipment.carrier_name ?? "Unknown"}{" "}
                  {shipment.carrier_scac
                    ? `(${shipment.carrier_scac})`
                    : ""}
                </p>
              </div>
              <div>
                <p className="text-white/55">BoL</p>
                <p>{shipment.bol_number ?? "Pending"}</p>
              </div>
              <div>
                <p className="text-white/55">PRO</p>
                <p>{shipment.pro_number ?? "Pending"}</p>
              </div>
            </div>
          </Card>

          <div className="space-y-4">
            {shipment.discrepancies.length > 0 ? (
              shipment.discrepancies.map((discrepancy) => (
                <DiscrepancyCard
                  key={discrepancy.id}
                  discrepancy={discrepancy}
                  editMode={editMode}
                  editedSourceValue={getEditedValue(
                    discrepancy.source_doc_id,
                    discrepancy.field_name,
                    "source"
                  )}
                  editedCompareValue={getEditedValue(
                    discrepancy.compare_doc_id,
                    discrepancy.field_name,
                    "compare"
                  )}
                  onEditSource={(value) =>
                    discrepancy.source_doc_id &&
                    handleEditValue(
                      discrepancy.source_doc_id,
                      discrepancy.field_name,
                      discrepancy.source_value ?? "",
                      value,
                      "source"
                    )
                  }
                  onEditCompare={(value) =>
                    discrepancy.compare_doc_id &&
                    handleEditValue(
                      discrepancy.compare_doc_id,
                      discrepancy.field_name,
                      discrepancy.compare_value ?? "",
                      value,
                      "compare"
                    )
                  }
                />
              ))
            ) : (
              <Card>
                <p className="text-sm text-[color:var(--muted)]">
                  No discrepancy cards yet. Upload the paired invoice or
                  rate confirmation to trigger reconciliation.
                </p>
              </Card>
            )}
          </div>
        </div>
      </section>

      {/* Sticky bottom bar for edit mode */}
      <AnimatePresence>
        {editMode && (
          <motion.div
            initial={{ y: 80, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 80, opacity: 0 }}
            transition={{ type: "spring", damping: 30, stiffness: 300 }}
            className="fixed inset-x-0 bottom-0 z-30 border-t border-white/20 bg-white/80 backdrop-blur-xl"
          >
            <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
              <p className="text-sm font-medium text-[color:var(--foreground)]">
                {edits.size === 0 ? (
                  "No fields modified"
                ) : (
                  <>
                    <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-indigo-600 px-1.5 text-[10px] font-bold text-white">
                      {edits.size}
                    </span>{" "}
                    field{edits.size === 1 ? "" : "s"} modified
                  </>
                )}
              </p>
              <div className="flex items-center gap-3">
                <Button
                  variant="ghost"
                  onClick={handleCancel}
                  disabled={saving}
                >
                  <X className="mr-2 h-4 w-4" />
                  Cancel
                </Button>
                <Button
                  disabled={saving || edits.size === 0}
                  onClick={handleSaveAndApprove}
                >
                  {saving ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <CheckCircle className="mr-2 h-4 w-4" />
                  )}
                  {saving ? "Saving..." : "Save & Approve"}
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
