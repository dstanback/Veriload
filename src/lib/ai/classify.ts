import "server-only";

import { env } from "@/lib/env";
import { loadPrompt } from "@/lib/ai/prompt-loader";
import { classificationSchema } from "@/lib/ai/schemas";
import { runStructuredVisionPrompt, type VisionPageImage } from "@/lib/ai/shared";
import type { DocumentType } from "@/types/documents";

const keywordMap: Array<{ type: DocumentType; patterns: RegExp[] }> = [
  { type: "bol", patterns: [/bill[\s_-]*of[\s_-]*lading/i, /(^|[\W_])bol($|[\W_])/i] },
  { type: "invoice", patterns: [/(^|[\W_])invoice($|[\W_])/i, /\bfreight[\s_-]*bill\b/i] },
  { type: "rate_con", patterns: [/rate[\s_-]*(confirmation|con)/i, /\brc[-_ ]?\d+/i] },
  { type: "pod", patterns: [/proof[\s_-]*of[\s_-]*delivery/i, /(^|[\W_])pod($|[\W_])/i] },
  { type: "accessorial", patterns: [/accessorial/i, /\bdet\b/i, /\btonu\b/i] }
];

export interface ClassificationResult {
  doc_type: DocumentType;
  confidence: number;
  reasoning: string;
  rawResponse: Record<string, unknown> | null;
  model: string | null;
  costCents: number;
}

function fallbackClassification(params: {
  filename: string | null;
  mimeType: string;
  sourceText?: string;
  error?: unknown;
}): ClassificationResult {
  const text = [params.filename, params.sourceText].filter(Boolean).join(" ");

  for (const entry of keywordMap) {
    if (entry.patterns.some((pattern) => pattern.test(text))) {
      return {
        doc_type: entry.type,
        confidence: 0.92,
        reasoning: `Fallback heuristic matched filename or metadata keywords for ${entry.type}.`,
        rawResponse: params.error
          ? { fallback: true, error: `${params.error}` }
          : { fallback: true },
        model: null,
        costCents: 0
      };
    }
  }

  if (params.mimeType.startsWith("image/")) {
    return {
      doc_type: "pod",
      confidence: 0.55,
      reasoning: "Fallback heuristic treated image upload as a likely POD.",
      rawResponse: params.error ? { fallback: true, error: `${params.error}` } : { fallback: true },
      model: null,
      costCents: 0
    };
  }

  return {
    doc_type: "unknown",
    confidence: 0.42,
    reasoning: "Fallback heuristic could not determine the document type.",
    rawResponse: params.error ? { fallback: true, error: `${params.error}` } : { fallback: true },
    model: null,
    costCents: 0
  };
}

export async function classifyDocument(params: {
  filename: string | null;
  mimeType: string;
  pageImages: VisionPageImage[];
  sourceText?: string;
}): Promise<ClassificationResult> {
  if (!env.ANTHROPIC_API_KEY || params.pageImages.length === 0) {
    return fallbackClassification(params);
  }

  try {
    const prompt = await loadPrompt("classify-document.txt");
    const result = await runStructuredVisionPrompt({
      prompt,
      system:
        "You classify freight operations documents. Return exactly one category and a confidence score.",
      schema: classificationSchema,
      images: params.pageImages.slice(0, 2),
      model: env.ANTHROPIC_CLASSIFIER_MODEL || "claude-3-5-haiku-latest",
      mode: "classifier",
      maxTokens: 512
    });

    return {
      ...result.data,
      rawResponse: result.rawResponse,
      model: result.model,
      costCents: result.costCents
    };
  } catch (error) {
    return fallbackClassification({
      ...params,
      error
    });
  }
}
