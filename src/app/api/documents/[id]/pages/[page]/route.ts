import { NextResponse } from "next/server";

import { getCurrentAppSession } from "@/lib/auth";
import { getDocument } from "@/lib/repository";
import { objectExists, readFileBuffer } from "@/lib/storage";

export const runtime = "nodejs";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string; page: string }> }
) {
  let session;
  try {
    session = await getCurrentAppSession();
  } catch {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const { id, page } = await params;
  const pageNumber = parseInt(page, 10);

  if (Number.isNaN(pageNumber) || pageNumber < 1) {
    return NextResponse.json({ error: "Invalid page number." }, { status: 400 });
  }

  const document = await getDocument(id);

  if (!document) {
    return NextResponse.json({ error: "Document not found." }, { status: 404 });
  }

  if (document.organization_id !== session.organizationId) {
    return NextResponse.json({ error: "Document not found." }, { status: 404 });
  }

  const pageStoragePath = `pages/${id}/page_${String(pageNumber).padStart(3, "0")}.png`;
  const exists = await objectExists(pageStoragePath);

  if (!exists) {
    return NextResponse.json({ error: "Page image not found." }, { status: 404 });
  }

  const buffer = await readFileBuffer(pageStoragePath);

  return new NextResponse(buffer, {
    status: 200,
    headers: {
      "Content-Type": "image/png",
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
}
