import { redirect } from "next/navigation";

import { LandingPage } from "@/components/landing/landing-page";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  // If user has a valid session, redirect to dashboard
  try {
    const { getCurrentAppSession } = await import("@/lib/auth");
    await getCurrentAppSession();
    redirect("/dashboard");
  } catch {
    // No valid session — show landing page
  }

  return <LandingPage />;
}
