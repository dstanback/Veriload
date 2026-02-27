import "server-only";

export interface ParsedInboundAttachment {
  filename: string;
  mimeType: string;
  size: number;
  buffer: Buffer;
}

export interface ParsedInboundEmail {
  to: string;
  from: string;
  subject: string;
  cc: string[];
  date: string | null;
  attachments: ParsedInboundAttachment[];
}

function shouldIgnoreAttachment(filename: string, size: number) {
  const lower = filename.toLowerCase();
  return lower.endsWith(".sig") || lower.endsWith(".vcf") || size < 10_000;
}

export async function parseInboundEmail(formData: FormData): Promise<ParsedInboundEmail> {
  const attachmentCount = Number(formData.get("attachments") ?? 0);
  const attachments: ParsedInboundAttachment[] = [];

  for (let index = 1; index <= attachmentCount; index += 1) {
    const file = formData.get(`attachment${index}`);
    if (!(file instanceof File)) {
      continue;
    }

    if (shouldIgnoreAttachment(file.name, file.size)) {
      continue;
    }

    attachments.push({
      filename: file.name,
      mimeType: file.type || "application/octet-stream",
      size: file.size,
      buffer: Buffer.from(await file.arrayBuffer())
    });
  }

  return {
    to: `${formData.get("to") ?? ""}`,
    from: `${formData.get("from") ?? ""}`,
    subject: `${formData.get("subject") ?? ""}`,
    cc: `${formData.get("cc") ?? ""}`
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean),
    date: formData.get("date") ? `${formData.get("date")}` : null,
    attachments
  };
}
