import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

export default function LoginPage() {
  return (
    <main className="flex min-h-screen items-center justify-center px-6 py-10">
      <Card className="w-full max-w-md bg-white/90">
        <p className="text-xs uppercase tracking-[0.2em] text-[color:var(--accent)]">Veriload</p>
        <h1 className="mt-3 text-3xl font-semibold">Log in to the ops dashboard</h1>
        <div className="mt-6 space-y-4">
          <Input type="email" placeholder="Work email" />
          <Input type="password" placeholder="Password" />
          <Button className="w-full">Continue</Button>
        </div>
        <p className="mt-6 text-sm text-[color:var(--muted)]">
          Need an account? <Link className="font-medium text-[color:var(--accent)]" href="/signup">Create one</Link>
        </p>
      </Card>
    </main>
  );
}
