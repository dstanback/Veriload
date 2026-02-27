import { BellDot, Search } from "lucide-react";

import { Input } from "@/components/ui/input";

export function Header() {
  return (
    <header className="flex flex-col gap-4 rounded-[2rem] border border-[color:var(--border)] bg-[color:var(--surface)] px-6 py-5 shadow-card lg:flex-row lg:items-center lg:justify-between">
      <div>
        <p className="text-sm uppercase tracking-[0.2em] text-[color:var(--muted)]">Acme Logistics</p>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight">Freight reconciliation cockpit</h1>
      </div>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <label className="relative block min-w-[280px]">
          <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[color:var(--muted)]" size={16} />
          <Input className="pl-10" placeholder="Search shipment refs or carriers" />
        </label>
        <button className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-[color:var(--border)] bg-white">
          <BellDot size={18} />
        </button>
      </div>
    </header>
  );
}
