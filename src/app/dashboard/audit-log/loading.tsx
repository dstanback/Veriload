import { AuditLogSkeleton } from "@/components/dashboard/audit-log-table";

export default function AuditLogLoading() {
  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs uppercase tracking-[0.2em] text-[color:var(--muted)]">
          Activity
        </p>
        <h1 className="mt-1 text-2xl font-semibold">Audit Log</h1>
      </div>
      <AuditLogSkeleton />
    </div>
  );
}
