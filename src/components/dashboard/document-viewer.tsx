import { Card } from "@/components/ui/card";
import type { ShipmentDetail } from "@/types/shipments";

export function DocumentViewer({ documents }: { documents: ShipmentDetail["documents"] }) {
  return (
    <div className="grid gap-4 xl:grid-cols-2">
      {documents.map((document) => (
        <Card key={document.id} className="space-y-4 bg-white/85">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-[color:var(--muted)]">{document.role}</p>
              <p className="mt-1 text-lg font-semibold">{document.original_filename ?? document.id}</p>
            </div>
            <span className="rounded-full bg-black/5 px-3 py-1 text-xs font-medium">{document.doc_type ?? "unknown"}</span>
          </div>
          <div className="rounded-[1.5rem] border border-dashed border-[color:var(--border)] bg-[#f7f4ee] p-4">
            <p className="text-sm font-medium">Stored asset</p>
            <p className="mt-2 break-all text-xs text-[color:var(--muted)]">{document.storage_path}</p>
          </div>
          <pre className="overflow-x-auto rounded-[1.5rem] bg-[#17202a] p-4 text-xs leading-6 text-white/90">
            {JSON.stringify(document.extracted_data?.extracted_fields ?? {}, null, 2)}
          </pre>
        </Card>
      ))}
    </div>
  );
}
