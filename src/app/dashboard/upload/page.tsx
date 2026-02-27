export const dynamic = "force-dynamic";

import { UploadDropzone } from "@/components/dashboard/upload-dropzone";
import { Card } from "@/components/ui/card";

export default function UploadPage() {
  return (
    <div className="space-y-6">
      <Card className="bg-white/90">
        <p className="text-xs uppercase tracking-[0.2em] text-[color:var(--muted)]">Manual ingestion</p>
        <h2 className="mt-2 text-2xl font-semibold">Upload PDFs or images into the extraction queue</h2>
        <p className="mt-2 max-w-3xl text-sm text-[color:var(--muted)]">
          Uploads create pending document rows immediately, then process through Redis workers when `REDIS_URL`
          is configured. Anthropic vision extraction and S3-compatible storage activate automatically when their
          environment variables are present.
        </p>
      </Card>
      <UploadDropzone />
    </div>
  );
}
