import "server-only";

import { env } from "@/lib/env";
import { loadPrompt } from "@/lib/ai/prompt-loader";
import {
  anthropicExtractionEnvelopeSchema,
  normalizeConfidenceMap,
  podExtractionSchema
} from "@/lib/ai/schemas";
import { runStructuredVisionPrompt, type VisionPageImage } from "@/lib/ai/shared";
import type { DocConfidenceMap, PodExtraction } from "@/types/documents";

function findToken(filename: string, label: string) {
  const match = filename.match(new RegExp(`${label}[-_ ]?([a-z0-9]+)`, "i"));
  return match?.[1]?.toUpperCase() ?? null;
}

function fallbackPodExtraction(filename: string | null, error?: unknown): {
  extracted: PodExtraction;
  confidences: DocConfidenceMap;
  rawResponse: Record<string, unknown> | null;
  model: string | null;
  costCents: number;
} {
  const normalized = filename ?? "";
  const bolNumber = findToken(normalized, "bol");

  return {
    extracted: {
      bol_reference: bolNumber ? `BOL-${bolNumber}` : null,
      delivery_date: null,
      delivery_time: null,
      receiver_signature: null,
      receiver_name: null,
      exception_notes: null,
      piece_count_confirmed: null,
      damage_notes: null,
      extraction_warnings: [
        "Heuristic extraction fallback used. Configure Anthropic vision extraction for production documents."
      ]
    },
    confidences: {
      bol_reference: bolNumber ? 0.75 : 0.18
    },
    rawResponse: error ? { fallback: true, error: `${error}` } : { fallback: true },
    model: null,
    costCents: 0
  };
}

export async function extractPodFromDocument(params: {
  filename: string | null;
  pageImages: VisionPageImage[];
}) {
  if (!env.ANTHROPIC_API_KEY || params.pageImages.length === 0) {
    return fallbackPodExtraction(params.filename);
  }

  try {
    const prompt = await loadPrompt("extract-pod.txt");
    const result = await runStructuredVisionPrompt({
      prompt,
      system:
        "You extract structured data from proof of delivery documents. Do not infer absent signatures or notes.",
      schema: anthropicExtractionEnvelopeSchema(podExtractionSchema),
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
    return fallbackPodExtraction(params.filename, error);
  }
}
