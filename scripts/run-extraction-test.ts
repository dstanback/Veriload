import { basename, extname } from "node:path";
import { readFile } from "node:fs/promises";
import { randomUUID } from "node:crypto";

import { processDocument } from "@/lib/pipeline/process-document";
import { saveFile } from "@/lib/storage";

async function main() {
  const inputPath = process.argv[2];

  if (!inputPath) {
    throw new Error("Usage: npx tsx scripts/run-extraction-test.ts <path-to-pdf-or-image>");
  }

  const buffer = await readFile(inputPath);
  const filename = basename(inputPath);
  const extension = extname(filename).toLowerCase();
  const mimeType =
    extension === ".pdf"
      ? "application/pdf"
      : extension === ".png"
        ? "image/png"
        : extension === ".jpg" || extension === ".jpeg"
          ? "image/jpeg"
          : "application/octet-stream";
  const storagePath = `raw/test/${randomUUID()}/${filename}`;

  await saveFile(storagePath, buffer, mimeType);

  const sample = await processDocument({
    organizationId: randomUUID(),
    source: "upload",
    sourceMetadata: {
      runner: "script",
      localPath: inputPath
    },
    originalFilename: filename,
    storagePath,
    mimeType
  });

  console.log(JSON.stringify(sample, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
