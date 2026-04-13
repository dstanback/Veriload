import { NextResponse } from "next/server";

import { getCurrentAppSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { buildCsvHeader, formatShipmentCsvRow } from "@/lib/export";
import type { ShipmentDetail } from "@/types/shipments";
import type { DiscrepancyRecord } from "@/types/discrepancies";

export const runtime = "nodejs";

export async function GET(request: Request) {
  let session;
  try {
    session = await getCurrentAppSession();
  } catch {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const statusFilter = searchParams.get("status");
  const dateFrom = searchParams.get("dateFrom");
  const dateTo = searchParams.get("dateTo");
  const carrier = searchParams.get("carrier");

  // Build Prisma where clause
  const where: Record<string, unknown> = {
    organizationId: session.organizationId,
  };

  if (statusFilter) {
    const statuses = statusFilter.split(",").map((s) => s.trim()).filter(Boolean);
    if (statuses.length === 1) {
      where.status = statuses[0];
    } else if (statuses.length > 1) {
      where.status = { in: statuses };
    }
  }

  if (dateFrom || dateTo) {
    const createdAt: Record<string, Date> = {};
    if (dateFrom) {
      const d = new Date(dateFrom + "T00:00:00");
      if (!isNaN(d.getTime())) createdAt.gte = d;
    }
    if (dateTo) {
      const d = new Date(dateTo + "T23:59:59.999");
      if (!isNaN(d.getTime())) createdAt.lte = d;
    }
    if (Object.keys(createdAt).length > 0) {
      where.createdAt = createdAt;
    }
  }

  if (carrier) {
    where.carrierName = { contains: carrier, mode: "insensitive" };
  }

  // Stream CSV via ReadableStream
  const encoder = new TextEncoder();
  const today = new Date().toISOString().slice(0, 10);

  const stream = new ReadableStream({
    async start(controller) {
      try {
        // Write header
        controller.enqueue(encoder.encode(buildCsvHeader()));

        // Query in batches to support large datasets
        const batchSize = 200;
        let cursor: string | undefined;
        let rowCount = 0;

        while (true) {
          const shipments = await db.shipment.findMany({
            where,
            include: {
              documents: {
                include: {
                  document: {
                    include: {
                      extractedData: {
                        orderBy: { createdAt: "desc" },
                        take: 1,
                      },
                    },
                  },
                },
              },
              discrepancies: {
                orderBy: { createdAt: "desc" },
              },
            },
            orderBy: { createdAt: "desc" },
            take: batchSize,
            ...(cursor
              ? { skip: 1, cursor: { id: cursor } }
              : {}),
          });

          if (shipments.length === 0) break;

          for (const s of shipments) {
            const detail = {
              id: s.id,
              organization_id: s.organizationId,
              shipment_ref: s.shipmentRef,
              bol_number: s.bolNumber,
              pro_number: s.proNumber,
              shipper_name: s.shipperName,
              consignee_name: s.consigneeName,
              carrier_name: s.carrierName,
              carrier_scac: s.carrierScac,
              origin: s.origin,
              destination: s.destination,
              status: s.status,
              match_confidence: s.matchConfidence,
              discrepancy_level: s.discrepancyLevel,
              created_at: s.createdAt.toISOString(),
              updated_at: s.updatedAt.toISOString(),
              documents: s.documents.map((link) => ({
                doc_type: link.document.docType,
                extracted_data: link.document.extractedData[0]
                  ? { extracted_fields: link.document.extractedData[0].extractedFields as Record<string, unknown> }
                  : null,
              })),
              discrepancies: s.discrepancies.map((d): DiscrepancyRecord => ({
                id: d.id,
                shipment_id: d.shipmentId,
                field_name: d.fieldName,
                source_doc_id: d.sourceDocId,
                compare_doc_id: d.compareDocId,
                source_value: d.sourceValue,
                compare_value: d.compareValue,
                variance_amount: d.varianceAmount == null ? null : Number(d.varianceAmount),
                variance_pct: d.variancePct,
                severity: d.severity as DiscrepancyRecord["severity"],
                resolution: (d.resolution as DiscrepancyRecord["resolution"]) ?? null,
                resolved_by: d.resolvedById,
                resolved_at: d.resolvedAt?.toISOString() ?? null,
                notes: d.notes,
                created_at: d.createdAt.toISOString(),
              })),
            } as unknown as ShipmentDetail;

            controller.enqueue(encoder.encode(formatShipmentCsvRow(detail)));
            rowCount++;
          }

          cursor = shipments[shipments.length - 1].id;
          if (shipments.length < batchSize) break;
        }

        // Audit log
        await db.auditLog.create({
          data: {
            organizationId: session.organizationId,
            userId: session.userId,
            action: "data_exported",
            details: {
              format: "csv",
              filters: { status: statusFilter, dateFrom, dateTo, carrier },
              rowCount,
              timestamp: new Date().toISOString(),
            },
          },
        });

        controller.close();
      } catch (err) {
        controller.error(err);
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="veriload-shipments-${today}.csv"`,
    },
  });
}
