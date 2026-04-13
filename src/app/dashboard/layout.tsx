import { redirect } from "next/navigation";
import { headers } from "next/headers";

import { getCurrentAppSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { Header } from "@/components/layout/header";
import { Sidebar } from "@/components/layout/sidebar";
import { ToastProvider } from "@/components/ui/toast";

export default async function DashboardLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await getCurrentAppSession();

  // Check if onboarding is needed (fresh account with no documents)
  const requestHeaders = await headers();
  const pathname = requestHeaders.get("x-next-pathname") ?? "";
  const isOnboardingPage = pathname.includes("/onboarding");

  if (!isOnboardingPage) {
    const [org, documentCount] = await Promise.all([
      db.organization.findUnique({
        where: { id: session.organizationId },
        select: { settings: true },
      }),
      db.document.count({
        where: { organizationId: session.organizationId },
      }),
    ]);

    const settings = (org?.settings ?? {}) as Record<string, unknown>;
    if (!settings.onboardingCompleted && documentCount === 0) {
      redirect("/dashboard/onboarding");
    }
  }

  // Load checklist state for sidebar
  const [documentCount, shipmentCount, org] = await Promise.all([
    db.document.count({
      where: { organizationId: session.organizationId },
    }),
    db.shipment.count({
      where: { organizationId: session.organizationId },
    }),
    db.organization.findUnique({
      where: { id: session.organizationId },
      select: { settings: true },
    }),
  ]);

  const settings = (org?.settings ?? {}) as Record<string, unknown>;
  const onboardingCompleted = Boolean(settings.onboardingCompleted);
  const hasTolerances = settings.autoApproveEnabled != null;

  const checklistItems = {
    uploadedDocument: documentCount > 0,
    reviewedShipment: shipmentCount > 0,
    configuredTolerances: hasTolerances,
    dismissed: onboardingCompleted && documentCount > 0,
  };

  return (
    <ToastProvider>
      <main className="min-h-screen px-4 py-4 md:px-6 md:py-6">
        <div className="mx-auto grid max-w-7xl gap-6 lg:grid-cols-[280px_1fr]">
          <Sidebar checklist={checklistItems} />
          <div className="space-y-6">
            <Header />
            {children}
          </div>
        </div>
      </main>
    </ToastProvider>
  );
}
