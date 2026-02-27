import { classifyDocument } from "@/lib/ai/classify";
import { extractFieldsFromDocument } from "@/lib/ai/extract";

describe("document extraction heuristics", () => {
  it("classifies invoices from filenames", async () => {
    const result = await classifyDocument({
      filename: "carrier_invoice_90022.pdf",
      mimeType: "application/pdf",
      pageImages: []
    });

    expect(result.doc_type).toBe("invoice");
    expect(result.confidence).toBeGreaterThan(0.8);
  });

  it("extracts a BoL reference from filenames", async () => {
    const result = await extractFieldsFromDocument({
      docType: "invoice",
      filename: "atlas_invoice_bol_77104.pdf",
      pageImages: []
    });

    expect("bol_reference" in result.extracted && result.extracted.bol_reference).toBe("BOL-77104");
  });
});
