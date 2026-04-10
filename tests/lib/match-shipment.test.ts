import { matchDocumentToShipment } from "@/lib/pipeline/match-shipment";
import { defaultDevStore } from "@/lib/demo-data";

describe("shipment matching", () => {
  it("matches on exact BoL number", () => {
    // Find an invoice document that references a BOL with an existing shipment
    const document = defaultDevStore.documents.find(
      (item) => item.doc_type === "invoice" && item.status === "extracted"
    );
    expect(document).toBeDefined();

    const extracted = document!.extracted_data?.extracted_fields;
    expect(extracted).toBeDefined();
    expect("bol_reference" in extracted!).toBe(true);

    const bolRef = "bol_reference" in extracted! ? (extracted as { bol_reference: string }).bol_reference : null;
    const expectedShipment = defaultDevStore.shipments.find((s) => s.bol_number === bolRef);
    expect(expectedShipment).toBeDefined();

    const result = matchDocumentToShipment({
      document: document!,
      existingShipments: defaultDevStore.shipments
    });

    expect(result.shipment.id).toBe(expectedShipment!.id);
    expect(result.created).toBe(false);
    expect(result.confidence).toBeGreaterThan(90);
  });
});
