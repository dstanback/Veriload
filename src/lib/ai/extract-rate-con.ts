import "server-only";

import { env } from "@/lib/env";
import { loadPrompt } from "@/lib/ai/prompt-loader";
import {
  anthropicExtractionEnvelopeSchema,
  normalizeConfidenceMap,
  rateConExtractionSchema
} from "@/lib/ai/schemas";
import { runStructuredVisionPrompt, type VisionPageImage } from "@/lib/ai/shared";
import type { DocConfidenceMap, RateConExtraction } from "@/types/documents";

function fallbackRateConExtraction(filename: string | null, error?: unknown): {
  extracted: RateConExtraction;
  confidences: DocConfidenceMap;
  rawResponse: Record<string, unknown> | null;
  model: string | null;
  costCents: number;
} {
  return {
    extracted: {
      rate_con_number: filename?.replace(/\.[^.]+$/, "").toUpperCase() ?? null,
      carrier_name: null,
      carrier_scac: null,
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
      agreed_rate: null,
      fuel_surcharge_pct: null,
      accessorial_schedule: [],
      effective_date: null,
      equipment_type: null,
      extraction_warnings: [
        "Heuristic extraction fallback used. Configure Anthropic vision extraction for production documents."
      ]
    },
    confidences: {
      rate_con_number: filename ? 0.7 : 0.2
    },
    rawResponse: error ? { fallback: true, error: `${error}` } : { fallback: true },
    model: null,
    costCents: 0
  };
}

export async function extractRateConFromDocument(params: {
  filename: string | null;
  pageImages: VisionPageImage[];
}) {
  if (!env.ANTHROPIC_API_KEY || params.pageImages.length === 0) {
    return fallbackRateConExtraction(params.filename);
  }

  try {
    const prompt = await loadPrompt("extract-rate-con.txt");
    const result = await runStructuredVisionPrompt({
      prompt,
      system:
        "You extract structured data from freight rate confirmations. Preserve approved rates and accessorial schedules exactly.",
      schema: anthropicExtractionEnvelopeSchema(rateConExtractionSchema),
      images: params.pageImages,
      model: env.ANTHROPIC_EXTRACTION_MODEL || "claude-sonnet-4-5-latest",
      mode: "extraction",
      maxTokens: 2200
    });

    return {
      extracted: result.data.fields,
      confidences: normalizeConfidenceMap(result.data.field_confidences),
      rawResponse: result.rawResponse,
      model: result.model,
      costCents: result.costCents
    };
  } catch (error) {
    return fallbackRateConExtraction(params.filename, error);
  }
}
