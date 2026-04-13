import "server-only";

import { sendEmail, type SendEmailResult } from "@/lib/email/client";

export interface SendDisputeEmailParams {
  to: string;
  carrierName: string;
  subject: string;
  htmlBody: string;
  textBody: string;
  shipmentRef: string;
}

export async function sendDisputeEmail(
  params: SendDisputeEmailParams
): Promise<SendEmailResult> {
  console.log(
    `[email] Sending dispute email for shipment ${params.shipmentRef} to ${params.to}`
  );

  const result = await sendEmail({
    to: params.to,
    subject: params.subject,
    html: params.htmlBody,
    text: params.textBody,
  });

  if (result.sent) {
    console.log(
      `[email] Dispute email sent for shipment ${params.shipmentRef} — messageId: ${result.messageId}`
    );
  } else {
    console.warn(
      `[email] Dispute email failed for shipment ${params.shipmentRef}: ${result.error}`
    );
  }

  return result;
}
