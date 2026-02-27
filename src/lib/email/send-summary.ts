import "server-only";

import type { DashboardSummary } from "@/types/shipments";

export function buildDailySummaryEmail(summary: DashboardSummary) {
  return {
    subject: "Veriload daily reconciliation summary",
    text: [
      `Documents processed today: ${summary.documentsProcessedToday}`,
      `Pending review: ${summary.pendingReview}`,
      `Auto-approved: ${summary.autoApproved}`,
      `Disputes open: ${summary.disputesOpen}`
    ].join("\n")
  };
}
