"use client";

import { AnimatePresence } from "framer-motion";
import { Eye, FileText } from "lucide-react";
import { useCallback, useState } from "react";

import { DocumentViewerModal } from "@/components/dashboard/document-viewer-modal";
import { Card } from "@/components/ui/card";
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
  const [selectedDocId, setSelectedDocId] = useState<string | null>(null);

  const selectedDoc = selectedDocId
    ? documents.find((d) => d.id === selectedDocId) ?? null
    : null;

  const handleClose = useCallback(() => {
    setSelectedDocId(null);
  }, []);

  return (
    <>
      <div className="grid gap-4 xl:grid-cols-2">
        {documents.map((document) => (
          <button
            key={document.id}
            type="button"
            className="text-left"
            onClick={() => setSelectedDocId(document.id)}
          >
            <Card
              className={cn(
                "space-y-4 bg-white/85 transition-all duration-200",
                "hover:scale-[1.02] hover:shadow-lg hover:border-[color:var(--accent)]/30",
                "cursor-pointer"
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
        ))}
      </div>

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
