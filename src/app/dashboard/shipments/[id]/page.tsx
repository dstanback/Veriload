export const dynamic = "force-dynamic";

import { notFound } from "next/navigation";

import { ShipmentDetail } from "@/components/dashboard/shipment-detail";
import { getShipmentDetail } from "@/lib/repository";

export default async function ShipmentDetailPage({
  params
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const shipment = await getShipmentDetail(id);

  if (!shipment) {
    notFound();
  }

  return <ShipmentDetail shipment={shipment} />;
}
