import "server-only";

import { sendEmail, type SendEmailResult } from "@/lib/email/client";

export interface SendSummaryEmailParams {
  to: string[];
  orgName: string;
  subject: string;
  html: string;
  text: string;
}

export async function sendSummaryEmail(
  params: SendSummaryEmailParams
): Promise<Array<{ recipient: string } & SendEmailResult>> {
  const results: Array<{ recipient: string } & SendEmailResult> = [];

  for (const recipient of params.to) {
    console.log(
      `[email] Sending daily summary for "${params.orgName}" to ${recipient}`
    );

    const result = await sendEmail({
      to: recipient,
      subject: params.subject,
      html: params.html,
      text: params.text,
    });

    if (result.sent) {
      console.log(
        `[email] Summary sent to ${recipient} — messageId: ${result.messageId}`
      );
    } else {
      console.warn(
        `[email] Summary send failed for ${recipient}: ${result.error}`
      );
    }

    results.push({ recipient, ...result });
  }

  return results;
}
