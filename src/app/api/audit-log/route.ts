import { NextResponse } from "next/server";

import { getCurrentAppSession } from "@/lib/auth";
import {
  getAuditLogs,
  getAuditLogCount,
  type AuditLogFilters,
} from "@/lib/repository";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    await getCurrentAppSession();
  } catch {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);

  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10) || 1);
  const pageSize = Math.min(
    100,
    Math.max(1, parseInt(searchParams.get("pageSize") ?? "50", 10) || 50),
  );

  const filters: AuditLogFilters = {};

  const actions = searchParams.get("actions");
  if (actions) {
    filters.actions = actions.split(",").filter(Boolean);
  }

  const userId = searchParams.get("userId");
  if (userId) filters.userId = userId;

  const shipmentRef = searchParams.get("shipmentRef");
  if (shipmentRef) filters.shipmentRef = shipmentRef;

  const dateFrom = searchParams.get("dateFrom");
  if (dateFrom) filters.dateFrom = dateFrom;

  const dateTo = searchParams.get("dateTo");
  if (dateTo) filters.dateTo = dateTo;

  const [logs, total] = await Promise.all([
    getAuditLogs(filters, page, pageSize),
    getAuditLogCount(filters),
  ]);

  return NextResponse.json({ logs, total, page, pageSize });
}
