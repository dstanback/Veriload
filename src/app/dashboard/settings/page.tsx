export const dynamic = "force-dynamic";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

export default function SettingsPage() {
  return (
    <div className="space-y-6">
      <Card className="bg-white/90">
        <p className="text-xs uppercase tracking-[0.2em] text-[color:var(--muted)]">Organization settings</p>
        <h2 className="mt-2 text-2xl font-semibold">Workflow controls</h2>
      </Card>

      <div className="grid gap-6 xl:grid-cols-2">
        <Card className="space-y-4 bg-white/90">
          <h3 className="text-lg font-semibold">Organization profile</h3>
          <Input defaultValue="Acme Logistics" />
          <Input defaultValue="docs@acme.veriload.local" />
          <Textarea defaultValue="Auto-approve green shipments above 90 confidence. Hold any red discrepancy for manager review." rows={5} />
          <Button>Save profile</Button>
        </Card>

        <Card className="space-y-4 bg-white/90">
          <h3 className="text-lg font-semibold">Tolerance thresholds</h3>
          <div className="grid gap-4 sm:grid-cols-2">
            <Input defaultValue="0.00" />
            <Input defaultValue="0.02" />
            <Input defaultValue="0.02" />
            <Input defaultValue="0.05" />
          </div>
          <p className="text-sm text-[color:var(--muted)]">
            Left to right: amount green, amount yellow, weight green, weight yellow.
          </p>
          <Button variant="secondary">Update tolerances</Button>
        </Card>
      </div>
    </div>
  );
}
