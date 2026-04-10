import { NextResponse } from "next/server";

import { getCurrentAppSession } from "@/lib/auth";
import { getDocument } from "@/lib/repository";

export const runtime = "nodejs";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  let session;
  try {
    session = await getCurrentAppSession();
  } catch {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const { id } = await params;
  const document = await getDocument(id);

  if (!document) {
    return NextResponse.json({ error: "Document not found." }, { status: 404 });
  }

  if (document.organization_id !== session.organizationId) {
    return NextResponse.json({ error: "Document not found." }, { status: 404 });
  }

  const pageCount = document.page_count ?? 0;
  const pageImageUrls: string[] = [];
  for (let i = 1; i <= pageCount; i++) {
    pageImageUrls.push(`/api/documents/${document.id}/pages/${i}`);
  }

  return NextResponse.json({
    document,
    extractedData: document.extracted_data ?? null,
    pageImageUrls,
  });
}
