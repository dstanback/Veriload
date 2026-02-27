import { randomUUID } from "node:crypto";
import path from "node:path";

import { NextResponse } from "next/server";

import { env } from "@/lib/env";
import { parseInboundEmail } from "@/lib/email/parse-inbound";
import { ingestStoredDocumentForOrganization, resolveOrganizationForInboundAddress } from "@/lib/repository";
import { saveFile } from "@/lib/storage";

export const runtime = "nodejs";

function isAuthorized(request: Request) {
  if (!env.SENDGRID_INBOUND_WEBHOOK_SECRET) {
    return true;
  }

  return request.headers.get("x-veriload-webhook-secret") === env.SENDGRID_INBOUND_WEBHOOK_SECRET;
}

export async function POST(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized webhook." }, { status: 401 });
  }

  const formData = await request.formData();
  const email = await parseInboundEmail(formData);
  const organization = await resolveOrganizationForInboundAddress(email.to);

  if (!organization) {
    return NextResponse.json({ error: `No organization mapping was found for ${email.to}.` }, { status: 404 });
  }

  if (email.attachments.length === 0) {
    return NextResponse.json({
      message: "No valid attachments detected. Ignored inline files and unsupported attachments."
    });
  }

  const results = [];

  for (const attachment of email.attachments) {
    if (attachment.size > 25 * 1024 * 1024) {
      return NextResponse.json(
        { error: `Attachment ${attachment.filename} exceeds the 25MB limit.` },
        { status: 400 }
      );
    }

    const documentId = randomUUID();
    const storagePath = path.posix.join("email", documentId, attachment.filename);
    await saveFile(storagePath, attachment.buffer, attachment.mimeType);
    results.push(
      await ingestStoredDocumentForOrganization({
        organizationId: organization.id,
        filename: attachment.filename,
        mimeType: attachment.mimeType,
        storagePath,
        source: "email",
        sourceMetadata: {
          sender: email.from,
          subject: email.subject,
          to: email.to,
          cc: email.cc,
          receivedAt: email.date,
          size: attachment.size
        }
      })
    );
  }

  return NextResponse.json({
    message: `We received ${results.length} document(s) from your email. They are being processed and will appear on your dashboard shortly.`,
    sender: email.from,
    to: email.to,
    results
  });
}
