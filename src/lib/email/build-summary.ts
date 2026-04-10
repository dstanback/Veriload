import "server-only";

import { db } from "@/lib/db";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

export interface NeedsReviewShipment {
  id: string;
  shipmentRef: string | null;
  carrierName: string | null;
  discrepancyLevel: string | null;
  invoiceTotal: number | null;
  topDiscrepancy: string | null;
}

export interface DailySummary {
  organizationId: string;
  date: string;
  documentsReceived: {
    total: number;
    byType: Record<string, number>;
    byStatus: Record<string, number>;
  };
  autoApproved: {
    count: number;
    totalInvoiceValue: number;
  };
  needsReview: NeedsReviewShipment[];
  disputes: {
    count: number;
    totalDisputedAmount: number;
  };
  potentialSavings: number;
}

/* ------------------------------------------------------------------ */
/*  Builder                                                            */
/* ------------------------------------------------------------------ */

export async function buildDailySummary(
  organizationId: string,
  date: Date
): Promise<DailySummary> {
  const dayStart = new Date(date);
  dayStart.setHours(0, 0, 0, 0);
  const dayEnd = new Date(date);
  dayEnd.setHours(23, 59, 59, 999);

  const dateStr = dayStart.toISOString().slice(0, 10);

  // Parallel queries
  const [
    documents,
    autoApprovedLogs,
    reviewShipments,
    disputedShipments,
    caughtDiscrepancies,
  ] = await Promise.all([
    // Documents received in the period
    db.document.findMany({
      where: {
        organizationId,
        createdAt: { gte: dayStart, lte: dayEnd },
      },
      select: { docType: true, status: true },
    }),

    // Shipments auto-approved in the period
    db.auditLog.findMany({
      where: {
        organizationId,
        action: "auto_approved",
        createdAt: { gte: dayStart, lte: dayEnd },
      },
      select: { shipmentId: true },
    }),

    // Shipments needing review (pending or matched with yellow/red discrepancies)
    db.shipment.findMany({
      where: {
        organizationId,
        OR: [
          { status: "pending" },
          { status: "matched", discrepancyLevel: { in: ["yellow", "red"] } },
        ],
      },
      include: {
        discrepancies: {
          orderBy: { createdAt: "desc" },
          take: 1,
        },
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
      },
      orderBy: { updatedAt: "desc" },
      take: 20,
    }),

    // Open disputes
    db.shipment.findMany({
      where: {
        organizationId,
        status: "disputed",
      },
      include: {
        discrepancies: {
          where: { resolution: "disputed" },
        },
      },
    }),

    // Caught red discrepancies on approved/disputed shipments (potential savings)
    db.discrepancy.findMany({
      where: {
        severity: "red",
        shipment: {
          organizationId,
          status: { in: ["approved", "disputed"] },
        },
        varianceAmount: { not: null },
      },
      select: { varianceAmount: true },
    }),
  ]);

  // Aggregate document counts
  const byType: Record<string, number> = {};
  const byStatus: Record<string, number> = {};
  for (const doc of documents) {
    const t = doc.docType ?? "unknown";
    byType[t] = (byType[t] ?? 0) + 1;
    const s = doc.status;
    byStatus[s] = (byStatus[s] ?? 0) + 1;
  }

  // Auto-approved invoice totals
  const autoApprovedShipmentIds = autoApprovedLogs
    .map((l) => l.shipmentId)
    .filter(Boolean) as string[];
  let autoApprovedInvoiceTotal = 0;
  if (autoApprovedShipmentIds.length > 0) {
    const invoiceDocs = await db.shipmentDocument.findMany({
      where: {
        shipmentId: { in: autoApprovedShipmentIds },
        role: "invoice",
      },
      include: {
        document: {
          include: {
            extractedData: { orderBy: { createdAt: "desc" }, take: 1 },
          },
        },
      },
    });
    for (const link of invoiceDocs) {
      const fields = link.document.extractedData[0]?.extractedFields as Record<string, unknown> | undefined;
      if (fields && typeof fields.total_amount === "number") {
        autoApprovedInvoiceTotal += fields.total_amount;
      }
    }
  }

  // Map needs-review shipments
  const needsReview: NeedsReviewShipment[] = reviewShipments.map((s) => {
    let invoiceTotal: number | null = null;
    for (const link of s.documents) {
      if (link.document.docType === "invoice") {
        const fields = link.document.extractedData[0]?.extractedFields as Record<string, unknown> | undefined;
        if (fields && typeof fields.total_amount === "number") {
          invoiceTotal = fields.total_amount;
        }
      }
    }

    const topDisc = s.discrepancies[0];
    const topDiscrepancy = topDisc
      ? `${topDisc.fieldName}: ${topDisc.sourceValue ?? "?"} vs ${topDisc.compareValue ?? "?"}`
      : null;

    return {
      id: s.id,
      shipmentRef: s.shipmentRef,
      carrierName: s.carrierName,
      discrepancyLevel: s.discrepancyLevel,
      invoiceTotal,
      topDiscrepancy,
    };
  });

  // Dispute amounts
  let totalDisputedAmount = 0;
  for (const shipment of disputedShipments) {
    for (const d of shipment.discrepancies) {
      if (d.varianceAmount != null) {
        totalDisputedAmount += Math.abs(Number(d.varianceAmount));
      }
    }
  }

  // Potential savings
  const potentialSavings = caughtDiscrepancies.reduce(
    (sum, d) => sum + Math.abs(Number(d.varianceAmount ?? 0)),
    0
  );

  return {
    organizationId,
    date: dateStr,
    documentsReceived: {
      total: documents.length,
      byType,
      byStatus,
    },
    autoApproved: {
      count: autoApprovedLogs.length,
      totalInvoiceValue: autoApprovedInvoiceTotal,
    },
    needsReview,
    disputes: {
      count: disputedShipments.length,
      totalDisputedAmount,
    },
    potentialSavings,
  };
}
