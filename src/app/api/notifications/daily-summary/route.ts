import { NextResponse } from "next/server";

import { db } from "@/lib/db";
import { buildDailySummary } from "@/lib/email/build-summary";
import { renderSummaryHtml, renderSummaryText } from "@/lib/email/render-summary";
import { env } from "@/lib/env";

export const runtime = "nodejs";

export async function POST(request: Request) {
  // Auth: check CRON_SECRET bearer token
  if (env.CRON_SECRET) {
    const auth = request.headers.get("authorization");
    if (auth !== `Bearer ${env.CRON_SECRET}`) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }
  }

  // Parse optional body
  let organizationId: string | null = null;
  let date: Date;

  try {
    const body = await request.json().catch(() => ({}));
    organizationId = typeof body.organizationId === "string" ? body.organizationId : null;

    if (typeof body.date === "string") {
      date = new Date(body.date);
      if (Number.isNaN(date.getTime())) {
        return NextResponse.json({ error: "Invalid date." }, { status: 400 });
      }
    } else {
      // Default to yesterday
      date = new Date();
      date.setDate(date.getDate() - 1);
    }
  } catch {
    date = new Date();
    date.setDate(date.getDate() - 1);
  }

  // Get organizations to process
  let orgs: Array<{ id: string; name: string; settings: unknown }>;

  if (organizationId) {
    const org = await db.organization.findUnique({
      where: { id: organizationId },
      select: { id: true, name: true, settings: true },
    });
    orgs = org ? [org] : [];
  } else {
    orgs = await db.organization.findMany({
      select: { id: true, name: true, settings: true },
    });
  }

  const results: Array<{
    organizationId: string;
    orgName: string;
    generated: boolean;
    reason?: string;
  }> = [];

  for (const org of orgs) {
    // Check if daily summary is enabled
    const settings = (org.settings ?? {}) as Record<string, unknown>;
    const dailySummaryEnabled = settings.dailySummaryEnabled !== false; // enabled by default

    if (!dailySummaryEnabled) {
      results.push({
        organizationId: org.id,
        orgName: org.name,
        generated: false,
        reason: "Daily summary disabled in settings.",
      });
      continue;
    }

    const summary = await buildDailySummary(org.id, date);
    const html = renderSummaryHtml(summary, org.name);
    const text = renderSummaryText(summary, org.name);

    // Store in audit log for preview (MVP: don't send email)
    await db.auditLog.create({
      data: {
        organizationId: org.id,
        action: "daily_summary_generated",
        details: {
          date: summary.date,
          html,
          text,
          stats: {
            documentsReceived: summary.documentsReceived.total,
            autoApproved: summary.autoApproved.count,
            needsReview: summary.needsReview.length,
            disputes: summary.disputes.count,
            potentialSavings: summary.potentialSavings,
          },
        },
      },
    });

    results.push({
      organizationId: org.id,
      orgName: org.name,
      generated: true,
    });
  }

  return NextResponse.json({
    processed: results.length,
    results,
  });
}
