import { NextResponse } from "next/server";

import { disputeShipment } from "@/lib/repository";

export const runtime = "nodejs";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = (await request.json().catch(() => ({}))) as { notes?: string };
  const shipment = await disputeShipment(id, body.notes ?? "Dispute created from dashboard.");

  if (!shipment) {
    return NextResponse.json({ error: "Shipment not found." }, { status: 404 });
  }

  return NextResponse.json({ shipment });
}
