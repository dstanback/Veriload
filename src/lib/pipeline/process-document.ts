import "server-only";

import { randomUUID } from "node:crypto";

import { classifyDocument } from "@/lib/ai/classify";
import { extractFieldsFromDocument } from "@/lib/ai/extract";
import { env } from "@/lib/env";
import { convertPdfToImages } from "@/lib/pipeline/pdf-to-images";
import type { DocumentRecord, DocumentSource, ExtractedDataRecord, BolExtraction } from "@/types/documents";

function validateExtraction(docType: DocumentRecord["doc_type"], extracted: ExtractedDataRecord["extracted_fields"]) {
  const warnings = [...(extracted.extraction_warnings ?? [])];

  if (docType === "invoice" && "subtotal" in extracted) {
    const accessorialTotal = extracted.accessorials.reduce((sum, item) => sum + item.amount, 0);
    const expectedTotal = (extracted.subtotal ?? 0) + (extracted.fuel_surcharge ?? 0) + accessorialTotal;
    if (extracted.total_amount != null && Math.abs(extracted.total_amount - expectedTotal) > 0.01) {
      warnings.push("Invoice total does not equal subtotal plus fuel and accessorials.");
    }
  }

  if ("carrier_scac" in extracted && extracted.carrier_scac && !/^[A-Z]{2,4}$/.test(extracted.carrier_scac)) {
    warnings.push("Carrier SCAC failed format validation.");
  }

  if ("weight" in extracted && extracted.weight != null && extracted.weight > 48000) {
    warnings.push("BoL weight exceeds typical TL/LTL operating range.");
  }

  if ("invoice_date" in extracted && extracted.invoice_date) {
    const invoiceDate = new Date(extracted.invoice_date);
    const now = new Date();
    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(now.getDate() - 90);
    if (invoiceDate > now || invoiceDate < ninetyDaysAgo) {
      warnings.push("Invoice date falls outside the allowed validation window.");
    }
  }

  return {
    ...extracted,
    extraction_warnings: warnings
  };
}

function buildMockBolExtraction(): BolExtraction {
  return {
    bol_number: "BOL-2024-00123",
    shipper_name: "ABC Manufacturing",
    shipper_address: "1200 Industrial Blvd, Chicago, IL 60601",
    consignee_name: "XYZ Distribution",
    consignee_address: "8500 Commerce Dr, Dallas, TX 75201",
    carrier_name: "FastFreight Inc",
    carrier_scac: "FFRT",
    pickup_date: new Date().toISOString().slice(0, 10),
    delivery_date: null,
    pieces: 24,
    weight: 15000,
    weight_unit: "lbs",
    commodity_description: "Packaged industrial components",
    reference_numbers: ["REF-ABC-2024-0456"],
    hazmat_flag: false,
    special_instructions: null,
    extraction_warnings: ["Demo mode: mock extraction used (no ANTHROPIC_API_KEY configured)."]
  };
}

function buildMockDocumentResult(params: {
  documentId: string;
  organizationId: string;
  source: DocumentSource;
  sourceMetadata: Record<string, unknown>;
  originalFilename: string | null;
  storagePath: string;
  mimeType: string;
}): DocumentRecord {
  const now = new Date().toISOString();
  const mockExtraction = buildMockBolExtraction();

  return {
    id: params.documentId,
    organization_id: params.organizationId,
    source: params.source,
    source_metadata: {
      ...params.sourceMetadata,
      classifierReasoning: "Demo mode: classified as BOL based on mock pipeline.",
      pageImagePaths: [],
      classifierModel: null,
      classifierCostCents: 0
    },
    original_filename: params.originalFilename,
    storage_path: params.storagePath,
    mime_type: params.mimeType,
    page_count: 1,
    status: "extracted",
    doc_type: "bol",
    doc_type_confidence: 0.95,
    processing_error: null,
    created_at: now,
    processed_at: now,
    extracted_data: {
      id: randomUUID(),
      document_id: params.documentId,
      doc_type: "bol",
      extracted_fields: mockExtraction,
      field_confidences: {
        bol_number: 0.97,
        shipper_name: 0.95,
        consignee_name: 0.94,
        carrier_name: 0.96,
        carrier_scac: 0.98,
        weight: 0.92,
        pieces: 0.91
      },
      raw_llm_response: { demo: true },
      extraction_model: null,
      extraction_cost_cents: 0,
      created_at: now
    }
  };
}

export async function processDocument(params: {
  documentId?: string;
  organizationId: string;
  source: DocumentSource;
  sourceMetadata: Record<string, unknown>;
  originalFilename: string | null;
  storagePath: string;
  mimeType: string;
}): Promise<DocumentRecord> {
  const documentId = params.documentId ?? randomUUID();

  if (!env.ANTHROPIC_API_KEY) {
    return buildMockDocumentResult({ ...params, documentId });
  }

  const imageResult = await convertPdfToImages({
    documentId,
    storagePath: params.storagePath,
    mimeType: params.mimeType
  });
  const classification = await classifyDocument({
    filename: params.originalFilename,
    mimeType: params.mimeType,
    pageImages: imageResult.pageImages,
    sourceText: JSON.stringify(params.sourceMetadata)
  });
  const extraction = await extractFieldsFromDocument({
    docType: classification.doc_type,
    filename: params.originalFilename,
    pageImages: imageResult.pageImages
  });
  const validatedFields = validateExtraction(classification.doc_type, extraction.extracted);
  const now = new Date().toISOString();

  return {
    id: documentId,
    organization_id: params.organizationId,
    source: params.source,
    source_metadata: {
      ...params.sourceMetadata,
      classifierReasoning: classification.reasoning,
      pageImagePaths: imageResult.pageImagePaths,
      classifierModel: classification.model,
      classifierCostCents: classification.costCents
    },
    original_filename: params.originalFilename,
    storage_path: params.storagePath,
    mime_type: params.mimeType,
    page_count: imageResult.pageCount,
    status: classification.confidence < 0.7 ? "needs_review" : "extracted",
    doc_type: classification.doc_type,
    doc_type_confidence: classification.confidence,
    processing_error: null,
    created_at: now,
    processed_at: now,
    extracted_data: {
      id: randomUUID(),
      document_id: documentId,
      doc_type: classification.doc_type,
      extracted_fields: validatedFields,
      field_confidences: extraction.confidences,
      raw_llm_response: {
        classification: classification.rawResponse,
        extraction: extraction.rawResponse
      },
      extraction_model: extraction.model,
      extraction_cost_cents: Number((classification.costCents + extraction.costCents).toFixed(4)),
      created_at: now
    }
  };
}
