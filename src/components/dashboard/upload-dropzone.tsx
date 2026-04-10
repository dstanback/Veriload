"use client";

import { useRouter } from "next/navigation";
import { startTransition, useCallback, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  AlertCircle,
  CheckCircle2,
  FileText,
  Loader2,
  RefreshCw,
  Trash2,
  UploadCloud,
  X
} from "lucide-react";

import { StatusBadge } from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const ACCEPTED_TYPES = new Set([
  "application/pdf",
  "image/png",
  "image/jpeg",
  "image/tiff"
]);

const ACCEPTED_EXTENSIONS = new Set(["pdf", "png", "jpg", "jpeg", "tiff", "tif"]);

function isValidFile(file: File): boolean {
  if (ACCEPTED_TYPES.has(file.type)) return true;
  const ext = file.name.toLowerCase().split(".").pop() ?? "";
  return ACCEPTED_EXTENSIONS.has(ext);
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

type FileStatus = "pending" | "uploading" | "processing" | "classified" | "extracted" | "error";

interface SelectedFile {
  id: string;
  file: File;
  previewUrl: string | null;
  status: FileStatus;
  progress: number;
  error: string | null;
  result: UploadResult | null;
}

interface UploadResult {
  filename: string;
  error: string | null;
  document: {
    id: string;
    doc_type: string | null;
    status: string;
    extracted_data?: {
      doc_type: string;
      extracted_fields: Record<string, unknown>;
    } | null;
  } | null;
  shipment: {
    id: string;
    shipment_ref: string | null;
    status: string;
  } | null;
  queued?: boolean;
}

const statusLabels: Record<FileStatus, string> = {
  pending: "Ready to upload",
  uploading: "Uploading...",
  processing: "Processing...",
  classified: "Classified",
  extracted: "Extracted",
  error: "Failed"
};

function ExtractionSummary({ fields, keys, labels }: { fields: Record<string, unknown>; keys: string[]; labels: Record<string, string> }) {
  return (
    <div className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
      {keys.map((key) => {
        const value = fields[key];
        if (value == null) return null;
        return (
          <p key={key}>
            <span className="text-[color:var(--muted)]">{labels[key] ?? key}:</span>{" "}
            <span className="font-medium">{String(value)}</span>
          </p>
        );
      })}
    </div>
  );
}

function FilePreview({ selectedFile, onRemove }: { selectedFile: SelectedFile; onRemove: () => void }) {
  const isPdf = selectedFile.file.type === "application/pdf";
  const isImage = selectedFile.file.type.startsWith("image/");
  const result = selectedFile.result;
  const docType = result?.document?.doc_type;
  const extractedFields = result?.document?.extracted_data?.extracted_fields;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.2 }}
      className={cn(
        "relative overflow-hidden rounded-2xl border p-4 transition-all",
        selectedFile.status === "error"
          ? "border-rose-200 bg-rose-50/50"
          : selectedFile.status === "extracted"
            ? "border-emerald-200 bg-emerald-50/30"
            : "border-[color:var(--border)] bg-[color:var(--surface)]"
      )}
    >
      <div className="flex gap-3">
        {/* Thumbnail */}
        <div className="flex h-14 w-14 flex-shrink-0 items-center justify-center overflow-hidden rounded-xl bg-black/[0.04]">
          {isImage && selectedFile.previewUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={selectedFile.previewUrl}
              alt={selectedFile.file.name}
              className="h-full w-full object-cover"
            />
          ) : (
            <FileText size={24} className={cn(
              isPdf ? "text-rose-500" : "text-[color:var(--accent)]"
            )} />
          )}
        </div>

        {/* File Info */}
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold">{selectedFile.file.name}</p>
              <p className="text-xs text-[color:var(--muted)]">{formatFileSize(selectedFile.file.size)}</p>
            </div>
            {selectedFile.status === "pending" && (
              <button
                onClick={onRemove}
                className="flex-shrink-0 rounded-lg p-1 text-[color:var(--muted)] transition-colors hover:bg-black/5 hover:text-[color:var(--danger)]"
              >
                <Trash2 size={14} />
              </button>
            )}
          </div>

          {/* Status row */}
          <div className="mt-2 flex items-center gap-2">
            {selectedFile.status === "uploading" || selectedFile.status === "processing" ? (
              <Loader2 size={14} className="animate-spin text-[color:var(--accent)]" />
            ) : selectedFile.status === "extracted" ? (
              <CheckCircle2 size={14} className="text-emerald-600" />
            ) : selectedFile.status === "error" ? (
              <AlertCircle size={14} className="text-rose-600" />
            ) : null}
            <span className={cn(
              "text-xs font-medium",
              selectedFile.status === "error" ? "text-rose-600" : "text-[color:var(--muted)]"
            )}>
              {selectedFile.status === "error" ? selectedFile.error : statusLabels[selectedFile.status]}
            </span>
          </div>

          {/* Progress bar */}
          {(selectedFile.status === "uploading" || selectedFile.status === "processing") && (
            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-black/[0.06]">
              <motion.div
                className="h-full rounded-full bg-[color:var(--accent)]"
                initial={{ width: 0 }}
                animate={{ width: `${selectedFile.progress}%` }}
                transition={{ duration: 0.3, ease: "easeOut" }}
              />
            </div>
          )}
        </div>
      </div>

      {/* Extraction summary (success state) */}
      {selectedFile.status === "extracted" && result && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: "auto", opacity: 1 }}
          transition={{ duration: 0.3, delay: 0.1 }}
          className="mt-3 overflow-hidden border-t border-emerald-100 pt-3"
        >
          <div className="flex flex-wrap items-center gap-2">
            {docType && (
              <StatusBadge
                variant="severity"
                value="green"
                className="!bg-emerald-100 !text-emerald-800"
              />
            )}
            <span className="text-xs font-semibold capitalize text-emerald-700">
              {docType?.replace(/_/g, " ") ?? "Document"}
            </span>
            {result.shipment && (
              <span className="text-xs text-[color:var(--muted)]">
                &rarr; Shipment {result.shipment.shipment_ref ?? result.shipment.id.slice(0, 8)}
              </span>
            )}
            {result.queued && (
              <span className="text-xs text-amber-600">Queued for background processing</span>
            )}
          </div>
          {extractedFields && docType === "bol" && (
            <ExtractionSummary fields={extractedFields} keys={["bol_number", "carrier_name", "shipper_name", "consignee_name", "weight", "pieces"]} labels={{ bol_number: "BOL", carrier_name: "Carrier", shipper_name: "Shipper", consignee_name: "Consignee", weight: "Weight", pieces: "Pieces" }} />
          )}
          {extractedFields && docType === "invoice" && (
            <ExtractionSummary fields={extractedFields} keys={["invoice_number", "carrier_name", "total_amount", "bol_reference"]} labels={{ invoice_number: "Invoice #", carrier_name: "Carrier", total_amount: "Total", bol_reference: "BOL Ref" }} />
          )}
        </motion.div>
      )}
    </motion.div>
  );
}

export function UploadDropzone() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFiles, setSelectedFiles] = useState<SelectedFile[]>([]);
  const [referenceNumber, setReferenceNumber] = useState("");
  const [isDragActive, setIsDragActive] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  const addFiles = useCallback((fileList: FileList | File[]) => {
    const files = Array.from(fileList);
    const newFiles: SelectedFile[] = files
      .filter(isValidFile)
      .map((file) => ({
        id: `${file.name}-${file.size}-${Date.now()}-${Math.random()}`,
        file,
        previewUrl: file.type.startsWith("image/") ? URL.createObjectURL(file) : null,
        status: "pending" as FileStatus,
        progress: 0,
        error: null,
        result: null
      }));

    if (newFiles.length < files.length) {
      const rejected = files.length - newFiles.length;
      console.warn(`${rejected} file(s) rejected: unsupported type.`);
    }

    setSelectedFiles((prev) => [...prev, ...newFiles]);
  }, []);

  const removeFile = useCallback((id: string) => {
    setSelectedFiles((prev) => {
      const file = prev.find((f) => f.id === id);
      if (file?.previewUrl) URL.revokeObjectURL(file.previewUrl);
      return prev.filter((f) => f.id !== id);
    });
  }, []);

  const clearAll = useCallback(() => {
    selectedFiles.forEach((f) => {
      if (f.previewUrl) URL.revokeObjectURL(f.previewUrl);
    });
    setSelectedFiles([]);
    setReferenceNumber("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  }, [selectedFiles]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragActive(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragActive(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragActive(false);
    if (e.dataTransfer.files.length > 0) {
      addFiles(e.dataTransfer.files);
    }
  }, [addFiles]);

  const handleUpload = async () => {
    const pendingFiles = selectedFiles.filter((f) => f.status === "pending" || f.status === "error");
    if (pendingFiles.length === 0) return;

    setIsUploading(true);

    for (const selectedFile of pendingFiles) {
      // Mark uploading
      setSelectedFiles((prev) =>
        prev.map((f) => f.id === selectedFile.id ? { ...f, status: "uploading" as FileStatus, progress: 10, error: null } : f)
      );

      try {
        const formData = new FormData();
        formData.append("files", selectedFile.file);
        if (referenceNumber) formData.append("referenceNumber", referenceNumber);

        // Simulate progress
        setSelectedFiles((prev) =>
          prev.map((f) => f.id === selectedFile.id ? { ...f, progress: 40 } : f)
        );

        const response = await fetch("/api/documents/upload", {
          method: "POST",
          body: formData
        });

        setSelectedFiles((prev) =>
          prev.map((f) => f.id === selectedFile.id ? { ...f, status: "processing" as FileStatus, progress: 70 } : f)
        );

        const payload = await response.json();
        const result: UploadResult | undefined = payload.results?.[0];

        if (!response.ok || !result) {
          throw new Error(payload.error ?? "Upload failed");
        }

        if (result.error) {
          throw new Error(result.error);
        }

        setSelectedFiles((prev) =>
          prev.map((f) =>
            f.id === selectedFile.id
              ? { ...f, status: "extracted" as FileStatus, progress: 100, result }
              : f
          )
        );
      } catch (err) {
        setSelectedFiles((prev) =>
          prev.map((f) =>
            f.id === selectedFile.id
              ? {
                  ...f,
                  status: "error" as FileStatus,
                  progress: 0,
                  error: err instanceof Error ? err.message : "Upload failed"
                }
              : f
          )
        );
      }
    }

    setIsUploading(false);
    startTransition(() => {
      router.refresh();
    });
  };

  const retryFailed = () => {
    setSelectedFiles((prev) =>
      prev.map((f) => f.status === "error" ? { ...f, status: "pending" as FileStatus, error: null, progress: 0 } : f)
    );
  };

  const pendingCount = selectedFiles.filter((f) => f.status === "pending").length;
  const errorCount = selectedFiles.filter((f) => f.status === "error").length;
  const doneCount = selectedFiles.filter((f) => f.status === "extracted").length;

  return (
    <div className="space-y-4">
      {/* Drop zone */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={cn(
          "group cursor-pointer rounded-[1.75rem] border-2 border-dashed p-8 text-center transition-all",
          isDragActive
            ? "border-[color:var(--accent)] bg-[color:var(--accent)]/5 shadow-lg"
            : "border-[color:var(--border)] bg-[color:var(--surface)] hover:border-[color:var(--accent)]/40 hover:shadow-md"
        )}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept=".pdf,.png,.jpg,.jpeg,.tiff,.tif,application/pdf,image/png,image/jpeg,image/tiff"
          className="hidden"
          onChange={(e) => e.target.files && addFiles(e.target.files)}
        />
        <motion.div
          animate={{ scale: isDragActive ? 1.05 : 1 }}
          transition={{ type: "spring", stiffness: 300, damping: 20 }}
          className="flex flex-col items-center"
        >
          <div className={cn(
            "flex h-16 w-16 items-center justify-center rounded-2xl transition-colors",
            isDragActive ? "bg-[color:var(--accent)]/15" : "bg-[color:var(--accent)]/8 group-hover:bg-[color:var(--accent)]/12"
          )}>
            <UploadCloud size={28} className={cn(
              "transition-colors",
              isDragActive ? "text-[color:var(--accent)]" : "text-[color:var(--muted)] group-hover:text-[color:var(--accent)]"
            )} />
          </div>
          <h3 className="mt-4 text-lg font-semibold">
            {isDragActive ? "Drop files here" : "Upload freight documents"}
          </h3>
          <p className="mt-1.5 max-w-md text-sm text-[color:var(--muted)]">
            Drag & drop or click to select. Supports PDF, PNG, JPG, and TIFF up to 25 MB per file.
          </p>
        </motion.div>
      </div>

      {/* Selected files */}
      <AnimatePresence mode="popLayout">
        {selectedFiles.length > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="space-y-4"
          >
            {/* Reference number + actions */}
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
              <div className="flex-1">
                <label className="text-xs font-medium text-[color:var(--muted)]">Reference number (optional)</label>
                <input
                  type="text"
                  value={referenceNumber}
                  onChange={(e) => setReferenceNumber(e.target.value)}
                  placeholder="e.g. PO-2024-00123"
                  className="mt-1 h-10 w-full rounded-xl border border-[color:var(--border)] bg-white px-4 text-sm outline-none transition-colors focus:border-[color:var(--accent)] focus:ring-2 focus:ring-[color:var(--accent)]/20"
                />
              </div>
              <div className="flex gap-2">
                {errorCount > 0 && (
                  <Button variant="secondary" onClick={retryFailed} className="gap-1.5">
                    <RefreshCw size={14} />
                    Retry {errorCount} failed
                  </Button>
                )}
                <Button
                  variant="ghost"
                  onClick={clearAll}
                  className="gap-1.5 text-[color:var(--muted)]"
                  disabled={isUploading}
                >
                  <X size={14} />
                  Clear
                </Button>
                <Button
                  onClick={handleUpload}
                  disabled={isUploading || pendingCount === 0}
                  className="gap-1.5"
                >
                  {isUploading ? (
                    <>
                      <Loader2 size={14} className="animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <UploadCloud size={14} />
                      Upload {pendingCount > 0 ? `${pendingCount} file${pendingCount > 1 ? "s" : ""}` : ""}
                    </>
                  )}
                </Button>
              </div>
            </div>

            {/* Summary */}
            {doneCount > 0 && (
              <div className="flex items-center gap-2 rounded-xl bg-emerald-50 px-4 py-2.5 text-sm text-emerald-700">
                <CheckCircle2 size={16} />
                <span className="font-medium">{doneCount} document{doneCount > 1 ? "s" : ""} processed successfully</span>
              </div>
            )}

            {/* File list */}
            <div className="space-y-2">
              <AnimatePresence mode="popLayout">
                {selectedFiles.map((sf) => (
                  <FilePreview
                    key={sf.id}
                    selectedFile={sf}
                    onRemove={() => removeFile(sf.id)}
                  />
                ))}
              </AnimatePresence>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
