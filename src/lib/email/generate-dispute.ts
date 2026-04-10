import "server-only";

import { getAnthropicClient } from "@/lib/ai/client";
import { loadPrompt } from "@/lib/ai/prompt-loader";

export interface DisputeDiscrepancy {
  field: string;
  sourceValue: string | null;
  compareValue: string | null;
  variance: string | null;
}

export interface GenerateDisputeEmailParams {
  carrierName: string;
  shipmentRef: string;
  bolNumber: string | null;
  discrepancies: DisputeDiscrepancy[];
  reason: string;
}

function formatDiscrepancyTable(discrepancies: DisputeDiscrepancy[]): string {
  if (discrepancies.length === 0) return "  (No specific discrepancies listed)";

  const lines = discrepancies.map((d) => {
    const invoice = d.sourceValue ?? "N/A";
    const expected = d.compareValue ?? "N/A";
    const variance = d.variance ? ` | Variance: ${d.variance}` : "";
    return `  - ${d.field}: Invoice "${invoice}" vs Expected "${expected}"${variance}`;
  });

  return lines.join("\n");
}

function generateFromTemplate(params: GenerateDisputeEmailParams): {
  subject: string;
  body: string;
} {
  const ref = params.shipmentRef;
  const bolLine = params.bolNumber ? ` (BOL: ${params.bolNumber})` : "";

  const subject = `Invoice Dispute — Shipment ${ref} [${params.carrierName}]`;

  const body = `Dear ${params.carrierName} Accounts Receivable,

We are writing regarding shipment ${ref}${bolLine}.

During our reconciliation review, we identified the following discrepancies between the submitted invoice and our approved rates/shipment documentation:

${formatDiscrepancyTable(params.discrepancies)}

Reason for dispute:
${params.reason}

We kindly request that you review these items and provide a corrected invoice or supporting documentation within 5 business days.

If you have any questions or need additional information, please do not hesitate to reach out.

Best regards,
Veriload Freight Audit Team`;

  return { subject, body };
}

export async function generateDisputeEmail(
  params: GenerateDisputeEmailParams
): Promise<{ subject: string; body: string }> {
  const client = getAnthropicClient();

  if (!client) {
    return generateFromTemplate(params);
  }

  try {
    const promptTemplate = await loadPrompt("generate-dispute-email.txt");

    const discrepancyText = params.discrepancies
      .map(
        (d) =>
          `- ${d.field}: Invoice shows "${d.sourceValue ?? "N/A"}" vs expected "${d.compareValue ?? "N/A"}"${d.variance ? ` (variance: ${d.variance})` : ""}`
      )
      .join("\n");

    const userMessage = `${promptTemplate}

Shipment Reference: ${params.shipmentRef}
Carrier: ${params.carrierName}
BOL Number: ${params.bolNumber ?? "N/A"}

Discrepancies found:
${discrepancyText}

Shipper's reason/notes:
${params.reason}

Respond with a JSON object containing exactly two fields: "subject" (a short email subject line) and "body" (the full email body text). Return only the JSON, no other text.`;

    const response = await client.messages.create({
      model: "claude-3-5-haiku-latest",
      max_tokens: 1024,
      temperature: 0.3,
      messages: [{ role: "user", content: userMessage }],
    });

    const textBlock = response.content.find((b) => b.type === "text");
    if (textBlock && textBlock.type === "text") {
      const jsonMatch = textBlock.text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]) as {
          subject?: string;
          body?: string;
        };
        if (
          typeof parsed.subject === "string" &&
          typeof parsed.body === "string"
        ) {
          return { subject: parsed.subject, body: parsed.body };
        }
      }
    }

    return generateFromTemplate(params);
  } catch {
    return generateFromTemplate(params);
  }
}
