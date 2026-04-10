import { NextResponse } from "next/server";

import { getCurrentAppSession } from "@/lib/auth";
import { approveShipment } from "@/lib/repository";

export const runtime = "nodejs";

export async function POST(
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

  let shipment;
  try {
    shipment = await approveShipment(id, session.userId);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Bad request.";
    return NextResponse.json({ error: message }, { status: 400 });
  }

  if (!shipment) {
    return NextResponse.json({ error: "Shipment not found." }, { status: 404 });
  }

  return NextResponse.json({ shipment });
}
