import { readFile, rm, mkdir } from "node:fs/promises";
import path from "node:path";

import { classifyDocument } from "@/lib/ai/classify";
import { extractFieldsFromDocument } from "@/lib/ai/extract";
import type { VisionPageImage } from "@/lib/ai/shared";
import { env } from "@/lib/env";
import { processDocument } from "@/lib/pipeline/process-document";
import { convertPdfToImages } from "@/lib/pipeline/pdf-to-images";
import { reconcileShipment } from "@/lib/pipeline/reconcile";
import { saveFile } from "@/lib/storage";
import type { ShipmentDocumentLink, ShipmentRecord } from "@/types/shipments";
import type { DocumentRecord } from "@/types/documents";

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

const STORAGE_ROOT = path.resolve(process.cwd(), ".veriload-storage");
const FIXTURES = path.resolve(process.cwd(), "tests/fixtures");

async function loadFixturePdf(filename: string): Promise<Buffer> {
  return readFile(path.join(FIXTURES, filename));
}

async function storeFixture(
  storagePath: string,
  filename: string
): Promise<void> {
  const buffer = await loadFixturePdf(filename);
  await saveFile(storagePath, buffer, "application/pdf");
}

/* ------------------------------------------------------------------ */
/*  Integration: Real Anthropic pipeline (requires API key)            */
/* ------------------------------------------------------------------ */

const hasApiKey = Boolean(env.ANTHROPIC_API_KEY);

describe.skipIf(!hasApiKey)("pipeline integration (Anthropic)", () => {
  const testStorageDir = "test-integration";

  afterAll(async () => {
    // Clean up test storage
    await rm(path.join(STORAGE_ROOT, testStorageDir), {
      recursive: true,
      force: true,
    });
    await rm(path.join(STORAGE_ROOT, "pages"), {
      recursive: true,
      force: true,
    });
  });

  let bolImages: VisionPageImage[];
  let invoiceImages: VisionPageImage[];

  it("renders PDF fixtures to page images", async () => {
    const bolPath = `${testStorageDir}/sample-bol.pdf`;
    await storeFixture(bolPath, "sample-bol.pdf");

    const invoicePath = `${testStorageDir}/sample-invoice.pdf`;
    await storeFixture(invoicePath, "sample-invoice.pdf");

    const bolResult = await convertPdfToImages({
      documentId: "test-bol-001",
      storagePath: bolPath,
      mimeType: "application/pdf",
    });

    expect(bolResult.pageCount).toBe(1);
    expect(bolResult.pageImages.length).toBe(1);
    expect(bolResult.pageImages[0].mediaType).toBe("image/png");
    bolImages = bolResult.pageImages;

    const invoiceResult = await convertPdfToImages({
      documentId: "test-inv-001",
      storagePath: invoicePath,
      mimeType: "application/pdf",
    });

    expect(invoiceResult.pageCount).toBe(1);
    invoiceImages = invoiceResult.pageImages;
  }, 30_000);

  it("classifies sample BOL as bol", async () => {
    const result = await classifyDocument({
      filename: "sample-bol.pdf",
      mimeType: "application/pdf",
      pageImages: bolImages,
    });

    expect(result.doc_type).toBe("bol");
    expect(result.confidence).toBeGreaterThan(0.7);
    expect(result.model).toBeTruthy();
  }, 30_000);

  it("classifies sample invoice as invoice", async () => {
    const result = await classifyDocument({
      filename: "sample-invoice.pdf",
      mimeType: "application/pdf",
      pageImages: invoiceImages,
    });

    expect(result.doc_type).toBe("invoice");
    expect(result.confidence).toBeGreaterThan(0.7);
  }, 30_000);

  it("extracts BOL fields from sample-bol.pdf", async () => {
    const result = await extractFieldsFromDocument({
      docType: "bol",
      filename: "sample-bol.pdf",
      pageImages: bolImages,
    });

    const fields = result.extracted;
    expect("bol_number" in fields).toBe(true);

    if ("bol_number" in fields) {
      expect(fields.bol_number).toContain("BOL-2024-TEST-001");
      expect(fields.shipper_name).toContain("Midwest Steel");
      expect(fields.consignee_name).toContain("Gulf Coast");
      expect(fields.carrier_name).toContain("Schneider");
      expect(fields.carrier_scac).toBe("SNLU");
      expect(fields.weight).toBeCloseTo(22500, -1);
      expect(fields.pieces).toBe(12);
    }
  }, 60_000);

  it("extracts invoice fields from sample-invoice.pdf", async () => {
    const result = await extractFieldsFromDocument({
      docType: "invoice",
      filename: "sample-invoice.pdf",
      pageImages: invoiceImages,
    });

    const fields = result.extracted;
    expect("invoice_number" in fields).toBe(true);

    if ("invoice_number" in fields) {
      expect(fields.invoice_number).toContain("INV-SNLU-2024-0892");
      expect(fields.bol_reference).toContain("BOL-2024-TEST-001");
      expect(fields.total_amount).toBeCloseTo(3192, 0);
      expect(fields.fuel_surcharge).toBeCloseTo(342, 0);
      expect(fields.line_items.length).toBeGreaterThanOrEqual(1);
    }
  }, 60_000);

  it("processes BOL end-to-end through processDocument", async () => {
    const bolPath = `${testStorageDir}/sample-bol.pdf`;
    const doc = await processDocument({
      documentId: "test-e2e-bol",
      organizationId: "org-test",
      source: "upload",
      sourceMetadata: {},
      originalFilename: "sample-bol.pdf",
      storagePath: bolPath,
      mimeType: "application/pdf",
    });

    expect(doc.doc_type).toBe("bol");
    expect(doc.status).toBe("extracted");
    expect(doc.extracted_data).toBeTruthy();
    expect(doc.extracted_data!.extraction_model).toBeTruthy();
    expect(doc.processing_error).toBeNull();
  }, 90_000);

  it("processes invoice end-to-end through processDocument", async () => {
    const invoicePath = `${testStorageDir}/sample-invoice.pdf`;
    const doc = await processDocument({
      documentId: "test-e2e-inv",
      organizationId: "org-test",
      source: "upload",
      sourceMetadata: {},
      originalFilename: "sample-invoice.pdf",
      storagePath: invoicePath,
      mimeType: "application/pdf",
    });

    expect(doc.doc_type).toBe("invoice");
    expect(doc.status).toBe("extracted");
    expect(doc.extracted_data).toBeTruthy();
    expect(doc.processing_error).toBeNull();
  }, 90_000);

  it("matches BOL and invoice to same shipment via BOL number and produces discrepancies", async () => {
    const bolPath = `${testStorageDir}/sample-bol.pdf`;
    const invoicePath = `${testStorageDir}/sample-invoice.pdf`;

    const bolDoc = await processDocument({
      documentId: "test-match-bol",
      organizationId: "org-test",
      source: "upload",
      sourceMetadata: {},
      originalFilename: "sample-bol.pdf",
      storagePath: bolPath,
      mimeType: "application/pdf",
    });

    // First reconcile: creates a shipment from the BOL
    const firstResult = reconcileShipment({
      organizationId: "org-test",
      existingShipments: [],
      existingLinks: [],
      existingDocuments: [],
      existingDiscrepancies: [],
      document: bolDoc,
    });

    expect(firstResult.shipment.bol_number).toContain("BOL-2024-TEST-001");

    const invoiceDoc = await processDocument({
      documentId: "test-match-inv",
      organizationId: "org-test",
      source: "upload",
      sourceMetadata: {},
      originalFilename: "sample-invoice.pdf",
      storagePath: invoicePath,
      mimeType: "application/pdf",
    });

    // Second reconcile: should match the invoice to the existing shipment by BOL
    const secondResult = reconcileShipment({
      organizationId: "org-test",
      existingShipments: [firstResult.shipment],
      existingLinks: firstResult.links,
      existingDocuments: [bolDoc],
      existingDiscrepancies: firstResult.discrepancies,
      document: invoiceDoc,
    });

    // Should have matched to same shipment
    expect(secondResult.shipment.id).toBe(firstResult.shipment.id);

    // Should have linked both documents
    expect(secondResult.links.length).toBe(2);

    // Should have discrepancies (weight, pieces comparisons)
    expect(secondResult.discrepancies.length).toBeGreaterThan(0);

    // Discrepancy level should be set
    expect(secondResult.shipment.discrepancy_level).toBeTruthy();
  }, 120_000);
});

/* ------------------------------------------------------------------ */
/*  Mock pipeline (no API key — always runs)                           */
/* ------------------------------------------------------------------ */

describe("pipeline mock/fallback path", () => {
  const testStorageDir = "test-mock";

  afterAll(async () => {
    await rm(path.join(STORAGE_ROOT, testStorageDir), {
      recursive: true,
      force: true,
    });
    await rm(path.join(STORAGE_ROOT, "pages"), {
      recursive: true,
      force: true,
    });
  });

  it("classifies BOL from filename via fallback heuristics", async () => {
    const result = await classifyDocument({
      filename: "bill_of_lading_12345.pdf",
      mimeType: "application/pdf",
      pageImages: [],
    });

    expect(result.doc_type).toBe("bol");
    expect(result.confidence).toBeGreaterThan(0.8);
    expect(result.model).toBeNull();
    expect(result.costCents).toBe(0);
  });

  it("classifies invoice from filename via fallback heuristics", async () => {
    const result = await classifyDocument({
      filename: "freight_invoice_9001.pdf",
      mimeType: "application/pdf",
      pageImages: [],
    });

    expect(result.doc_type).toBe("invoice");
    expect(result.confidence).toBeGreaterThan(0.8);
  });

  it("falls back to unknown for unrecognized filenames", async () => {
    const result = await classifyDocument({
      filename: "random_document_xyz.pdf",
      mimeType: "application/pdf",
      pageImages: [],
    });

    expect(result.doc_type).toBe("unknown");
    expect(result.confidence).toBeLessThan(0.7);
  });

  it("extracts BOL reference from filename in fallback mode", async () => {
    const result = await extractFieldsFromDocument({
      docType: "bol",
      filename: "bol_99882.pdf",
      pageImages: [],
    });

    expect("bol_number" in result.extracted).toBe(true);
    if ("bol_number" in result.extracted) {
      expect(result.extracted.bol_number).toBe("BOL-99882");
    }
    expect(result.model).toBeNull();
    expect(result.costCents).toBe(0);
  });

  it("extracts invoice reference from filename in fallback mode", async () => {
    const result = await extractFieldsFromDocument({
      docType: "invoice",
      filename: "invoice_5500_bol_88123.pdf",
      pageImages: [],
    });

    expect("invoice_number" in result.extracted).toBe(true);
    if ("invoice_number" in result.extracted) {
      expect(result.extracted.invoice_number).toBe("INV-5500");
      expect(result.extracted.bol_reference).toBe("BOL-88123");
    }
  });

  it("returns valid schema shape for unknown doc type fallback", async () => {
    const result = await extractFieldsFromDocument({
      docType: "unknown",
      filename: "mystery.pdf",
      pageImages: [],
    });

    expect(result.extracted).toHaveProperty("extraction_warnings");
    expect(Array.isArray(result.extracted.extraction_warnings)).toBe(true);
  });

  it("processes a fixture PDF end-to-end via mock path", async () => {
    const storagePath = `${testStorageDir}/mock-bol.pdf`;
    const buffer = await loadFixturePdf("sample-bol.pdf");
    await saveFile(storagePath, buffer, "application/pdf");

    const doc = await processDocument({
      documentId: "test-mock-bol",
      organizationId: "org-test",
      source: "upload",
      sourceMetadata: {},
      originalFilename: "sample-bol.pdf",
      storagePath,
      mimeType: "application/pdf",
    });

    // Mock path: filename contains "bol" so classifier should match it
    expect(doc.doc_type).toBe("bol");
    expect(doc.page_count).toBe(1);
    expect(doc.extracted_data).toBeTruthy();
    expect(doc.processing_error).toBeNull();
    // In mock mode, status depends on confidence
    expect(["extracted", "needs_review"]).toContain(doc.status);
  }, 30_000);

  it("reconciles two mock-processed documents and computes discrepancies", async () => {
    const bolPath = `${testStorageDir}/reconcile-bol.pdf`;
    const invPath = `${testStorageDir}/reconcile-inv.pdf`;

    const bolBuf = await loadFixturePdf("sample-bol.pdf");
    await saveFile(bolPath, bolBuf, "application/pdf");
    const invBuf = await loadFixturePdf("sample-invoice.pdf");
    await saveFile(invPath, invBuf, "application/pdf");

    const bolDoc = await processDocument({
      documentId: "test-reconcile-bol",
      organizationId: "org-test",
      source: "upload",
      sourceMetadata: {},
      originalFilename: "bol_2024_test_001.pdf",
      storagePath: bolPath,
      mimeType: "application/pdf",
    });

    const invDoc = await processDocument({
      documentId: "test-reconcile-inv",
      organizationId: "org-test",
      source: "upload",
      sourceMetadata: {},
      originalFilename: "invoice_8892_bol_2024.pdf",
      storagePath: invPath,
      mimeType: "application/pdf",
    });

    // Reconcile BOL first
    const first = reconcileShipment({
      organizationId: "org-test",
      existingShipments: [],
      existingLinks: [],
      existingDocuments: [],
      existingDiscrepancies: [],
      document: bolDoc,
    });

    expect(first.shipment).toBeTruthy();
    expect(first.links.length).toBe(1);

    // Reconcile invoice — should produce discrepancy comparisons
    const second = reconcileShipment({
      organizationId: "org-test",
      existingShipments: [first.shipment],
      existingLinks: first.links,
      existingDocuments: [bolDoc],
      existingDiscrepancies: [],
      document: invDoc,
    });

    expect(second.shipment).toBeTruthy();
    expect(second.links.length).toBe(2);
    // Discrepancies may or may not exist depending on fallback values
    expect(Array.isArray(second.discrepancies)).toBe(true);
  }, 30_000);
});
