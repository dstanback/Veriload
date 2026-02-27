import Link from "next/link";

const highlights = [
  "Automated freight document classification",
  "Bill of lading and invoice extraction",
  "Shipment-level discrepancy scoring",
  "Approval and dispute workflows"
];

export default function HomePage() {
  return (
    <main className="min-h-screen px-6 py-10 md:px-10">
      <div className="mx-auto flex max-w-7xl flex-col gap-8">
        <header className="flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[color:var(--accent)]">
              Veriload
            </p>
            <h1 className="mt-2 text-4xl font-semibold tracking-tight md:text-6xl">
              Reconcile freight paperwork before margin leaks out.
            </h1>
          </div>
          <div className="flex items-center gap-3">
            <Link
              className="rounded-full border border-[color:var(--border)] px-4 py-2 text-sm font-medium"
              href="/login"
            >
              Log in
            </Link>
            <Link
              className="rounded-full bg-[color:var(--foreground)] px-4 py-2 text-sm font-medium text-white"
              href="/signup"
            >
              Start pilot
            </Link>
          </div>
        </header>

        <section className="grid gap-6 md:grid-cols-[1.3fr_0.7fr]">
          <div className="rounded-[2rem] border border-[color:var(--border)] bg-[color:var(--surface)] p-8 shadow-card">
            <p className="max-w-2xl text-lg leading-8 text-[color:var(--muted)]">
              Upload messy invoices, BoLs, rate confirmations, and PODs. Veriload classifies the
              paperwork, extracts structured data, matches shipment documents, and flags
              overcharges before your AP team pays the carrier.
            </p>

            <div className="mt-8 grid gap-3 sm:grid-cols-2">
              {highlights.map((highlight) => (
                <div
                  key={highlight}
                  className="rounded-2xl border border-[color:var(--border)] bg-white/80 px-4 py-3 text-sm font-medium"
                >
                  {highlight}
                </div>
              ))}
            </div>
          </div>

          <aside className="rounded-[2rem] border border-[color:var(--border)] bg-[#1f2a37] p-8 text-white shadow-card">
            <p className="text-sm uppercase tracking-[0.2em] text-white/70">MVP status</p>
            <div className="mt-8 space-y-5">
              <div>
                <p className="text-4xl font-semibold">4 layers</p>
                <p className="mt-2 text-sm text-white/70">Ingestion, extraction, reconciliation, dashboard</p>
              </div>
              <div>
                <p className="text-4xl font-semibold">&lt; 60 sec</p>
                <p className="mt-2 text-sm text-white/70">Target processing time from upload to review queue</p>
              </div>
              <div>
                <p className="text-4xl font-semibold">JSON-first</p>
                <p className="mt-2 text-sm text-white/70">Prompt templates and typed schemas drive the product</p>
              </div>
            </div>
          </aside>
        </section>
      </div>
    </main>
  );
}
