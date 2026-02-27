import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import type { DiscrepancyRecord } from "@/types/discrepancies";

export function DiscrepancyCard({ discrepancy }: { discrepancy: DiscrepancyRecord }) {
  return (
    <Card className="bg-white/90">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-[color:var(--muted)]">{discrepancy.field_name}</p>
          <p className="mt-2 text-lg font-semibold">{discrepancy.source_value ?? "—"} vs {discrepancy.compare_value ?? "—"}</p>
          {discrepancy.notes ? <p className="mt-2 text-sm text-[color:var(--muted)]">{discrepancy.notes}</p> : null}
        </div>
        <Badge tone={discrepancy.severity}>{discrepancy.severity}</Badge>
      </div>
    </Card>
  );
}
