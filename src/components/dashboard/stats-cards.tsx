import { Card } from "@/components/ui/card";
import type { DashboardSummary } from "@/types/shipments";

const labels: Array<{
  key: keyof Pick<DashboardSummary, "documentsProcessedToday" | "pendingReview" | "autoApproved" | "disputesOpen">;
  label: string;
}> = [
  { key: "documentsProcessedToday", label: "Processed today" },
  { key: "pendingReview", label: "Pending review" },
  { key: "autoApproved", label: "Auto-approved" },
  { key: "disputesOpen", label: "Open disputes" }
];

export function StatsCards({ summary }: { summary: DashboardSummary }) {
  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      {labels.map((item) => (
        <Card key={item.key} className="bg-white/85">
          <p className="text-sm text-[color:var(--muted)]">{item.label}</p>
          <p className="mt-3 text-4xl font-semibold">{summary[item.key]}</p>
        </Card>
      ))}
    </div>
  );
}
