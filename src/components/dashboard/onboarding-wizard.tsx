"use client";

import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowRight,
  CheckCircle,
  FileText,
  Rocket,
  SkipForward,
  Upload,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { UploadDropzone } from "@/components/dashboard/upload-dropzone";

/* ------------------------------------------------------------------ */
/*  Types                                                             */
/* ------------------------------------------------------------------ */

interface OnboardingWizardProps {
  userName: string;
  orgName: string;
}

/* ------------------------------------------------------------------ */
/*  Progress indicator                                                */
/* ------------------------------------------------------------------ */

function StepIndicator({ current, total }: { current: number; total: number }) {
  return (
    <div className="flex items-center justify-center gap-2">
      {Array.from({ length: total }, (_, i) => (
        <div
          key={i}
          className={`h-2 rounded-full transition-all duration-300 ${
            i === current
              ? "w-8 bg-[color:var(--accent)]"
              : i < current
                ? "w-2 bg-[color:var(--accent)]/60"
                : "w-2 bg-[color:var(--border)]"
          }`}
        />
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Step 1: Welcome                                                   */
/* ------------------------------------------------------------------ */

function WelcomeStep({
  userName,
  orgName,
  onNext,
  onSkip,
}: {
  userName: string;
  orgName: string;
  onNext: () => void;
  onSkip: () => void;
}) {
  return (
    <div className="flex flex-col items-center text-center">
      <motion.div
        className="flex h-20 w-20 items-center justify-center rounded-3xl bg-[color:var(--accent)]/10"
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: "spring", damping: 12, stiffness: 200 }}
      >
        <Rocket size={36} className="text-[color:var(--accent)]" />
      </motion.div>

      <motion.h1
        className="mt-6 text-3xl font-semibold tracking-tight"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
      >
        Welcome to Veriload, {userName.split(" ")[0]}!
      </motion.h1>

      <motion.p
        className="mt-3 max-w-md text-[color:var(--muted)]"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.25 }}
      >
        Veriload automates freight bill reconciliation for{" "}
        <span className="font-medium text-[color:var(--foreground)]">{orgName}</span>.
        Upload invoices, BoLs, and rate confirmations — AI extracts the data,
        matches documents, and flags discrepancies automatically.
      </motion.p>

      <motion.div
        className="mt-8 flex items-center gap-3"
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.35 }}
      >
        <Button onClick={onNext}>
          Let&apos;s Get Started
          <ArrowRight size={16} className="ml-2" />
        </Button>
        <Button variant="ghost" onClick={onSkip}>
          <SkipForward size={16} className="mr-1.5" />
          Skip
        </Button>
      </motion.div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Step 2: Upload                                                    */
/* ------------------------------------------------------------------ */

function UploadStep({
  onNext,
  onSkip,
}: {
  onNext: () => void;
  onSkip: () => void;
}) {
  return (
    <div className="space-y-6">
      <div className="text-center">
        <motion.div
          className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[#17202a]"
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", damping: 12 }}
        >
          <Upload size={24} className="text-white" />
        </motion.div>
        <motion.h2
          className="mt-4 text-2xl font-semibold"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          Upload Your First Document
        </motion.h2>
        <motion.p
          className="mx-auto mt-2 max-w-md text-sm text-[color:var(--muted)]"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          Upload a BOL, invoice, or rate confirmation to see Veriload in action.
          The AI pipeline will classify and extract data from your document.
        </motion.p>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
      >
        <UploadDropzone />
      </motion.div>

      <motion.div
        className="flex items-center justify-center gap-3"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
      >
        <Button onClick={onNext}>
          Continue
          <ArrowRight size={16} className="ml-2" />
        </Button>
        <Button variant="ghost" onClick={onSkip}>
          <SkipForward size={16} className="mr-1.5" />
          Skip
        </Button>
      </motion.div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Step 3: Results                                                   */
/* ------------------------------------------------------------------ */

function ResultsStep({ onFinish }: { onFinish: () => void }) {
  return (
    <div className="flex flex-col items-center text-center">
      <motion.div
        className="flex h-20 w-20 items-center justify-center rounded-3xl bg-emerald-100"
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: "spring", damping: 12 }}
      >
        <CheckCircle size={36} className="text-emerald-600" />
      </motion.div>

      <motion.h2
        className="mt-6 text-2xl font-semibold"
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
      >
        You&apos;re All Set!
      </motion.h2>

      <motion.p
        className="mt-3 max-w-md text-[color:var(--muted)]"
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.25 }}
      >
        Your documents are being processed by the AI pipeline. Head to the
        dashboard to see extraction results, shipment matches, and discrepancy
        detection in action.
      </motion.p>

      <motion.div
        className="mt-8 grid gap-3 sm:grid-cols-3"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.35 }}
      >
        {[
          { icon: FileText, label: "Documents are classified" },
          { icon: CheckCircle, label: "Fields are extracted" },
          { icon: Rocket, label: "Discrepancies flagged" },
        ].map((item) => {
          const Icon = item.icon;
          return (
            <div
              key={item.label}
              className="rounded-2xl border border-[color:var(--border)] bg-white/80 px-4 py-3 text-sm"
            >
              <Icon size={18} className="mx-auto mb-2 text-[color:var(--accent)]" />
              {item.label}
            </div>
          );
        })}
      </motion.div>

      <motion.div
        className="mt-8"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
      >
        <Button onClick={onFinish}>
          Go to Dashboard
          <ArrowRight size={16} className="ml-2" />
        </Button>
      </motion.div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Main wizard                                                       */
/* ------------------------------------------------------------------ */

export function OnboardingWizard({ userName, orgName }: OnboardingWizardProps) {
  const router = useRouter();
  const [step, setStep] = useState(0);

  const completeOnboarding = useCallback(async () => {
    await fetch("/api/onboarding/complete", { method: "POST" });
    router.push("/dashboard");
    router.refresh();
  }, [router]);

  const handleNext = useCallback(() => setStep((s) => s + 1), []);

  return (
    <div className="mx-auto max-w-2xl py-8">
      <Card className="bg-white/90 p-8 md:p-12">
        <StepIndicator current={step} total={3} />

        <div className="mt-10">
          <AnimatePresence mode="wait">
            {step === 0 && (
              <motion.div
                key="welcome"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3 }}
              >
                <WelcomeStep
                  userName={userName}
                  orgName={orgName}
                  onNext={handleNext}
                  onSkip={completeOnboarding}
                />
              </motion.div>
            )}

            {step === 1 && (
              <motion.div
                key="upload"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3 }}
              >
                <UploadStep onNext={handleNext} onSkip={completeOnboarding} />
              </motion.div>
            )}

            {step === 2 && (
              <motion.div
                key="results"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3 }}
              >
                <ResultsStep onFinish={completeOnboarding} />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </Card>
    </div>
  );
}
