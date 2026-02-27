import { parseInboundEmail } from "@/lib/email/parse-inbound";

describe("inbound email parsing", () => {
  it("filters out tiny inline files and keeps valid attachments", async () => {
    const formData = new FormData();
    formData.set("to", "docs@acme.veriload.local");
    formData.set("from", "ops@example.com");
    formData.set("subject", "Docs");
    formData.set("attachments", "2");
    formData.set(
      "attachment1",
      new File([Buffer.alloc(12_000)], "invoice.pdf", { type: "application/pdf" })
    );
    formData.set(
      "attachment2",
      new File([Buffer.alloc(500)], "logo.png", { type: "image/png" })
    );

    const result = await parseInboundEmail(formData);

    expect(result.attachments).toHaveLength(1);
    expect(result.attachments[0]?.filename).toBe("invoice.pdf");
  });
});
