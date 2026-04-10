export const dynamic = "force-dynamic";

import { SettingsTabs } from "@/components/dashboard/settings-tabs";
import { Card } from "@/components/ui/card";
import { getSettingsPageData } from "./actions";

export default async function SettingsPage() {
  const data = await getSettingsPageData();

  return (
    <div className="space-y-6">
      <Card className="bg-white/90">
        <p className="text-xs uppercase tracking-[0.2em] text-[color:var(--muted)]">
          Organization settings
        </p>
        <h2 className="mt-2 text-2xl font-semibold">Workflow controls</h2>
      </Card>
      <SettingsTabs data={data} />
    </div>
  );
}
