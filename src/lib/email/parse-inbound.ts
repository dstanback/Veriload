import "server-only";

export interface ParsedInboundAttachment {
  filename: string;
  contentType: string;
  size: number;
  buffer: Buffer;
}

export interface ParsedInboundEmail {
  sender: string;
  recipients: string[];
  subject: string;
  text: string;
  html: string;
  attachments: ParsedInboundAttachment[];
}

const ALLOWED_MIME_TYPES = new Set([
  "application/pdf",
  "image/png",
  "image/jpeg",
  "image/jpg",
  "image/tiff"
]);

const IGNORED_EXTENSIONS = new Set([".sig", ".vcf"]);

function shouldKeepAttachment(filename: string, mimeType: string, size: number): boolean {
  const lower = filename.toLowerCase();

  for (const ext of IGNORED_EXTENSIONS) {
    if (lower.endsWith(ext)) return false;
  }

  // Ignore inline images smaller than 10 KB
  if (size < 10_000) return false;

  if (!ALLOWED_MIME_TYPES.has(mimeType.toLowerCase())) return false;

  return true;
}

function parseEnvelopeRecipients(formData: FormData): string[] {
  const envelopeRaw = formData.get("envelope");
  if (envelopeRaw) {
    try {
      const envelope = JSON.parse(`${envelopeRaw}`) as { to?: string[] };
      if (Array.isArray(envelope.to) && envelope.to.length > 0) {
        return envelope.to.map((addr) => addr.trim().toLowerCase());
      }
    } catch {
      // fall through to `to` header
    }
  }

  const toHeader = `${formData.get("to") ?? ""}`;
  return toHeader
    .split(",")
    .map((addr) => addr.trim().toLowerCase())
    .filter(Boolean);
}

export async function parseInboundEmail(formData: FormData): Promise<ParsedInboundEmail> {
  const attachmentCount = Number(formData.get("attachments") ?? 0);
  const attachments: ParsedInboundAttachment[] = [];

  for (let index = 1; index <= attachmentCount; index += 1) {
    const file = formData.get(`attachment${index}`);
    if (!(file instanceof File)) {
      continue;
    }

    const mimeType = file.type || "application/octet-stream";

    if (!shouldKeepAttachment(file.name, mimeType, file.size)) {
      continue;
    }

    attachments.push({
      filename: file.name,
      contentType: mimeType,
      size: file.size,
      buffer: Buffer.from(await file.arrayBuffer())
    });
  }

  return {
    sender: `${formData.get("from") ?? ""}`,
    recipients: parseEnvelopeRecipients(formData),
    subject: `${formData.get("subject") ?? ""}`,
    text: `${formData.get("text") ?? ""}`,
    html: `${formData.get("html") ?? ""}`,
    attachments
  };
}
