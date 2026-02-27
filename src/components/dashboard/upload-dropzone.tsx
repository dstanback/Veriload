"use client";

import { useRouter } from "next/navigation";
import { startTransition, useState } from "react";
import { UploadCloud } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

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

export function UploadDropzone() {
  const router = useRouter();
  const [files, setFiles] = useState<FileList | null>(null);
  const [referenceNumber, setReferenceNumber] = useState("");
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<UploadResult[]>([]);

  const handleSubmit = async () => {
    if (!files?.length) {
      return;
    }

    setLoading(true);
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

      {results.length > 0 ? (
        <Card className="bg-white/90">
          <p className="text-lg font-semibold">Latest processing results</p>
          <div className="mt-4 space-y-3">
            {results.map((result) => (
              <div key={result.document.id} className="rounded-2xl border border-[color:var(--border)] bg-[#f7f4ee] p-4">
                <p className="font-medium">
                  Document {result.document.id} classified as {result.document.doc_type ?? "unknown"}
                </p>
                <p className="mt-1 text-sm text-[color:var(--muted)]">
                  Status: {result.document.status}.{" "}
                  {result.queued
                    ? "Queued for worker processing."
                    : `Shipment: ${result.shipment?.shipment_ref ?? result.shipment?.id ?? "new pending group"}`}
                </p>
              </div>
            ))}
          </div>
        </Card>
      ) : null}
    </div>
  );
}
