export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";

import { getCurrentAppSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { OnboardingWizard } from "@/components/dashboard/onboarding-wizard";

export default async function OnboardingPage() {
  const session = await getCurrentAppSession();

  const org = await db.organization.findUnique({
    where: { id: session.organizationId },
    select: { settings: true, name: true },
  });

  const settings = (org?.settings ?? {}) as Record<string, unknown>;

  if (settings.onboardingCompleted) {
    redirect("/dashboard");
  }

  return (
    <OnboardingWizard
      userName={session.name}
      orgName={org?.name ?? "Your Organization"}
    />
  );
}
