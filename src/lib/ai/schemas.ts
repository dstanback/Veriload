import { z } from "zod";

import type {
  BolExtraction,
  DocConfidenceMap,
  InvoiceExtraction,
  PodExtraction,
  RateConExtraction
} from "@/types/documents";

export const classificationSchema = z.object({
  doc_type: z.enum(["bol", "invoice", "rate_con", "pod", "accessorial", "unknown"]),
  confidence: z.number().min(0).max(1),
  reasoning: z.string().min(1)
});

const locationSchema = z.object({
  city: z.string().nullable(),
  state: z.string().nullable(),
  zip: z.string().nullable()
});

const accessorialSchema = z.object({
  code: z.string().nullable(),
  description: z.string(),
  amount: z.number()
});

const invoiceLineItemSchema = z.object({
  description: z.string(),
  pieces: z.number().nullable(),
  weight: z.number().nullable(),
  weight_unit: z.string().nullable(),
  rate: z.number().nullable(),
  amount: z.number().nullable()
});

export const invoiceExtractionSchema = z.object({
  invoice_number: z.string().nullable(),
  invoice_date: z.string().nullable(),
  carrier_name: z.string().nullable(),
  carrier_scac: z.string().nullable(),
  bol_reference: z.string().nullable(),
  pro_number: z.string().nullable(),
  shipper_reference: z.string().nullable(),
  origin: locationSchema,
  destination: locationSchema,
  line_items: z.array(invoiceLineItemSchema),
  subtotal: z.number().nullable(),
  fuel_surcharge: z.number().nullable(),
  fuel_surcharge_pct: z.number().nullable(),
  accessorials: z.array(accessorialSchema),
  total_amount: z.number().nullable(),
  payment_terms: z.string().nullable(),
  remit_to: z.string().nullable(),
  notes: z.string().nullable(),
  extraction_warnings: z.array(z.string())
}) satisfies z.ZodType<InvoiceExtraction>;

export const bolExtractionSchema = z.object({
  bol_number: z.string().nullable(),
  shipper_name: z.string().nullable(),
  shipper_address: z.string().nullable(),
  consignee_name: z.string().nullable(),
  consignee_address: z.string().nullable(),
  carrier_name: z.string().nullable(),
  carrier_scac: z.string().nullable(),
  pickup_date: z.string().nullable(),
  delivery_date: z.string().nullable(),
  pieces: z.number().nullable(),
  weight: z.number().nullable(),
  weight_unit: z.string().nullable(),
  commodity_description: z.string().nullable(),
  reference_numbers: z.array(z.string()),
  hazmat_flag: z.boolean().nullable(),
  special_instructions: z.string().nullable(),
  extraction_warnings: z.array(z.string())
}) satisfies z.ZodType<BolExtraction>;

export const rateConExtractionSchema = z.object({
  rate_con_number: z.string().nullable(),
  carrier_name: z.string().nullable(),
  carrier_scac: z.string().nullable(),
  origin: locationSchema,
  destination: locationSchema,
  agreed_rate: z.number().nullable(),
  fuel_surcharge_pct: z.number().nullable(),
  accessorial_schedule: z.array(
    z.object({
      code: z.string().nullable(),
      description: z.string(),
      amount: z.number().nullable()
    })
  ),
  effective_date: z.string().nullable(),
  equipment_type: z.string().nullable(),
  extraction_warnings: z.array(z.string())
}) satisfies z.ZodType<RateConExtraction>;

export const podExtractionSchema = z.object({
  bol_reference: z.string().nullable(),
  delivery_date: z.string().nullable(),
  delivery_time: z.string().nullable(),
  receiver_signature: z.enum(["present", "absent"]).nullable(),
  receiver_name: z.string().nullable(),
  exception_notes: z.string().nullable(),
  piece_count_confirmed: z.number().nullable(),
  damage_notes: z.string().nullable(),
  extraction_warnings: z.array(z.string())
}) satisfies z.ZodType<PodExtraction>;

export const unknownExtractionSchema = z.object({
  extraction_warnings: z.array(z.string())
});

export const anthropicExtractionEnvelopeSchema = <T extends z.ZodTypeAny>(fields: T) =>
  z.object({
    fields,
    field_confidences: z.record(z.any()).nullable().default({})
  });

export function normalizeConfidenceMap(value: unknown): DocConfidenceMap {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }

  const result: DocConfidenceMap = {};

  for (const [key, entry] of Object.entries(value)) {
    if (typeof entry === "number" || entry === null) {
      result[key] = entry;
      continue;
    }

    if (typeof entry === "object" && !Array.isArray(entry)) {
      result[key] = normalizeConfidenceMap(entry);
    }
  }

  return result;
}
