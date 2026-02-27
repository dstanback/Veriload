import { NextResponse } from "next/server";

import { getShipmentDetail } from "@/lib/repository";

export const runtime = "nodejs";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const shipment = await getShipmentDetail(id);

  if (!shipment) {
    return NextResponse.json({ error: "Shipment not found." }, { status: 404 });
  }

  return NextResponse.json({ shipment });
}
