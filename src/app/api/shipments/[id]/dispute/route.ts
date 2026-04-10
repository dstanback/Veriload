import { NextResponse } from "next/server";

import { getCurrentAppSession } from "@/lib/auth";
import { disputeShipment } from "@/lib/repository";

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
  const body = (await request.json().catch(() => ({}))) as {
    reason?: string;
    discrepancyIds?: string[];
  };

  if (!body.reason || body.reason.trim().length === 0) {
    return NextResponse.json(
      { error: "A dispute reason is required." },
      { status: 400 }
    );
  }

  const shipment = await disputeShipment(
    id,
    body.reason.trim(),
    body.discrepancyIds ?? null,
    session.userId
  );

  if (!shipment) {
    return NextResponse.json({ error: "Shipment not found." }, { status: 404 });
  }

  return NextResponse.json({ shipment });
}
