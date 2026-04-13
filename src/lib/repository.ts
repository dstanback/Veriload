import "server-only";

import { Prisma } from "@prisma/client";

import { getCurrentAppSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { env } from "@/lib/env";
import { processDocument } from "@/lib/pipeline/process-document";
import { computeDiscrepancies, reconcileShipment } from "@/lib/pipeline/reconcile";
import { worstSeverity } from "@/lib/utils/tolerances";
import { enqueueProcessDocument, isProcessingQueueAvailable } from "@/lib/queue/client";
import { slugify } from "@/lib/utils";
import type { DiscrepancyRecord } from "@/types/discrepancies";
import type { DocumentRecord } from "@/types/documents";
import type {
  AuditLogRecord,
  DashboardSummary,
  ShipmentDetail,
  ShipmentDocumentLink,
  ShipmentRecord
} from "@/types/shipments";

const documentWithLatestExtractionArgs = Prisma.validator<Prisma.DocumentDefaultArgs>()({
  include: {
    extractedData: {
      orderBy: {
        createdAt: "desc"
      },
      take: 1
    }
  }
});

const shipmentDetailArgs = Prisma.validator<Prisma.ShipmentDefaultArgs>()({
  include: {
    documents: {
      include: {
        document: documentWithLatestExtractionArgs
      }
    },
    discrepancies: {
      orderBy: {
        createdAt: "desc"
      }
    }
  }
});

type DocumentWithLatestExtraction = Prisma.DocumentGetPayload<typeof documentWithLatestExtractionArgs>;
type ShipmentWithDetail = Prisma.ShipmentGetPayload<typeof shipmentDetailArgs>;

function mapExtractedData(document: DocumentWithLatestExtraction): DocumentRecord["extracted_data"] {
  const extracted = document.extractedData[0];
  if (!extracted) {
    return null;
  }

  return {
    id: extracted.id,
    document_id: extracted.documentId,
    doc_type: extracted.docType as DocumentRecord["doc_type"] & NonNullable<DocumentRecord["doc_type"]>,
    extracted_fields:
      extracted.extractedFields as unknown as NonNullable<DocumentRecord["extracted_data"]>["extracted_fields"],
    field_confidences:
      (extracted.fieldConfidences as unknown as NonNullable<DocumentRecord["extracted_data"]>["field_confidences"]) ??
      null,
    raw_llm_response: (extracted.rawLlmResponse as unknown as Record<string, unknown> | null) ?? null,
    extraction_model: extracted.extractionModel,
    extraction_cost_cents: extracted.extractionCostCents,
    created_at: extracted.createdAt.toISOString()
  };
}

function mapDocument(document: DocumentWithLatestExtraction): DocumentRecord {
  return {
    id: document.id,
    organization_id: document.organizationId,
    source: document.source as DocumentRecord["source"],
    source_metadata: (document.sourceMetadata as Record<string, unknown>) ?? {},
    original_filename: document.originalFilename,
    storage_path: document.storagePath,
    mime_type: document.mimeType,
    page_count: document.pageCount,
    status: document.status as DocumentRecord["status"],
    doc_type: document.docType as DocumentRecord["doc_type"],
    doc_type_confidence: document.docTypeConfidence,
    processing_error: document.processingError,
    created_at: document.createdAt.toISOString(),
    processed_at: document.processedAt?.toISOString() ?? null,
    extracted_data: mapExtractedData(document)
  };
}

function mapDiscrepancy(discrepancy: ShipmentWithDetail["discrepancies"][number]): DiscrepancyRecord {
  return {
    id: discrepancy.id,
    shipment_id: discrepancy.shipmentId,
    field_name: discrepancy.fieldName,
    source_doc_id: discrepancy.sourceDocId,
    compare_doc_id: discrepancy.compareDocId,
    source_value: discrepancy.sourceValue,
    compare_value: discrepancy.compareValue,
    variance_amount: discrepancy.varianceAmount == null ? null : Number(discrepancy.varianceAmount),
    variance_pct: discrepancy.variancePct,
    severity: discrepancy.severity as DiscrepancyRecord["severity"],
    resolution: (discrepancy.resolution as DiscrepancyRecord["resolution"]) ?? null,
    resolved_by: discrepancy.resolvedById,
    resolved_at: discrepancy.resolvedAt?.toISOString() ?? null,
    notes: discrepancy.notes,
    created_at: discrepancy.createdAt.toISOString()
  };
}

function mapShipment(shipment: {
  id: string;
  organizationId: string;
  shipmentRef: string | null;
  bolNumber: string | null;
  proNumber: string | null;
  shipperName: string | null;
  consigneeName: string | null;
  carrierName: string | null;
  carrierScac: string | null;
  origin: string | null;
  destination: string | null;
  status: string;
  matchConfidence: number | null;
  discrepancyLevel: string | null;
  createdAt: Date;
  updatedAt: Date;
}): ShipmentRecord {
  return {
    id: shipment.id,
    organization_id: shipment.organizationId,
    shipment_ref: shipment.shipmentRef,
    bol_number: shipment.bolNumber,
    pro_number: shipment.proNumber,
    shipper_name: shipment.shipperName,
    consignee_name: shipment.consigneeName,
    carrier_name: shipment.carrierName,
    carrier_scac: shipment.carrierScac,
    origin: shipment.origin,
    destination: shipment.destination,
    status: shipment.status as ShipmentRecord["status"],
    match_confidence: shipment.matchConfidence,
    discrepancy_level: shipment.discrepancyLevel as ShipmentRecord["discrepancy_level"],
    created_at: shipment.createdAt.toISOString(),
    updated_at: shipment.updatedAt.toISOString()
  };
}

function mapShipmentDetail(shipment: ShipmentWithDetail): ShipmentDetail {
  return {
    ...mapShipment(shipment),
    documents: shipment.documents.map((link) => ({
      ...mapDocument(link.document),
      role: link.role as ShipmentDocumentLink["role"]
    })),
    discrepancies: shipment.discrepancies.map(mapDiscrepancy)
  };
}

function mapAuditLog(item: {
  id: string;
  organizationId: string;
  userId: string | null;
  shipmentId: string | null;
  action: string;
  details: Prisma.JsonValue;
  createdAt: Date;
}): AuditLogRecord {
  return {
    id: item.id,
    organization_id: item.organizationId,
    user_id: item.userId,
    shipment_id: item.shipmentId,
    action: item.action,
    details: (item.details as Record<string, unknown>) ?? {},
    created_at: item.createdAt.toISOString()
  };
}

function getAutoApproveConfig(settings: Prisma.JsonValue) {
  const typed = (settings ?? {}) as Record<string, unknown>;
  const enabled = Boolean(typed.autoApproveEnabled);
  const threshold =
    typeof typed.autoApproveConfidenceThreshold === "number" ? typed.autoApproveConfidenceThreshold : 90;

  return {
    enabled,
    threshold
  };
}

async function getScopedOrganizationId() {
  const session = await getCurrentAppSession();
  return session.organizationId;
}

async function getScopedSession() {
  return getCurrentAppSession();
}

export async function resolveOrganizationForInboundAddress(address: string) {
  const normalized = address.trim().toLowerCase();
  const [localPart, domain] = normalized.split("@");

  if (!localPart || !domain) {
    return null;
  }

  if (!domain.endsWith(env.EMAIL_DOMAIN.toLowerCase())) {
    return null;
  }

  const domainPrefix = domain.slice(0, -env.EMAIL_DOMAIN.length).replace(/\.$/, "");
  const orgSlug = slugify(domainPrefix.split(".").filter(Boolean).join("-") || localPart.replace(/^docs\+?/, ""));

  if (!orgSlug) {
    return null;
  }

  return db.organization.findUnique({
    where: {
      slug: orgSlug
    }
  });
}

export async function listShipments(filters?: {
  query?: string;
  discrepancyLevel?: string | null;
  status?: string | null;
}) {
  const organizationId = await getScopedOrganizationId();
  const shipments = await db.shipment.findMany({
    where: {
      organizationId,
      ...(filters?.discrepancyLevel ? { discrepancyLevel: filters.discrepancyLevel } : {}),
      ...(filters?.status ? { status: filters.status } : {}),
      ...(filters?.query
        ? {
            OR: [
              { shipmentRef: { contains: filters.query, mode: "insensitive" } },
              { bolNumber: { contains: filters.query, mode: "insensitive" } },
              { proNumber: { contains: filters.query, mode: "insensitive" } },
              { carrierName: { contains: filters.query, mode: "insensitive" } },
              { origin: { contains: filters.query, mode: "insensitive" } },
              { destination: { contains: filters.query, mode: "insensitive" } }
            ]
          }
        : {})
    },
    orderBy: {
      updatedAt: "desc"
    }
  });

  return shipments.map(mapShipment);
}

export async function getShipmentDetail(id: string): Promise<ShipmentDetail | null> {
  const organizationId = await getScopedOrganizationId();
  const shipment = await db.shipment.findFirst({
    where: {
      id,
      organizationId
    },
    ...shipmentDetailArgs
  });

  return shipment ? mapShipmentDetail(shipment) : null;
}

export async function getDocument(id: string) {
  const organizationId = await getScopedOrganizationId();
  const document = await db.document.findFirst({
    where: {
      id,
      organizationId
    },
    ...documentWithLatestExtractionArgs
  });

  return document ? mapDocument(document) : null;
}

export async function getDashboardSummary(): Promise<DashboardSummary> {
  const organizationId = await getScopedOrganizationId();
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const [documentsProcessedToday, pendingReview, autoApproved, disputesOpen, green, yellow, red, recentActivity] =
    await Promise.all([
      db.document.count({
        where: {
          organizationId,
          processedAt: {
            gte: today
          }
        }
      }),
      db.shipment.count({
        where: {
          organizationId,
          OR: [{ discrepancyLevel: "yellow" }, { status: "matched" }]
        }
      }),
      db.auditLog.count({
        where: {
          organizationId,
          action: "auto_approved"
        }
      }),
      db.shipment.count({
        where: {
          organizationId,
          status: "disputed"
        }
      }),
      db.shipment.count({
        where: {
          organizationId,
          discrepancyLevel: "green"
        }
      }),
      db.shipment.count({
        where: {
          organizationId,
          discrepancyLevel: "yellow"
        }
      }),
      db.shipment.count({
        where: {
          organizationId,
          discrepancyLevel: "red"
        }
      }),
      db.auditLog.findMany({
        where: {
          organizationId
        },
        orderBy: {
          createdAt: "desc"
        },
        take: 20
      })
    ]);

  return {
    documentsProcessedToday,
    pendingReview,
    autoApproved,
    disputesOpen,
    discrepancyDistribution: {
      green,
      yellow,
      red
    },
    recentActivity: recentActivity.map(mapAuditLog)
  };
}

export async function approveShipment(id: string, userId?: string | null) {
  const session = await getScopedSession();
  const actorId = userId ?? session.userId;

  const shipment = await db.$transaction(async (tx) => {
    const existing = await tx.shipment.findFirst({
      where: {
        id,
        organizationId: session.organizationId
      }
    });

    if (!existing) {
      return null;
    }

    if (existing.status !== "pending" && existing.status !== "matched") {
      throw new Error(`Cannot approve shipment with status "${existing.status}". Only pending or matched shipments can be approved.`);
    }

    await tx.shipment.update({
      where: {
        id: existing.id
      },
      data: {
        status: "approved"
      }
    });
    await tx.discrepancy.updateMany({
      where: {
        shipmentId: existing.id,
        resolution: null
      },
      data: {
        resolution: "manually_approved",
        resolvedById: actorId,
        resolvedAt: new Date()
      }
    });
    await tx.auditLog.create({
      data: {
        organizationId: session.organizationId,
        userId: actorId,
        shipmentId: existing.id,
        action: "shipment_approved",
        details: {
          user_name: session.name,
          timestamp: new Date().toISOString()
        }
      }
    });

    return existing.id;
  });

  return shipment ? getShipmentDetail(shipment) : null;
}

export async function disputeShipment(
  id: string,
  reason: string,
  discrepancyIds?: string[] | null,
  userId?: string | null
) {
  const session = await getScopedSession();
  const actorId = userId ?? session.userId;

  const shipment = await db.$transaction(async (tx) => {
    const existing = await tx.shipment.findFirst({
      where: {
        id,
        organizationId: session.organizationId
      }
    });

    if (!existing) {
      return null;
    }

    await tx.shipment.update({
      where: {
        id: existing.id
      },
      data: {
        status: "disputed",
        discrepancyLevel: existing.discrepancyLevel ?? "red"
      }
    });

    const discrepancyWhere = discrepancyIds && discrepancyIds.length > 0
      ? { shipmentId: existing.id, id: { in: discrepancyIds } }
      : { shipmentId: existing.id, severity: { in: ["red", "yellow"] } };

    const updateResult = await tx.discrepancy.updateMany({
      where: discrepancyWhere,
      data: {
        resolution: "disputed",
        notes: reason,
        resolvedById: actorId,
        resolvedAt: new Date()
      }
    });

    await tx.auditLog.create({
      data: {
        organizationId: session.organizationId,
        userId: actorId,
        shipmentId: existing.id,
        action: "shipment_disputed",
        details: {
          reason,
          user_name: session.name,
          disputed_discrepancy_count: updateResult.count
        }
      }
    });

    return existing.id;
  });

  return shipment ? getShipmentDetail(shipment) : null;
}

async function createPendingDocument(params: {
  organizationId: string;
  source: DocumentRecord["source"];
  sourceMetadata: Record<string, unknown>;
  originalFilename: string | null;
  storagePath: string;
  mimeType: string;
}) {
  const document = await db.document.create({
    data: {
      organizationId: params.organizationId,
      source: params.source,
      sourceMetadata: params.sourceMetadata as unknown as Prisma.InputJsonValue,
      originalFilename: params.originalFilename,
      storagePath: params.storagePath,
      mimeType: params.mimeType,
      status: "pending"
    },
    ...documentWithLatestExtractionArgs
  });

  return mapDocument(document);
}

async function getDocumentByIdInternal(documentId: string) {
  const document = await db.document.findUnique({
    where: {
      id: documentId
    },
    ...documentWithLatestExtractionArgs
  });

  return document ? mapDocument(document) : null;
}

export async function processPendingDocumentById(documentId: string) {
  const existing = await db.document.findUnique({
    where: {
      id: documentId
    }
  });

  if (!existing) {
    throw new Error(`Document ${documentId} was not found.`);
  }

  await db.document.update({
    where: {
      id: existing.id
    },
    data: {
      status: "processing",
      processingError: null
    }
  });

  try {
    const processedDocument = await processDocument({
      documentId: existing.id,
      organizationId: existing.organizationId,
      source: existing.source as DocumentRecord["source"],
      sourceMetadata: (existing.sourceMetadata as Record<string, unknown>) ?? {},
      originalFilename: existing.originalFilename,
      storagePath: existing.storagePath,
      mimeType: existing.mimeType
    });

    await db.$transaction(async (tx) => {
      await tx.document.update({
        where: {
          id: existing.id
        },
        data: {
          sourceMetadata: processedDocument.source_metadata as unknown as Prisma.InputJsonValue,
          pageCount: processedDocument.page_count,
          status: processedDocument.status,
          docType: processedDocument.doc_type,
          docTypeConfidence: processedDocument.doc_type_confidence,
          processingError: processedDocument.processing_error,
          processedAt: processedDocument.processed_at ? new Date(processedDocument.processed_at) : null
        }
      });

      if (processedDocument.extracted_data) {
        await tx.extractedData.create({
          data: {
            documentId: existing.id,
            docType: processedDocument.extracted_data.doc_type,
            extractedFields:
              processedDocument.extracted_data.extracted_fields as unknown as Prisma.InputJsonValue,
            fieldConfidences: (processedDocument.extracted_data.field_confidences ??
              undefined) as unknown as Prisma.InputJsonValue | undefined,
            rawLlmResponse: (processedDocument.extracted_data.raw_llm_response ??
              undefined) as unknown as Prisma.InputJsonValue | undefined,
            extractionModel: processedDocument.extracted_data.extraction_model,
            extractionCostCents: processedDocument.extracted_data.extraction_cost_cents
          }
        });
      }
    });

    return getDocumentByIdInternal(existing.id);
  } catch (error) {
    await db.document.update({
      where: {
        id: existing.id
      },
      data: {
        status: "failed",
        processingError: error instanceof Error ? error.message : `${error}`,
        processedAt: new Date()
      }
    });

    throw error;
  }
}

function toDiscrepancyCreateMany(discrepancies: DiscrepancyRecord[]) {
  return discrepancies.map((discrepancy) => ({
    id: discrepancy.id,
    shipmentId: discrepancy.shipment_id,
    fieldName: discrepancy.field_name,
    sourceDocId: discrepancy.source_doc_id,
    compareDocId: discrepancy.compare_doc_id,
    sourceValue: discrepancy.source_value,
    compareValue: discrepancy.compare_value,
    varianceAmount: discrepancy.variance_amount,
    variancePct: discrepancy.variance_pct,
    severity: discrepancy.severity,
    resolution: discrepancy.resolution,
    resolvedById: discrepancy.resolved_by,
    resolvedAt: discrepancy.resolved_at ? new Date(discrepancy.resolved_at) : null,
    notes: discrepancy.notes,
    createdAt: new Date(discrepancy.created_at)
  }));
}

async function loadOrganizationGraph(organizationId: string) {
  const [documents, shipments, links, discrepancies, organization] = await Promise.all([
    db.document.findMany({
      where: {
        organizationId
      },
      ...documentWithLatestExtractionArgs
    }),
    db.shipment.findMany({
      where: {
        organizationId
      }
    }),
    db.shipmentDocument.findMany({
      where: {
        shipment: {
          organizationId
        }
      }
    }),
    db.discrepancy.findMany({
      where: {
        shipment: {
          organizationId
        }
      }
    }),
    db.organization.findUniqueOrThrow({
      where: {
        id: organizationId
      }
    })
  ]);

  return {
    documents: documents.map(mapDocument),
    shipments: shipments.map(mapShipment),
    links: links.map((link) => ({
      shipment_id: link.shipmentId,
      document_id: link.documentId,
      role: link.role as ShipmentDocumentLink["role"]
    })),
    discrepancies: discrepancies.map((item) => ({
      id: item.id,
      shipment_id: item.shipmentId,
      field_name: item.fieldName,
      source_doc_id: item.sourceDocId,
      compare_doc_id: item.compareDocId,
      source_value: item.sourceValue,
      compare_value: item.compareValue,
      variance_amount: item.varianceAmount == null ? null : Number(item.varianceAmount),
      variance_pct: item.variancePct,
      severity: item.severity as DiscrepancyRecord["severity"],
      resolution: (item.resolution as DiscrepancyRecord["resolution"]) ?? null,
      resolved_by: item.resolvedById,
      resolved_at: item.resolvedAt?.toISOString() ?? null,
      notes: item.notes,
      created_at: item.createdAt.toISOString()
    })),
    organization
  };
}

export async function reconcileProcessedDocumentById(documentId: string) {
  const document = await getDocumentByIdInternal(documentId);
  if (!document || !document.extracted_data) {
    return null;
  }

  const organizationGraph = await loadOrganizationGraph(document.organization_id);
  const result = reconcileShipment({
    organizationId: document.organization_id,
    existingShipments: organizationGraph.shipments,
    existingLinks: organizationGraph.links,
    existingDocuments: organizationGraph.documents,
    existingDiscrepancies: organizationGraph.discrepancies,
    document
  });
  const autoApprove = getAutoApproveConfig(organizationGraph.organization.settings);
  const shouldAutoApprove =
    autoApprove.enabled &&
    result.shipment.discrepancy_level === "green" &&
    (result.shipment.match_confidence ?? 0) >= autoApprove.threshold;
  const nextStatus = shouldAutoApprove ? "approved" : result.shipment.status;

  await db.$transaction(async (tx) => {
    await tx.shipment.upsert({
      where: {
        id: result.shipment.id
      },
      update: {
        shipmentRef: result.shipment.shipment_ref,
        bolNumber: result.shipment.bol_number,
        proNumber: result.shipment.pro_number,
        shipperName: result.shipment.shipper_name,
        consigneeName: result.shipment.consignee_name,
        carrierName: result.shipment.carrier_name,
        carrierScac: result.shipment.carrier_scac,
        origin: result.shipment.origin,
        destination: result.shipment.destination,
        status: nextStatus,
        matchConfidence: result.shipment.match_confidence,
        discrepancyLevel: result.shipment.discrepancy_level
      },
      create: {
        id: result.shipment.id,
        organizationId: result.shipment.organization_id,
        shipmentRef: result.shipment.shipment_ref,
        bolNumber: result.shipment.bol_number,
        proNumber: result.shipment.pro_number,
        shipperName: result.shipment.shipper_name,
        consigneeName: result.shipment.consignee_name,
        carrierName: result.shipment.carrier_name,
        carrierScac: result.shipment.carrier_scac,
        origin: result.shipment.origin,
        destination: result.shipment.destination,
        status: nextStatus,
        matchConfidence: result.shipment.match_confidence,
        discrepancyLevel: result.shipment.discrepancy_level
      }
    });

    await tx.shipmentDocument.deleteMany({
      where: {
        shipmentId: result.shipment.id
      }
    });

    if (result.links.length > 0) {
      await tx.shipmentDocument.createMany({
        data: result.links.map((link) => ({
          shipmentId: link.shipment_id,
          documentId: link.document_id,
          role: link.role
        }))
      });
    }

    await tx.discrepancy.deleteMany({
      where: {
        shipmentId: result.shipment.id
      }
    });

    if (result.discrepancies.length > 0) {
      await tx.discrepancy.createMany({
        data: toDiscrepancyCreateMany(result.discrepancies)
      });
    }

    if (shouldAutoApprove) {
      await tx.auditLog.create({
        data: {
          organizationId: document.organization_id,
          shipmentId: result.shipment.id,
          action: "auto_approved",
          details: {
            confidence: result.shipment.match_confidence,
            threshold: autoApprove.threshold
          } as unknown as Prisma.InputJsonValue
        }
      });
    }
  });

  const shipment = await db.shipment.findUnique({
    where: {
      id: result.shipment.id
    },
    ...shipmentDetailArgs
  });

  return shipment ? mapShipmentDetail(shipment) : null;
}

export async function ingestUpload(params: {
  filename: string;
  mimeType: string;
  storagePath: string;
  size: number;
  referenceNumber?: string | null;
}) {
  const session = await getScopedSession();
  const document = await createPendingDocument({
    organizationId: session.organizationId,
    source: "upload",
    sourceMetadata: {
      uploadedAt: new Date().toISOString(),
      size: params.size,
      referenceNumber: params.referenceNumber ?? null,
      uploaderEmail: session.email
    } as Record<string, unknown>,
    originalFilename: params.filename,
    storagePath: params.storagePath,
    mimeType: params.mimeType
  });

  if (isProcessingQueueAvailable()) {
    await enqueueProcessDocument(document.id);
    return {
      document,
      shipment: null,
      queued: true
    };
  }

  const processed = await processPendingDocumentById(document.id);
  const shipment = await reconcileProcessedDocumentById(document.id);

  return {
    document: processed ?? document,
    shipment,
    queued: false
  };
}

export async function ingestStoredDocumentForOrganization(params: {
  organizationId: string;
  filename: string;
  mimeType: string;
  storagePath: string;
  source: DocumentRecord["source"];
  sourceMetadata: Record<string, unknown>;
}) {
  const document = await createPendingDocument({
    organizationId: params.organizationId,
    source: params.source,
    sourceMetadata: params.sourceMetadata as Record<string, unknown>,
    originalFilename: params.filename,
    storagePath: params.storagePath,
    mimeType: params.mimeType
  });

  if (isProcessingQueueAvailable()) {
    await enqueueProcessDocument(document.id);
    return {
      document,
      shipment: null,
      queued: true
    };
  }

  const processed = await processPendingDocumentById(document.id);
  const shipment = await reconcileProcessedDocumentById(document.id);

  return {
    document: processed ?? document,
    shipment,
    queued: false
  };
}

export async function resetDocumentForReprocessing(documentId: string) {
  const session = await getScopedSession();

  return db.$transaction(async (tx) => {
    const existing = await tx.document.findFirst({
      where: {
        id: documentId,
        organizationId: session.organizationId
      }
    });

    if (!existing) {
      return null;
    }

    const oldDocType = existing.docType;
    const oldConfidence = existing.docTypeConfidence;

    // Delete all existing ExtractedData for this document
    await tx.extractedData.deleteMany({
      where: { documentId: existing.id }
    });

    // Reset document to pending state
    await tx.document.update({
      where: { id: existing.id },
      data: {
        status: "pending",
        docType: null,
        docTypeConfidence: null,
        processingError: null,
        processedAt: null
      }
    });

    return {
      documentId: existing.id,
      organizationId: existing.organizationId,
      originalFilename: existing.originalFilename,
      storagePath: existing.storagePath,
      mimeType: existing.mimeType,
      source: existing.source,
      sourceMetadata: (existing.sourceMetadata as Record<string, unknown>) ?? {},
      oldDocType,
      oldConfidence
    };
  });
}

export async function editApproveShipment(
  id: string,
  edits: Array<{ documentId: string; fieldName: string; newValue: string }>,
  userId?: string | null
) {
  const session = await getScopedSession();
  const actorId = userId ?? session.userId;

  const shipmentId = await db.$transaction(async (tx) => {
    const existing = await tx.shipment.findFirst({
      where: {
        id,
        organizationId: session.organizationId
      }
    });

    if (!existing) {
      return null;
    }

    if (existing.status !== "pending" && existing.status !== "matched") {
      throw new Error(
        `Cannot edit-approve shipment with status "${existing.status}". Only pending or matched shipments can be edited.`
      );
    }

    // Apply edits to extracted fields in each document's ExtractedData
    const editsByDocument = new Map<string, Array<{ fieldName: string; newValue: string }>>();
    for (const edit of edits) {
      const list = editsByDocument.get(edit.documentId) ?? [];
      list.push({ fieldName: edit.fieldName, newValue: edit.newValue });
      editsByDocument.set(edit.documentId, list);
    }

    for (const [documentId, docEdits] of editsByDocument) {
      const extractedData = await tx.extractedData.findFirst({
        where: { documentId },
        orderBy: { createdAt: "desc" }
      });

      if (!extractedData) continue;

      const fields = (extractedData.extractedFields as Record<string, unknown>) ?? {};
      for (const edit of docEdits) {
        // Try to preserve the original type (number vs string)
        const numericValue = Number(edit.newValue);
        fields[edit.fieldName] =
          edit.newValue !== "" && !Number.isNaN(numericValue) && String(numericValue) === edit.newValue
            ? numericValue
            : edit.newValue;
      }

      await tx.extractedData.update({
        where: { id: extractedData.id },
        data: {
          extractedFields: fields as Prisma.InputJsonValue
        }
      });
    }

    // Re-fetch all documents linked to this shipment with updated extracted data
    const links = await tx.shipmentDocument.findMany({
      where: { shipmentId: existing.id }
    });

    const documentRecords: DocumentRecord[] = [];
    for (const link of links) {
      const doc = await tx.document.findUnique({
        where: { id: link.documentId },
        ...documentWithLatestExtractionArgs
      });
      if (doc) {
        documentRecords.push(mapDocument(doc));
      }
    }

    // Re-compute discrepancies with the edited data
    const shipmentRecord = mapShipment(existing);
    const newDiscrepancies = computeDiscrepancies(shipmentRecord, documentRecords);
    const newDiscrepancyLevel =
      newDiscrepancies.length > 0
        ? worstSeverity(newDiscrepancies.map((d) => d.severity))
        : null;

    // Delete old discrepancies and insert new ones
    await tx.discrepancy.deleteMany({
      where: { shipmentId: existing.id }
    });

    if (newDiscrepancies.length > 0) {
      await tx.discrepancy.createMany({
        data: toDiscrepancyCreateMany(newDiscrepancies)
      });
    }

    // Resolve all discrepancies as manually_approved
    await tx.discrepancy.updateMany({
      where: {
        shipmentId: existing.id,
        resolution: null
      },
      data: {
        resolution: "manually_approved",
        resolvedById: actorId,
        resolvedAt: new Date()
      }
    });

    // Update shipment to approved
    await tx.shipment.update({
      where: { id: existing.id },
      data: {
        status: "approved",
        discrepancyLevel: newDiscrepancyLevel
      }
    });

    // Create audit log entry
    await tx.auditLog.create({
      data: {
        organizationId: session.organizationId,
        userId: actorId,
        shipmentId: existing.id,
        action: "shipment_edit_approved",
        details: {
          user_name: session.name,
          edits,
          fields_modified: edits.length,
          timestamp: new Date().toISOString()
        }
      }
    });

    return existing.id;
  });

  return shipmentId ? getShipmentDetail(shipmentId) : null;
}

/* ------------------------------------------------------------------ */
/*  Audit Log — paginated queries                                      */
/* ------------------------------------------------------------------ */

export interface AuditLogFilters {
  actions?: string[];
  userId?: string;
  shipmentRef?: string;
  dateFrom?: string;
  dateTo?: string;
}

function buildAuditLogWhere(organizationId: string, filters?: AuditLogFilters) {
  const where: Record<string, unknown> = { organizationId };

  if (filters?.actions && filters.actions.length > 0) {
    where.action = { in: filters.actions };
  }
  if (filters?.userId) {
    where.userId = filters.userId;
  }
  if (filters?.shipmentRef) {
    where.shipment = {
      OR: [
        { shipmentRef: { contains: filters.shipmentRef, mode: "insensitive" } },
        { bolNumber: { contains: filters.shipmentRef, mode: "insensitive" } },
      ],
    };
  }
  if (filters?.dateFrom || filters?.dateTo) {
    const createdAt: Record<string, Date> = {};
    if (filters.dateFrom) {
      const d = new Date(filters.dateFrom + "T00:00:00");
      if (!isNaN(d.getTime())) createdAt.gte = d;
    }
    if (filters.dateTo) {
      const d = new Date(filters.dateTo + "T23:59:59.999");
      if (!isNaN(d.getTime())) createdAt.lte = d;
    }
    if (Object.keys(createdAt).length > 0) {
      where.createdAt = createdAt;
    }
  }

  return where;
}

export async function getAuditLogs(
  filters?: AuditLogFilters,
  page = 1,
  pageSize = 50,
) {
  const organizationId = await getScopedOrganizationId();
  const where = buildAuditLogWhere(organizationId, filters);

  const logs = await db.auditLog.findMany({
    where,
    include: {
      user: { select: { id: true, name: true, email: true } },
      shipment: { select: { id: true, shipmentRef: true, bolNumber: true } },
    },
    orderBy: { createdAt: "desc" },
    skip: (page - 1) * pageSize,
    take: pageSize,
  });

  return logs.map((item) => ({
    ...mapAuditLog(item),
    user_name: item.user?.name ?? null,
    user_email: item.user?.email ?? null,
    shipment_ref: item.shipment?.shipmentRef ?? item.shipment?.bolNumber ?? null,
  }));
}

export async function getAuditLogCount(filters?: AuditLogFilters) {
  const organizationId = await getScopedOrganizationId();
  const where = buildAuditLogWhere(organizationId, filters);
  return db.auditLog.count({ where });
}

export async function getOrgUsers() {
  const organizationId = await getScopedOrganizationId();
  return db.user.findMany({
    where: { organizationId },
    select: { id: true, name: true, email: true },
    orderBy: { name: "asc" },
  });
}

export async function createDemoDataIfEmpty() {
  const orgCount = await db.organization.count();

  if (orgCount > 0) {
    return;
  }

  await db.organization.create({
    data: {
      name: env.DEV_ORG_NAME,
      slug: env.DEV_ORG_SLUG,
      settings: {
        autoApproveEnabled: true,
        autoApproveConfidenceThreshold: 90
      },
      users: {
        create: {
          email: env.DEV_USER_EMAIL,
          name: env.DEV_USER_NAME,
          role: "manager"
        }
      }
    }
  });
}
