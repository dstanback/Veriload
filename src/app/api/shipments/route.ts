import { NextResponse } from "next/server";

import { getShipmentDetail, listShipments } from "@/lib/repository";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const shipments = await listShipments({
    query: searchParams.get("q") ?? undefined,
    discrepancyLevel: searchParams.get("discrepancy"),
    status: searchParams.get("status")
  });
  const detailMap = Object.fromEntries(
    await Promise.all(shipments.map(async (shipment) => [shipment.id, await getShipmentDetail(shipment.id)]))
  );

  return NextResponse.json({
    shipments,
    details: detailMap
  });
}
