import { NextResponse } from "next/server";

import { getCurrentAppSession } from "@/lib/auth";
import { editApproveShipment } from "@/lib/repository";

export const runtime = "nodejs";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  let session;
  try {
    session = await getCurrentAppSession();
  } catch {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const { id } = await params;

  let body: { edits?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  if (!Array.isArray(body.edits)) {
    return NextResponse.json(
      { error: "Missing or invalid edits array." },
      { status: 400 }
    );
  }

  const edits = body.edits as Array<{
    documentId: string;
    fieldName: string;
    newValue: string;
  }>;

  for (const edit of edits) {
    if (
      typeof edit.documentId !== "string" ||
      typeof edit.fieldName !== "string" ||
      typeof edit.newValue !== "string"
    ) {
      return NextResponse.json(
        { error: "Each edit must have documentId, fieldName, and newValue as strings." },
        { status: 400 }
      );
    }
  }

  let shipment;
  try {
    shipment = await editApproveShipment(id, edits, session.userId);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Bad request.";
    return NextResponse.json({ error: message }, { status: 400 });
  }

  if (!shipment) {
    return NextResponse.json({ error: "Shipment not found." }, { status: 404 });
  }

  return NextResponse.json({ shipment });
}
