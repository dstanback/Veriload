import { z } from "zod";

/* ------------------------------------------------------------------ */
/*  Schemas                                                           */
/* ------------------------------------------------------------------ */

export const tolerancesSchema = z.object({
  totalAmountGreen: z.number().min(0).max(100),
  totalAmountYellow: z.number().min(0).max(100),
  weightGreen: z.number().min(0).max(100),
  weightYellow: z.number().min(0).max(100),
  fuelSurchargeGreen: z.number().min(0).max(100),
  fuelSurchargeYellow: z.number().min(0).max(100),
  dateWindowDays: z.number().int().min(0).max(90),
});

export const orgSettingsSchema = z.object({
  autoApproveEnabled: z.boolean().optional(),
  autoApproveConfidenceThreshold: z.number().min(80).max(99).optional(),
  tolerances: tolerancesSchema.optional(),
  dailySummaryEnabled: z.boolean().optional(),
  summaryRecipients: z.array(z.string().email()).optional(),
});

/* ------------------------------------------------------------------ */
/*  Types                                                             */
/* ------------------------------------------------------------------ */

export type Tolerances = z.infer<typeof tolerancesSchema>;

export interface OrgSettings {
  autoApproveEnabled: boolean;
  autoApproveConfidenceThreshold: number;
  tolerances: Tolerances;
  dailySummaryEnabled: boolean;
  summaryRecipients: string[];
}

export interface TeamMember {
  id: string;
  name: string;
  email: string;
  role: string;
  created_at: string;
}

export interface SettingsPageData {
  session: {
    userId: string;
    email: string;
    name: string;
    role: string;
  };
  organization: {
    id: string;
    name: string;
    slug: string;
    settings: OrgSettings;
  };
  teamMembers: TeamMember[];
  autoApproveSimulation: number;
}

/* ------------------------------------------------------------------ */
/*  Defaults                                                          */
/* ------------------------------------------------------------------ */

export const DEFAULT_TOLERANCES: Tolerances = {
  totalAmountGreen: 0,
  totalAmountYellow: 2,
  weightGreen: 2,
  weightYellow: 5,
  fuelSurchargeGreen: 0.1,
  fuelSurchargeYellow: 1,
  dateWindowDays: 3,
};
