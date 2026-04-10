import { randomUUID } from "node:crypto";
import crypto from "node:crypto";
import path from "node:path";

import { NextResponse } from "next/server";

import { db } from "@/lib/db";
import { env } from "@/lib/env";
import { parseInboundEmail } from "@/lib/email/parse-inbound";
import { ingestStoredDocumentForOrganization, resolveOrganizationForInboundAddress } from "@/lib/repository";
import { saveFile } from "@/lib/storage";

export const runtime = "nodejs";

const MAX_ATTACHMENT_BYTES = 25 * 1024 * 1024;
const DEDUP_WINDOW_MS = 60 * 60 * 1000; // 1 hour

function verifyWebhookSignature(request: Request): boolean {
  const verificationKey = env.SENDGRID_WEBHOOK_VERIFICATION_KEY;

  if (!verificationKey) {
    console.warn("[email-ingest] SENDGRID_WEBHOOK_VERIFICATION_KEY is not set — skipping signature verification (dev mode)");
    return true;
  }

  const signature = request.headers.get("x-twilio-email-event-webhook-signature");
  const timestamp = request.headers.get("x-twilio-email-event-webhook-timestamp");

  if (!signature || !timestamp) {
    return false;
  }

  try {
    const publicKey = crypto.createPublicKey({
      key: verificationKey,
      format: "pem",
      type: "spki"
    });
    const payload = timestamp + (request as unknown as { _body?: string })._body;
    const decodedSignature = Buffer.from(signature, "base64");
    return crypto.verify("sha256", Buffer.from(payload), publicKey, decodedSignature);
  } catch {
    return false;
  }
}

function isAuthorized(request: Request) {
  // First check the simple shared-secret approach (backward compatible)
  if (env.SENDGRID_INBOUND_WEBHOOK_SECRET) {
    if (request.headers.get("x-veriload-webhook-secret") === env.SENDGRID_INBOUND_WEBHOOK_SECRET) {
      return true;
    }
  }

  // Then try EventWebhook signature verification
  return verifyWebhookSignature(request);
}

export async function POST(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized webhook." }, { status: 401 });
  }

  const formData = await request.formData();
  const email = await parseInboundEmail(formData);

  // Resolve org from each recipient address
  let organization = null;
  let matchedRecipient = "";
  for (const recipient of email.recipients) {
    organization = await resolveOrganizationForInboundAddress(recipient);
    if (organization) {
      matchedRecipient = recipient;
      break;
    }
  }

  if (!organization) {
    // Acknowledge but don't leak org existence
    console.log(`[email-ingest] No org found for recipients: ${email.recipients.join(", ")}`);
    return NextResponse.json({ ok: true });
  }

  if (email.attachments.length === 0) {
    console.log(`[email-ingest] No valid attachments from ${email.sender} to ${matchedRecipient}`);
    await db.auditLog.create({
      data: {
        organizationId: organization.id,
        action: "email_ingested",
        details: {
          sender: email.sender,
          subject: email.subject,
          attachmentCount: 0,
          orgSlug: organization.slug,
          note: "No valid attachments"
        }
      }
    });
    return NextResponse.json({ ok: true });
  }

  const results = [];
  const now = new Date();
  const dedupCutoff = new Date(now.getTime() - DEDUP_WINDOW_MS);
  let skippedDuplicates = 0;

  for (const attachment of email.attachments) {
    // Oversized attachment → create failed document
    if (attachment.size > MAX_ATTACHMENT_BYTES) {
      const documentId = randomUUID();
      const storagePath = path.posix.join("email", documentId, attachment.filename);

      await db.document.create({
        data: {
          id: documentId,
          organizationId: organization.id,
          source: "email",
          sourceMetadata: {
            sender: email.sender,
            subject: email.subject,
            receivedAt: now.toISOString()
          },
          originalFilename: attachment.filename,
          storagePath,
          mimeType: attachment.contentType,
          status: "failed",
          processingError: "File exceeds 25MB limit",
          processedAt: now
        }
      });

      results.push({ documentId, status: "failed", reason: "File exceeds 25MB limit" });
      continue;
    }

    // Duplicate detection: same filename + sender + org within 1 hour
    const duplicate = await db.document.findFirst({
      where: {
        organizationId: organization.id,
        originalFilename: attachment.filename,
        source: "email",
        createdAt: { gte: dedupCutoff },
        sourceMetadata: {
          path: ["sender"],
          equals: email.sender
        }
      },
      orderBy: { createdAt: "desc" }
    });

    if (duplicate) {
      skippedDuplicates++;
      console.log(
        `[email-ingest] Duplicate skipped: "${attachment.filename}" from ${email.sender} (org: ${organization.slug}), existing doc: ${duplicate.id}`
      );
      continue;
    }

    const documentId = randomUUID();
    const storagePath = path.posix.join("email", documentId, attachment.filename);
    await saveFile(storagePath, attachment.buffer, attachment.contentType);
    results.push(
      await ingestStoredDocumentForOrganization({
        organizationId: organization.id,
        filename: attachment.filename,
        mimeType: attachment.contentType,
        storagePath,
        source: "email",
        sourceMetadata: {
          sender: email.sender,
          subject: email.subject,
          receivedAt: now.toISOString()
        }
      })
    );
  }

  // Create audit log entry
  await db.auditLog.create({
    data: {
      organizationId: organization.id,
      action: "email_ingested",
      details: {
        sender: email.sender,
        subject: email.subject,
        attachmentCount: email.attachments.length,
        processedCount: results.length,
        skippedDuplicates,
        orgSlug: organization.slug
      }
    }
  });

  return NextResponse.json({ ok: true });
}
