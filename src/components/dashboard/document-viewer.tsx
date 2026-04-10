"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Eye, FileText, Loader2, RefreshCw } from "lucide-react";
import { useRouter } from "next/navigation";
import { startTransition, useCallback, useState } from "react";

import { DocumentViewerModal } from "@/components/dashboard/document-viewer-modal";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useToast } from "@/components/ui/toast";
import { cn } from "@/lib/utils";
import type { DiscrepancyRecord } from "@/types/discrepancies";
import type { ShipmentDetail } from "@/types/shipments";

export function DocumentViewer({
  documents,
  discrepancies = [],
}: {
  documents: ShipmentDetail["documents"];
  discrepancies?: DiscrepancyRecord[];
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [selectedDocId, setSelectedDocId] = useState<string | null>(null);
  const [reprocessingId, setReprocessingId] = useState<string | null>(null);
  const [confirmDocId, setConfirmDocId] = useState<string | null>(null);

  const selectedDoc = selectedDocId
    ? documents.find((d) => d.id === selectedDocId) ?? null
    : null;

  const handleClose = useCallback(() => {
    setSelectedDocId(null);
  }, []);

  const handleReprocess = useCallback(
    async (docId: string) => {
      setConfirmDocId(null);
      setReprocessingId(docId);

      try {
        const res = await fetch(`/api/documents/${docId}/reprocess`, {
          method: "POST",
        });
        const data = await res.json();

        if (data.error && !data.document) {
          throw new Error(data.error);
        }

        if (data.error) {
          toast(`Reprocessing failed: ${data.error}`, "error");
        } else {
          toast("Document reprocessed successfully.", "success");
        }

        startTransition(() => {
          router.refresh();
        });
      } catch (err) {
        toast(
          err instanceof Error
            ? err.message
            : "Failed to reprocess document.",
          "error"
        );
      } finally {
        setReprocessingId(null);
      }
    },
    [toast, router]
  );

  return (
    <>
      <div className="grid gap-4 xl:grid-cols-2">
        {documents.map((document) => {
          const isReprocessing = reprocessingId === document.id;

          return (
            <div key={document.id} className="relative">
              <button
                type="button"
                className="w-full text-left"
                onClick={() => setSelectedDocId(document.id)}
                disabled={isReprocessing}
              >
                <Card
                  className={cn(
                    "space-y-4 bg-white/85 transition-all duration-200",
                    "hover:scale-[1.02] hover:shadow-lg hover:border-[color:var(--accent)]/30",
                    "cursor-pointer",
                    isReprocessing && "pointer-events-none opacity-50"
                  )}
                >
                  <div className="flex items-center justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <p className="text-xs uppercase tracking-[0.2em] text-[color:var(--muted)]">
                        {document.role}
                      </p>
                      <p className="mt-1 truncate text-lg font-semibold">
                        {document.original_filename ?? document.id}
                      </p>
                    </div>
                    <span className="shrink-0 rounded-full bg-black/5 px-3 py-1 text-xs font-medium">
                      {document.doc_type ?? "unknown"}
                    </span>
                  </div>
                  <div className="rounded-[1.5rem] border border-dashed border-[color:var(--border)] bg-[#f7f4ee] p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4 text-[color:var(--muted)]" />
                        <p className="text-sm font-medium">Stored asset</p>
                      </div>
                      <div className="flex items-center gap-1.5 text-xs font-medium text-[color:var(--accent)]">
                        <Eye className="h-3.5 w-3.5" />
                        View
                      </div>
                    </div>
                    <p className="mt-2 break-all text-xs text-[color:var(--muted)]">
                      {document.storage_path}
                    </p>
                  </div>
                  <pre className="overflow-x-auto rounded-[1.5rem] bg-[#17202a] p-4 text-xs leading-6 text-white/90">
                    {JSON.stringify(
                      document.extracted_data?.extracted_fields ?? {},
                      null,
                      2
                    )}
                  </pre>
                </Card>
              </button>

              {/* Reprocess button */}
              <div className="absolute right-2 top-2 z-10">
                <Button
                  variant="ghost"
                  className="h-8 gap-1.5 rounded-full px-3 text-xs"
                  disabled={isReprocessing}
                  onClick={(e) => {
                    e.stopPropagation();
                    setConfirmDocId(document.id);
                  }}
                >
                  {isReprocessing ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <RefreshCw className="h-3.5 w-3.5" />
                  )}
                  {isReprocessing ? "Reprocessing..." : "Reprocess"}
                </Button>
              </div>

              {/* Reprocessing overlay */}
              <AnimatePresence>
                {isReprocessing && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="absolute inset-0 z-10 flex flex-col items-center justify-center rounded-[1.75rem] bg-white/70 backdrop-blur-sm"
                  >
                    <Loader2 className="h-8 w-8 animate-spin text-[color:var(--accent)]" />
                    <p className="mt-3 text-sm font-medium text-[color:var(--foreground)]">
                      Reprocessing...
                    </p>
                    <p className="mt-1 text-xs text-[color:var(--muted)]">
                      Re-running extraction pipeline
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}
      </div>

      {/* Confirmation dialog */}
      <AnimatePresence>
        {confirmDocId && (
          <ConfirmReprocessDialog
            filename={
              documents.find((d) => d.id === confirmDocId)
                ?.original_filename ?? confirmDocId
            }
            onConfirm={() => handleReprocess(confirmDocId)}
            onCancel={() => setConfirmDocId(null)}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {selectedDoc && (
          <DocumentViewerModal
            document={selectedDoc}
            discrepancies={discrepancies}
            onClose={handleClose}
          />
        )}
      </AnimatePresence>
    </>
  );
}

/* ------------------------------------------------------------------ */
/*  Confirmation Dialog                                                */
/* ------------------------------------------------------------------ */

function ConfirmReprocessDialog({
  filename,
  onConfirm,
  onCancel,
}: {
  filename: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-40 bg-black/30"
        onClick={onCancel}
      />
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        transition={{ type: "spring", damping: 30, stiffness: 300 }}
        className="fixed left-1/2 top-1/2 z-50 w-[420px] max-w-[90vw] -translate-x-1/2 -translate-y-1/2 rounded-[1.75rem] border border-[color:var(--border)] bg-white p-6 shadow-2xl"
      >
        <h3 className="text-base font-semibold text-[color:var(--foreground)]">
          Re-run extraction?
        </h3>
        <p className="mt-2 text-sm leading-relaxed text-[color:var(--muted)]">
          Re-run extraction on{" "}
          <span className="font-medium text-[color:var(--foreground)]">
            {filename}
          </span>
          ? This will replace existing extracted data.
        </p>
        <div className="mt-5 flex justify-end gap-3">
          <Button variant="ghost" onClick={onCancel}>
            Cancel
          </Button>
          <Button onClick={onConfirm}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Reprocess
          </Button>
        </div>
      </motion.div>
    </>
  );
}
