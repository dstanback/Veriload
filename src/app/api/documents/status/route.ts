import { NextResponse } from "next/server";

import { getCurrentAppSession } from "@/lib/auth";
import { db } from "@/lib/db";

export const runtime = "nodejs";

export async function GET(request: Request) {
  let session;
  try {
    session = await getCurrentAppSession();
  } catch {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const idsParam = searchParams.get("ids") ?? "";
  const ids = idsParam
    .split(",")
    .map((id) => id.trim())
    .filter(Boolean);

  if (ids.length === 0) {
    return NextResponse.json({ documents: [] });
  }

  // Cap at 50 IDs per request to prevent abuse
  const capped = ids.slice(0, 50);

  const documents = await db.document.findMany({
    where: {
      id: { in: capped },
      organizationId: session.organizationId
    },
    select: {
      id: true,
      status: true,
      docType: true,
      docTypeConfidence: true,
      processingError: true,
      processedAt: true
    }
  });

  return NextResponse.json({
    documents: documents.map((doc) => ({
      id: doc.id,
      status: doc.status,
      docType: doc.docType,
      docTypeConfidence: doc.docTypeConfidence,
      processingError: doc.processingError,
      processedAt: doc.processedAt?.toISOString() ?? null
    }))
  });
}
