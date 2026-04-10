export const dynamic = "force-dynamic";

import { getCurrentAppSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { Card } from "@/components/ui/card";
import { NotificationsList } from "@/components/dashboard/notifications-list";

export default async function NotificationsPage() {
  const session = await getCurrentAppSession();

  const summaries = await db.auditLog.findMany({
    where: {
      organizationId: session.organizationId,
      action: "daily_summary_generated",
    },
    orderBy: { createdAt: "desc" },
    take: 30,
  });

  const items = summaries.map((s) => {
    const details = (s.details ?? {}) as Record<string, unknown>;
    const stats = (details.stats ?? {}) as Record<string, number>;
    return {
      id: s.id,
      date: (details.date as string) ?? s.createdAt.toISOString().slice(0, 10),
      createdAt: s.createdAt.toISOString(),
      html: (details.html as string) ?? "",
      stats: {
        documentsReceived: stats.documentsReceived ?? 0,
        autoApproved: stats.autoApproved ?? 0,
        needsReview: stats.needsReview ?? 0,
        disputes: stats.disputes ?? 0,
        potentialSavings: stats.potentialSavings ?? 0,
      },
    };
  });

  return (
    <div className="space-y-6">
      <Card className="bg-white/90">
        <p className="text-xs uppercase tracking-[0.2em] text-[color:var(--muted)]">
          Notifications
        </p>
        <h2 className="mt-2 text-2xl font-semibold">Daily Summaries</h2>
        <p className="mt-1 text-sm text-[color:var(--muted)]">
          Reconciliation summaries generated for your organization. Preview email
          content or generate a new summary for today.
        </p>
      </Card>
      <NotificationsList items={items} />
    </div>
  );
}
