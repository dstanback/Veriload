import { randomUUID } from "node:crypto";
import path from "node:path";

import { NextResponse } from "next/server";

import { ingestUpload } from "@/lib/repository";
import { saveFile } from "@/lib/storage";

export const runtime = "nodejs";

const MAX_UPLOAD_BYTES = 25 * 1024 * 1024;

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
      return NextResponse.json(
        { error: `File ${file.name} exceeds the 25MB limit.` },
        { status: 400 }
      );
    }

    const documentId = randomUUID();
    const storagePath = path.posix.join("raw", documentId, file.name);
    await saveFile(storagePath, Buffer.from(await file.arrayBuffer()), file.type || "application/octet-stream");
    results.push(
      await ingestUpload({
        filename: file.name,
        mimeType: file.type || "application/octet-stream",
        storagePath,
        size: file.size,
        referenceNumber
      })
    );
  }

  return NextResponse.json({ results });
}
