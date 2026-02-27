import "server-only";

import type Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";

import { calculateAnthropicCostCents } from "@/lib/ai/costs";
import { getAnthropicClient } from "@/lib/ai/client";

export interface VisionPageImage {
  mediaType: "image/png" | "image/jpeg" | "image/gif" | "image/webp";
  data: string;
  storagePath: string;
}

export interface StructuredVisionResult<T> {
  data: T;
  rawResponse: Record<string, unknown> | null;
  model: string | null;
  costCents: number;
}

function toImageBlock(image: VisionPageImage): Anthropic.Messages.ImageBlockParam {
  return {
    type: "image",
    source: {
      type: "base64",
      media_type: image.mediaType,
      data: image.data
    }
  };
}

export async function runStructuredVisionPrompt<T>(params: {
  prompt: string;
  system: string;
  schema: z.ZodType<T>;
  images: VisionPageImage[];
  model: string;
  mode: "classifier" | "extraction";
  maxTokens: number;
}): Promise<StructuredVisionResult<T>> {
  const client = getAnthropicClient();
  if (!client) {
    throw new Error("ANTHROPIC_API_KEY is not configured.");
  }

  const response = await client.messages.create({
    model: params.model,
    max_tokens: params.maxTokens,
    temperature: 0,
    system: params.system,
    messages: [
      {
        role: "user",
        content: [
          {
            type: "text",
            text: params.prompt
          },
          ...params.images.map(toImageBlock)
        ]
      }
    ],
    tools: [
      {
        name: "submit_result",
        description: "Return the structured JSON result for this document task.",
        input_schema: {
          type: "object",
          additionalProperties: false,
          properties: {
            result: {
              type: "object"
            }
          },
          required: ["result"]
        }
      }
    ],
    tool_choice: {
      type: "tool",
      name: "submit_result"
    }
  });

  const toolUseBlock = response.content.find((block) => block.type === "tool_use");
  if (!toolUseBlock || typeof toolUseBlock.input !== "object" || toolUseBlock.input == null) {
    throw new Error("Anthropic did not return a structured tool response.");
  }

  const parsed = z
    .object({
      result: z.unknown()
    })
    .parse(toolUseBlock.input);

  return {
    data: params.schema.parse(parsed.result),
    rawResponse: JSON.parse(JSON.stringify(response)) as Record<string, unknown>,
    model: params.model,
    costCents: calculateAnthropicCostCents(response.usage, params.mode)
  };
}
