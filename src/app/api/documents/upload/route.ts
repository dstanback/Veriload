import { randomUUID } from "node:crypto";
import path from "node:path";

import { NextResponse } from "next/server";

import { ingestUpload } from "@/lib/repository";
import { saveFile } from "@/lib/storage";

export const runtime = "nodejs";

const MAX_UPLOAD_BYTES = 25 * 1024 * 1024;

const ALLOWED_TYPES = new Set([
  "application/pdf",
  "image/png",
  "image/jpeg",
  "image/tiff"
]);

function isAllowedFileType(file: File): boolean {
  if (ALLOWED_TYPES.has(file.type)) return true;
  const ext = file.name.toLowerCase().split(".").pop();
  return ext === "pdf" || ext === "png" || ext === "jpg" || ext === "jpeg" || ext === "tiff" || ext === "tif";
}

export async function POST(request: Request) {
  const formData = await request.formData();
  const files = formData.getAll("files").filter((value): value is File => value instanceof File);
  const referenceNumber = `${formData.get("referenceNumber") ?? ""}`.trim() || null;

  if (files.length === 0) {
    return NextResponse.json({ error: "No files provided." }, { status: 400 });
  }

  const results = [];

  for (const file of files) {
    if (file.size > MAX_UPLOAD_BYTES) {
      results.push({
        filename: file.name,
        error: `File exceeds the 25 MB limit (${(file.size / 1024 / 1024).toFixed(1)} MB).`,
        document: null,
        shipment: null
      });
      continue;
    }

    if (!isAllowedFileType(file)) {
      results.push({
        filename: file.name,
        error: `Unsupported file type: ${file.type || "unknown"}. Accepted: PDF, PNG, JPG, TIFF.`,
        document: null,
        shipment: null
      });
      continue;
    }

    try {
      const documentId = randomUUID();
      const storagePath = path.posix.join("raw", documentId, file.name);
      await saveFile(storagePath, Buffer.from(await file.arrayBuffer()), file.type || "application/octet-stream");

      const result = await ingestUpload({
        filename: file.name,
        mimeType: file.type || "application/octet-stream",
        storagePath,
        size: file.size,
        referenceNumber
      });

      results.push({
        filename: file.name,
        error: null,
        ...result
      });
    } catch (err) {
      results.push({
        filename: file.name,
        error: err instanceof Error ? err.message : "Processing failed unexpectedly.",
        document: null,
        shipment: null
      });
    }
  }

  return NextResponse.json({ results });
}
