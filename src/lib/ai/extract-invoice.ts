import "server-only";

import { env } from "@/lib/env";
import { loadPrompt } from "@/lib/ai/prompt-loader";
import {
  anthropicExtractionEnvelopeSchema,
  invoiceExtractionSchema,
  normalizeConfidenceMap
} from "@/lib/ai/schemas";
import { runStructuredVisionPrompt, type VisionPageImage } from "@/lib/ai/shared";
import type { DocConfidenceMap, InvoiceExtraction } from "@/types/documents";

function findToken(filename: string, label: string) {
  const match = filename.match(new RegExp(`${label}[-_ ]?([a-z0-9]+)`, "i"));
  return match?.[1]?.toUpperCase() ?? null;
}

function fallbackInvoiceExtraction(filename: string | null, error?: unknown): {
  extracted: InvoiceExtraction;
  confidences: DocConfidenceMap;
  rawResponse: Record<string, unknown> | null;
  model: string | null;
  costCents: number;
} {
  const normalized = filename ?? "";
  const invoiceNumber = findToken(normalized, "invoice");
  const bolNumber = findToken(normalized, "bol");

  return {
    extracted: {
      invoice_number: invoiceNumber ? `INV-${invoiceNumber}` : null,
      invoice_date: null,
      carrier_name: null,
      carrier_scac: null,
      bol_reference: bolNumber ? `BOL-${bolNumber}` : null,
      pro_number: null,
      shipper_reference: null,
      origin: {
        city: null,
        state: null,
        zip: null
      },
      destination: {
        city: null,
        state: null,
        zip: null
      },
      line_items: [],
      subtotal: null,
      fuel_surcharge: null,
      fuel_surcharge_pct: null,
      accessorials: [],
      total_amount: null,
      payment_terms: null,
      remit_to: null,
      notes: null,
      extraction_warnings: [
        "Heuristic extraction fallback used. Configure Anthropic vision extraction for production documents."
      ]
    },
    confidences: {
      invoice_number: invoiceNumber ? 0.8 : 0.2,
      bol_reference: bolNumber ? 0.76 : 0.2
    },
    rawResponse: error ? { fallback: true, error: `${error}` } : { fallback: true },
    model: null,
    costCents: 0
  };
}

export async function extractInvoiceFromDocument(params: {
  filename: string | null;
  pageImages: VisionPageImage[];
}) {
  if (!env.ANTHROPIC_API_KEY || params.pageImages.length === 0) {
    return fallbackInvoiceExtraction(params.filename);
  }

  try {
    const prompt = await loadPrompt("extract-invoice.txt");
    const result = await runStructuredVisionPrompt({
      prompt,
      system:
        "You extract structured data from freight invoices. Preserve exact charges and references, and do not infer.",
      schema: anthropicExtractionEnvelopeSchema(invoiceExtractionSchema),
      images: params.pageImages,
      model: env.ANTHROPIC_EXTRACTION_MODEL || "claude-sonnet-4-5-latest",
      mode: "extraction",
      maxTokens: 2600
    });

    return {
      extracted: result.data.fields,
      confidences: normalizeConfidenceMap(result.data.field_confidences),
      rawResponse: result.rawResponse,
      model: result.model,
      costCents: result.costCents
    };
  } catch (error) {
    return fallbackInvoiceExtraction(params.filename, error);
  }
}
