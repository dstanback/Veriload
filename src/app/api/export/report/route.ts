import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { NextResponse } from "next/server";

import { getCurrentAppSession } from "@/lib/auth";
import { db } from "@/lib/db";
import type { DiscrepancyRecord } from "@/types/discrepancies";

export const runtime = "nodejs";

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

const PAGE_W = 612; // US Letter
const PAGE_H = 792;
const MARGIN = 50;
const CONTENT_W = PAGE_W - MARGIN * 2;

const COLOR_FG = rgb(0.09, 0.13, 0.18); // #18212d
const COLOR_MUTED = rgb(0.44, 0.4, 0.36); // #70665b
const COLOR_ACCENT = rgb(0.67, 0.31, 0.14); // #ac4f23
const COLOR_SUCCESS = rgb(0.18, 0.48, 0.36); // #2d7a5b
const COLOR_LINE = rgb(0.9, 0.88, 0.85);

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function fmtCurrency(val: number | null): string {
  if (val == null) return "—";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  }).format(val);
}

function fmtDate(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function truncate(str: string | null, max: number): string {
  if (!str) return "—";
  return str.length > max ? str.slice(0, max - 1) + "…" : str;
}

/* ------------------------------------------------------------------ */
/*  GET handler                                                        */
/* ------------------------------------------------------------------ */

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
  const includeDetail = searchParams.get("detail") === "true";

  // Build where clause
  const where: Record<string, unknown> = {
    organizationId: session.organizationId,
  };

  if (statusFilter) {
    const statuses = statusFilter
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    if (statuses.length === 1) where.status = statuses[0];
    else if (statuses.length > 1) where.status = { in: statuses };
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
    if (Object.keys(createdAt).length > 0) where.createdAt = createdAt;
  }

  if (carrier) {
    where.carrierName = { contains: carrier, mode: "insensitive" };
  }

  // Fetch data
  const [shipments, org] = await Promise.all([
    db.shipment.findMany({
      where,
      include: {
        documents: {
          include: {
            document: {
              include: {
                extractedData: { orderBy: { createdAt: "desc" }, take: 1 },
              },
            },
          },
        },
        discrepancies: { orderBy: { createdAt: "desc" } },
      },
      orderBy: { createdAt: "desc" },
      take: 500,
    }),
    db.organization.findUnique({
      where: { id: session.organizationId },
      select: { name: true },
    }),
  ]);

  // Compute summary
  let totalSavings = 0;
  let greenCount = 0;
  let yellowCount = 0;
  let redCount = 0;

  for (const s of shipments) {
    if (s.discrepancyLevel === "green") greenCount++;
    else if (s.discrepancyLevel === "yellow") yellowCount++;
    else if (s.discrepancyLevel === "red") redCount++;

    for (const d of s.discrepancies) {
      if (
        d.severity === "red" &&
        d.varianceAmount != null &&
        (d.resolution === "disputed" || d.resolution === "manually_approved")
      ) {
        totalSavings += Math.abs(Number(d.varianceAmount));
      }
    }
  }

  // ── Build PDF ────────────────────────────────────────────────────
  const pdfDoc = await PDFDocument.create();
  const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  let pageNum = 0;
  const generatedAt = new Date().toLocaleString("en-US");
  const dateRange =
    dateFrom && dateTo
      ? `${fmtDate(dateFrom)} – ${fmtDate(dateTo)}`
      : dateFrom
        ? `From ${fmtDate(dateFrom)}`
        : dateTo
          ? `Through ${fmtDate(dateTo)}`
          : "All time";

  function addPage() {
    pageNum++;
    const page = pdfDoc.addPage([PAGE_W, PAGE_H]);
    // Footer
    const footerText = `Page ${pageNum}  •  Generated ${generatedAt}`;
    page.drawText(footerText, {
      x: MARGIN,
      y: 25,
      size: 7,
      font: fontRegular,
      color: COLOR_MUTED,
    });
    return page;
  }

  // ── Page 1: Header + Summary ─────────────────────────────────────
  const page1 = addPage();
  let y = PAGE_H - MARGIN;

  // Title block
  page1.drawText("VERILOAD", {
    x: MARGIN,
    y,
    size: 10,
    font: fontBold,
    color: COLOR_ACCENT,
  });
  y -= 20;
  page1.drawText("Reconciliation Report", {
    x: MARGIN,
    y,
    size: 22,
    font: fontBold,
    color: COLOR_FG,
  });
  y -= 18;
  page1.drawText(`${org?.name ?? "Organization"}  •  ${dateRange}`, {
    x: MARGIN,
    y,
    size: 9,
    font: fontRegular,
    color: COLOR_MUTED,
  });
  y -= 30;

  // Divider
  page1.drawLine({
    start: { x: MARGIN, y },
    end: { x: MARGIN + CONTENT_W, y },
    thickness: 0.5,
    color: COLOR_LINE,
  });
  y -= 25;

  // Summary stats
  page1.drawText("Summary", {
    x: MARGIN,
    y,
    size: 14,
    font: fontBold,
    color: COLOR_FG,
  });
  y -= 22;

  const summaryRows = [
    ["Total Shipments", String(shipments.length)],
    ["Total Savings (caught discrepancies)", fmtCurrency(totalSavings)],
    ["Green (clean)", String(greenCount)],
    ["Yellow (minor discrepancy)", String(yellowCount)],
    ["Red (material discrepancy)", String(redCount)],
  ];

  for (const [label, value] of summaryRows) {
    page1.drawText(label, {
      x: MARGIN,
      y,
      size: 9,
      font: fontRegular,
      color: COLOR_MUTED,
    });
    page1.drawText(value, {
      x: MARGIN + 260,
      y,
      size: 9,
      font: fontBold,
      color: label.includes("Savings") ? COLOR_SUCCESS : COLOR_FG,
    });
    y -= 16;
  }

  y -= 20;

  // Divider
  page1.drawLine({
    start: { x: MARGIN, y },
    end: { x: MARGIN + CONTENT_W, y },
    thickness: 0.5,
    color: COLOR_LINE,
  });
  y -= 25;

  // ── Shipment table ───────────────────────────────────────────────
  page1.drawText("Shipment Overview", {
    x: MARGIN,
    y,
    size: 14,
    font: fontBold,
    color: COLOR_FG,
  });
  y -= 20;

  const colWidths = [80, 80, 90, 80, 65, 55, 62];
  const colHeaders = [
    "Ref / BOL",
    "Carrier",
    "Lane",
    "Invoice",
    "Variance",
    "Status",
    "Level",
  ];

  function drawTableHeader(page: ReturnType<typeof pdfDoc.addPage>, yPos: number) {
    let x = MARGIN;
    for (let i = 0; i < colHeaders.length; i++) {
      page.drawText(colHeaders[i], {
        x,
        y: yPos,
        size: 7,
        font: fontBold,
        color: COLOR_MUTED,
      });
      x += colWidths[i];
    }
    return yPos - 4;
  }

  function drawTableLine(page: ReturnType<typeof pdfDoc.addPage>, yPos: number) {
    page.drawLine({
      start: { x: MARGIN, y: yPos },
      end: { x: MARGIN + CONTENT_W, y: yPos },
      thickness: 0.3,
      color: COLOR_LINE,
    });
  }

  y = drawTableHeader(page1, y);
  drawTableLine(page1, y);
  y -= 14;

  let currentPage = page1;

  for (const s of shipments) {
    if (y < 60) {
      currentPage = addPage();
      y = PAGE_H - MARGIN;
      y = drawTableHeader(currentPage, y);
      drawTableLine(currentPage, y);
      y -= 14;
    }

    const ref = truncate(s.shipmentRef ?? s.bolNumber ?? s.id.slice(0, 8), 12);
    const carrierName = truncate(s.carrierName, 12);
    const lane = truncate(
      [s.origin, s.destination].filter(Boolean).join(" → ") || "—",
      14,
    );

    // Get invoice total from extracted data
    let invoiceTotal: number | null = null;
    for (const link of s.documents) {
      if (link.document.docType === "invoice") {
        const fields = link.document.extractedData[0]?.extractedFields as
          | Record<string, unknown>
          | undefined;
        if (fields && typeof fields.total_amount === "number") {
          invoiceTotal = fields.total_amount;
        }
      }
    }

    let variance = 0;
    for (const d of s.discrepancies) {
      if (d.varianceAmount != null) variance += Math.abs(Number(d.varianceAmount));
    }

    const vals = [
      ref,
      carrierName,
      lane,
      fmtCurrency(invoiceTotal),
      variance > 0 ? fmtCurrency(variance) : "—",
      s.status,
      s.discrepancyLevel ?? "—",
    ];

    let x = MARGIN;
    for (let i = 0; i < vals.length; i++) {
      currentPage.drawText(vals[i], {
        x,
        y,
        size: 7.5,
        font: fontRegular,
        color: COLOR_FG,
      });
      x += colWidths[i];
    }
    y -= 14;
  }

  // ── Detail pages (optional) ──────────────────────────────────────
  if (includeDetail) {
    for (const s of shipments) {
      if (s.discrepancies.length === 0) continue;

      currentPage = addPage();
      y = PAGE_H - MARGIN;

      currentPage.drawText(
        `Shipment: ${s.shipmentRef ?? s.bolNumber ?? s.id.slice(0, 8)}`,
        { x: MARGIN, y, size: 12, font: fontBold, color: COLOR_FG },
      );
      y -= 16;

      const info = [
        `Carrier: ${s.carrierName ?? "—"}  •  ${s.origin ?? "?"} → ${s.destination ?? "?"}`,
        `Status: ${s.status}  •  Level: ${s.discrepancyLevel ?? "—"}  •  Confidence: ${s.matchConfidence != null ? `${s.matchConfidence.toFixed(0)}%` : "—"}`,
      ];
      for (const line of info) {
        currentPage.drawText(line, {
          x: MARGIN,
          y,
          size: 8,
          font: fontRegular,
          color: COLOR_MUTED,
        });
        y -= 14;
      }
      y -= 8;

      currentPage.drawText("Discrepancies", {
        x: MARGIN,
        y,
        size: 10,
        font: fontBold,
        color: COLOR_FG,
      });
      y -= 16;

      const dColWidths = [100, 90, 90, 70, 60, 60];
      const dColHeaders = [
        "Field",
        "Source Value",
        "Compare Value",
        "Variance $",
        "Severity",
        "Resolution",
      ];

      let dx = MARGIN;
      for (let i = 0; i < dColHeaders.length; i++) {
        currentPage.drawText(dColHeaders[i], {
          x: dx,
          y,
          size: 7,
          font: fontBold,
          color: COLOR_MUTED,
        });
        dx += dColWidths[i];
      }
      y -= 4;
      drawTableLine(currentPage, y);
      y -= 14;

      for (const d of s.discrepancies) {
        if (y < 60) {
          currentPage = addPage();
          y = PAGE_H - MARGIN;
        }

        const dVals = [
          truncate(d.fieldName, 15),
          truncate(d.sourceValue, 13),
          truncate(d.compareValue, 13),
          d.varianceAmount != null
            ? fmtCurrency(Math.abs(Number(d.varianceAmount)))
            : "—",
          d.severity,
          d.resolution ?? "unresolved",
        ];

        dx = MARGIN;
        for (let i = 0; i < dVals.length; i++) {
          currentPage.drawText(dVals[i], {
            x: dx,
            y,
            size: 7.5,
            font: fontRegular,
            color: COLOR_FG,
          });
          dx += dColWidths[i];
        }
        y -= 13;
      }
    }
  }

  const pdfBytes = await pdfDoc.save();

  // Audit log
  await db.auditLog.create({
    data: {
      organizationId: session.organizationId,
      userId: session.userId,
      action: "data_exported",
      details: {
        format: "pdf",
        filters: { status: statusFilter, dateFrom, dateTo, carrier },
        rowCount: shipments.length,
        includeDetail,
        timestamp: new Date().toISOString(),
      },
    },
  });

  const today = new Date().toISOString().slice(0, 10);

  return new Response(Buffer.from(pdfBytes), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="veriload-report-${today}.pdf"`,
    },
  });
}
