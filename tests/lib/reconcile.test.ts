import { defaultDevStore } from "@/lib/demo-data";
import { reconcileShipment } from "@/lib/pipeline/reconcile";

describe("reconciliation engine", () => {
  it("marks a shipment red when invoice discrepancies are material", () => {
    // Find a "disputed" shipment with red discrepancy level that has an invoice with accessorials
    const disputedShipment = defaultDevStore.shipments.find(
      (s) => s.status === "disputed" && s.discrepancy_level === "red"
    );
    expect(disputedShipment).toBeDefined();

    // Find the invoice document linked to this shipment
    const invoiceLink = defaultDevStore.shipment_documents.find(
      (link) => link.shipment_id === disputedShipment!.id && link.role === "invoice"
    );
    expect(invoiceLink).toBeDefined();

    const document = defaultDevStore.documents.find((d) => d.id === invoiceLink!.document_id);
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
    const hasRedDiscrepancy = result.discrepancies.some((item) => item.severity === "red");
    expect(hasRedDiscrepancy).toBe(true);
  });
});
