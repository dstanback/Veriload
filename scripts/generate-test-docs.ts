import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { writeFile, mkdir } from "node:fs/promises";
import path from "node:path";

const FIXTURES_DIR = path.resolve(process.cwd(), "tests/fixtures");

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

type Page = ReturnType<PDFDocument["addPage"]>;

function drawLine(page: Page, y: number, width: number, margin: number) {
  page.drawLine({
    start: { x: margin, y },
    end: { x: width - margin, y },
    thickness: 0.5,
    color: rgb(0.7, 0.7, 0.7),
  });
}

/* ------------------------------------------------------------------ */
/*  BOL PDF                                                            */
/* ------------------------------------------------------------------ */

async function generateBol(): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const page = doc.addPage([612, 792]); // US Letter
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);
  const regular = await doc.embedFont(StandardFonts.Helvetica);
  const { width } = page.getSize();
  const margin = 50;
  let y = 740;

  // Title
  page.drawText("STRAIGHT BILL OF LADING — SHORT FORM", {
    x: margin,
    y,
    size: 16,
    font: bold,
    color: rgb(0, 0, 0),
  });
  y -= 10;
  drawLine(page, y, width, margin);
  y -= 25;

  // BOL number
  page.drawText("BOL#:", { x: margin, y, size: 10, font: bold });
  page.drawText("BOL-2024-TEST-001", {
    x: margin + 40,
    y,
    size: 10,
    font: regular,
  });
  page.drawText("Date:", { x: 350, y, size: 10, font: bold });
  page.drawText("2024-08-15", { x: 385, y, size: 10, font: regular });
  y -= 30;

  drawLine(page, y, width, margin);
  y -= 20;

  // Shipper
  page.drawText("SHIPPER:", { x: margin, y, size: 10, font: bold });
  y -= 16;
  page.drawText("Midwest Steel Corp", {
    x: margin,
    y,
    size: 10,
    font: regular,
  });
  y -= 14;
  page.drawText("1200 Industrial Blvd", {
    x: margin,
    y,
    size: 10,
    font: regular,
  });
  y -= 14;
  page.drawText("Chicago, IL 60609", {
    x: margin,
    y,
    size: 10,
    font: regular,
  });
  y -= 25;

  // Consignee
  page.drawText("CONSIGNEE:", { x: margin, y, size: 10, font: bold });
  y -= 16;
  page.drawText("Gulf Coast Fabrication", {
    x: margin,
    y,
    size: 10,
    font: regular,
  });
  y -= 14;
  page.drawText("8400 Ship Channel Dr", {
    x: margin,
    y,
    size: 10,
    font: regular,
  });
  y -= 14;
  page.drawText("Houston, TX 77012", {
    x: margin,
    y,
    size: 10,
    font: regular,
  });
  y -= 25;

  drawLine(page, y, width, margin);
  y -= 20;

  // Carrier
  page.drawText("CARRIER:", { x: margin, y, size: 10, font: bold });
  page.drawText("Schneider National", {
    x: margin + 60,
    y,
    size: 10,
    font: regular,
  });
  y -= 16;
  page.drawText("SCAC:", { x: margin, y, size: 10, font: bold });
  page.drawText("SNLU", { x: margin + 40, y, size: 10, font: regular });
  y -= 30;

  drawLine(page, y, width, margin);
  y -= 20;

  // Commodity table header
  const cols = [margin, margin + 120, margin + 200, margin + 320];
  page.drawText("COMMODITY DESCRIPTION", {
    x: cols[0],
    y,
    size: 9,
    font: bold,
  });
  page.drawText("PIECES", { x: cols[1], y, size: 9, font: bold });
  page.drawText("WEIGHT (LBS)", { x: cols[2], y, size: 9, font: bold });
  page.drawText("HAZMAT", { x: cols[3], y, size: 9, font: bold });
  y -= 5;
  drawLine(page, y, width, margin);
  y -= 16;

  // Commodity row
  page.drawText("Steel Coils", { x: cols[0], y, size: 10, font: regular });
  page.drawText("12", { x: cols[1], y, size: 10, font: regular });
  page.drawText("22,500", { x: cols[2], y, size: 10, font: regular });
  page.drawText("No", { x: cols[3], y, size: 10, font: regular });
  y -= 30;

  drawLine(page, y, width, margin);
  y -= 20;

  // Totals
  page.drawText("Total Pieces:", { x: margin, y, size: 10, font: bold });
  page.drawText("12", { x: margin + 85, y, size: 10, font: regular });
  page.drawText("Total Weight:", { x: 250, y, size: 10, font: bold });
  page.drawText("22,500 lbs", { x: 335, y, size: 10, font: regular });
  y -= 30;

  // Special instructions
  page.drawText("SPECIAL INSTRUCTIONS:", {
    x: margin,
    y,
    size: 10,
    font: bold,
  });
  y -= 16;
  page.drawText("Handle with care - coils must remain banded.", {
    x: margin,
    y,
    size: 10,
    font: regular,
  });
  y -= 40;

  drawLine(page, y, width, margin);
  y -= 20;

  // Signature block
  page.drawText("Shipper Signature: _________________________", {
    x: margin,
    y,
    size: 10,
    font: regular,
  });
  page.drawText("Carrier Signature: _________________________", {
    x: 310,
    y,
    size: 10,
    font: regular,
  });

  return doc.save();
}

/* ------------------------------------------------------------------ */
/*  Invoice PDF                                                        */
/* ------------------------------------------------------------------ */

async function generateInvoice(): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const page = doc.addPage([612, 792]);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);
  const regular = await doc.embedFont(StandardFonts.Helvetica);
  const { width } = page.getSize();
  const margin = 50;
  let y = 740;

  // Header
  page.drawText("FREIGHT INVOICE", {
    x: margin,
    y,
    size: 18,
    font: bold,
    color: rgb(0, 0, 0),
  });
  y -= 10;
  drawLine(page, y, width, margin);
  y -= 25;

  // Carrier info
  page.drawText("Carrier:", { x: margin, y, size: 10, font: bold });
  page.drawText("Schneider National", {
    x: margin + 55,
    y,
    size: 10,
    font: regular,
  });
  page.drawText("SCAC:", { x: 350, y, size: 10, font: bold });
  page.drawText("SNLU", { x: 385, y, size: 10, font: regular });
  y -= 18;

  page.drawText("Invoice#:", { x: margin, y, size: 10, font: bold });
  page.drawText("INV-SNLU-2024-0892", {
    x: margin + 60,
    y,
    size: 10,
    font: regular,
  });
  page.drawText("Invoice Date:", { x: 350, y, size: 10, font: bold });
  page.drawText(formatInvoiceDate(), { x: 425, y, size: 10, font: regular });
  y -= 18;

  page.drawText("BOL Reference:", { x: margin, y, size: 10, font: bold });
  page.drawText("BOL-2024-TEST-001", {
    x: margin + 95,
    y,
    size: 10,
    font: regular,
  });
  page.drawText("PRO#:", { x: 350, y, size: 10, font: bold });
  page.drawText("PRO-88421", { x: 385, y, size: 10, font: regular });
  y -= 30;

  drawLine(page, y, width, margin);
  y -= 20;

  // Origin / Destination
  page.drawText("ORIGIN:", { x: margin, y, size: 10, font: bold });
  page.drawText("Chicago, IL 60609", {
    x: margin + 55,
    y,
    size: 10,
    font: regular,
  });
  y -= 16;
  page.drawText("DESTINATION:", { x: margin, y, size: 10, font: bold });
  page.drawText("Houston, TX 77012", {
    x: margin + 85,
    y,
    size: 10,
    font: regular,
  });
  y -= 25;

  drawLine(page, y, width, margin);
  y -= 20;

  // Line items table header
  const cols = [margin, margin + 240, margin + 340, margin + 420];
  page.drawText("DESCRIPTION", { x: cols[0], y, size: 9, font: bold });
  page.drawText("WEIGHT (LBS)", { x: cols[1], y, size: 9, font: bold });
  page.drawText("PIECES", { x: cols[2], y, size: 9, font: bold });
  page.drawText("AMOUNT", { x: cols[3], y, size: 9, font: bold });
  y -= 5;
  drawLine(page, y, width, margin);
  y -= 18;

  // Line item 1
  page.drawText("Steel Coils - Base Freight (Chicago to Houston)", {
    x: cols[0],
    y,
    size: 10,
    font: regular,
  });
  page.drawText("22,500", { x: cols[1], y, size: 10, font: regular });
  page.drawText("12", { x: cols[2], y, size: 10, font: regular });
  page.drawText("$2,850.00", { x: cols[3], y, size: 10, font: regular });
  y -= 25;

  drawLine(page, y, width, margin);
  y -= 20;

  // Charges summary
  const labelX = 320;
  const valueX = cols[3];
  page.drawText("Subtotal:", { x: labelX, y, size: 10, font: bold });
  page.drawText("$2,850.00", { x: valueX, y, size: 10, font: regular });
  y -= 18;

  page.drawText("Fuel Surcharge (12%):", {
    x: labelX,
    y,
    size: 10,
    font: bold,
  });
  page.drawText("$342.00", { x: valueX, y, size: 10, font: regular });
  y -= 18;

  drawLine(page, y + 6, width, labelX);
  y -= 4;

  page.drawText("TOTAL DUE:", { x: labelX, y, size: 12, font: bold });
  page.drawText("$3,192.00", { x: valueX, y, size: 12, font: bold });
  y -= 30;

  drawLine(page, y, width, margin);
  y -= 20;

  // Payment terms
  page.drawText("Payment Terms:", { x: margin, y, size: 10, font: bold });
  page.drawText("Net 30", { x: margin + 100, y, size: 10, font: regular });
  y -= 18;

  page.drawText("Remit To:", { x: margin, y, size: 10, font: bold });
  page.drawText("Schneider National, PO Box 2545, Green Bay, WI 54306", {
    x: margin + 65,
    y,
    size: 10,
    font: regular,
  });

  return doc.save();
}

function formatInvoiceDate(): string {
  const now = new Date();
  now.setDate(now.getDate() - 5);
  return now.toISOString().slice(0, 10);
}

/* ------------------------------------------------------------------ */
/*  Main                                                               */
/* ------------------------------------------------------------------ */

async function main() {
  await mkdir(FIXTURES_DIR, { recursive: true });

  const bol = await generateBol();
  const bolPath = path.join(FIXTURES_DIR, "sample-bol.pdf");
  await writeFile(bolPath, bol);
  console.log(`  ✓ ${bolPath} (${bol.length} bytes)`);

  const invoice = await generateInvoice();
  const invoicePath = path.join(FIXTURES_DIR, "sample-invoice.pdf");
  await writeFile(invoicePath, invoice);
  console.log(`  ✓ ${invoicePath} (${invoice.length} bytes)`);

  console.log("\nDone — fixture PDFs generated.");
}

main().catch((error) => {
  console.error("Failed to generate test docs:", error);
  process.exit(1);
});
