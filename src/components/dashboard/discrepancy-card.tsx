import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { DiscrepancyRecord } from "@/types/discrepancies";

export interface DiscrepancyEdit {
  documentId: string;
  fieldName: string;
  originalValue: string;
  newValue: string;
}

interface DiscrepancyCardProps {
  discrepancy: DiscrepancyRecord;
  editMode?: boolean;
  editedSourceValue?: string;
  editedCompareValue?: string;
  onEditSource?: (value: string) => void;
  onEditCompare?: (value: string) => void;
}

export function DiscrepancyCard({
  discrepancy,
  editMode,
  editedSourceValue,
  editedCompareValue,
  onEditSource,
  onEditCompare,
}: DiscrepancyCardProps) {
  const sourceChanged = editedSourceValue != null && editedSourceValue !== (discrepancy.source_value ?? "");
  const compareChanged = editedCompareValue != null && editedCompareValue !== (discrepancy.compare_value ?? "");

  return (
    <Card className="bg-white/90">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <p className="text-xs uppercase tracking-[0.2em] text-[color:var(--muted)]">
            {discrepancy.field_name}
          </p>

          {editMode ? (
            <div className="mt-2 space-y-2">
              {/* Source value */}
              <div className="flex items-center gap-2">
                <span className="shrink-0 text-[10px] uppercase tracking-wider text-[color:var(--muted)]">
                  Source
                </span>
                <input
                  type="text"
                  value={editedSourceValue ?? discrepancy.source_value ?? ""}
                  onChange={(e) => onEditSource?.(e.target.value)}
                  className={cn(
                    "w-full rounded-lg border px-3 py-1.5 text-sm transition",
                    "font-mono",
                    "focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500",
                    sourceChanged
                      ? "border-indigo-300 bg-indigo-50"
                      : "border-[color:var(--border)] bg-white"
                  )}
                />
                {sourceChanged && (
                  <span className="shrink-0 rounded-full bg-indigo-100 px-2 py-0.5 text-[10px] font-semibold text-indigo-700">
                    edited
                  </span>
                )}
              </div>

              {/* Compare value */}
              <div className="flex items-center gap-2">
                <span className="shrink-0 text-[10px] uppercase tracking-wider text-[color:var(--muted)]">
                  Compare
                </span>
                <input
                  type="text"
                  value={editedCompareValue ?? discrepancy.compare_value ?? ""}
                  onChange={(e) => onEditCompare?.(e.target.value)}
                  className={cn(
                    "w-full rounded-lg border px-3 py-1.5 text-sm transition",
                    "font-mono",
                    "focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500",
                    compareChanged
                      ? "border-indigo-300 bg-indigo-50"
                      : "border-[color:var(--border)] bg-white"
                  )}
                />
                {compareChanged && (
                  <span className="shrink-0 rounded-full bg-indigo-100 px-2 py-0.5 text-[10px] font-semibold text-indigo-700">
                    edited
                  </span>
                )}
              </div>
            </div>
          ) : (
            <p className="mt-2 text-lg font-semibold">
              {discrepancy.source_value ?? "—"} vs {discrepancy.compare_value ?? "—"}
            </p>
          )}

          {discrepancy.notes ? (
            <p className="mt-2 text-sm text-[color:var(--muted)]">
              {discrepancy.notes}
            </p>
          ) : null}
        </div>
        <Badge tone={discrepancy.severity}>{discrepancy.severity}</Badge>
      </div>
    </Card>
  );
}
