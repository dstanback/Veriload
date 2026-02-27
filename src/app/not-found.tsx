import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export default function NotFoundPage() {
  return (
    <main className="flex min-h-screen items-center justify-center px-6 py-10">
      <Card className="max-w-lg bg-white/90 text-center">
        <p className="text-xs uppercase tracking-[0.2em] text-[color:var(--accent)]">Not found</p>
        <h1 className="mt-3 text-3xl font-semibold">That shipment or page does not exist.</h1>
        <p className="mt-3 text-sm text-[color:var(--muted)]">
          The record may not have been created yet, or the local development store was reset.
        </p>
        <Link href="/dashboard">
          <Button className="mt-6">Return to dashboard</Button>
        </Link>
      </Card>
    </main>
  );
}
