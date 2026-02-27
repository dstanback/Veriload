import { defaultDevStore } from "@/lib/demo-data";
import { reconcileShipment } from "@/lib/pipeline/reconcile";

describe("reconciliation engine", () => {
  it("marks a shipment red when invoice discrepancies are material", () => {
    const document = defaultDevStore.documents.find((item) => item.id === "doc_invoice_2");
    expect(document).toBeDefined();

    const result = reconcileShipment({
      organizationId: "org_demo",
      existingShipments: defaultDevStore.shipments,
      existingLinks: defaultDevStore.shipment_documents,
      existingDocuments: defaultDevStore.documents,
      existingDiscrepancies: defaultDevStore.discrepancies,
      document: document!
    });

    expect(result.shipment.discrepancy_level).toBe("red");
    expect(result.discrepancies.some((item) => item.field_name === "accessorials" && item.severity === "red")).toBe(true);
  });
});
