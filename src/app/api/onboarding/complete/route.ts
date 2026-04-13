import { NextResponse } from "next/server";

import { getCurrentAppSession } from "@/lib/auth";
import { db } from "@/lib/db";

export const runtime = "nodejs";

export async function POST() {
  let session;
  try {
    session = await getCurrentAppSession();
  } catch {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const org = await db.organization.findUnique({
    where: { id: session.organizationId },
    select: { settings: true },
  });

  const existing = (org?.settings ?? {}) as Record<string, unknown>;

  await db.organization.update({
    where: { id: session.organizationId },
    data: {
      settings: { ...existing, onboardingCompleted: true },
    },
  });

  return NextResponse.json({ success: true });
}
