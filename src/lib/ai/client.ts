import "server-only";

import Anthropic from "@anthropic-ai/sdk";

import { env } from "@/lib/env";

let cachedClient: Anthropic | null = null;

export function getAnthropicClient() {
  if (!env.ANTHROPIC_API_KEY) {
    return null;
  }

  if (!cachedClient) {
    cachedClient = new Anthropic({
      apiKey: env.ANTHROPIC_API_KEY
    });
  }

  return cachedClient;
}
