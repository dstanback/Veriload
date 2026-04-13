"use client";

import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { AnimatePresence, motion } from "framer-motion";
import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Search,
  User as UserIcon,
} from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";

import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { getAuditActionMeta, KNOWN_ACTIONS } from "@/lib/utils/audit-labels";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface AuditLogEntry {
  id: string;
  organization_id: string;
  user_id: string | null;
  shipment_id: string | null;
  action: string;
  details: Record<string, unknown>;
  created_at: string;
  user_name: string | null;
  user_email: string | null;
  shipment_ref: string | null;
}

interface OrgUser {
  id: string;
  name: string;
  email: string;
}

interface AuditLogTableProps {
  initialLogs: AuditLogEntry[];
  initialTotal: number;
  users: OrgUser[];
}

/* ------------------------------------------------------------------ */
/*  Relative time formatter                                            */
/* ------------------------------------------------------------------ */

function relativeTime(iso: string): string {
  const now = Date.now();
  const then = new Date(iso).getTime();
  const diffSec = Math.floor((now - then) / 1000);

  if (diffSec < 60) return "Just now";
  if (diffSec < 3600) {
    const m = Math.floor(diffSec / 60);
    return `${m}m ago`;
  }
  if (diffSec < 86400) {
    const h = Math.floor(diffSec / 3600);
    return `${h}h ago`;
  }
  if (diffSec < 604800) {
    const d = Math.floor(diffSec / 86400);
    return `${d}d ago`;
  }
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function fullDate(iso: string): string {
  return new Date(iso).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

/* ------------------------------------------------------------------ */
/*  Expandable details                                                 */
/* ------------------------------------------------------------------ */

function ExpandedDetails({ entry }: { entry: AuditLogEntry }) {
  const details = entry.details;

  // Specific renderers for known action types
  if (
    entry.action === "shipment_disputed" &&
    typeof details.reason === "string"
  ) {
    return (
      <div className="space-y-2 text-sm">
        <KV label="Reason" value={String(details.reason)} />
        {details.user_name != null && (
          <KV label="User" value={String(details.user_name)} />
        )}
        {details.disputed_discrepancy_count != null && (
          <KV
            label="Discrepancies disputed"
            value={String(details.disputed_discrepancy_count)}
          />
        )}
      </div>
    );
  }

  if (entry.action === "shipment_edit_approved" && Array.isArray(details.edits)) {
    return (
      <div className="space-y-3 text-sm">
        {details.user_name != null && (
          <KV label="User" value={String(details.user_name)} />
        )}
        <p className="font-medium text-[color:var(--foreground)]">Edits</p>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-[color:var(--border)] text-[color:var(--muted)]">
                <th className="pb-1.5 text-left font-medium">Field</th>
                <th className="pb-1.5 text-left font-medium">Before</th>
                <th className="pb-1.5 text-left font-medium">After</th>
              </tr>
            </thead>
            <tbody>
              {(details.edits as Array<Record<string, unknown>>).map(
                (edit, i) => (
                  <tr
                    key={i}
                    className="border-b border-[color:var(--border)] last:border-0"
                  >
                    <td className="py-1.5 font-medium">
                      {String(edit.field ?? "—")}
                    </td>
                    <td className="py-1.5 text-red-600 dark:text-red-400">
                      {String(edit.from ?? "—")}
                    </td>
                    <td className="py-1.5 text-emerald-600 dark:text-emerald-400">
                      {String(edit.to ?? "—")}
                    </td>
                  </tr>
                ),
              )}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  if (
    entry.action === "email_ingested" &&
    typeof details.sender === "string"
  ) {
    return (
      <div className="space-y-2 text-sm">
        <KV label="Sender" value={String(details.sender)} />
        {details.subject != null && <KV label="Subject" value={String(details.subject)} />}
        {details.attachmentCount != null && (
          <KV label="Attachments" value={String(details.attachmentCount)} />
        )}
        {details.processedCount != null && (
          <KV label="Processed" value={String(details.processedCount)} />
        )}
        {details.skippedDuplicates != null && (
          <KV
            label="Duplicates skipped"
            value={String(details.skippedDuplicates)}
          />
        )}
      </div>
    );
  }

  if (entry.action === "daily_summary_generated") {
    return (
      <div className="space-y-2 text-sm">
        {Object.entries(details).map(([k, v]) => (
          <KV key={k} label={humanizeKey(k)} value={formatValue(v)} />
        ))}
        <Link
          href="/dashboard/notifications"
          className="mt-2 inline-block text-xs font-medium text-[color:var(--accent)] hover:underline"
        >
          Preview Email &rarr;
        </Link>
      </div>
    );
  }

  // Generic: render all key-value pairs
  const entries = Object.entries(details);
  if (entries.length === 0) {
    return (
      <p className="text-sm text-[color:var(--muted)]">No additional details</p>
    );
  }

  return (
    <div className="space-y-2 text-sm">
      {entries.map(([k, v]) => (
        <KV key={k} label={humanizeKey(k)} value={formatValue(v)} />
      ))}
    </div>
  );
}

function KV({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex gap-3">
      <span className="shrink-0 text-[color:var(--muted)]">{label}:</span>
      <span className="font-[family-name:var(--font-code)] text-[color:var(--foreground)] break-all">
        {value}
      </span>
    </div>
  );
}

function humanizeKey(key: string) {
  return key
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function formatValue(v: unknown): string {
  if (v == null) return "—";
  if (typeof v === "object") return JSON.stringify(v);
  return String(v);
}

/* ------------------------------------------------------------------ */
/*  Filter bar                                                         */
/* ------------------------------------------------------------------ */

function FilterBar({
  users,
  filters,
  onFiltersChange,
}: {
  users: OrgUser[];
  filters: FilterState;
  onFiltersChange: (f: FilterState) => void;
}) {
  return (
    <div className="space-y-3">
      {/* Action pills */}
      <div className="flex flex-wrap gap-1.5">
        {KNOWN_ACTIONS.map((action) => {
          const meta = getAuditActionMeta(action);
          const active = filters.actions.includes(action);
          return (
            <button
              key={action}
              type="button"
              onClick={() => {
                const next = active
                  ? filters.actions.filter((a) => a !== action)
                  : [...filters.actions, action];
                onFiltersChange({ ...filters, actions: next });
              }}
              className={cn(
                "rounded-full px-3 py-1 text-xs font-medium transition",
                active
                  ? "bg-[color:var(--foreground)] text-white dark:bg-slate-100 dark:text-slate-900"
                  : "border border-[color:var(--border)] bg-[color:var(--surface)] text-[color:var(--muted)] hover:bg-[color:var(--border)]",
              )}
            >
              {meta.label}
            </button>
          );
        })}
      </div>

      {/* Second row: user, dates, shipment */}
      <div className="flex flex-wrap items-end gap-3">
        <label className="flex flex-col gap-1 text-xs text-[color:var(--muted)]">
          User
          <select
            value={filters.userId}
            onChange={(e) =>
              onFiltersChange({ ...filters, userId: e.target.value })
            }
            className="rounded-xl border border-[color:var(--border)] bg-[color:var(--surface)] px-3 py-1.5 text-xs text-[color:var(--foreground)]"
          >
            <option value="">All users</option>
            {users.map((u) => (
              <option key={u.id} value={u.id}>
                {u.name}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1 text-xs text-[color:var(--muted)]">
          From
          <input
            type="date"
            value={filters.dateFrom}
            onChange={(e) =>
              onFiltersChange({ ...filters, dateFrom: e.target.value })
            }
            className="rounded-xl border border-[color:var(--border)] bg-[color:var(--surface)] px-3 py-1.5 text-xs text-[color:var(--foreground)]"
          />
        </label>

        <label className="flex flex-col gap-1 text-xs text-[color:var(--muted)]">
          To
          <input
            type="date"
            value={filters.dateTo}
            onChange={(e) =>
              onFiltersChange({ ...filters, dateTo: e.target.value })
            }
            className="rounded-xl border border-[color:var(--border)] bg-[color:var(--surface)] px-3 py-1.5 text-xs text-[color:var(--foreground)]"
          />
        </label>

        <label className="flex flex-col gap-1 text-xs text-[color:var(--muted)]">
          Shipment
          <div className="relative">
            <Search
              size={14}
              className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[color:var(--muted)]"
            />
            <input
              type="text"
              placeholder="Ref / BOL..."
              value={filters.shipmentRef}
              onChange={(e) =>
                onFiltersChange({ ...filters, shipmentRef: e.target.value })
              }
              className="rounded-xl border border-[color:var(--border)] bg-[color:var(--surface)] py-1.5 pl-8 pr-3 text-xs text-[color:var(--foreground)]"
            />
          </div>
        </label>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Column definitions                                                 */
/* ------------------------------------------------------------------ */

const col = createColumnHelper<AuditLogEntry>();

function buildColumns(expandedId: string | null, onToggle: (id: string) => void) {
  return [
    col.display({
      id: "expand",
      size: 36,
      cell: ({ row }) => (
        <button
          type="button"
          onClick={() => onToggle(row.original.id)}
          className="grid h-6 w-6 place-items-center rounded-lg transition hover:bg-[color:var(--border)]"
          aria-label={
            expandedId === row.original.id
              ? "Collapse details"
              : "Expand details"
          }
        >
          <ChevronDown
            size={14}
            className={cn(
              "transition-transform",
              expandedId === row.original.id && "rotate-180",
            )}
          />
        </button>
      ),
    }),
    col.accessor("created_at", {
      header: "Time",
      size: 120,
      cell: (info) => (
        <span title={fullDate(info.getValue())} className="whitespace-nowrap">
          {relativeTime(info.getValue())}
        </span>
      ),
    }),
    col.accessor("user_name", {
      header: "User",
      size: 150,
      cell: (info) => {
        const name = info.getValue();
        if (!name) {
          return (
            <span className="text-[color:var(--muted)]">System</span>
          );
        }
        return (
          <div className="flex items-center gap-2">
            <div className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-indigo-100 text-[10px] font-bold text-indigo-600 dark:bg-indigo-900/40 dark:text-indigo-300">
              {name.charAt(0).toUpperCase()}
            </div>
            <span className="truncate">{name}</span>
          </div>
        );
      },
    }),
    col.accessor("action", {
      header: "Action",
      size: 180,
      cell: (info) => {
        const meta = getAuditActionMeta(info.getValue());
        const Icon = meta.icon;
        return (
          <div className="flex items-center gap-2">
            <div
              className={cn(
                "grid h-6 w-6 shrink-0 place-items-center rounded-lg",
                meta.bgColor,
              )}
            >
              <Icon size={13} className={meta.color} />
            </div>
            <span className="text-sm font-medium">{meta.label}</span>
          </div>
        );
      },
    }),
    col.accessor("shipment_ref", {
      header: "Shipment",
      size: 140,
      cell: (info) => {
        const ref = info.getValue();
        const shipmentId = info.row.original.shipment_id;
        if (!ref || !shipmentId) {
          return <span className="text-[color:var(--muted)]">&mdash;</span>;
        }
        return (
          <Link
            href={`/dashboard/shipments/${shipmentId}`}
            className="font-medium text-[color:var(--accent)] hover:underline"
          >
            {ref}
          </Link>
        );
      },
    }),
    col.display({
      id: "summary",
      header: "Details",
      cell: ({ row }) => {
        const details = row.original.details;
        const keys = Object.keys(details);
        if (keys.length === 0) {
          return <span className="text-[color:var(--muted)]">&mdash;</span>;
        }
        // Show first meaningful detail as preview
        const preview = detailPreview(row.original);
        return (
          <span className="truncate text-[color:var(--muted)] max-w-[200px] inline-block">
            {preview}
          </span>
        );
      },
    }),
  ];
}

function detailPreview(entry: AuditLogEntry): string {
  const d = entry.details;
  if (entry.action === "shipment_disputed" && d.reason) return String(d.reason);
  if (entry.action === "email_ingested" && d.sender)
    return `From ${d.sender}`;
  if (entry.action === "data_exported" && d.format)
    return `${String(d.format).toUpperCase()} · ${d.rowCount ?? "?"} rows`;
  if (entry.action === "shipment_edit_approved" && d.fields_modified)
    return `${d.fields_modified} field(s) edited`;
  if (entry.action === "auto_approved" && d.confidence)
    return `Confidence: ${Number(d.confidence).toFixed(0)}%`;
  if (entry.action === "document_reprocessed" && d.new_doc_type)
    return `→ ${d.new_doc_type}`;
  if (d.user_name) return String(d.user_name);
  return `${Object.keys(d).length} field(s)`;
}

/* ------------------------------------------------------------------ */
/*  Main component                                                     */
/* ------------------------------------------------------------------ */

interface FilterState {
  actions: string[];
  userId: string;
  dateFrom: string;
  dateTo: string;
  shipmentRef: string;
}

const PAGE_SIZE = 50;

export function AuditLogTable({
  initialLogs,
  initialTotal,
  users,
}: AuditLogTableProps) {
  const [logs, setLogs] = useState(initialLogs);
  const [total, setTotal] = useState(initialTotal);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const [filters, setFilters] = useState<FilterState>({
    actions: [],
    userId: "",
    dateFrom: "",
    dateTo: "",
    shipmentRef: "",
  });

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const fetchLogs = useCallback(
    async (f: FilterState, p: number) => {
      setLoading(true);
      try {
        const params = new URLSearchParams();
        params.set("page", String(p));
        params.set("pageSize", String(PAGE_SIZE));
        if (f.actions.length > 0) params.set("actions", f.actions.join(","));
        if (f.userId) params.set("userId", f.userId);
        if (f.dateFrom) params.set("dateFrom", f.dateFrom);
        if (f.dateTo) params.set("dateTo", f.dateTo);
        if (f.shipmentRef) params.set("shipmentRef", f.shipmentRef);

        const res = await fetch(`/api/audit-log?${params.toString()}`);
        if (!res.ok) return;

        const data = await res.json();
        setLogs(data.logs);
        setTotal(data.total);
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  // Debounce shipment ref filter
  const [debouncedRef, setDebouncedRef] = useState(filters.shipmentRef);
  useEffect(() => {
    const id = setTimeout(() => setDebouncedRef(filters.shipmentRef), 350);
    return () => clearTimeout(id);
  }, [filters.shipmentRef]);

  // Refetch on filter/page change
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const actionsKey = filters.actions.join(",");
  useEffect(() => {
    const filtersWithDebounce = { ...filters, shipmentRef: debouncedRef };
    fetchLogs(filtersWithDebounce, page);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    actionsKey,
    filters.userId,
    filters.dateFrom,
    filters.dateTo,
    debouncedRef,
    page,
    fetchLogs,
  ]);

  function handleFiltersChange(f: FilterState) {
    setFilters(f);
    setPage(1);
    setExpandedId(null);
  }

  function toggleExpanded(id: string) {
    setExpandedId((prev) => (prev === id ? null : id));
  }

  const columns = useMemo(
    () => buildColumns(expandedId, toggleExpanded),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [expandedId],
  );

  const table = useReactTable({
    data: logs,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getRowId: (row) => row.id,
  });

  return (
    <div className="space-y-4">
      <Card>
        <FilterBar
          users={users}
          filters={filters}
          onFiltersChange={handleFiltersChange}
        />
      </Card>

      <Card className="overflow-hidden p-0">
        <div className={cn("overflow-x-auto", loading && "opacity-60")}>
          <table className="min-w-full border-collapse text-left text-sm">
            <thead className="bg-black/5 text-[color:var(--muted)] dark:bg-white/5">
              {table.getHeaderGroups().map((hg) => (
                <tr key={hg.id}>
                  {hg.headers.map((header) => (
                    <th
                      key={header.id}
                      className="px-4 py-3 font-medium"
                      style={{
                        width: header.getSize(),
                      }}
                    >
                      {header.isPlaceholder
                        ? null
                        : flexRender(
                            header.column.columnDef.header,
                            header.getContext(),
                          )}
                    </th>
                  ))}
                </tr>
              ))}
            </thead>
            <tbody>
              {table.getRowModel().rows.length === 0 && (
                <tr>
                  <td
                    colSpan={columns.length}
                    className="px-4 py-12 text-center text-[color:var(--muted)]"
                  >
                    No audit log entries found
                  </td>
                </tr>
              )}
              {table.getRowModel().rows.map((row) => (
                <RowWithExpansion
                  key={row.id}
                  row={row}
                  expandedId={expandedId}
                  colCount={columns.length}
                />
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Pagination */}
      <div className="flex items-center justify-between text-sm">
        <p className="text-[color:var(--muted)]">
          {total.toLocaleString()} entries &middot; Page {page} of {totalPages}
        </p>
        <div className="flex gap-2">
          <button
            type="button"
            disabled={page <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            className="inline-flex items-center gap-1 rounded-full border border-[color:var(--border)] px-3 py-1.5 text-xs font-medium transition hover:bg-[color:var(--border)] disabled:opacity-40"
          >
            <ChevronLeft size={14} />
            Prev
          </button>
          <button
            type="button"
            disabled={page >= totalPages}
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            className="inline-flex items-center gap-1 rounded-full border border-[color:var(--border)] px-3 py-1.5 text-xs font-medium transition hover:bg-[color:var(--border)] disabled:opacity-40"
          >
            Next
            <ChevronRight size={14} />
          </button>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Row with animated expansion                                        */
/* ------------------------------------------------------------------ */

function RowWithExpansion({
  row,
  expandedId,
  colCount,
}: {
  row: ReturnType<ReturnType<typeof useReactTable<AuditLogEntry>>["getRowModel"]>["rows"][number];
  expandedId: string | null;
  colCount: number;
}) {
  const isExpanded = expandedId === row.original.id;

  return (
    <>
      <tr
        className={cn(
          "border-t border-[color:var(--border)] transition-colors cursor-pointer",
          isExpanded
            ? "bg-[color:var(--border)]"
            : "hover:bg-black/[0.02] dark:hover:bg-white/[0.02]",
        )}
      >
        {row.getVisibleCells().map((cell) => (
          <td key={cell.id} className="px-4 py-3">
            {flexRender(cell.column.columnDef.cell, cell.getContext())}
          </td>
        ))}
      </tr>
      <AnimatePresence initial={false}>
        {isExpanded && (
          <tr>
            <td colSpan={colCount} className="p-0">
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden"
              >
                <div className="border-t border-[color:var(--border)] bg-[color:var(--background)] px-6 py-4">
                  <ExpandedDetails entry={row.original} />
                </div>
              </motion.div>
            </td>
          </tr>
        )}
      </AnimatePresence>
    </>
  );
}

/* ------------------------------------------------------------------ */
/*  Loading skeleton                                                   */
/* ------------------------------------------------------------------ */

function Skeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "animate-pulse rounded-xl bg-[color:var(--border)]",
        className,
      )}
    />
  );
}

export function AuditLogSkeleton() {
  return (
    <div className="space-y-4">
      {/* Filters skeleton */}
      <Card>
        <div className="flex flex-wrap gap-1.5">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-7 w-24 rounded-full" />
          ))}
        </div>
        <div className="mt-3 flex gap-3">
          <Skeleton className="h-12 w-32" />
          <Skeleton className="h-12 w-32" />
          <Skeleton className="h-12 w-32" />
          <Skeleton className="h-12 w-36" />
        </div>
      </Card>

      {/* Table skeleton */}
      <Card className="overflow-hidden p-0">
        <div className="bg-black/5 px-4 py-3 dark:bg-white/5">
          <div className="flex gap-6">
            <Skeleton className="h-4 w-6" />
            <Skeleton className="h-4 w-16" />
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-4 w-16" />
          </div>
        </div>
        {Array.from({ length: 10 }).map((_, i) => (
          <div
            key={i}
            className="flex gap-6 border-t border-[color:var(--border)] px-4 py-3"
          >
            <Skeleton className="h-5 w-6" />
            <Skeleton className="h-5 w-16" />
            <Skeleton className="h-5 w-24" />
            <Skeleton className="h-5 w-28" />
            <Skeleton className="h-5 w-20" />
            <Skeleton className="h-5 w-32" />
          </div>
        ))}
      </Card>

      {/* Pagination skeleton */}
      <div className="flex items-center justify-between">
        <Skeleton className="h-4 w-40" />
        <div className="flex gap-2">
          <Skeleton className="h-8 w-16 rounded-full" />
          <Skeleton className="h-8 w-16 rounded-full" />
        </div>
      </div>
    </div>
  );
}
