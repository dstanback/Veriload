"use client";

import { AnimatePresence, motion } from "framer-motion";
import {
  Calendar,
  Eye,
  FileText,
  Loader2,
  RefreshCw,
  X,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { startTransition, useCallback, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useToast } from "@/components/ui/toast";
import { formatDate } from "@/lib/utils";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface SummaryItem {
  id: string;
  date: string;
  createdAt: string;
  html: string;
  stats: {
    documentsReceived: number;
    autoApproved: number;
    needsReview: number;
    disputes: number;
    potentialSavings: number;
  };
}

/* ------------------------------------------------------------------ */
/*  NotificationsList                                                  */
/* ------------------------------------------------------------------ */

export function NotificationsList({ items }: { items: SummaryItem[] }) {
  const router = useRouter();
  const { toast } = useToast();
  const [generating, setGenerating] = useState(false);
  const [previewHtml, setPreviewHtml] = useState<string | null>(null);

  const handleGenerate = useCallback(async () => {
    setGenerating(true);
    try {
      const res = await fetch("/api/notifications/daily-summary", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date: new Date().toISOString().slice(0, 10) }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? "Failed to generate summary.");
      }
      toast("Daily summary generated.", "success");
      startTransition(() => {
        router.refresh();
      });
    } catch (err) {
      toast(
        err instanceof Error ? err.message : "Failed to generate summary.",
        "error"
      );
    } finally {
      setGenerating(false);
    }
  }, [toast, router]);

  return (
    <>
      <div className="flex items-center justify-between">
        <p className="text-sm text-[color:var(--muted)]">
          {items.length} {items.length === 1 ? "summary" : "summaries"}
        </p>
        <Button onClick={handleGenerate} disabled={generating}>
          {generating ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <RefreshCw className="mr-2 h-4 w-4" />
          )}
          {generating ? "Generating..." : "Generate Now"}
        </Button>
      </div>

      {items.length === 0 ? (
        <Card className="flex flex-col items-center gap-3 py-12 text-center">
          <FileText className="h-10 w-10 text-[color:var(--muted)]" />
          <p className="text-sm text-[color:var(--muted)]">
            No summaries generated yet. Click &ldquo;Generate Now&rdquo; to
            create one for today.
          </p>
        </Card>
      ) : (
        <div className="space-y-3">
          {items.map((item) => (
            <Card
              key={item.id}
              className="flex items-center justify-between bg-white/90"
            >
              <div className="flex items-center gap-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50">
                  <Calendar className="h-5 w-5 text-indigo-600" />
                </div>
                <div>
                  <p className="text-sm font-semibold">{item.date}</p>
                  <p className="mt-0.5 text-xs text-[color:var(--muted)]">
                    Generated {formatDate(item.createdAt)}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-6">
                <div className="hidden gap-4 text-center sm:flex">
                  <StatPill
                    label="Docs"
                    value={item.stats.documentsReceived}
                  />
                  <StatPill
                    label="Auto"
                    value={item.stats.autoApproved}
                    color="text-emerald-600"
                  />
                  <StatPill
                    label="Review"
                    value={item.stats.needsReview}
                    color="text-amber-600"
                  />
                  <StatPill
                    label="Disputes"
                    value={item.stats.disputes}
                    color="text-rose-600"
                  />
                </div>

                <Button
                  variant="ghost"
                  className="gap-1.5 text-xs"
                  onClick={() => setPreviewHtml(item.html)}
                >
                  <Eye className="h-3.5 w-3.5" />
                  Preview
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      <AnimatePresence>
        {previewHtml && (
          <PreviewModal
            html={previewHtml}
            onClose={() => setPreviewHtml(null)}
          />
        )}
      </AnimatePresence>
    </>
  );
}

/* ------------------------------------------------------------------ */
/*  Stat pill                                                          */
/* ------------------------------------------------------------------ */

function StatPill({
  label,
  value,
  color,
}: {
  label: string;
  value: number;
  color?: string;
}) {
  return (
    <div>
      <p className={`text-sm font-semibold ${color ?? "text-[color:var(--foreground)]"}`}>
        {value}
      </p>
      <p className="text-[10px] text-[color:var(--muted)]">{label}</p>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Preview modal                                                      */
/* ------------------------------------------------------------------ */

function PreviewModal({
  html,
  onClose,
}: {
  html: string;
  onClose: () => void;
}) {
  const backdropRef = useRef<HTMLDivElement>(null);

  return (
    <>
      <motion.div
        ref={backdropRef}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm"
        onClick={(e) => {
          if (e.target === backdropRef.current) onClose();
        }}
      />
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 10 }}
        transition={{ type: "spring", damping: 30, stiffness: 300 }}
        className="fixed inset-6 z-50 flex flex-col overflow-hidden rounded-[1.75rem] border border-[color:var(--border)] bg-white shadow-2xl lg:inset-12"
      >
        <div className="flex items-center justify-between border-b border-[color:var(--border)] px-6 py-4">
          <h3 className="text-base font-semibold">Email Preview</h3>
          <button
            onClick={onClose}
            className="rounded-full p-2 text-[color:var(--muted)] transition hover:bg-black/5"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="flex-1 overflow-auto bg-slate-100 p-4">
          <iframe
            srcDoc={html}
            sandbox=""
            className="mx-auto h-full w-full max-w-[680px] rounded-lg border border-[color:var(--border)] bg-white shadow-sm"
            title="Email preview"
          />
        </div>
      </motion.div>
    </>
  );
}
