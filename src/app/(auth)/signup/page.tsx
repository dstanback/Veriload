import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

export default function SignupPage() {
  return (
    <main className="flex min-h-screen items-center justify-center px-6 py-10">
      <Card className="w-full max-w-lg bg-white/90">
        <p className="text-xs uppercase tracking-[0.2em] text-[color:var(--accent)]">Pilot onboarding</p>
        <h1 className="mt-3 text-3xl font-semibold">Start a Veriload trial workspace</h1>
        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <Input placeholder="Full name" />
          <Input placeholder="Organization" />
          <Input className="sm:col-span-2" type="email" placeholder="Work email" />
          <Input className="sm:col-span-2" type="password" placeholder="Password" />
        </div>
        <Button className="mt-6 w-full">Create workspace</Button>
        <p className="mt-6 text-sm text-[color:var(--muted)]">
          Already provisioned? <Link className="font-medium text-[color:var(--accent)]" href="/login">Go to login</Link>
        </p>
      </Card>
    </main>
  );
}
