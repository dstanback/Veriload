export const dynamic = "force-dynamic";

import Link from "next/link";
import {
  CheckCircle2,
  Clock,
  AlertCircle,
  FileText,
  Loader2,
  ArrowRight
} from "lucide-react";

import { UploadDropzone } from "@/components/dashboard/upload-dropzone";
import { PageHeader } from "@/components/PageHeader";
import { StatusBadge } from "@/components/StatusBadge";
import { Card } from "@/components/ui/card";
import { formatDate } from "@/lib/utils";
import { listRecentDocuments } from "@/lib/repository";

function StatusIcon({ status }: { status: string }) {
  switch (status) {
    case "extracted":
      return <CheckCircle2 size={16} className="text-emerald-600" />;
    case "processing":
      return <Loader2 size={16} className="animate-spin text-[color:var(--accent)]" />;
    case "failed":
      return <AlertCircle size={16} className="text-rose-600" />;
    case "needs_review":
      return <AlertCircle size={16} className="text-amber-600" />;
    default:
      return <Clock size={16} className="text-[color:var(--muted)]" />;
  }
}

export default async function UploadPage() {
  const recentDocuments = await listRecentDocuments(10);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Upload Documents"
        description="Drop freight documents into the extraction pipeline. Files are classified, extracted, matched to shipments, and reconciled automatically."
        breadcrumbs={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Upload" }
        ]}
      />

      <UploadDropzone />

      {/* Recent Uploads */}
      <Card className="bg-white/90">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.2em] text-[color:var(--muted)]">
              Pipeline Status
            </p>
            <h2 className="mt-1 text-lg font-semibold">Recent Uploads</h2>
          </div>
          {recentDocuments.length > 0 && (
            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">
              {recentDocuments.length} documents
            </span>
          )}
        </div>

        {recentDocuments.length === 0 ? (
          <div className="mt-6 flex flex-col items-center py-12">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[color:var(--accent)]/8">
              <FileText size={24} className="text-[color:var(--accent)]" />
            </div>
            <h3 className="mt-4 text-base font-semibold">No documents yet</h3>
            <p className="mt-1 max-w-sm text-center text-sm text-[color:var(--muted)]">
              Upload your first BOL, invoice, or rate confirmation to see documents flow through the pipeline.
            </p>
          </div>
        ) : (
          <div className="mt-4 space-y-2">
            {recentDocuments.map((doc) => (
              <div
                key={doc.id}
                className="flex items-center gap-3 rounded-2xl border border-[color:var(--border)] bg-[color:var(--background)]/50 px-4 py-3 transition-colors hover:bg-[color:var(--background)]"
              >
                <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-[color:var(--accent)]/8">
                  <FileText size={18} className="text-[color:var(--accent)]" />
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="truncate text-sm font-semibold">
                      {doc.original_filename ?? doc.id.slice(0, 12)}
                    </p>
                    {doc.doc_type && (
                      <span className="rounded-full bg-black/5 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider">
                        {doc.doc_type.replace(/_/g, " ")}
                      </span>
                    )}
                  </div>
                  <p className="mt-0.5 text-xs text-[color:var(--muted)]">
                    {formatDate(doc.created_at)}
                    {doc.doc_type_confidence != null && (
                      <> &middot; {(doc.doc_type_confidence * 100).toFixed(0)}% confidence</>
                    )}
                  </p>
                </div>

                <div className="flex flex-shrink-0 items-center gap-2">
                  <StatusIcon status={doc.status} />
                  <StatusBadge variant="status" value={doc.status} />
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
