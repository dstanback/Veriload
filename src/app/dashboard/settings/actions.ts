"use server";

import { z } from "zod";

import { getCurrentAppSession } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  DEFAULT_TOLERANCES,
  orgSettingsSchema,
  type OrgSettings,
  type SettingsPageData,
} from "./settings-types";

/* ------------------------------------------------------------------ */
/*  Helpers                                                           */
/* ------------------------------------------------------------------ */

function parseOrgSettings(raw: unknown): OrgSettings {
  const obj = (raw ?? {}) as Record<string, unknown>;
  const tolerancesRaw = (obj.tolerances ?? {}) as Record<string, unknown>;

  return {
    autoApproveEnabled: Boolean(obj.autoApproveEnabled),
    autoApproveConfidenceThreshold:
      typeof obj.autoApproveConfidenceThreshold === "number"
        ? obj.autoApproveConfidenceThreshold
        : 90,
    dailySummaryEnabled: obj.dailySummaryEnabled !== false,
    summaryRecipients: Array.isArray(obj.summaryRecipients)
      ? (obj.summaryRecipients as string[]).filter((r) => typeof r === "string")
      : [],
    tolerances: {
      totalAmountGreen:
        typeof tolerancesRaw.totalAmountGreen === "number"
          ? tolerancesRaw.totalAmountGreen
          : DEFAULT_TOLERANCES.totalAmountGreen,
      totalAmountYellow:
        typeof tolerancesRaw.totalAmountYellow === "number"
          ? tolerancesRaw.totalAmountYellow
          : DEFAULT_TOLERANCES.totalAmountYellow,
      weightGreen:
        typeof tolerancesRaw.weightGreen === "number"
          ? tolerancesRaw.weightGreen
          : DEFAULT_TOLERANCES.weightGreen,
      weightYellow:
        typeof tolerancesRaw.weightYellow === "number"
          ? tolerancesRaw.weightYellow
          : DEFAULT_TOLERANCES.weightYellow,
      fuelSurchargeGreen:
        typeof tolerancesRaw.fuelSurchargeGreen === "number"
          ? tolerancesRaw.fuelSurchargeGreen
          : DEFAULT_TOLERANCES.fuelSurchargeGreen,
      fuelSurchargeYellow:
        typeof tolerancesRaw.fuelSurchargeYellow === "number"
          ? tolerancesRaw.fuelSurchargeYellow
          : DEFAULT_TOLERANCES.fuelSurchargeYellow,
      dateWindowDays:
        typeof tolerancesRaw.dateWindowDays === "number"
          ? tolerancesRaw.dateWindowDays
          : DEFAULT_TOLERANCES.dateWindowDays,
    },
  };
}

/* ------------------------------------------------------------------ */
/*  Data loader (called from server component)                        */
/* ------------------------------------------------------------------ */

export async function getSettingsPageData(): Promise<SettingsPageData> {
  const session = await getCurrentAppSession();

  const [org, users, recentShipments] = await Promise.all([
    db.organization.findUniqueOrThrow({
      where: { id: session.organizationId },
    }),
    db.user.findMany({
      where: { organizationId: session.organizationId },
      orderBy: { createdAt: "desc" },
    }),
    db.shipment.findMany({
      where: { organizationId: session.organizationId },
      orderBy: { createdAt: "desc" },
      take: 30,
      select: { discrepancyLevel: true, matchConfidence: true },
    }),
  ]);

  const settings = parseOrgSettings(org.settings);

  const autoApproveSimulation = recentShipments.filter(
    (s) =>
      s.discrepancyLevel === "green" &&
      (s.matchConfidence ?? 0) >= settings.autoApproveConfidenceThreshold
  ).length;

  return {
    session: {
      userId: session.userId,
      email: session.email,
      name: session.name,
      role: session.role,
    },
    organization: {
      id: org.id,
      name: org.name,
      slug: org.slug,
      settings,
    },
    teamMembers: users.map((u) => ({
      id: u.id,
      name: u.name,
      email: u.email,
      role: u.role,
      created_at: u.createdAt.toISOString(),
    })),
    autoApproveSimulation,
  };
}

/* ------------------------------------------------------------------ */
/*  Mutation: update org settings                                     */
/* ------------------------------------------------------------------ */

export async function updateOrgSettings(
  input: z.infer<typeof orgSettingsSchema>
): Promise<{ success: boolean; error?: string }> {
  try {
    const session = await getCurrentAppSession();
    const validated = orgSettingsSchema.parse(input);

    const org = await db.organization.findUniqueOrThrow({
      where: { id: session.organizationId },
    });

    const existing = (org.settings ?? {}) as Record<string, unknown>;
    const merged = { ...existing, ...validated };

    await db.organization.update({
      where: { id: session.organizationId },
      data: { settings: merged },
    });

    return { success: true };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return {
        success: false,
        error: error.errors[0]?.message ?? "Validation failed.",
      };
    }
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Failed to update settings.",
    };
  }
}

/* ------------------------------------------------------------------ */
/*  Mutation: create team member                                      */
/* ------------------------------------------------------------------ */

export async function createTeamMember(
  email: string,
  name: string,
  role: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const session = await getCurrentAppSession();

    const trimmedEmail = email.trim().toLowerCase();
    const trimmedName = name.trim();

    if (!trimmedEmail || !trimmedName) {
      return { success: false, error: "Email and name are required." };
    }

    if (!["admin", "analyst", "reviewer"].includes(role)) {
      return {
        success: false,
        error: "Role must be admin, analyst, or reviewer.",
      };
    }

    const existing = await db.user.findUnique({
      where: { email: trimmedEmail },
    });

    if (existing) {
      return {
        success: false,
        error: "A user with this email already exists.",
      };
    }

    await db.user.create({
      data: {
        email: trimmedEmail,
        name: trimmedName,
        role,
        organizationId: session.organizationId,
      },
    });

    return { success: true };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Failed to create user.",
    };
  }
}

/* ------------------------------------------------------------------ */
/*  Mutation: remove team member                                      */
/* ------------------------------------------------------------------ */

export async function removeTeamMember(
  userId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const session = await getCurrentAppSession();

    if (userId === session.userId) {
      return { success: false, error: "You cannot remove yourself." };
    }

    const user = await db.user.findFirst({
      where: {
        id: userId,
        organizationId: session.organizationId,
      },
    });

    if (!user) {
      return {
        success: false,
        error: "User not found in your organization.",
      };
    }

    await db.user.delete({ where: { id: userId } });

    return { success: true };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Failed to remove user.",
    };
  }
}
