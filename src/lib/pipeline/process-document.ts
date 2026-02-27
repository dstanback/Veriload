import "server-only";

import { randomUUID } from "node:crypto";

import { classifyDocument } from "@/lib/ai/classify";
import { extractFieldsFromDocument } from "@/lib/ai/extract";
import { convertPdfToImages } from "@/lib/pipeline/pdf-to-images";
import type { DocumentRecord, DocumentSource, ExtractedDataRecord } from "@/types/documents";

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
