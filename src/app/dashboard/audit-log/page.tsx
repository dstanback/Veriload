export const dynamic = "force-dynamic";

import {
  AuditLogTable,
} from "@/components/dashboard/audit-log-table";
import {
  getAuditLogs,
  getAuditLogCount,
  getOrgUsers,
} from "@/lib/repository";

export default async function AuditLogPage() {
  const [logs, total, users] = await Promise.all([
    getAuditLogs(undefined, 1, 50),
    getAuditLogCount(),
    getOrgUsers(),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs uppercase tracking-[0.2em] text-[color:var(--muted)]">
          Activity
        </p>
        <h1 className="mt-1 text-2xl font-semibold">Audit Log</h1>
      </div>

      <AuditLogTable
        initialLogs={logs}
        initialTotal={total}
        users={users}
      />
    </div>
  );
}
