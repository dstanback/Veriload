import "server-only";

import sgMail from "@sendgrid/mail";

import { env } from "@/lib/env";

export interface SendEmailParams {
  to: string | string[];
  subject: string;
  html: string;
  text: string;
  from?: string;
}

export interface SendEmailResult {
  sent: boolean;
  messageId?: string;
  error?: string;
}

function getConfiguredClient(): typeof sgMail | null {
  if (!env.SENDGRID_API_KEY) {
    return null;
  }
  sgMail.setApiKey(env.SENDGRID_API_KEY);
  return sgMail;
}

export async function sendEmail(params: SendEmailParams): Promise<SendEmailResult> {
  const from = params.from ?? env.EMAIL_FROM;
  const client = getConfiguredClient();

  if (!client) {
    console.log("[email] SendGrid not configured — logging email to console (dev mode)");
    console.log("[email] From:", from);
    console.log("[email] To:", params.to);
    console.log("[email] Subject:", params.subject);
    console.log("[email] Text:", params.text.slice(0, 500));
    return { sent: false, error: "SENDGRID_API_KEY not configured" };
  }

  try {
    const [response] = await client.send({
      to: params.to,
      from,
      subject: params.subject,
      html: params.html,
      text: params.text,
    });

    const messageId = response.headers?.["x-message-id"] as string | undefined;
    return { sent: true, messageId };
  } catch (err) {
    const message = err instanceof Error ? err.message : `${err}`;
    console.error("[email] SendGrid send failed:", message);
    return { sent: false, error: message };
  }
}

export function isEmailConfigured(): boolean {
  return Boolean(env.SENDGRID_API_KEY);
}
