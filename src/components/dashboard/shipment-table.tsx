"use client";

import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  useReactTable,
  type RowSelectionState,
} from "@tanstack/react-table";
import { AnimatePresence, motion } from "framer-motion";
import { CheckCircle, Loader2, X } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { startTransition, useCallback, useMemo, useRef, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useToast } from "@/components/ui/toast";
import { cn, formatCurrency } from "@/lib/utils";
import type { ShipmentDetail, ShipmentRecord } from "@/types/shipments";

/* ------------------------------------------------------------------ */
/*  Helpers                                                           */
/* ------------------------------------------------------------------ */

function badgeTone(level: ShipmentRecord["discrepancy_level"]) {
  if (level === "green") return "green";
  if (level === "yellow") return "yellow";
  if (level === "red") return "red";
  return "neutral";
}

const APPROVABLE_STATUSES = new Set(["pending", "matched"]);

function getInvoiceAmount(
  shipment: ShipmentRecord,
  detailMap?: Record<string, ShipmentDetail | null>
) {
  const detail = detailMap?.[shipment.id];
  const invoice = detail?.documents.find(
    (d) => d.doc_type === "invoice"
  )?.extracted_data?.extracted_fields;
  return invoice && "total_amount" in invoice ? invoice.total_amount : null;
}

/* ------------------------------------------------------------------ */
/*  Checkbox                                                          */
/* ------------------------------------------------------------------ */

function RowCheckbox({
  checked,
  indeterminate,
  onChange,
  ariaLabel,
}: {
  checked: boolean;
  indeterminate?: boolean;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  ariaLabel: string;
}) {
  const ref = useRef<HTMLInputElement>(null);

  // sync indeterminate (not controllable via React attribute)
  if (ref.current) {
    ref.current.indeterminate = !!indeterminate;
  }

  return (
    <input
      ref={ref}
      type="checkbox"
      checked={checked}
      onChange={onChange}
      aria-label={ariaLabel}
      className="h-4 w-4 cursor-pointer rounded border-slate-300 accent-indigo-600"
    />
  );
}

/* ------------------------------------------------------------------ */
/*  Column definitions                                                */
/* ------------------------------------------------------------------ */

const col = createColumnHelper<ShipmentRecord>();

function buildColumns(
  detailMap?: Record<string, ShipmentDetail | null>
) {
  return [
    col.display({
      id: "select",
      header: ({ table }) => (
        <RowCheckbox
          checked={table.getIsAllPageRowsSelected()}
          indeterminate={table.getIsSomePageRowsSelected()}
          onChange={table.getToggleAllPageRowsSelectedHandler()}
          ariaLabel="Select all shipments"
        />
      ),
      cell: ({ row }) => (
        <RowCheckbox
          checked={row.getIsSelected()}
          onChange={row.getToggleSelectedHandler()}
          ariaLabel={`Select shipment ${row.original.shipment_ref ?? row.original.id}`}
        />
      ),
      size: 48,
    }),
    col.accessor("shipment_ref", {
      header: "Shipment",
      cell: (info) => {
        const s = info.row.original;
        return (
          <div>
            <Link
              className="font-semibold hover:text-[color:var(--accent)]"
              href={`/dashboard/shipments/${s.id}`}
            >
              {s.shipment_ref ?? s.bol_number ?? s.id}
            </Link>
            <p className="mt-1 text-xs text-[color:var(--muted)]">
              BoL {s.bol_number ?? "Pending"}
            </p>
          </div>
        );
      },
    }),
    col.accessor("carrier_name", {
      header: "Carrier",
      cell: (info) => {
        const s = info.row.original;
        return (
          <div>
            <p>{s.carrier_name ?? "Unknown carrier"}</p>
            <p className="mt-1 text-xs text-[color:var(--muted)]">
              {s.carrier_scac ?? "No SCAC"}
            </p>
          </div>
        );
      },
    }),
    col.accessor("origin", {
      header: "Lane",
      cell: (info) => {
        const s = info.row.original;
        return (
          <div>
            <p>{s.origin ?? "Unknown origin"}</p>
            <p className="mt-1 text-xs text-[color:var(--muted)]">
              {s.destination ?? "Unknown destination"}
            </p>
          </div>
        );
      },
    }),
    col.display({
      id: "invoice",
      header: "Invoice",
      cell: (info) =>
        formatCurrency(getInvoiceAmount(info.row.original, detailMap)),
    }),
    col.accessor("status", {
      header: "Status",
      cell: (info) => (
        <Badge
          tone={
            info.getValue() as
              | "approved"
              | "disputed"
              | "matched"
              | "pending"
          }
        >
          {info.getValue()}
        </Badge>
      ),
    }),
    col.accessor("discrepancy_level", {
      header: "Discrepancy",
      cell: (info) => (
        <Badge tone={badgeTone(info.getValue())}>
          {info.getValue() ?? "none"}
        </Badge>
      ),
    }),
    col.accessor("match_confidence", {
      header: "Confidence",
      cell: (info) => `${info.getValue()?.toFixed(0) ?? "—"}%`,
    }),
  ];
}

/* ------------------------------------------------------------------ */
/*  Confirmation modal                                                */
/* ------------------------------------------------------------------ */

function ConfirmModal({
  count,
  onConfirm,
  onCancel,
}: {
  count: number;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm"
      onClick={(e) => {
        if (e.target === e.currentTarget) onCancel();
      }}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 12 }}
        transition={{ type: "spring", damping: 25, stiffness: 350 }}
        className="w-full max-w-md rounded-2xl border border-[color:var(--border)] bg-white p-6 shadow-xl"
      >
        <h3 className="text-lg font-semibold text-[color:var(--foreground)]">
          Approve {count} shipment{count !== 1 ? "s" : ""}?
        </h3>
        <p className="mt-2 text-sm text-[color:var(--muted)]">
          This will mark all associated discrepancies as manually approved. This
          action cannot be undone.
        </p>
        <div className="mt-6 flex justify-end gap-3">
          <Button variant="ghost" onClick={onCancel}>
            Cancel
          </Button>
          <Button onClick={onConfirm}>
            <CheckCircle className="mr-2 h-4 w-4" />
            Confirm Approval
          </Button>
        </div>
      </motion.div>
    </motion.div>
  );
}

/* ------------------------------------------------------------------ */
/*  Bulk action bar                                                   */
/* ------------------------------------------------------------------ */

function BulkActionBar({
  selectedCount,
  eligibleCount,
  loading,
  progress,
  onApprove,
  onClear,
}: {
  selectedCount: number;
  eligibleCount: number;
  loading: boolean;
  progress: { done: number; total: number } | null;
  onApprove: () => void;
  onClear: () => void;
}) {
  const allEligible = eligibleCount === selectedCount;

  return (
    <motion.div
      initial={{ y: 80, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ y: 80, opacity: 0 }}
      transition={{ type: "spring", damping: 25, stiffness: 300 }}
      className="fixed bottom-0 left-0 right-0 z-40 border-t border-slate-200 bg-white/80 backdrop-blur-md"
    >
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-3">
        <div className="flex items-center gap-4">
          <p className="text-sm font-semibold text-[color:var(--foreground)]">
            {selectedCount} shipment{selectedCount !== 1 ? "s" : ""} selected
          </p>
          {!allEligible && (
            <p className="text-xs text-amber-700">
              {eligibleCount} of {selectedCount} selected are eligible for
              approval
            </p>
          )}
        </div>
        <div className="flex items-center gap-3">
          {progress && (
            <p className="text-sm text-[color:var(--muted)]">
              Approved {progress.done} of {progress.total}...
            </p>
          )}
          <Button variant="ghost" onClick={onClear} disabled={loading}>
            Clear Selection
          </Button>
          <Button
            disabled={eligibleCount === 0 || loading}
            onClick={onApprove}
          >
            {loading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <CheckCircle className="mr-2 h-4 w-4" />
            )}
            {loading
              ? "Approving..."
              : `Approve${allEligible ? "" : ` ${eligibleCount}`} Selected`}
          </Button>
        </div>
      </div>
    </motion.div>
  );
}

/* ------------------------------------------------------------------ */
/*  Main table component                                              */
/* ------------------------------------------------------------------ */

export function ShipmentTable({
  shipments,
  detailMap,
}: {
  shipments: ShipmentRecord[];
  detailMap?: Record<string, ShipmentDetail | null>;
}) {
  const router = useRouter();
  const { toast } = useToast();

  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});
  const [showConfirm, setShowConfirm] = useState(false);
  const [bulkLoading, setBulkLoading] = useState(false);
  const [progress, setProgress] = useState<{
    done: number;
    total: number;
  } | null>(null);

  const columns = useMemo(() => buildColumns(detailMap), [detailMap]);

  const table = useReactTable({
    data: shipments,
    columns,
    state: { rowSelection },
    onRowSelectionChange: setRowSelection,
    getCoreRowModel: getCoreRowModel(),
    getRowId: (row) => row.id,
    enableRowSelection: true,
  });

  const selectedRows = table.getSelectedRowModel().rows;
  const selectedCount = selectedRows.length;
  const eligibleRows = selectedRows.filter((r) =>
    APPROVABLE_STATUSES.has(r.original.status)
  );
  const eligibleCount = eligibleRows.length;

  const clearSelection = useCallback(() => {
    setRowSelection({});
  }, []);

  const handleBulkApprove = useCallback(async () => {
    setShowConfirm(false);
    setBulkLoading(true);

    const targets = eligibleRows.map((r) => r.original);
    setProgress({ done: 0, total: targets.length });

    const results: { id: string; ok: boolean; ref: string }[] = [];

    // Fire all requests in parallel, tracking progress as each settles
    await Promise.all(
      targets.map(async (shipment) => {
        try {
          const res = await fetch(`/api/shipments/${shipment.id}/approve`, {
            method: "POST",
          });
          results.push({
            id: shipment.id,
            ok: res.ok,
            ref: shipment.shipment_ref ?? shipment.bol_number ?? shipment.id,
          });
        } catch {
          results.push({
            id: shipment.id,
            ok: false,
            ref: shipment.shipment_ref ?? shipment.bol_number ?? shipment.id,
          });
        }
        setProgress((prev) =>
          prev ? { ...prev, done: prev.done + 1 } : null
        );
      })
    );

    const succeeded = results.filter((r) => r.ok);
    const failed = results.filter((r) => !r.ok);

    if (failed.length === 0) {
      toast(
        `Successfully approved ${succeeded.length} shipment${succeeded.length !== 1 ? "s" : ""}.`,
        "success"
      );
    } else if (succeeded.length > 0) {
      toast(
        `Approved ${succeeded.length} shipment${succeeded.length !== 1 ? "s" : ""}. ${failed.length} failed: ${failed.map((f) => f.ref).join(", ")}`,
        "error"
      );
    } else {
      toast(
        `All ${failed.length} approvals failed. Please try again.`,
        "error"
      );
    }

    clearSelection();
    setBulkLoading(false);
    setProgress(null);
    startTransition(() => {
      router.refresh();
    });
  }, [eligibleRows, toast, clearSelection, router]);

  return (
    <>
      <Card className="overflow-hidden p-0">
        <div className="overflow-x-auto">
          <table className="min-w-full border-collapse text-left text-sm">
            <thead className="bg-black/5 text-[color:var(--muted)]">
              {table.getHeaderGroups().map((hg) => (
                <tr key={hg.id}>
                  {hg.headers.map((header) => (
                    <th
                      key={header.id}
                      className={cn(
                        "px-6 py-4 font-medium",
                        header.id === "select" && "w-12"
                      )}
                    >
                      {header.isPlaceholder
                        ? null
                        : flexRender(
                            header.column.columnDef.header,
                            header.getContext()
                          )}
                    </th>
                  ))}
                </tr>
              ))}
            </thead>
            <tbody>
              {table.getRowModel().rows.map((row) => (
                <tr
                  key={row.id}
                  className={cn(
                    "border-t border-[color:var(--border)] transition-colors",
                    row.getIsSelected() && "bg-indigo-50"
                  )}
                >
                  {row.getVisibleCells().map((cell) => (
                    <td key={cell.id} className="px-6 py-4">
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext()
                      )}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Bulk action bar */}
      <AnimatePresence>
        {selectedCount > 0 && (
          <BulkActionBar
            selectedCount={selectedCount}
            eligibleCount={eligibleCount}
            loading={bulkLoading}
            progress={progress}
            onApprove={() => setShowConfirm(true)}
            onClear={clearSelection}
          />
        )}
      </AnimatePresence>

      {/* Confirmation modal */}
      <AnimatePresence>
        {showConfirm && (
          <ConfirmModal
            count={eligibleCount}
            onConfirm={handleBulkApprove}
            onCancel={() => setShowConfirm(false)}
          />
        )}
      </AnimatePresence>
    </>
  );
}
