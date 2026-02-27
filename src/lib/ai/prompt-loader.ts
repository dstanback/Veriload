import "server-only";

import { readFile } from "node:fs/promises";
import path from "node:path";

const promptDirectory = path.resolve(process.cwd(), "src/prompts");
const promptCache = new Map<string, Promise<string>>();

export async function loadPrompt(filename: string) {
  if (!promptCache.has(filename)) {
    promptCache.set(filename, readFile(path.join(promptDirectory, filename), "utf8"));
  }

  return promptCache.get(filename)!;
}
