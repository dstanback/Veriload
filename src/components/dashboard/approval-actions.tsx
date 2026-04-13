"use client";

import { AnimatePresence, motion } from "framer-motion";
import {
  CheckCircle,
  ClipboardCopy,
  Loader2,
  Lock,
  Mail,
  Pencil,
  Send,
  X,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { startTransition, useCallback, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/toast";
import { cn } from "@/lib/utils";
import type { DiscrepancyRecord } from "@/types/discrepancies";
import type { ShipmentStatus } from "@/types/shipments";

/* ------------------------------------------------------------------ */
/*  Types                                                             */
/* ------------------------------------------------------------------ */

interface ApprovalActionsProps {
  shipmentId: string;
  status: ShipmentStatus;
  carrierName: string | null;
  shipmentRef: string | null;
  discrepancies: DiscrepancyRecord[];
  editMode?: boolean;
  onToggleEditMode?: () => void;
}

interface DisputeEmail {
  subject: string;
  body: string;
  sent?: boolean;
  messageId?: string | null;
  carrierEmail?: string | null;
}

/* ------------------------------------------------------------------ */
/*  Constants                                                         */
/* ------------------------------------------------------------------ */

const LOCKED_STATUSES: ShipmentStatus[] = ["approved", "disputed", "paid"];

const lockReasons: Record<string, string> = {
  approved: "This shipment has already been approved",
  disputed: "This shipment is currently disputed",
  paid: "This shipment has already been paid",
};

/* ------------------------------------------------------------------ */
/*  ApprovalActions                                                   */
/* ------------------------------------------------------------------ */

export function ApprovalActions({
  shipmentId,
  status,
  carrierName,
  shipmentRef,
  discrepancies,
  editMode,
  onToggleEditMode,
}: ApprovalActionsProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [loading, setLoading] = useState<"approve" | "dispute" | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const isLocked = LOCKED_STATUSES.includes(status);

  const handleApprove = async () => {
    setLoading("approve");
    try {
      const res = await fetch(`/api/shipments/${shipmentId}/approve`, {
        method: "POST",
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? "Failed to approve shipment.");
      }
      toast("Shipment approved successfully.", "success");
      startTransition(() => {
        router.refresh();
      });
    } catch (err) {
      toast(
        err instanceof Error ? err.message : "Failed to approve shipment.",
        "error"
      );
    } finally {
      setLoading(null);
    }
  };

  const handleDisputeSubmit = useCallback(
    async (
      reason: string,
      discrepancyIds: string[],
      carrierEmail: string
    ): Promise<DisputeEmail | null> => {
      setLoading("dispute");
      try {
        const res = await fetch(`/api/shipments/${shipmentId}/dispute`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            reason,
            discrepancyIds,
            ...(carrierEmail ? { carrierEmail } : {}),
          }),
        });
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body.error ?? "Failed to submit dispute.");
        }
        const data = (await res.json()) as {
          email?: DisputeEmail;
        };
        toast("Dispute submitted successfully.", "success");
        startTransition(() => {
          router.refresh();
        });
        return data.email ?? null;
      } catch (err) {
        toast(
          err instanceof Error
            ? err.message
            : "Failed to submit dispute.",
          "error"
        );
        return null;
      } finally {
        setLoading(null);
      }
    },
    [shipmentId, toast, router]
  );

  return (
    <>
      <div className="flex flex-wrap gap-3">
        <div className="group relative">
          <Button
            disabled={isLocked || loading !== null}
            onClick={handleApprove}
          >
            {loading === "approve" ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <CheckCircle className="mr-2 h-4 w-4" />
            )}
            {loading === "approve" ? "Approving..." : "Approve"}
          </Button>
          {isLocked && (
            <Tooltip text={lockReasons[status] ?? "Action unavailable"} />
          )}
        </div>
        <div className="group relative">
          <Button
            disabled={isLocked || loading !== null}
            onClick={() => setDrawerOpen(true)}
            variant="danger"
          >
            <Send className="mr-2 h-4 w-4" />
            Dispute
          </Button>
          {isLocked && (
            <Tooltip text={lockReasons[status] ?? "Action unavailable"} />
          )}
        </div>
        {onToggleEditMode && (
          <div className="group relative">
            <Button
              disabled={isLocked || loading !== null}
              onClick={onToggleEditMode}
              variant="secondary"
            >
              <Pencil className="mr-2 h-4 w-4" />
              {editMode ? "Cancel Edit" : "Edit & Approve"}
            </Button>
            {isLocked && (
              <Tooltip text={lockReasons[status] ?? "Action unavailable"} />
            )}
          </div>
        )}
      </div>

      <AnimatePresence>
        {drawerOpen && (
          <DisputeDrawer
            shipmentId={shipmentId}
            carrierName={carrierName}
            shipmentRef={shipmentRef}
            discrepancies={discrepancies}
            loading={loading === "dispute"}
            onSubmit={handleDisputeSubmit}
            onClose={() => setDrawerOpen(false)}
          />
        )}
      </AnimatePresence>
    </>
  );
}

/* ------------------------------------------------------------------ */
/*  Tooltip                                                           */
/* ------------------------------------------------------------------ */

function Tooltip({ text }: { text: string }) {
  return (
    <span className="pointer-events-none absolute -top-9 left-1/2 z-10 -translate-x-1/2 whitespace-nowrap rounded-lg bg-[color:var(--foreground)] px-3 py-1.5 text-xs text-white opacity-0 shadow-lg transition group-hover:opacity-100">
      <Lock className="mr-1 inline h-3 w-3" />
      {text}
    </span>
  );
}

/* ------------------------------------------------------------------ */
/*  Email preview pane                                                */
/* ------------------------------------------------------------------ */

function EmailPreview({
  email,
  carrierName,
  onClose,
}: {
  email: DisputeEmail;
  carrierName: string | null;
  onClose: () => void;
}) {
  const { toast } = useToast();

  const handleCopy = async () => {
    const text = `To: ${carrierName ?? "Carrier"}\nSubject: ${email.subject}\n\n${email.body}`;
    try {
      await navigator.clipboard.writeText(text);
      toast("Email copied to clipboard.", "success");
    } catch {
      toast("Failed to copy to clipboard.", "error");
    }
  };

  return (
    <div className="flex flex-1 flex-col">
      <div className="flex-1 space-y-4 overflow-y-auto px-6 py-6">
        {/* Send status banner */}
        {email.sent ? (
          <div className="flex items-center gap-2 rounded-xl bg-emerald-50 px-4 py-3 text-emerald-700">
            <Mail className="h-5 w-5 shrink-0" />
            <div>
              <p className="text-sm font-semibold">
                Email sent to {email.carrierEmail}
              </p>
              {email.messageId && (
                <p className="mt-0.5 text-xs text-emerald-600">
                  Message ID: {email.messageId}
                </p>
              )}
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-2 text-emerald-700">
            <CheckCircle className="h-5 w-5" />
            <p className="text-sm font-semibold">
              Dispute submitted — email draft ready
            </p>
          </div>
        )}

        <div className="space-y-3 rounded-2xl border border-[color:var(--border)] bg-slate-50 p-5">
          <div>
            <p className="text-[10px] uppercase tracking-[0.2em] text-[color:var(--muted)]">
              To
            </p>
            <p className="mt-0.5 text-sm font-medium text-[color:var(--foreground)]">
              {email.carrierEmail ?? `${carrierName ?? "Carrier"} — Accounts Receivable`}
            </p>
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-[0.2em] text-[color:var(--muted)]">
              Subject
            </p>
            <p className="mt-0.5 text-sm font-semibold text-[color:var(--foreground)]">
              {email.subject}
            </p>
          </div>
          <hr className="border-[color:var(--border)]" />
          <div className="whitespace-pre-wrap text-sm leading-relaxed text-[color:var(--foreground)]">
            {email.body}
          </div>
        </div>
      </div>

      <div className="flex gap-3 border-t border-[color:var(--border)] px-6 py-4">
        <Button variant="secondary" className="flex-1" onClick={handleCopy}>
          <ClipboardCopy className="mr-2 h-4 w-4" />
          Copy to Clipboard
        </Button>
        <Button className="flex-1" onClick={onClose}>
          Done
        </Button>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Dispute drawer                                                    */
/* ------------------------------------------------------------------ */

function DisputeDrawer({
  shipmentId,
  carrierName,
  shipmentRef,
  discrepancies,
  loading,
  onSubmit,
  onClose,
}: {
  shipmentId: string;
  carrierName: string | null;
  shipmentRef: string | null;
  discrepancies: DiscrepancyRecord[];
  loading: boolean;
  onSubmit: (
    reason: string,
    discrepancyIds: string[],
    carrierEmail: string
  ) => Promise<DisputeEmail | null>;
  onClose: () => void;
}) {
  const flaggable = discrepancies.filter(
    (d) => d.severity === "red" || d.severity === "yellow"
  );
  const [selected, setSelected] = useState<Set<string>>(() => {
    const initial = new Set<string>();
    for (const d of flaggable) {
      if (d.severity === "red") initial.add(d.id);
    }
    return initial;
  });
  const [reason, setReason] = useState("");
  const [carrierEmail, setCarrierEmail] = useState("");
  const [emailPreview, setEmailPreview] = useState<DisputeEmail | null>(null);
  const backdropRef = useRef<HTMLDivElement>(null);

  const toggleDiscrepancy = useCallback((id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  const handleSubmit = async () => {
    if (!reason.trim()) return;
    const email = await onSubmit(
      reason.trim(),
      Array.from(selected),
      carrierEmail.trim()
    );
    if (email) {
      setEmailPreview(email);
    }
  };

  const hasCarrierEmail = carrierEmail.trim().length > 0;

  return (
    <>
      {/* Backdrop */}
      <motion.div
        ref={backdropRef}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-40 bg-black/30"
        onClick={(e) => {
          if (e.target === backdropRef.current && !loading) onClose();
        }}
      />

      {/* Drawer */}
      <motion.div
        initial={{ x: "100%" }}
        animate={{ x: 0 }}
        exit={{ x: "100%" }}
        transition={{ type: "spring", damping: 30, stiffness: 300 }}
        className="fixed right-0 top-0 z-50 flex h-full w-[480px] max-w-[90vw] flex-col bg-white shadow-2xl"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[color:var(--border)] px-6 py-4">
          <h3 className="text-lg font-semibold text-[color:var(--foreground)]">
            {emailPreview ? "Dispute Email Preview" : "Submit Dispute"}
          </h3>
          <button
            onClick={onClose}
            disabled={loading}
            className="rounded-full p-1.5 text-[color:var(--muted)] transition hover:bg-black/5 disabled:opacity-50"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {emailPreview ? (
          /* ---- Email preview ---- */
          <EmailPreview
            email={emailPreview}
            carrierName={carrierName}
            onClose={onClose}
          />
        ) : (
          /* ---- Dispute form ---- */
          <>
            <div className="flex-1 space-y-6 overflow-y-auto px-6 py-6">
              {/* Shipment info */}
              <div className="space-y-3">
                <div>
                  <label className="text-xs uppercase tracking-[0.2em] text-[color:var(--muted)]">
                    Carrier
                  </label>
                  <p className="mt-1 text-sm font-medium text-[color:var(--foreground)]">
                    {carrierName ?? "Unknown carrier"}
                  </p>
                </div>
                <div>
                  <label className="text-xs uppercase tracking-[0.2em] text-[color:var(--muted)]">
                    Shipment reference
                  </label>
                  <p className="mt-1 text-sm font-medium text-[color:var(--foreground)]">
                    {shipmentRef ?? shipmentId}
                  </p>
                </div>
              </div>

              {/* Carrier email (optional) */}
              <div className="space-y-2">
                <label className="text-xs uppercase tracking-[0.2em] text-[color:var(--muted)]">
                  Carrier email (optional)
                </label>
                <Input
                  type="email"
                  placeholder="ap@carrier.com"
                  value={carrierEmail}
                  onChange={(e) => setCarrierEmail(e.target.value)}
                />
                <p className="text-xs text-[color:var(--muted)]">
                  If provided, the dispute email will be sent automatically when SendGrid is configured.
                </p>
              </div>

              {/* Discrepancy checkboxes */}
              {flaggable.length > 0 && (
                <div className="space-y-3">
                  <p className="text-xs uppercase tracking-[0.2em] text-[color:var(--muted)]">
                    Discrepancies to dispute
                  </p>
                  <div className="space-y-2">
                    {flaggable.map((d) => (
                      <label
                        key={d.id}
                        className={cn(
                          "flex cursor-pointer items-start gap-3 rounded-xl border px-4 py-3 transition",
                          selected.has(d.id)
                            ? "border-[color:var(--danger)] bg-rose-50"
                            : "border-[color:var(--border)] bg-white hover:bg-black/[0.02]"
                        )}
                      >
                        <input
                          type="checkbox"
                          checked={selected.has(d.id)}
                          onChange={() => toggleDiscrepancy(d.id)}
                          className="mt-0.5 h-4 w-4 shrink-0 rounded accent-[color:var(--danger)]"
                        />
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium text-[color:var(--foreground)]">
                            {d.field_name}
                          </p>
                          <p className="mt-0.5 text-xs text-[color:var(--muted)]">
                            {d.source_value ?? "—"} vs{" "}
                            {d.compare_value ?? "—"}
                            {d.variance_amount != null && (
                              <span className="ml-1.5 font-medium text-rose-600">
                                ($
                                {Math.abs(d.variance_amount).toFixed(2)}{" "}
                                variance)
                              </span>
                            )}
                          </p>
                        </div>
                        <span
                          className={cn(
                            "shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase",
                            d.severity === "red"
                              ? "bg-rose-100 text-rose-800"
                              : "bg-amber-100 text-amber-900"
                          )}
                        >
                          {d.severity}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>
              )}

              {/* Reason textarea */}
              <div className="space-y-2">
                <label className="text-xs uppercase tracking-[0.2em] text-[color:var(--muted)]">
                  Dispute reason / message
                </label>
                <Textarea
                  rows={4}
                  placeholder="Describe the issue with this shipment..."
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                />
              </div>
            </div>

            {/* Footer */}
            <div className="border-t border-[color:var(--border)] px-6 py-4">
              <Button
                variant="danger"
                className="w-full"
                disabled={loading || !reason.trim()}
                onClick={handleSubmit}
              >
                {loading ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : hasCarrierEmail ? (
                  <Mail className="mr-2 h-4 w-4" />
                ) : (
                  <Send className="mr-2 h-4 w-4" />
                )}
                {loading
                  ? "Submitting..."
                  : hasCarrierEmail
                    ? "Submit & Send"
                    : "Submit Dispute"}
              </Button>
            </div>
          </>
        )}
      </motion.div>
    </>
  );
}
