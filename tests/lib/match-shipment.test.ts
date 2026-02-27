import { matchDocumentToShipment } from "@/lib/pipeline/match-shipment";
import { defaultDevStore } from "@/lib/demo-data";

describe("shipment matching", () => {
  it("matches on exact BoL number", () => {
    const document = defaultDevStore.documents.find((item) => item.id === "doc_invoice_1");
    expect(document).toBeDefined();

    const result = matchDocumentToShipment({
      document: document!,
      existingShipments: defaultDevStore.shipments
    });

    expect(result.shipment.id).toBe("shp_1");
    expect(result.created).toBe(false);
    expect(result.confidence).toBeGreaterThan(90);
  });
});
