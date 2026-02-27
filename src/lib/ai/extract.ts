import "server-only";

import { extractBolFromDocument } from "@/lib/ai/extract-bol";
import { extractInvoiceFromDocument } from "@/lib/ai/extract-invoice";
import { extractPodFromDocument } from "@/lib/ai/extract-pod";
import { extractRateConFromDocument } from "@/lib/ai/extract-rate-con";
import { normalizeConfidenceMap } from "@/lib/ai/schemas";
import type { VisionPageImage } from "@/lib/ai/shared";
import type { DocumentType, DocConfidenceMap, ExtractedFields } from "@/types/documents";

export async function extractFieldsFromDocument(params: {
  docType: DocumentType;
  filename: string | null;
  pageImages: VisionPageImage[];
}): Promise<{
  extracted: ExtractedFields;
  confidences: DocConfidenceMap;
  rawResponse: Record<string, unknown> | null;
  model: string | null;
  costCents: number;
}> {
  switch (params.docType) {
    case "bol":
      return extractBolFromDocument(params);
    case "invoice":
      return extractInvoiceFromDocument(params);
    case "rate_con":
      return extractRateConFromDocument(params);
    case "pod":
      return extractPodFromDocument(params);
    default:
      return {
        extracted: {
          extraction_warnings: [
            "Document type is unknown. Manual review is required before reliable reconciliation."
          ]
        },
        confidences: normalizeConfidenceMap({
          overall: 0.1
        }),
        rawResponse: {
          fallback: true
        },
        model: null,
        costCents: 0
      };
  }
}
