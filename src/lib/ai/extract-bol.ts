import "server-only";

import { env } from "@/lib/env";
import { loadPrompt } from "@/lib/ai/prompt-loader";
import {
  anthropicExtractionEnvelopeSchema,
  bolExtractionSchema,
  normalizeConfidenceMap
} from "@/lib/ai/schemas";
import { runStructuredVisionPrompt, type VisionPageImage } from "@/lib/ai/shared";
import type { BolExtraction, DocConfidenceMap } from "@/types/documents";

function findToken(filename: string, label: string) {
  const match = filename.match(new RegExp(`${label}[-_ ]?([a-z0-9]+)`, "i"));
  return match?.[1]?.toUpperCase() ?? null;
}

function fallbackBolExtraction(filename: string | null, error?: unknown): {
  extracted: BolExtraction;
  confidences: DocConfidenceMap;
  rawResponse: Record<string, unknown> | null;
  model: string | null;
  costCents: number;
} {
  const normalized = filename ?? "";
  const bolNumber = findToken(normalized, "bol");

  return {
    extracted: {
      bol_number: bolNumber ? `BOL-${bolNumber}` : null,
      shipper_name: null,
      shipper_address: null,
      consignee_name: null,
      consignee_address: null,
      carrier_name: null,
      carrier_scac: null,
      pickup_date: null,
      delivery_date: null,
      pieces: null,
      weight: null,
      weight_unit: null,
      commodity_description: null,
      reference_numbers: [],
      hazmat_flag: null,
      special_instructions: null,
      extraction_warnings: [
        "Heuristic extraction fallback used. Configure Anthropic vision extraction for production documents."
      ]
    },
    confidences: {
      bol_number: bolNumber ? 0.78 : 0.15
    },
    rawResponse: error ? { fallback: true, error: `${error}` } : { fallback: true },
    model: null,
    costCents: 0
  };
}

export async function extractBolFromDocument(params: {
  filename: string | null;
  pageImages: VisionPageImage[];
}) {
  if (!env.ANTHROPIC_API_KEY || params.pageImages.length === 0) {
    return fallbackBolExtraction(params.filename);
  }

  try {
    const prompt = await loadPrompt("extract-bol.txt");
    const result = await runStructuredVisionPrompt({
      prompt,
      system:
        "You extract structured data from logistics Bills of Lading. Do not infer missing values.",
      schema: anthropicExtractionEnvelopeSchema(bolExtractionSchema),
      images: params.pageImages,
      model: env.ANTHROPIC_EXTRACTION_MODEL || "claude-sonnet-4-5-latest",
      mode: "extraction",
      maxTokens: 1800
    });

    return {
      extracted: result.data.fields,
      confidences: normalizeConfidenceMap(result.data.field_confidences),
      rawResponse: result.rawResponse,
      model: result.model,
      costCents: result.costCents
    };
  } catch (error) {
    return fallbackBolExtraction(params.filename, error);
  }
}
