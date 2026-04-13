import "server-only";

import { Prisma } from "@prisma/client";

import { getCurrentAppSession } from "@/lib/auth";
import { db } from "@/lib/db";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

export interface TimeSeriesPoint {
  date: string; // YYYY-MM-DD
  value: number;
}

export interface StackedTimeSeriesPoint {
  date: string;
  bol: number;
  invoice: number;
  rate_con: number;
  pod: number;
  other: number;
}

export interface DiscrepancyTrendPoint {
  date: string;
  green: number;
  yellow: number;
  red: number;
}

export interface TopDiscrepancyType {
  fieldName: string;
  count: number;
  avgVariancePct: number;
  totalVarianceAmount: number;
}

export interface CarrierPerformanceRow {
  carrierName: string;
  totalShipments: number;
  discrepancyRate: number;
  avgVarianceAmount: number;
  avgResolutionDays: number | null;
}

export interface DocTypeCount {
  docType: string;
  count: number;
}

export interface ConfidenceBucket {
  range: string;
  min: number;
  max: number;
  count: number;
}

export interface AnalyticsData {
  // Savings
  totalSavings: number;
  avgSavingsPerShipment: number;
  totalShipmentsProcessed: number;
  totalDocumentsProcessed: number;
  savingsOverTime: TimeSeriesPoint[];

  // Processing volume
  volumeOverTime: StackedTimeSeriesPoint[];
  docTypeCounts: DocTypeCount[];

  // Discrepancy trends
  discrepancyTrends: DiscrepancyTrendPoint[];
  topDiscrepancyTypes: TopDiscrepancyType[];

  // Carrier performance
  carrierPerformance: CarrierPerformanceRow[];

  // Processing accuracy
  confidenceDistribution: ConfidenceBucket[];
  classificationCounts: DocTypeCount[];
  avgProcessingTimeSecs: number | null;
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function daysBetween(a: Date, b: Date): number {
  const msPerDay = 86_400_000;
  return Math.abs(b.getTime() - a.getTime()) / msPerDay;
}

function dateKey(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function generateDateRange(start: Date, end: Date): string[] {
  const dates: string[] = [];
  const current = new Date(start);
  current.setHours(0, 0, 0, 0);
  const endNorm = new Date(end);
  endNorm.setHours(0, 0, 0, 0);
  while (current <= endNorm) {
    dates.push(dateKey(current));
    current.setDate(current.getDate() + 1);
  }
  return dates;
}

function normalizeDocType(raw: string | null): keyof Omit<StackedTimeSeriesPoint, "date"> {
  if (!raw) return "other";
  const lower = raw.toLowerCase();
  if (lower === "bol") return "bol";
  if (lower === "invoice") return "invoice";
  if (lower === "rate_con" || lower === "rate con") return "rate_con";
  if (lower === "pod") return "pod";
  return "other";
}

/* ------------------------------------------------------------------ */
/*  Main query function                                                */
/* ------------------------------------------------------------------ */

export async function getAnalyticsData(
  startDate: Date,
  endDate: Date,
  carrierFilter?: string
): Promise<AnalyticsData> {
  const session = await getCurrentAppSession();
  const orgId = session.organizationId;

  const shipmentWhere: Prisma.ShipmentWhereInput = {
    organizationId: orgId,
    createdAt: { gte: startDate, lte: endDate },
    ...(carrierFilter ? { carrierName: carrierFilter } : {}),
  };

  const discrepancyWhere: Prisma.DiscrepancyWhereInput = {
    shipment: {
      organizationId: orgId,
      createdAt: { gte: startDate, lte: endDate },
      ...(carrierFilter ? { carrierName: carrierFilter } : {}),
    },
  };

  // ── Parallel queries ──────────────────────────────────────────────
  const [
    caughtDiscrepancies,
    shipmentsInRange,
    documentsInRange,
    allDiscrepancies,
    documentsWithConfidence,
    processedDocuments,
  ] = await Promise.all([
    // 1. Red discrepancies that were caught (disputed or resolved)
    db.discrepancy.findMany({
      where: {
        ...discrepancyWhere,
        severity: "red",
        resolution: { in: ["disputed", "manually_approved"] },
        varianceAmount: { not: null },
      },
      select: {
        varianceAmount: true,
        createdAt: true,
        shipmentId: true,
      },
    }),

    // 2. Shipments in range
    db.shipment.findMany({
      where: shipmentWhere,
      select: {
        id: true,
        carrierName: true,
        discrepancyLevel: true,
        createdAt: true,
        discrepancies: {
          select: {
            severity: true,
            varianceAmount: true,
            resolvedAt: true,
            createdAt: true,
            fieldName: true,
            variancePct: true,
          },
        },
      },
    }),

    // 3. Documents in range
    db.document.findMany({
      where: {
        organizationId: orgId,
        createdAt: { gte: startDate, lte: endDate },
      },
      select: {
        docType: true,
        createdAt: true,
        processedAt: true,
        status: true,
      },
    }),

    // 4. All discrepancies in range (for trends)
    db.discrepancy.findMany({
      where: discrepancyWhere,
      select: {
        severity: true,
        createdAt: true,
        fieldName: true,
        varianceAmount: true,
        variancePct: true,
      },
    }),

    // 5. Documents with confidence scores (for accuracy)
    db.document.findMany({
      where: {
        organizationId: orgId,
        createdAt: { gte: startDate, lte: endDate },
        docTypeConfidence: { not: null },
      },
      select: {
        docType: true,
        docTypeConfidence: true,
      },
    }),

    // 6. Processed documents for average processing time
    db.document.findMany({
      where: {
        organizationId: orgId,
        createdAt: { gte: startDate, lte: endDate },
        status: "processed",
        processedAt: { not: null },
      },
      select: {
        createdAt: true,
        processedAt: true,
      },
    }),
  ]);

  const allDates = generateDateRange(startDate, endDate);

  // ── Savings ───────────────────────────────────────────────────────
  const savingsByDate = new Map<string, number>();
  let totalSavings = 0;
  const savingsShipmentIds = new Set<string>();

  for (const d of caughtDiscrepancies) {
    const amount = Math.abs(Number(d.varianceAmount));
    totalSavings += amount;
    savingsShipmentIds.add(d.shipmentId);
    const dk = dateKey(d.createdAt);
    savingsByDate.set(dk, (savingsByDate.get(dk) ?? 0) + amount);
  }

  let cumulative = 0;
  const savingsOverTime: TimeSeriesPoint[] = allDates.map((date) => {
    cumulative += savingsByDate.get(date) ?? 0;
    return { date, value: Math.round(cumulative * 100) / 100 };
  });

  const avgSavingsPerShipment =
    savingsShipmentIds.size > 0 ? totalSavings / savingsShipmentIds.size : 0;

  // ── Processing volume ─────────────────────────────────────────────
  const volumeMap = new Map<string, StackedTimeSeriesPoint>();
  for (const date of allDates) {
    volumeMap.set(date, { date, bol: 0, invoice: 0, rate_con: 0, pod: 0, other: 0 });
  }

  const docTypeCountMap = new Map<string, number>();
  for (const doc of documentsInRange) {
    const dk = dateKey(doc.createdAt);
    const entry = volumeMap.get(dk);
    const normalized = normalizeDocType(doc.docType);
    if (entry) {
      entry[normalized]++;
    }
    const displayType = doc.docType ?? "unknown";
    docTypeCountMap.set(displayType, (docTypeCountMap.get(displayType) ?? 0) + 1);
  }

  const volumeOverTime = allDates.map((d) => volumeMap.get(d)!);
  const docTypeCounts: DocTypeCount[] = Array.from(docTypeCountMap.entries())
    .map(([docType, count]) => ({ docType, count }))
    .sort((a, b) => b.count - a.count);

  // ── Discrepancy trends ────────────────────────────────────────────
  const trendMap = new Map<string, DiscrepancyTrendPoint>();
  for (const date of allDates) {
    trendMap.set(date, { date, green: 0, yellow: 0, red: 0 });
  }

  const fieldAgg = new Map<string, { count: number; totalPct: number; totalAmount: number }>();

  for (const d of allDiscrepancies) {
    const dk = dateKey(d.createdAt);
    const entry = trendMap.get(dk);
    if (entry && (d.severity === "green" || d.severity === "yellow" || d.severity === "red")) {
      entry[d.severity]++;
    }

    const existing = fieldAgg.get(d.fieldName) ?? { count: 0, totalPct: 0, totalAmount: 0 };
    existing.count++;
    existing.totalPct += d.variancePct ?? 0;
    existing.totalAmount += Math.abs(Number(d.varianceAmount ?? 0));
    fieldAgg.set(d.fieldName, existing);
  }

  const discrepancyTrends = allDates.map((d) => trendMap.get(d)!);

  const topDiscrepancyTypes: TopDiscrepancyType[] = Array.from(fieldAgg.entries())
    .map(([fieldName, agg]) => ({
      fieldName,
      count: agg.count,
      avgVariancePct: agg.count > 0 ? agg.totalPct / agg.count : 0,
      totalVarianceAmount: Math.round(agg.totalAmount * 100) / 100,
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 15);

  // ── Carrier performance ───────────────────────────────────────────
  const carrierMap = new Map<
    string,
    {
      total: number;
      withDiscrepancy: number;
      totalVariance: number;
      resolutionDaysSum: number;
      resolutionCount: number;
    }
  >();

  for (const s of shipmentsInRange) {
    const name = s.carrierName ?? "Unknown";
    const entry = carrierMap.get(name) ?? {
      total: 0,
      withDiscrepancy: 0,
      totalVariance: 0,
      resolutionDaysSum: 0,
      resolutionCount: 0,
    };
    entry.total++;
    if (s.discrepancyLevel === "yellow" || s.discrepancyLevel === "red") {
      entry.withDiscrepancy++;
    }
    for (const d of s.discrepancies) {
      entry.totalVariance += Math.abs(Number(d.varianceAmount ?? 0));
      if (d.resolvedAt) {
        entry.resolutionDaysSum += daysBetween(d.createdAt, d.resolvedAt);
        entry.resolutionCount++;
      }
    }
    carrierMap.set(name, entry);
  }

  const carrierPerformance: CarrierPerformanceRow[] = Array.from(carrierMap.entries())
    .map(([carrierName, data]) => ({
      carrierName,
      totalShipments: data.total,
      discrepancyRate: data.total > 0 ? data.withDiscrepancy / data.total : 0,
      avgVarianceAmount:
        data.withDiscrepancy > 0 ? data.totalVariance / data.withDiscrepancy : 0,
      avgResolutionDays:
        data.resolutionCount > 0
          ? Math.round((data.resolutionDaysSum / data.resolutionCount) * 10) / 10
          : null,
    }))
    .sort((a, b) => b.totalShipments - a.totalShipments);

  // ── Processing accuracy ───────────────────────────────────────────
  const buckets: ConfidenceBucket[] = [
    { range: "0-20%", min: 0, max: 0.2, count: 0 },
    { range: "20-40%", min: 0.2, max: 0.4, count: 0 },
    { range: "40-60%", min: 0.4, max: 0.6, count: 0 },
    { range: "60-80%", min: 0.6, max: 0.8, count: 0 },
    { range: "80-90%", min: 0.8, max: 0.9, count: 0 },
    { range: "90-95%", min: 0.9, max: 0.95, count: 0 },
    { range: "95-100%", min: 0.95, max: 1.01, count: 0 },
  ];

  const classMap = new Map<string, number>();

  for (const doc of documentsWithConfidence) {
    const conf = doc.docTypeConfidence ?? 0;
    for (const b of buckets) {
      if (conf >= b.min && conf < b.max) {
        b.count++;
        break;
      }
    }
    const dt = doc.docType ?? "unknown";
    classMap.set(dt, (classMap.get(dt) ?? 0) + 1);
  }

  const classificationCounts: DocTypeCount[] = Array.from(classMap.entries())
    .map(([docType, count]) => ({ docType, count }))
    .sort((a, b) => b.count - a.count);

  let avgProcessingTimeSecs: number | null = null;
  if (processedDocuments.length > 0) {
    const totalMs = processedDocuments.reduce((sum, doc) => {
      return sum + (doc.processedAt!.getTime() - doc.createdAt.getTime());
    }, 0);
    avgProcessingTimeSecs = Math.round(totalMs / processedDocuments.length / 1000);
  }

  return {
    totalSavings: Math.round(totalSavings * 100) / 100,
    avgSavingsPerShipment: Math.round(avgSavingsPerShipment * 100) / 100,
    totalShipmentsProcessed: shipmentsInRange.length,
    totalDocumentsProcessed: documentsInRange.length,
    savingsOverTime,
    volumeOverTime,
    docTypeCounts,
    discrepancyTrends,
    topDiscrepancyTypes,
    carrierPerformance,
    confidenceDistribution: buckets,
    classificationCounts,
    avgProcessingTimeSecs,
  };
}
