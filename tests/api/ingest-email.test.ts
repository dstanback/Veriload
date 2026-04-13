import { describe, it, expect, vi, beforeEach } from "vitest";

import { parseInboundEmail } from "@/lib/email/parse-inbound";

// Mock dependencies used by the route handler
vi.mock("@/lib/db", () => ({
  db: {
    document: {
      create: vi.fn().mockResolvedValue({ id: "mock-doc-id" }),
      findFirst: vi.fn().mockResolvedValue(null)
    },
    auditLog: {
      create: vi.fn().mockResolvedValue({ id: "mock-audit-id" })
    }
  }
}));

vi.mock("@/lib/storage", () => ({
  saveFile: vi.fn().mockResolvedValue({ storagePath: "email/test/file.pdf", publicUrl: null })
}));

vi.mock("@/lib/repository", () => ({
  resolveOrganizationForInboundAddress: vi.fn().mockImplementation(async (address: string) => {
    if (address.includes("acme")) {
      return { id: "org-1", slug: "acme", name: "Acme Logistics" };
    }
    return null;
  }),
  ingestStoredDocumentForOrganization: vi.fn().mockResolvedValue({
    document: { id: "mock-doc-id", status: "pending" },
    shipment: null,
    queued: false
  })
}));

vi.mock("@/lib/env", () => ({
  env: {
    EMAIL_DOMAIN: "veriload.local",
    SENDGRID_INBOUND_WEBHOOK_SECRET: undefined,
    SENDGRID_WEBHOOK_VERIFICATION_KEY: undefined
  }
}));

function buildFormData(overrides: {
  to?: string;
  from?: string;
  subject?: string;
  envelope?: string;
  attachments?: Array<{ name: string; type: string; size: number }>;
} = {}): FormData {
  const formData = new FormData();
  formData.set("to", overrides.to ?? "docs@acme.veriload.local");
  formData.set("from", overrides.from ?? "shipper@carrier.com");
  formData.set("subject", overrides.subject ?? "Invoice attached");

  if (overrides.envelope) {
    formData.set("envelope", overrides.envelope);
  }

  const files = overrides.attachments ?? [
    { name: "invoice.pdf", type: "application/pdf", size: 50_000 }
  ];

  formData.set("attachments", `${files.length}`);
  files.forEach((file, i) => {
    formData.set(
      `attachment${i + 1}`,
      new File([Buffer.alloc(file.size)], file.name, { type: file.type })
    );
  });

  return formData;
}

describe("parseInboundEmail", () => {
  it("parses a SendGrid payload with 2 PDF attachments and 1 ignored .vcf", async () => {
    const formData = buildFormData({
      attachments: [
        { name: "freight-bill.pdf", type: "application/pdf", size: 100_000 },
        { name: "bol-scan.pdf", type: "application/pdf", size: 200_000 },
        { name: "contact.vcf", type: "text/x-vcard", size: 1_500 }
      ]
    });

    const result = await parseInboundEmail(formData);

    expect(result.attachments).toHaveLength(2);
    expect(result.attachments.map((a) => a.filename)).toEqual([
      "freight-bill.pdf",
      "bol-scan.pdf"
    ]);
    expect(result.sender).toBe("shipper@carrier.com");
    expect(result.subject).toBe("Invoice attached");
  });

  it("filters non-document MIME types", async () => {
    const formData = buildFormData({
      attachments: [
        { name: "invoice.pdf", type: "application/pdf", size: 50_000 },
        { name: "spreadsheet.xlsx", type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", size: 50_000 },
        { name: "readme.txt", type: "text/plain", size: 50_000 },
        { name: "scan.tiff", type: "image/tiff", size: 50_000 }
      ]
    });

    const result = await parseInboundEmail(formData);

    expect(result.attachments).toHaveLength(2);
    expect(result.attachments.map((a) => a.filename)).toEqual(["invoice.pdf", "scan.tiff"]);
  });

  it("ignores .sig files", async () => {
    const formData = buildFormData({
      attachments: [
        { name: "invoice.pdf", type: "application/pdf", size: 50_000 },
        { name: "signature.sig", type: "application/pgp-signature", size: 50_000 }
      ]
    });

    const result = await parseInboundEmail(formData);

    expect(result.attachments).toHaveLength(1);
    expect(result.attachments[0]?.filename).toBe("invoice.pdf");
  });

  it("ignores inline images smaller than 10KB", async () => {
    const formData = buildFormData({
      attachments: [
        { name: "invoice.pdf", type: "application/pdf", size: 50_000 },
        { name: "logo.png", type: "image/png", size: 5_000 }
      ]
    });

    const result = await parseInboundEmail(formData);

    expect(result.attachments).toHaveLength(1);
  });

  it("extracts recipients from envelope JSON when available", async () => {
    const formData = buildFormData({
      to: "docs@acme.veriload.local",
      envelope: JSON.stringify({
        to: ["docs@acme.veriload.local", "backup@other.veriload.local"],
        from: "shipper@carrier.com"
      })
    });

    const result = await parseInboundEmail(formData);

    expect(result.recipients).toHaveLength(2);
    expect(result.recipients).toContain("docs@acme.veriload.local");
    expect(result.recipients).toContain("backup@other.veriload.local");
  });

  it("falls back to to header when envelope is missing", async () => {
    const formData = buildFormData({
      to: "docs@acme.veriload.local"
    });

    const result = await parseInboundEmail(formData);

    expect(result.recipients).toEqual(["docs@acme.veriload.local"]);
  });

  it("returns attachment buffers with correct content types", async () => {
    const formData = buildFormData({
      attachments: [
        { name: "photo.jpg", type: "image/jpeg", size: 20_000 }
      ]
    });

    const result = await parseInboundEmail(formData);

    expect(result.attachments).toHaveLength(1);
    expect(result.attachments[0]?.contentType).toBe("image/jpeg");
    expect(result.attachments[0]?.buffer).toBeInstanceOf(Buffer);
    expect(result.attachments[0]?.size).toBe(20_000);
  });
});

describe("org resolution from email address", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("resolves org for a valid acme address", async () => {
    const { resolveOrganizationForInboundAddress } = await import("@/lib/repository");
    const org = await resolveOrganizationForInboundAddress("docs@acme.veriload.local");
    expect(org).toBeTruthy();
    expect(org!.slug).toBe("acme");
  });

  it("returns null for unknown org", async () => {
    const { resolveOrganizationForInboundAddress } = await import("@/lib/repository");
    const org = await resolveOrganizationForInboundAddress("docs@unknown.veriload.local");
    expect(org).toBeNull();
  });
});

describe("POST /api/ingest/email", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  async function callRoute(formData: FormData) {
    const { POST } = await import("@/app/api/ingest/email/route");
    const request = new Request("https://localhost/api/ingest/email", {
      method: "POST",
      body: formData
    });
    return POST(request);
  }

  it("processes valid attachments and creates audit log", async () => {
    const { db } = await import("@/lib/db");
    const { ingestStoredDocumentForOrganization } = await import("@/lib/repository");
    const { saveFile } = await import("@/lib/storage");

    const formData = buildFormData({
      to: "docs@acme.veriload.local",
      from: "ops@carrier.com",
      subject: "Monthly invoices",
      attachments: [
        { name: "inv-001.pdf", type: "application/pdf", size: 50_000 },
        { name: "inv-002.pdf", type: "application/pdf", size: 60_000 }
      ]
    });

    const response = await callRoute(formData);

    expect(response.status).toBe(200);
    expect(saveFile).toHaveBeenCalledTimes(2);
    expect(ingestStoredDocumentForOrganization).toHaveBeenCalledTimes(2);

    // Verify audit log was created
    expect(db.auditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          action: "email_ingested",
          details: expect.objectContaining({
            sender: "ops@carrier.com",
            subject: "Monthly invoices",
            attachmentCount: 2,
            orgSlug: "acme"
          })
        })
      })
    );
  });

  it("returns 200 for unknown org without leaking info", async () => {
    const formData = buildFormData({
      to: "docs@unknown.veriload.local"
    });

    const response = await callRoute(formData);

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.ok).toBe(true);
    expect(body.error).toBeUndefined();
  });

  it("returns 200 with no attachments and logs audit", async () => {
    const { db } = await import("@/lib/db");
    const { ingestStoredDocumentForOrganization } = await import("@/lib/repository");

    const formData = buildFormData({
      to: "docs@acme.veriload.local",
      attachments: []
    });
    formData.set("attachments", "0");

    const response = await callRoute(formData);

    expect(response.status).toBe(200);
    expect(ingestStoredDocumentForOrganization).not.toHaveBeenCalled();
    expect(db.auditLog.create).toHaveBeenCalled();
  });

  it("skips duplicate attachments within 1 hour", async () => {
    const { db } = await import("@/lib/db");
    const { saveFile } = await import("@/lib/storage");
    const { ingestStoredDocumentForOrganization } = await import("@/lib/repository");

    // Simulate a previously-seen document
    vi.mocked(db.document.findFirst).mockResolvedValueOnce({
      id: "existing-doc",
      organizationId: "org-1",
      source: "email",
      sourceMetadata: { sender: "ops@carrier.com" },
      originalFilename: "invoice.pdf",
      storagePath: "email/existing/invoice.pdf",
      mimeType: "application/pdf",
      pageCount: null,
      status: "extracted",
      docType: "invoice",
      docTypeConfidence: 0.95,
      processingError: null,
      createdAt: new Date(),
      processedAt: new Date()
    } as any);

    const formData = buildFormData({
      to: "docs@acme.veriload.local",
      from: "ops@carrier.com",
      attachments: [{ name: "invoice.pdf", type: "application/pdf", size: 50_000 }]
    });

    const response = await callRoute(formData);

    expect(response.status).toBe(200);
    expect(saveFile).not.toHaveBeenCalled();
    expect(ingestStoredDocumentForOrganization).not.toHaveBeenCalled();
  });

  it("marks oversized attachments as failed", async () => {
    const { db } = await import("@/lib/db");
    const { ingestStoredDocumentForOrganization } = await import("@/lib/repository");

    const formData = buildFormData({
      to: "docs@acme.veriload.local",
      attachments: [
        { name: "huge-scan.pdf", type: "application/pdf", size: 26 * 1024 * 1024 }
      ]
    });

    const response = await callRoute(formData);

    expect(response.status).toBe(200);
    expect(db.document.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: "failed",
          processingError: "File exceeds 25MB limit",
          originalFilename: "huge-scan.pdf"
        })
      })
    );
    expect(ingestStoredDocumentForOrganization).not.toHaveBeenCalled();
  });
});
