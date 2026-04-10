import { Prisma } from "@prisma/client";
import { randomUUID } from "node:crypto";

import { db } from "@/lib/db";
import { defaultDevStore } from "@/lib/demo-data";

async function main() {
  console.log("Clearing existing data...");

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

  const orgDef = defaultDevStore.organizations[0];

  console.log(`Creating organization: ${orgDef.name}`);
  const organization = await db.organization.create({
    data: {
      name: orgDef.name,
      slug: orgDef.slug,
      settings: orgDef.settings as unknown as Prisma.InputJsonValue
    }
  });

  console.log(`Creating ${defaultDevStore.users.length} users...`);
  const userIdMap = new Map<string, string>();
  for (const user of defaultDevStore.users) {
    const created = await db.user.create({
      data: {
        email: user.email,
        name: user.name,
        role: user.role,
        organizationId: organization.id
      }
    });
    userIdMap.set(user.id, created.id);
  }

  console.log(`Creating ${defaultDevStore.documents.length} documents...`);
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

  console.log(`Creating ${defaultDevStore.shipments.length} shipments...`);
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

  console.log(`Linking ${defaultDevStore.shipment_documents.length} shipment-document associations...`);
  if (defaultDevStore.shipment_documents.length > 0) {
    const linkData = defaultDevStore.shipment_documents
      .filter((link) => shipmentIdMap.has(link.shipment_id) && documentIdMap.has(link.document_id))
      .map((link) => ({
        shipmentId: shipmentIdMap.get(link.shipment_id)!,
        documentId: documentIdMap.get(link.document_id)!,
        role: link.role
      }));
    if (linkData.length > 0) {
      await db.shipmentDocument.createMany({ data: linkData });
    }
  }

  console.log(`Creating ${defaultDevStore.discrepancies.length} discrepancies...`);
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

  console.log(`Creating ${defaultDevStore.audit_log.length} audit log entries...`);
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

  console.log("\n--- Seed Summary ---");
  console.log(`Organization: ${orgDef.name} (${orgDef.slug})`);
  console.log(`Users:        ${defaultDevStore.users.length}`);
  console.log(`Shipments:    ${defaultDevStore.shipments.length}`);
  console.log(`Documents:    ${defaultDevStore.documents.length}`);
  console.log(`Discrepancies:${defaultDevStore.discrepancies.length}`);
  console.log(`Audit logs:   ${defaultDevStore.audit_log.length}`);
  console.log(`Links:        ${defaultDevStore.shipment_documents.length}`);
  console.log("\nSeeded Prisma database with Veriload demo data.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
