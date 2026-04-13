import { NextResponse } from "next/server";

import { getCurrentAppSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { isEmailConfigured } from "@/lib/email/client";
import {
  generateDisputeEmail,
  type DisputeDiscrepancy,
} from "@/lib/email/generate-dispute";
import { sendDisputeEmail } from "@/lib/email/send-dispute";
import { disputeShipment } from "@/lib/repository";

export const runtime = "nodejs";

function wrapDisputeBodyAsHtml(body: string): string {
  const escaped = body
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\n/g, "<br>");
  return `<!DOCTYPE html><html><body style="font-family:sans-serif;font-size:14px;line-height:1.6;color:#333;">${escaped}</body></html>`;
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  let session;
  try {
    session = await getCurrentAppSession();
  } catch {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const { id } = await params;
  const body = (await request.json().catch(() => ({}))) as {
    reason?: string;
    discrepancyIds?: string[];
    carrierEmail?: string;
  };

  if (!body.reason || body.reason.trim().length === 0) {
    return NextResponse.json(
      { error: "A dispute reason is required." },
      { status: 400 }
    );
  }

  const reason = body.reason.trim();
  const carrierEmail = body.carrierEmail?.trim() || null;

  const shipment = await disputeShipment(
    id,
    reason,
    body.discrepancyIds ?? null,
    session.userId
  );

  if (!shipment) {
    return NextResponse.json(
      { error: "Shipment not found." },
      { status: 404 }
    );
  }

  // Build discrepancy data for email generation
  const disputedDiscrepancies: DisputeDiscrepancy[] =
    shipment.discrepancies
      .filter((d) => d.resolution === "disputed")
      .map((d) => ({
        field: d.field_name,
        sourceValue: d.source_value,
        compareValue: d.compare_value,
        variance:
          d.variance_amount != null
            ? `$${Math.abs(d.variance_amount).toFixed(2)}`
            : d.variance_pct != null
              ? `${(d.variance_pct * 100).toFixed(1)}%`
              : null,
      }));

  const email = await generateDisputeEmail({
    carrierName: shipment.carrier_name ?? "Unknown Carrier",
    shipmentRef: shipment.shipment_ref ?? shipment.id,
    bolNumber: shipment.bol_number,
    discrepancies: disputedDiscrepancies,
    reason,
  });

  // Attempt to send the email if carrier email is provided and SendGrid is configured
  let emailSendResult: { sent: boolean; messageId?: string; error?: string } = {
    sent: false,
  };

  if (carrierEmail && isEmailConfigured()) {
    emailSendResult = await sendDisputeEmail({
      to: carrierEmail,
      carrierName: shipment.carrier_name ?? "Unknown Carrier",
      subject: email.subject,
      htmlBody: wrapDisputeBodyAsHtml(email.body),
      textBody: email.body,
      shipmentRef: shipment.shipment_ref ?? shipment.id,
    });
  }

  // Update the audit log entry with the generated email subject and send status
  const auditEntry = await db.auditLog.findFirst({
    where: {
      shipmentId: id,
      action: "shipment_disputed",
    },
    orderBy: { createdAt: "desc" },
  });

  if (auditEntry) {
    const details = (auditEntry.details ?? {}) as Record<string, unknown>;
    await db.auditLog.update({
      where: { id: auditEntry.id },
      data: {
        details: {
          ...details,
          email_subject: email.subject,
          ...(carrierEmail
            ? {
                carrier_email: carrierEmail,
                email_sent: emailSendResult.sent,
                email_message_id: emailSendResult.messageId ?? null,
                email_send_error: emailSendResult.error ?? null,
              }
            : {}),
        },
      },
    });
  }

  return NextResponse.json({
    shipment,
    email: {
      subject: email.subject,
      body: email.body,
      sent: emailSendResult.sent,
      messageId: emailSendResult.messageId ?? null,
      carrierEmail: carrierEmail ?? null,
    },
  });
}
