import "server-only";

import type Anthropic from "@anthropic-ai/sdk";

import { env } from "@/lib/env";

export function calculateAnthropicCostCents(
  usage: Anthropic.Messages.Usage | undefined,
  mode: "classifier" | "extraction"
) {
  if (!usage) {
    return 0;
  }

  const inputRate =
    mode === "classifier"
      ? env.ANTHROPIC_CLASSIFIER_INPUT_COST_PER_MILLION_TOKENS
      : env.ANTHROPIC_EXTRACTION_INPUT_COST_PER_MILLION_TOKENS;
  const outputRate =
    mode === "classifier"
      ? env.ANTHROPIC_CLASSIFIER_OUTPUT_COST_PER_MILLION_TOKENS
      : env.ANTHROPIC_EXTRACTION_OUTPUT_COST_PER_MILLION_TOKENS;
  const inputTokenCount =
    usage.input_tokens + (usage.cache_creation_input_tokens ?? 0) + (usage.cache_read_input_tokens ?? 0);
  const outputTokenCount = usage.output_tokens;

  const totalCents =
    (inputTokenCount * inputRate) / 1_000_000 + (outputTokenCount * outputRate) / 1_000_000;

  return Number(totalCents.toFixed(4));
}
