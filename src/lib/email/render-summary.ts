import "server-only";

import type { DailySummary } from "@/lib/email/build-summary";
import { env } from "@/lib/env";

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function currency(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
}

function severityColor(level: string | null): string {
  if (level === "red") return "#dc2626";
  if (level === "yellow") return "#d97706";
  return "#16a34a";
}

function severityLabel(level: string | null): string {
  if (level === "red") return "Red";
  if (level === "yellow") return "Yellow";
  return "Green";
}

const appUrl = env.NEXT_PUBLIC_APP_URL.replace(/\/$/, "");

/* ------------------------------------------------------------------ */
/*  HTML renderer                                                      */
/* ------------------------------------------------------------------ */

export function renderSummaryHtml(
  summary: DailySummary,
  orgName: string
): string {
  const needsReviewRows = summary.needsReview
    .map(
      (s) => `
      <tr>
        <td style="padding:10px 12px;border-bottom:1px solid #e5e7eb;">
          <a href="${appUrl}/dashboard/shipments/${s.id}" style="color:#4f46e5;text-decoration:none;font-weight:600;">${s.shipmentRef ?? s.id.slice(0, 8)}</a>
        </td>
        <td style="padding:10px 12px;border-bottom:1px solid #e5e7eb;color:#374151;">${s.carrierName ?? "—"}</td>
        <td style="padding:10px 12px;border-bottom:1px solid #e5e7eb;">
          <span style="display:inline-block;padding:2px 10px;border-radius:12px;font-size:11px;font-weight:700;color:#fff;background:${severityColor(s.discrepancyLevel)};">${severityLabel(s.discrepancyLevel)}</span>
        </td>
        <td style="padding:10px 12px;border-bottom:1px solid #e5e7eb;color:#374151;text-align:right;">${s.invoiceTotal != null ? currency(s.invoiceTotal) : "—"}</td>
        <td style="padding:10px 12px;border-bottom:1px solid #e5e7eb;color:#6b7280;font-size:12px;">${s.topDiscrepancy ?? "—"}</td>
      </tr>`
    )
    .join("");

  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  <div style="max-width:640px;margin:0 auto;padding:24px 16px;">

    <!-- Header -->
    <div style="background:#18212d;border-radius:16px;padding:24px 28px;color:#fff;">
      <p style="margin:0;font-size:11px;text-transform:uppercase;letter-spacing:2px;color:rgba(255,255,255,0.6);">Veriload</p>
      <h1 style="margin:8px 0 0;font-size:22px;font-weight:700;">Daily Reconciliation Summary</h1>
      <p style="margin:6px 0 0;font-size:13px;color:rgba(255,255,255,0.7);">${orgName} &mdash; ${summary.date}</p>
    </div>

    <!-- Stats row -->
    <div style="margin-top:16px;display:flex;gap:12px;">
      <div style="flex:1;background:#fff;border-radius:12px;padding:16px;text-align:center;border:1px solid #e5e7eb;">
        <p style="margin:0;font-size:24px;font-weight:700;color:#18212d;">${summary.documentsReceived.total}</p>
        <p style="margin:4px 0 0;font-size:11px;color:#6b7280;text-transform:uppercase;letter-spacing:1px;">Docs Received</p>
      </div>
      <div style="flex:1;background:#fff;border-radius:12px;padding:16px;text-align:center;border:1px solid #e5e7eb;">
        <p style="margin:0;font-size:24px;font-weight:700;color:#16a34a;">${summary.autoApproved.count}</p>
        <p style="margin:4px 0 0;font-size:11px;color:#6b7280;text-transform:uppercase;letter-spacing:1px;">Auto-Approved</p>
      </div>
      <div style="flex:1;background:#fff;border-radius:12px;padding:16px;text-align:center;border:1px solid #e5e7eb;">
        <p style="margin:0;font-size:24px;font-weight:700;color:#d97706;">${summary.needsReview.length}</p>
        <p style="margin:4px 0 0;font-size:11px;color:#6b7280;text-transform:uppercase;letter-spacing:1px;">Needs Review</p>
      </div>
      <div style="flex:1;background:#fff;border-radius:12px;padding:16px;text-align:center;border:1px solid #e5e7eb;">
        <p style="margin:0;font-size:24px;font-weight:700;color:#dc2626;">${summary.disputes.count}</p>
        <p style="margin:4px 0 0;font-size:11px;color:#6b7280;text-transform:uppercase;letter-spacing:1px;">Disputes</p>
      </div>
    </div>

    ${summary.needsReview.length > 0 ? `
    <!-- Needs Review -->
    <div style="margin-top:16px;background:#fff;border-radius:12px;border:1px solid #e5e7eb;overflow:hidden;">
      <div style="padding:16px 20px;border-bottom:1px solid #e5e7eb;">
        <h2 style="margin:0;font-size:15px;font-weight:700;color:#18212d;">Shipments Needing Review</h2>
      </div>
      <table style="width:100%;border-collapse:collapse;font-size:13px;">
        <thead>
          <tr style="background:#f9fafb;">
            <th style="padding:8px 12px;text-align:left;font-weight:600;color:#6b7280;font-size:11px;text-transform:uppercase;">Ref</th>
            <th style="padding:8px 12px;text-align:left;font-weight:600;color:#6b7280;font-size:11px;text-transform:uppercase;">Carrier</th>
            <th style="padding:8px 12px;text-align:left;font-weight:600;color:#6b7280;font-size:11px;text-transform:uppercase;">Severity</th>
            <th style="padding:8px 12px;text-align:right;font-weight:600;color:#6b7280;font-size:11px;text-transform:uppercase;">Amount</th>
            <th style="padding:8px 12px;text-align:left;font-weight:600;color:#6b7280;font-size:11px;text-transform:uppercase;">Top Issue</th>
          </tr>
        </thead>
        <tbody>${needsReviewRows}</tbody>
      </table>
    </div>` : ""}

    ${summary.potentialSavings > 0 ? `
    <!-- Potential Savings -->
    <div style="margin-top:16px;background:linear-gradient(135deg,#ecfdf5,#d1fae5);border-radius:12px;padding:20px 24px;border:1px solid #a7f3d0;">
      <p style="margin:0;font-size:11px;text-transform:uppercase;letter-spacing:1.5px;color:#047857;">Potential Savings</p>
      <p style="margin:6px 0 0;font-size:28px;font-weight:800;color:#065f46;">${currency(summary.potentialSavings)}</p>
      <p style="margin:4px 0 0;font-size:12px;color:#059669;">Total overcharges caught on approved &amp; disputed shipments</p>
    </div>` : ""}

    <!-- CTA -->
    <div style="margin-top:20px;text-align:center;">
      <a href="${appUrl}/dashboard" style="display:inline-block;padding:12px 32px;background:#18212d;color:#fff;border-radius:24px;text-decoration:none;font-size:14px;font-weight:600;">View Dashboard</a>
    </div>

    <!-- Footer -->
    <div style="margin-top:24px;text-align:center;padding:16px 0;">
      <p style="margin:0;font-size:11px;color:#9ca3af;">You're receiving this because daily summaries are enabled for ${orgName}.</p>
      <p style="margin:4px 0 0;font-size:11px;color:#9ca3af;">Veriload &mdash; Freight Bill Reconciliation</p>
    </div>

  </div>
</body>
</html>`;
}

/* ------------------------------------------------------------------ */
/*  Plain text renderer                                                */
/* ------------------------------------------------------------------ */

export function renderSummaryText(
  summary: DailySummary,
  orgName: string
): string {
  const lines: string[] = [
    `VERILOAD DAILY RECONCILIATION SUMMARY`,
    `${orgName} — ${summary.date}`,
    ``,
    `OVERVIEW`,
    `  Documents received: ${summary.documentsReceived.total}`,
    `  Auto-approved: ${summary.autoApproved.count} (${currency(summary.autoApproved.totalInvoiceValue)})`,
    `  Needs review: ${summary.needsReview.length}`,
    `  Open disputes: ${summary.disputes.count} (${currency(summary.disputes.totalDisputedAmount)})`,
  ];

  if (summary.potentialSavings > 0) {
    lines.push(``, `POTENTIAL SAVINGS: ${currency(summary.potentialSavings)}`);
    lines.push(`  Total overcharges caught on approved & disputed shipments`);
  }

  if (summary.needsReview.length > 0) {
    lines.push(``, `SHIPMENTS NEEDING REVIEW`);
    for (const s of summary.needsReview) {
      lines.push(
        `  ${s.shipmentRef ?? s.id.slice(0, 8)} | ${s.carrierName ?? "—"} | ${severityLabel(s.discrepancyLevel)} | ${s.invoiceTotal != null ? currency(s.invoiceTotal) : "—"}`
      );
      if (s.topDiscrepancy) {
        lines.push(`    → ${s.topDiscrepancy}`);
      }
    }
  }

  lines.push(``, `View dashboard: ${appUrl}/dashboard`);

  return lines.join("\n");
}
