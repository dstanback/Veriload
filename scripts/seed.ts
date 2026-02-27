import { Prisma } from "@prisma/client";
import { randomUUID } from "node:crypto";

import { db } from "@/lib/db";
import { defaultDevStore } from "@/lib/demo-data";
import { env } from "@/lib/env";

async function main() {
  await db.$transaction([
    db.auditLog.deleteMany(),
    db.discrepancy.deleteMany(),
    db.shipmentDocument.deleteMany(),
    db.extractedData.deleteMany(),
    db.document.deleteMany(),
    db.shipment.deleteMany(),
    db.user.deleteMany(),
    db.organization.deleteMany()
  ]);

  const organization = await db.organization.create({
    data: {
      name: env.DEV_ORG_NAME,
      slug: env.DEV_ORG_SLUG,
      settings: defaultDevStore.organizations[0]?.settings ?? {
        autoApproveEnabled: true,
        autoApproveConfidenceThreshold: 90
      }
    }
  });

  const userIdMap = new Map<string, string>();
  for (const user of defaultDevStore.users) {
    const created = await db.user.create({
      data: {
        email: user.email === "ops@acmefreight.com" ? env.DEV_USER_EMAIL : user.email,
        name: user.name === "Maya Patel" ? env.DEV_USER_NAME : user.name,
        role: user.role,
        organizationId: organization.id
      }
    });
    userIdMap.set(user.id, created.id);
  }

  const documentIdMap = new Map<string, string>();
  for (const document of defaultDevStore.documents) {
    const id = randomUUID();
    documentIdMap.set(document.id, id);
    await db.document.create({
      data: {
        id,
        organizationId: organization.id,
        source: document.source,
        sourceMetadata: document.source_metadata as unknown as Prisma.InputJsonValue,
        originalFilename: document.original_filename,
        storagePath: document.storage_path,
        mimeType: document.mime_type,
        pageCount: document.page_count,
        status: document.status,
        docType: document.doc_type,
        docTypeConfidence: document.doc_type_confidence,
        processingError: document.processing_error,
        createdAt: new Date(document.created_at),
        processedAt: document.processed_at ? new Date(document.processed_at) : null
      }
    });

    if (document.extracted_data) {
      await db.extractedData.create({
        data: {
          documentId: id,
          docType: document.extracted_data.doc_type,
          extractedFields: document.extracted_data.extracted_fields as unknown as Prisma.InputJsonValue,
          fieldConfidences: (document.extracted_data.field_confidences ??
            undefined) as unknown as Prisma.InputJsonValue | undefined,
          rawLlmResponse: (document.extracted_data.raw_llm_response ??
            undefined) as unknown as Prisma.InputJsonValue | undefined,
          extractionModel: document.extracted_data.extraction_model,
          extractionCostCents: document.extracted_data.extraction_cost_cents,
          createdAt: new Date(document.extracted_data.created_at)
        }
      });
    }
  }

  const shipmentIdMap = new Map<string, string>();
  for (const shipment of defaultDevStore.shipments) {
    const id = randomUUID();
    shipmentIdMap.set(shipment.id, id);
    await db.shipment.create({
      data: {
        id,
        organizationId: organization.id,
        shipmentRef: shipment.shipment_ref,
        bolNumber: shipment.bol_number,
        proNumber: shipment.pro_number,
        shipperName: shipment.shipper_name,
        consigneeName: shipment.consignee_name,
        carrierName: shipment.carrier_name,
        carrierScac: shipment.carrier_scac,
        origin: shipment.origin,
        destination: shipment.destination,
        status: shipment.status,
        matchConfidence: shipment.match_confidence,
        discrepancyLevel: shipment.discrepancy_level,
        createdAt: new Date(shipment.created_at),
        updatedAt: new Date(shipment.updated_at)
      }
    });
  }

  if (defaultDevStore.shipment_documents.length > 0) {
    await db.shipmentDocument.createMany({
      data: defaultDevStore.shipment_documents.map((link) => ({
        shipmentId: shipmentIdMap.get(link.shipment_id)!,
        documentId: documentIdMap.get(link.document_id)!,
        role: link.role
      }))
    });
  }

  if (defaultDevStore.discrepancies.length > 0) {
    await db.discrepancy.createMany({
      data: defaultDevStore.discrepancies.map((discrepancy) => ({
        shipmentId: shipmentIdMap.get(discrepancy.shipment_id)!,
        fieldName: discrepancy.field_name,
        sourceDocId: discrepancy.source_doc_id ? documentIdMap.get(discrepancy.source_doc_id) ?? null : null,
        compareDocId: discrepancy.compare_doc_id ? documentIdMap.get(discrepancy.compare_doc_id) ?? null : null,
        sourceValue: discrepancy.source_value,
        compareValue: discrepancy.compare_value,
        varianceAmount: discrepancy.variance_amount,
        variancePct: discrepancy.variance_pct,
        severity: discrepancy.severity,
        resolution: discrepancy.resolution,
        resolvedById: discrepancy.resolved_by ? userIdMap.get(discrepancy.resolved_by) ?? null : null,
        resolvedAt: discrepancy.resolved_at ? new Date(discrepancy.resolved_at) : null,
        notes: discrepancy.notes,
        createdAt: new Date(discrepancy.created_at)
      }))
    });
  }

  if (defaultDevStore.audit_log.length > 0) {
    await db.auditLog.createMany({
      data: defaultDevStore.audit_log.map((entry) => ({
        organizationId: organization.id,
        userId: entry.user_id ? userIdMap.get(entry.user_id) ?? null : null,
        shipmentId: entry.shipment_id ? shipmentIdMap.get(entry.shipment_id) ?? null : null,
        action: entry.action,
        details: entry.details as unknown as Prisma.InputJsonValue,
        createdAt: new Date(entry.created_at)
      }))
    });
  }

  console.log("Seeded Prisma database with Veriload demo data.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
