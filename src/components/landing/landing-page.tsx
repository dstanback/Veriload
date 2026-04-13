"use client";

import { motion, useInView } from "framer-motion";
import {
  ArrowRight,
  Brain,
  CheckCircle,
  FileSearch,
  Layers,
  MousePointerClick,
  ScanLine,
  Upload,
  Zap,
} from "lucide-react";
import Link from "next/link";
import { useRef } from "react";

/* ------------------------------------------------------------------ */
/*  Animation helpers                                                 */
/* ------------------------------------------------------------------ */

function FadeIn({
  children,
  delay = 0,
  className,
}: {
  children: React.ReactNode;
  delay?: number;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-60px" });

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 24 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.6, delay, ease: [0.22, 1, 0.36, 1] }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

/* ------------------------------------------------------------------ */
/*  Hero pipeline SVG                                                 */
/* ------------------------------------------------------------------ */

function PipelineVisual() {
  return (
    <motion.svg
      viewBox="0 0 480 260"
      fill="none"
      className="mx-auto w-full max-w-lg"
      aria-hidden
    >
      {/* Document shapes flowing left to right */}
      <motion.rect
        x="20" y="60" width="72" height="92" rx="12"
        className="fill-[#18212d]/10 stroke-[#18212d]/20"
        strokeWidth="1.5"
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.8, delay: 0.2 }}
      />
      <motion.rect
        x="32" y="80" width="48" height="4" rx="2"
        className="fill-[color:var(--accent)]"
        initial={{ scaleX: 0 }}
        animate={{ scaleX: 1 }}
        transition={{ duration: 0.5, delay: 0.6 }}
      />
      <motion.rect
        x="32" y="92" width="36" height="4" rx="2"
        className="fill-[#18212d]/15"
        initial={{ scaleX: 0 }}
        animate={{ scaleX: 1 }}
        transition={{ duration: 0.5, delay: 0.7 }}
      />
      <motion.rect
        x="32" y="104" width="44" height="4" rx="2"
        className="fill-[#18212d]/15"
        initial={{ scaleX: 0 }}
        animate={{ scaleX: 1 }}
        transition={{ duration: 0.5, delay: 0.8 }}
      />

      {/* Arrow 1 */}
      <motion.path
        d="M108 106 L158 106"
        className="stroke-[color:var(--accent)]"
        strokeWidth="2"
        strokeDasharray="6 4"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 0.6, delay: 1.0 }}
      />

      {/* AI processing node */}
      <motion.circle
        cx="206" cy="106" r="40"
        className="fill-[#18212d]"
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: "spring", damping: 15, stiffness: 200, delay: 1.2 }}
      />
      <motion.circle
        cx="206" cy="106" r="40"
        fill="none"
        className="stroke-[color:var(--accent)]"
        strokeWidth="2"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 1, delay: 1.4 }}
      />
      {/* Brain icon placeholder */}
      <motion.text
        x="206" y="112"
        textAnchor="middle"
        className="fill-white text-[11px] font-semibold"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.6 }}
      >
        AI
      </motion.text>

      {/* Arrow 2 */}
      <motion.path
        d="M254 106 L304 106"
        className="stroke-[color:var(--accent)]"
        strokeWidth="2"
        strokeDasharray="6 4"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 0.6, delay: 1.8 }}
      />

      {/* Output: matched documents */}
      <motion.rect
        x="320" y="44" width="64" height="48" rx="10"
        className="fill-emerald-100 stroke-emerald-400"
        strokeWidth="1.5"
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.6, delay: 2.0 }}
      />
      <motion.rect
        x="334" y="58" width="36" height="3" rx="1.5"
        className="fill-emerald-500"
        initial={{ scaleX: 0 }}
        animate={{ scaleX: 1 }}
        transition={{ duration: 0.4, delay: 2.2 }}
      />
      <motion.rect
        x="334" y="66" width="28" height="3" rx="1.5"
        className="fill-emerald-300"
        initial={{ scaleX: 0 }}
        animate={{ scaleX: 1 }}
        transition={{ duration: 0.4, delay: 2.3 }}
      />

      <motion.rect
        x="320" y="108" width="64" height="48" rx="10"
        className="fill-amber-100 stroke-amber-400"
        strokeWidth="1.5"
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.6, delay: 2.1 }}
      />
      <motion.rect
        x="334" y="122" width="36" height="3" rx="1.5"
        className="fill-amber-500"
        initial={{ scaleX: 0 }}
        animate={{ scaleX: 1 }}
        transition={{ duration: 0.4, delay: 2.3 }}
      />
      <motion.rect
        x="334" y="130" width="28" height="3" rx="1.5"
        className="fill-amber-300"
        initial={{ scaleX: 0 }}
        animate={{ scaleX: 1 }}
        transition={{ duration: 0.4, delay: 2.4 }}
      />

      {/* Checkmark on green card */}
      <motion.circle
        cx="398" cy="56" r="10"
        className="fill-emerald-500"
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: "spring", delay: 2.5, damping: 12 }}
      />
      <motion.path
        d="M394 56 L397 59 L403 53"
        className="stroke-white"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 0.3, delay: 2.7 }}
      />

      {/* Alert on amber card */}
      <motion.circle
        cx="398" cy="120" r="10"
        className="fill-amber-500"
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: "spring", delay: 2.6, damping: 12 }}
      />
      <motion.text
        x="398" y="125"
        textAnchor="middle"
        className="fill-white text-[12px] font-bold"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 2.8 }}
      >
        !
      </motion.text>

      {/* Labels */}
      <motion.text
        x="56" y="176"
        textAnchor="middle"
        className="fill-[color:var(--muted)] text-[10px]"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.0 }}
      >
        Upload
      </motion.text>
      <motion.text
        x="206" y="168"
        textAnchor="middle"
        className="fill-[color:var(--muted)] text-[10px]"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.8 }}
      >
        Process
      </motion.text>
      <motion.text
        x="352" y="176"
        textAnchor="middle"
        className="fill-[color:var(--muted)] text-[10px]"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 2.5 }}
      >
        Review
      </motion.text>
    </motion.svg>
  );
}

/* ------------------------------------------------------------------ */
/*  Feature cards                                                     */
/* ------------------------------------------------------------------ */

const features = [
  {
    icon: Brain,
    title: "AI-Powered Extraction",
    description:
      "Upload freight docs — invoices, BoLs, rate confirmations — and AI extracts every field with confidence scores.",
  },
  {
    icon: Layers,
    title: "Automatic Matching",
    description:
      "Documents are matched to shipments by BOL number, PRO number, and carrier SCAC — no manual pairing needed.",
  },
  {
    icon: Zap,
    title: "Instant Reconciliation",
    description:
      "Discrepancies between invoices and approved rates are flagged in real-time with green, yellow, and red severity levels.",
  },
  {
    icon: MousePointerClick,
    title: "One-Click Resolution",
    description:
      "Approve, dispute, or edit-and-approve with a full audit trail. Generate dispute emails with AI and send directly.",
  },
];

/* ------------------------------------------------------------------ */
/*  Steps                                                             */
/* ------------------------------------------------------------------ */

const steps = [
  {
    icon: Upload,
    title: "Upload",
    description: "Drop invoices, BoLs, and rate confirmations — any format.",
  },
  {
    icon: ScanLine,
    title: "AI Processes",
    description: "Vision AI classifies, extracts fields, and matches documents to shipments.",
  },
  {
    icon: FileSearch,
    title: "Review & Act",
    description: "See discrepancies at a glance. Approve clean shipments, dispute overcharges.",
  },
];

/* ------------------------------------------------------------------ */
/*  Logo placeholders                                                 */
/* ------------------------------------------------------------------ */

function PlaceholderLogos() {
  const shapes = [
    "M4 12h6v6H4z M14 8h8v10H14z",
    "M6 6 L18 6 L12 18z",
    "M12 4a8 8 0 100 16 8 8 0 000-16z M8 12h8",
    "M4 8h16v8H4z M8 4h8v4H8z",
    "M4 4h8v8H4z M14 10h6v6h-6z",
  ];

  return (
    <div className="flex items-center justify-center gap-10 opacity-40">
      {shapes.map((d, i) => (
        <svg key={i} width="40" height="40" viewBox="0 0 24 24" fill="none" aria-hidden>
          <path d={d} className="stroke-[color:var(--foreground)]" strokeWidth="1.5" />
        </svg>
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Main component                                                    */
/* ------------------------------------------------------------------ */

export function LandingPage() {
  return (
    <main className="min-h-screen">
      {/* ---- Navigation ---- */}
      <nav className="mx-auto flex max-w-7xl items-center justify-between px-6 py-6 md:px-10">
        <p className="text-sm font-semibold uppercase tracking-[0.22em] text-[color:var(--accent)]">
          Veriload
        </p>
        <div className="flex items-center gap-3">
          <Link
            className="rounded-full border border-[color:var(--border)] px-4 py-2 text-sm font-medium transition hover:bg-black/5"
            href="/login"
          >
            Log in
          </Link>
          <Link
            className="rounded-full bg-[color:var(--foreground)] px-4 py-2 text-sm font-medium text-white transition hover:opacity-90"
            href="/signup"
          >
            Get Started
          </Link>
        </div>
      </nav>

      {/* ---- Hero ---- */}
      <section className="mx-auto max-w-7xl px-6 pb-20 pt-12 md:px-10 md:pt-20">
        <div className="mx-auto max-w-3xl text-center">
          <motion.h1
            className="text-4xl font-semibold leading-[1.1] tracking-tight md:text-6xl"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7 }}
          >
            Stop Overpaying on Freight.{" "}
            <span className="text-[color:var(--accent)]">
              Start Reconciling in Seconds.
            </span>
          </motion.h1>
          <motion.p
            className="mx-auto mt-6 max-w-xl text-lg leading-relaxed text-[color:var(--muted)]"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.15 }}
          >
            Veriload automates freight bill reconciliation using AI — upload
            invoices and shipping docs, and get instant discrepancy detection
            with one-click resolution.
          </motion.p>
          <motion.div
            className="mt-8 flex items-center justify-center gap-4"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
          >
            <Link
              href="/signup"
              className="inline-flex items-center gap-2 rounded-full bg-[color:var(--foreground)] px-6 py-3 text-sm font-medium text-white transition hover:opacity-90"
            >
              Get Started
              <ArrowRight size={16} />
            </Link>
            <a
              href="#how-it-works"
              className="inline-flex items-center gap-2 rounded-full border border-[color:var(--border)] px-6 py-3 text-sm font-medium transition hover:bg-black/5"
            >
              See How It Works
            </a>
          </motion.div>
        </div>

        <motion.div
          className="mt-16"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.5 }}
        >
          <PipelineVisual />
        </motion.div>
      </section>

      {/* ---- Features ---- */}
      <section className="mx-auto max-w-7xl px-6 py-20 md:px-10" id="features">
        <FadeIn className="text-center">
          <p className="text-xs uppercase tracking-[0.2em] text-[color:var(--muted)]">
            Capabilities
          </p>
          <h2 className="mt-3 text-3xl font-semibold tracking-tight md:text-4xl">
            Everything your AP team needs
          </h2>
        </FadeIn>

        <div className="mt-12 grid gap-6 sm:grid-cols-2">
          {features.map((feature, i) => {
            const Icon = feature.icon;
            return (
              <FadeIn key={feature.title} delay={i * 0.1}>
                <div className="rounded-[1.75rem] border border-[color:var(--border)] bg-[color:var(--surface)] p-6 shadow-card transition hover:shadow-lg">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[color:var(--accent)]/10">
                    <Icon size={20} className="text-[color:var(--accent)]" />
                  </div>
                  <h3 className="mt-4 text-lg font-semibold">{feature.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-[color:var(--muted)]">
                    {feature.description}
                  </p>
                </div>
              </FadeIn>
            );
          })}
        </div>
      </section>

      {/* ---- How It Works ---- */}
      <section
        className="mx-auto max-w-7xl px-6 py-20 md:px-10"
        id="how-it-works"
      >
        <FadeIn className="text-center">
          <p className="text-xs uppercase tracking-[0.2em] text-[color:var(--muted)]">
            How it works
          </p>
          <h2 className="mt-3 text-3xl font-semibold tracking-tight md:text-4xl">
            Three steps to zero overcharges
          </h2>
        </FadeIn>

        <div className="mt-14 grid gap-8 md:grid-cols-3">
          {steps.map((step, i) => {
            const Icon = step.icon;
            return (
              <FadeIn key={step.title} delay={i * 0.15} className="text-center">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-[#17202a]">
                  <Icon size={28} className="text-white" />
                </div>
                <div className="mx-auto mt-3 flex h-7 w-7 items-center justify-center rounded-full bg-[color:var(--accent)] text-xs font-bold text-white">
                  {i + 1}
                </div>
                <h3 className="mt-3 text-lg font-semibold">{step.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-[color:var(--muted)]">
                  {step.description}
                </p>
              </FadeIn>
            );
          })}
        </div>
      </section>

      {/* ---- Social Proof ---- */}
      <section className="mx-auto max-w-7xl px-6 py-20 md:px-10">
        <FadeIn>
          <div className="rounded-[2rem] border border-[color:var(--border)] bg-[color:var(--surface)] p-10 shadow-card md:p-14">
            <p className="text-center text-xs uppercase tracking-[0.2em] text-[color:var(--muted)]">
              Trusted by logistics teams
            </p>

            <div className="mt-8">
              <PlaceholderLogos />
            </div>

            <div className="mx-auto mt-12 max-w-lg text-center">
              <blockquote className="text-xl font-medium italic leading-relaxed text-[color:var(--foreground)]">
                &ldquo;Veriload saved us 12 hours per week on invoice review.
                Discrepancies that used to slip through now get caught
                automatically.&rdquo;
              </blockquote>
              <p className="mt-4 text-sm text-[color:var(--muted)]">
                — Director of Freight Operations
              </p>
            </div>
          </div>
        </FadeIn>
      </section>

      {/* ---- CTA ---- */}
      <section className="mx-auto max-w-7xl px-6 py-16 md:px-10">
        <FadeIn className="text-center">
          <h2 className="text-3xl font-semibold tracking-tight md:text-4xl">
            Ready to stop overpaying?
          </h2>
          <p className="mx-auto mt-4 max-w-md text-[color:var(--muted)]">
            Set up your account in minutes. Upload your first invoice and see
            Veriload in action.
          </p>
          <div className="mt-8">
            <Link
              href="/signup"
              className="inline-flex items-center gap-2 rounded-full bg-[color:var(--foreground)] px-6 py-3 text-sm font-medium text-white transition hover:opacity-90"
            >
              Get Started Free
              <ArrowRight size={16} />
            </Link>
          </div>
        </FadeIn>
      </section>

      {/* ---- Footer ---- */}
      <footer className="border-t border-[color:var(--border)] px-6 py-10 md:px-10">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 md:flex-row">
          <p className="text-sm font-semibold uppercase tracking-[0.22em] text-[color:var(--accent)]">
            Veriload
          </p>
          <div className="flex items-center gap-6 text-sm text-[color:var(--muted)]">
            <Link href="/login" className="transition hover:text-[color:var(--foreground)]">
              Log in
            </Link>
            <Link href="/signup" className="transition hover:text-[color:var(--foreground)]">
              Sign up
            </Link>
          </div>
          <p className="text-xs text-[color:var(--muted)]">
            &copy; {new Date().getFullYear()} Veriload. All rights reserved.
          </p>
        </div>
      </footer>
    </main>
  );
}
