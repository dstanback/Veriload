import { buildCsvHeader, escapeCsvValue, formatShipmentCsvRow } from "@/lib/export";
import type { ShipmentDetail } from "@/types/shipments";

describe("escapeCsvValue", () => {
  it("returns empty string for null", () => {
    expect(escapeCsvValue(null)).toBe("");
  });

  it("returns empty string for undefined", () => {
    expect(escapeCsvValue(undefined)).toBe("");
  });

  it("returns empty string for empty string", () => {
    expect(escapeCsvValue("")).toBe("");
  });

  it("passes through simple values unchanged", () => {
    expect(escapeCsvValue("hello")).toBe("hello");
    expect(escapeCsvValue("12345")).toBe("12345");
  });

  it("wraps values containing commas in double quotes", () => {
    expect(escapeCsvValue("Atlas Freight, Inc.")).toBe('"Atlas Freight, Inc."');
  });

  it("wraps values containing double quotes and escapes them", () => {
    expect(escapeCsvValue('The "Best" Carrier')).toBe('"The ""Best"" Carrier"');
  });

  it("wraps values containing newlines", () => {
    expect(escapeCsvValue("line1\nline2")).toBe('"line1\nline2"');
  });

  it("wraps values containing carriage returns", () => {
    expect(escapeCsvValue("line1\rline2")).toBe('"line1\rline2"');
  });

  it("handles combined special characters", () => {
    expect(escapeCsvValue('value, with "quotes" and\nnewline')).toBe(
      '"value, with ""quotes"" and\nnewline"',
    );
  });
});

describe("buildCsvHeader", () => {
  it("returns a line ending with CRLF", () => {
    const header = buildCsvHeader();
    expect(header.endsWith("\r\n")).toBe(true);
  });

  it("contains all expected columns in order", () => {
    const header = buildCsvHeader();
    const columns = header.trimEnd().split(",");
    expect(columns).toEqual([
      "Shipment Ref",
      "BOL#",
      "PRO#",
      "Carrier",
      "SCAC",
      "Origin",
      "Destination",
      "Shipper",
      "Consignee",
      "Invoice Total",
      "Rate Con Total",
      "Variance Amount",
      "Variance %",
      "Status",
      "Discrepancy Level",
      "Match Confidence",
      "Document Count",
      "Created Date",
      "Resolved Date",
    ]);
  });

  it("has exactly 19 columns", () => {
    const header = buildCsvHeader();
    const columns = header.trimEnd().split(",");
    expect(columns.length).toBe(19);
  });
});

describe("formatShipmentCsvRow", () => {
  function makeShipment(overrides?: Partial<ShipmentDetail>): ShipmentDetail {
    return {
      id: "shp_1",
      organization_id: "org_1",
      shipment_ref: "REF-001",
      bol_number: "BOL-123",
      pro_number: "PRO-456",
      carrier_name: "Atlas Freight",
      carrier_scac: "ATLF",
      origin: "Chicago, IL",
      destination: "Dallas, TX",
      shipper_name: "Acme Corp",
      consignee_name: "Widget Inc",
      status: "approved",
      match_confidence: 95.5,
      discrepancy_level: "yellow",
      created_at: "2026-03-15T14:30:00.000Z",
      updated_at: "2026-03-16T10:00:00.000Z",
      documents: [],
      discrepancies: [],
      ...overrides,
    };
  }

  it("produces a row ending with CRLF", () => {
    const row = formatShipmentCsvRow(makeShipment());
    expect(row.endsWith("\r\n")).toBe(true);
  });

  it("produces 19 columns matching the header count", () => {
    // Use values without commas to allow simple split-based counting
    const row = formatShipmentCsvRow(
      makeShipment({ origin: "Chicago IL", destination: "Dallas TX" }),
    );
    const headerCount = buildCsvHeader().trimEnd().split(",").length;
    const rowCount = row.trimEnd().split(",").length;
    expect(rowCount).toBe(headerCount);
  });

  it("includes shipment reference and carrier name", () => {
    const row = formatShipmentCsvRow(makeShipment());
    expect(row).toContain("REF-001");
    expect(row).toContain("Atlas Freight");
  });

  it("handles null fields gracefully", () => {
    const row = formatShipmentCsvRow(
      makeShipment({
        shipment_ref: null,
        bol_number: null,
        pro_number: null,
        carrier_name: null,
        carrier_scac: null,
        origin: null,
        destination: null,
        shipper_name: null,
        consignee_name: null,
        match_confidence: null,
        discrepancy_level: null,
      }),
    );
    // Row should still have 19 columns (some empty)
    const count = row.trimEnd().split(",").length;
    expect(count).toBe(19);
    // Should not throw or produce "null"/"undefined" text
    expect(row).not.toContain("null");
    expect(row).not.toContain("undefined");
  });

  it("escapes carrier names containing commas", () => {
    const row = formatShipmentCsvRow(
      makeShipment({ carrier_name: "Atlas Freight, Inc." }),
    );
    expect(row).toContain('"Atlas Freight, Inc."');
  });

  it("formats dates as YYYY-MM-DD", () => {
    const row = formatShipmentCsvRow(
      makeShipment({ created_at: "2026-03-15T14:30:00.000Z" }),
    );
    expect(row).toContain("2026-03-15");
  });

  it("includes resolved date from discrepancies", () => {
    const row = formatShipmentCsvRow(
      makeShipment({
        discrepancies: [
          {
            id: "d1",
            shipment_id: "shp_1",
            field_name: "total_amount",
            source_doc_id: null,
            compare_doc_id: null,
            source_value: "1000",
            compare_value: "1200",
            variance_amount: 200,
            variance_pct: 0.2,
            severity: "red",
            resolution: "disputed",
            resolved_by: null,
            resolved_at: "2026-03-20T10:00:00.000Z",
            notes: null,
            created_at: "2026-03-15T14:30:00.000Z",
          },
        ],
      }),
    );
    expect(row).toContain("2026-03-20");
    expect(row).toContain("200.00");
  });

  it("computes variance from multiple discrepancies", () => {
    const row = formatShipmentCsvRow(
      makeShipment({
        discrepancies: [
          {
            id: "d1",
            shipment_id: "shp_1",
            field_name: "total_amount",
            source_doc_id: null,
            compare_doc_id: null,
            source_value: "1000",
            compare_value: "1200",
            variance_amount: 200,
            variance_pct: 0.2,
            severity: "red",
            resolution: null,
            resolved_by: null,
            resolved_at: null,
            notes: null,
            created_at: "2026-03-15T14:30:00.000Z",
          },
          {
            id: "d2",
            shipment_id: "shp_1",
            field_name: "fuel_surcharge",
            source_doc_id: null,
            compare_doc_id: null,
            source_value: "50",
            compare_value: "100",
            variance_amount: -50,
            variance_pct: 1.0,
            severity: "yellow",
            resolution: null,
            resolved_by: null,
            resolved_at: null,
            notes: null,
            created_at: "2026-03-15T14:30:00.000Z",
          },
        ],
      }),
    );
    // 200 + 50 (abs) = 250
    expect(row).toContain("250.00");
    // average variance pct: (0.2 + 1.0) / 2 = 0.6 = 60.0%
    expect(row).toContain("60.0%");
  });

  it("extracts invoice and rate con totals from documents", () => {
    const row = formatShipmentCsvRow(
      makeShipment({
        documents: [
          {
            id: "doc_1",
            organization_id: "org_1",
            source: "upload",
            source_metadata: {},
            original_filename: "invoice.pdf",
            storage_path: "/docs/invoice.pdf",
            mime_type: "application/pdf",
            page_count: 1,
            status: "processed",
            doc_type: "invoice",
            doc_type_confidence: 0.98,
            processing_error: null,
            created_at: "2026-03-15T14:30:00.000Z",
            processed_at: "2026-03-15T14:31:00.000Z",
            extracted_data: {
              id: "ext_1",
              document_id: "doc_1",
              doc_type: "invoice",
              extracted_fields: { total_amount: 5250.0 },
              field_confidences: null,
              raw_llm_response: null,
              extraction_model: null,
              extraction_cost_cents: null,
              created_at: "2026-03-15T14:31:00.000Z",
            },
            role: "invoice",
          },
          {
            id: "doc_2",
            organization_id: "org_1",
            source: "upload",
            source_metadata: {},
            original_filename: "ratecon.pdf",
            storage_path: "/docs/ratecon.pdf",
            mime_type: "application/pdf",
            page_count: 1,
            status: "processed",
            doc_type: "rate_con",
            doc_type_confidence: 0.95,
            processing_error: null,
            created_at: "2026-03-15T14:30:00.000Z",
            processed_at: "2026-03-15T14:31:00.000Z",
            extracted_data: {
              id: "ext_2",
              document_id: "doc_2",
              doc_type: "rate_con",
              extracted_fields: { total_amount: 5000.0 },
              field_confidences: null,
              raw_llm_response: null,
              extraction_model: null,
              extraction_cost_cents: null,
              created_at: "2026-03-15T14:31:00.000Z",
            },
            role: "rate_con",
          },
        ],
      }),
    );
    expect(row).toContain("5250.00");
    expect(row).toContain("5000.00");
  });
});
