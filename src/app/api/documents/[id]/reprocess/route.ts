import { NextResponse } from "next/server";

import { getCurrentAppSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { processDocument } from "@/lib/pipeline/process-document";
import {
  getDocument,
  reconcileProcessedDocumentById,
  resetDocumentForReprocessing,
} from "@/lib/repository";
import type { DocumentRecord } from "@/types/documents";
import { Prisma } from "@prisma/client";

export const runtime = "nodejs";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  let session;
  try {
    session = await getCurrentAppSession();
  } catch {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const { id } = await params;

  // Reset the document (validates org scope, deletes extracted data)
  const resetResult = await resetDocumentForReprocessing(id);

  if (!resetResult) {
    return NextResponse.json(
      { error: "Document not found." },
      { status: 404 }
    );
  }

  // Re-run the processing pipeline
  let processedDocument: DocumentRecord;
  try {
    processedDocument = await processDocument({
      documentId: resetResult.documentId,
      organizationId: resetResult.organizationId,
      source: resetResult.source as DocumentRecord["source"],
      sourceMetadata: resetResult.sourceMetadata,
      originalFilename: resetResult.originalFilename,
      storagePath: resetResult.storagePath,
      mimeType: resetResult.mimeType,
    });
  } catch (error) {
    // Pipeline failure: mark document as failed
    const processingError =
      error instanceof Error ? error.message : `${error}`;
    await db.document.update({
      where: { id: resetResult.documentId },
      data: {
        status: "failed",
        processingError,
        processedAt: new Date(),
      },
    });

    const failedDoc = await getDocument(resetResult.documentId);

    // Create audit log for failed reprocessing
    await db.auditLog.create({
      data: {
        organizationId: resetResult.organizationId,
        userId: session.userId,
        action: "document_reprocessed",
        details: {
          document_filename: resetResult.originalFilename,
          old_doc_type: resetResult.oldDocType,
          old_confidence: resetResult.oldConfidence,
          new_doc_type: null,
          new_confidence: null,
          error: processingError,
        },
      },
    });

    return NextResponse.json({
      document: failedDoc,
      error: processingError,
    });
  }

  // Persist the new extraction results
  await db.$transaction(async (tx) => {
    await tx.document.update({
      where: { id: resetResult.documentId },
      data: {
        sourceMetadata:
          processedDocument.source_metadata as unknown as Prisma.InputJsonValue,
        pageCount: processedDocument.page_count,
        status: processedDocument.status,
        docType: processedDocument.doc_type,
        docTypeConfidence: processedDocument.doc_type_confidence,
        processingError: processedDocument.processing_error,
        processedAt: processedDocument.processed_at
          ? new Date(processedDocument.processed_at)
          : null,
      },
    });

    if (processedDocument.extracted_data) {
      await tx.extractedData.create({
        data: {
          documentId: resetResult.documentId,
          docType: processedDocument.extracted_data.doc_type,
          extractedFields:
            processedDocument.extracted_data
              .extracted_fields as unknown as Prisma.InputJsonValue,
          fieldConfidences: (processedDocument.extracted_data
            .field_confidences ??
            undefined) as unknown as Prisma.InputJsonValue | undefined,
          rawLlmResponse: (processedDocument.extracted_data
            .raw_llm_response ??
            undefined) as unknown as Prisma.InputJsonValue | undefined,
          extractionModel: processedDocument.extracted_data.extraction_model,
          extractionCostCents:
            processedDocument.extracted_data.extraction_cost_cents,
        },
      });
    }
  });

  // If the document is linked to a shipment, re-run reconciliation
  const shipmentLink = await db.shipmentDocument.findFirst({
    where: { documentId: resetResult.documentId },
  });

  if (shipmentLink) {
    await reconcileProcessedDocumentById(resetResult.documentId);
  }

  // Create audit log
  await db.auditLog.create({
    data: {
      organizationId: resetResult.organizationId,
      userId: session.userId,
      shipmentId: shipmentLink?.shipmentId ?? null,
      action: "document_reprocessed",
      details: {
        document_filename: resetResult.originalFilename,
        old_doc_type: resetResult.oldDocType,
        old_confidence: resetResult.oldConfidence,
        new_doc_type: processedDocument.doc_type,
        new_confidence: processedDocument.doc_type_confidence,
      },
    },
  });

  const updatedDoc = await getDocument(resetResult.documentId);

  return NextResponse.json({ document: updatedDoc });
}
