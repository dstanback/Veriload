"use client";

import { AnimatePresence, motion } from "framer-motion";
import {
  AlertCircle,
  Check,
  Clock,
  Eye,
  Loader2,
  UploadCloud,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { startTransition, useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { useDocumentPolling, type DocumentStatus } from "@/hooks/use-document-polling";

interface UploadResult {
  document: {
    id: string;
    doc_type: string | null;
    status: string;
  };
  shipment: {
    id: string;
    shipment_ref: string | null;
  } | null;
  queued?: boolean;
}

const STATUS_CONFIG = {
  pending: {
    label: "Queued",
    icon: Clock,
    color: "text-slate-600",
    bg: "bg-slate-100",
    border: "border-slate-200",
  },
  processing: {
    label: "Processing",
    icon: Loader2,
    color: "text-indigo-600",
    bg: "bg-indigo-50",
    border: "border-indigo-200",
  },
  extracted: {
    label: "Complete",
    icon: Check,
    color: "text-emerald-600",
    bg: "bg-emerald-50",
    border: "border-emerald-200",
  },
  failed: {
    label: "Failed",
    icon: AlertCircle,
    color: "text-rose-600",
    bg: "bg-rose-50",
    border: "border-rose-200",
  },
  needs_review: {
    label: "Needs Review",
    icon: Eye,
    color: "text-amber-600",
    bg: "bg-amber-50",
    border: "border-amber-200",
  },
} as const;

function getStatusConfig(status: string) {
  return STATUS_CONFIG[status as keyof typeof STATUS_CONFIG] ?? STATUS_CONFIG.pending;
}

function formatConfidence(confidence: number | null) {
  if (confidence == null) return "";
  return `${(confidence * 100).toFixed(0)}%`;
}

function StatusLabel({ docStatus }: { docStatus: DocumentStatus }) {
  const config = getStatusConfig(docStatus.status);
  const Icon = config.icon;

  let label: string = config.label;
  if (docStatus.status === "processing" && docStatus.docType) {
    label = `Extracting ${docStatus.docType} fields...`;
  }

  return (
    <span className={cn("inline-flex items-center gap-1.5 text-sm font-medium", config.color)}>
      <Icon className={cn("h-4 w-4", docStatus.status === "processing" && "animate-spin")} />
      {label}
    </span>
  );
}

function ProgressBar({ status }: { status: string }) {
  const isProcessing = status === "processing" || status === "pending";
  const isComplete = status === "extracted" || status === "needs_review";

  return (
    <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-black/5">
      <motion.div
        className={cn(
          "h-full rounded-full",
          isComplete ? "bg-emerald-500" : status === "failed" ? "bg-rose-400" : "bg-indigo-500"
        )}
        initial={{ width: isProcessing ? "20%" : "0%" }}
        animate={
          isComplete
            ? { width: "100%", transition: { duration: 0.5, ease: "easeOut" } }
            : status === "failed"
              ? { width: "100%", transition: { duration: 0.3 } }
              : {
                  width: ["20%", "80%", "20%"],
                  transition: { duration: 2, repeat: Infinity, ease: "easeInOut" },
                }
        }
      />
    </div>
  );
}

function DocumentCard({
  result,
  docStatus,
  onRetry,
}: {
  result: UploadResult;
  docStatus: DocumentStatus;
  onRetry: (id: string) => void;
}) {
  const config = getStatusConfig(docStatus.status);
  const isTerminal = ["extracted", "failed", "needs_review"].includes(docStatus.status);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: "spring", damping: 25, stiffness: 300 }}
      className={cn(
        "rounded-2xl border p-4 transition-colors duration-300",
        config.border,
        config.bg
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="truncate font-medium text-[color:var(--foreground)]">
            {result.document.id.slice(0, 8)}...
          </p>

          <AnimatePresence mode="wait">
            <motion.div
              key={docStatus.status}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.2 }}
              className="mt-1"
            >
              <StatusLabel docStatus={docStatus} />
            </motion.div>
          </AnimatePresence>

          {/* Extra info for terminal states */}
          <AnimatePresence>
            {docStatus.status === "extracted" && (
              <motion.p
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                transition={{ delay: 0.3, duration: 0.3 }}
                className="mt-2 text-sm text-emerald-700"
              >
                Classified as <span className="font-semibold">{docStatus.docType ?? "unknown"}</span>
                {docStatus.docTypeConfidence != null && (
                  <> with {formatConfidence(docStatus.docTypeConfidence)} confidence</>
                )}
                {result.shipment && (
                  <span className="text-[color:var(--muted)]">
                    {" "}— Shipment {result.shipment.shipment_ref ?? result.shipment.id}
                  </span>
                )}
              </motion.p>
            )}

            {docStatus.status === "needs_review" && (
              <motion.p
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                transition={{ delay: 0.3, duration: 0.3 }}
                className="mt-2 text-sm text-amber-700"
              >
                Low confidence classification — manual review needed
              </motion.p>
            )}

            {docStatus.status === "failed" && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                transition={{ delay: 0.2, duration: 0.3 }}
                className="mt-2"
              >
                <p className="text-sm text-rose-700">
                  {docStatus.processingError ?? "An unexpected error occurred during processing."}
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Retry button for failed documents */}
        <AnimatePresence>
          {docStatus.status === "failed" && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.3 }}
            >
              <Button
                variant="ghost"
                className="h-8 rounded-full px-3 text-xs text-rose-600 hover:bg-rose-100 hover:text-rose-700"
                onClick={() => onRetry(result.document.id)}
              >
                Retry
              </Button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Progress bar */}
      {!isTerminal && <ProgressBar status={docStatus.status} />}

      {/* Completion animation — brief progress fill before fading */}
      <AnimatePresence>
        {isTerminal && (
          <motion.div
            initial={{ opacity: 1 }}
            animate={{ opacity: 0 }}
            transition={{ delay: 0.8, duration: 0.5 }}
            className="pointer-events-none"
          >
            <ProgressBar status={docStatus.status} />
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

export function UploadDropzone() {
  const router = useRouter();
  const [files, setFiles] = useState<FileList | null>(null);
  const [referenceNumber, setReferenceNumber] = useState("");
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<UploadResult[]>([]);

  const documentIds = useMemo(() => results.map((r) => r.document.id), [results]);
  const polledStatuses = useDocumentPolling(documentIds);

  const handleSubmit = async () => {
    if (!files?.length) return;

    setLoading(true);
    setResults([]);

    const formData = new FormData();
    Array.from(files).forEach((file) => {
      formData.append("files", file);
    });
    if (referenceNumber) {
      formData.append("referenceNumber", referenceNumber);
    }

    const response = await fetch("/api/documents/upload", {
      method: "POST",
      body: formData
    });
    const payload = await response.json();
    setResults(payload.results ?? []);
    startTransition(() => {
      router.refresh();
    });
    setLoading(false);
  };

  const handleRetry = async (documentId: string) => {
    try {
      await fetch(`/api/documents/${documentId}/reprocess`, { method: "POST" });
      startTransition(() => {
        router.refresh();
      });
    } catch {
      // Swallow — UI will stay on failed state
    }
  };

  return (
    <div className="space-y-4">
      <Card className="border-dashed bg-white/90">
        <div className="flex flex-col items-center justify-center gap-4 py-8 text-center">
          <div className="rounded-full bg-black/5 p-4">
            <UploadCloud />
          </div>
          <div>
            <p className="text-xl font-semibold">Upload freight documents</p>
            <p className="mt-2 text-sm text-[color:var(--muted)]">
              PDF, JPG, and PNG files are accepted. Files are stored locally in development mode.
            </p>
          </div>
          <input
            multiple
            accept=".pdf,image/png,image/jpeg"
            className="block text-sm"
            type="file"
            onChange={(event) => setFiles(event.target.files)}
          />
          <Input
            placeholder="Optional reference number"
            value={referenceNumber}
            onChange={(event) => setReferenceNumber(event.target.value)}
          />
          <Button disabled={loading || !files?.length} onClick={handleSubmit}>
            {loading ? "Uploading..." : "Upload and queue"}
          </Button>
        </div>
      </Card>

      <AnimatePresence>
        {results.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
          >
            <Card className="bg-white/90">
              <p className="text-lg font-semibold">Processing status</p>
              <div className="mt-4 space-y-3">
                {results.map((result) => {
                  const docStatus = polledStatuses.get(result.document.id) ?? {
                    id: result.document.id,
                    status: result.document.status,
                    docType: result.document.doc_type,
                    docTypeConfidence: null,
                    processingError: null,
                    processedAt: null,
                  };

                  return (
                    <DocumentCard
                      key={result.document.id}
                      result={result}
                      docStatus={docStatus}
                      onRetry={handleRetry}
                    />
                  );
                })}
              </div>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
