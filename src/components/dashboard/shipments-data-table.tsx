"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  flexRender,
  createColumnHelper,
  type SortingState
} from "@tanstack/react-table";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowUpDown, ArrowUp, ArrowDown, Search, X, Ship, Filter } from "lucide-react";

import { StatusBadge } from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import { cn, formatDate } from "@/lib/utils";
import type { ShipmentRecord } from "@/types/shipments";

const columnHelper = createColumnHelper<ShipmentRecord>();

function SortIcon({ sorted }: { sorted: false | "asc" | "desc" }) {
  if (sorted === "asc") return <ArrowUp size={14} />;
  if (sorted === "desc") return <ArrowDown size={14} />;
  return <ArrowUpDown size={14} className="opacity-40" />;
}

const columns = [
  columnHelper.accessor("shipment_ref", {
    header: "Shipment Ref",
    cell: (info) => {
      const row = info.row.original;
      return (
        <Link
          href={`/dashboard/shipments/${row.id}`}
          className="group/link font-semibold transition-colors hover:text-[color:var(--accent)]"
        >
          <span>{row.shipment_ref ?? row.id.slice(0, 8)}</span>
          <p className="mt-0.5 text-xs font-normal text-[color:var(--muted)]">
            BOL {row.bol_number ?? "Pending"}
          </p>
        </Link>
      );
    }
  }),
  columnHelper.accessor("carrier_name", {
    header: "Carrier",
    cell: (info) => (
      <div>
        <p>{info.getValue() ?? "Unknown"}</p>
        <p className="mt-0.5 text-xs text-[color:var(--muted)]">
          {info.row.original.carrier_scac ?? "No SCAC"}
        </p>
      </div>
    )
  }),
  columnHelper.accessor("origin", {
    header: "Origin \u2192 Destination",
    cell: (info) => (
      <span className="text-sm">
        {info.getValue() ?? "?"} &rarr; {info.row.original.destination ?? "?"}
      </span>
    )
  }),
  columnHelper.accessor("status", {
    header: "Status",
    cell: (info) => <StatusBadge variant="status" value={info.getValue()} />
  }),
  columnHelper.accessor("discrepancy_level", {
    header: "Discrepancy",
    cell: (info) => <StatusBadge variant="severity" value={info.getValue()} />
  }),
  columnHelper.accessor("match_confidence", {
    header: "Confidence",
    cell: (info) => {
      const val = info.getValue();
      return (
        <span style={{ fontFamily: "'JetBrains Mono', monospace" }} className="text-sm">
          {val != null ? `${val.toFixed(0)}%` : "\u2014"}
        </span>
      );
    }
  }),
  columnHelper.accessor("created_at", {
    header: "Date",
    cell: (info) => (
      <span className="text-sm text-[color:var(--muted)]">{formatDate(info.getValue())}</span>
    )
  })
];

const STATUS_OPTIONS = ["pending", "matched", "approved", "disputed", "paid"] as const;
const DISCREPANCY_OPTIONS = ["green", "yellow", "red"] as const;

interface ShipmentsDataTableProps {
  shipments: ShipmentRecord[];
  initialQuery?: string;
  initialStatus?: string | null;
  initialDiscrepancy?: string | null;
}

export function ShipmentsDataTable({
  shipments,
  initialQuery,
  initialStatus,
  initialDiscrepancy
}: ShipmentsDataTableProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [sorting, setSorting] = useState<SortingState>([]);
  const [globalFilter, setGlobalFilter] = useState(initialQuery ?? "");
  const [statusFilter, setStatusFilter] = useState<string | null>(initialStatus ?? null);
  const [discrepancyFilter, setDiscrepancyFilter] = useState<string | null>(initialDiscrepancy ?? null);
  const [showFilters, setShowFilters] = useState(!!initialStatus || !!initialDiscrepancy);

  const filteredData = useMemo(() => {
    let data = shipments;
    if (statusFilter) {
      data = data.filter((s) => s.status === statusFilter);
    }
    if (discrepancyFilter) {
      data = data.filter((s) => s.discrepancy_level === discrepancyFilter);
    }
    return data;
  }, [shipments, statusFilter, discrepancyFilter]);

  const table = useReactTable({
    data: filteredData,
    columns,
    state: { sorting, globalFilter },
    onSortingChange: setSorting,
    onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel()
  });

  function updateUrl(q: string, status: string | null, discrepancy: string | null) {
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (status) params.set("status", status);
    if (discrepancy) params.set("discrepancy", discrepancy);
    const qs = params.toString();
    router.push(`/dashboard/shipments${qs ? `?${qs}` : ""}`, { scroll: false });
  }

  function handleSearch(value: string) {
    setGlobalFilter(value);
    updateUrl(value, statusFilter, discrepancyFilter);
  }

  function handleStatusFilter(value: string | null) {
    setStatusFilter(value);
    updateUrl(globalFilter, value, discrepancyFilter);
  }

  function handleDiscrepancyFilter(value: string | null) {
    setDiscrepancyFilter(value);
    updateUrl(globalFilter, statusFilter, value);
  }

  function clearAllFilters() {
    setGlobalFilter("");
    setStatusFilter(null);
    setDiscrepancyFilter(null);
    updateUrl("", null, null);
  }

  const hasActiveFilters = globalFilter || statusFilter || discrepancyFilter;

  return (
    <div className="space-y-4">
      {/* Search & Filter Bar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1 sm:max-w-sm">
          <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[color:var(--muted)]" size={16} />
          <input
            type="text"
            value={globalFilter}
            onChange={(e) => handleSearch(e.target.value)}
            placeholder="Search shipments..."
            className="h-10 w-full rounded-xl border border-[color:var(--border)] bg-white pl-10 pr-4 text-sm outline-none transition-colors focus:border-[color:var(--accent)] focus:ring-2 focus:ring-[color:var(--accent)]/20"
          />
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant={showFilters ? "primary" : "secondary"}
            onClick={() => setShowFilters(!showFilters)}
            className="gap-2"
          >
            <Filter size={14} />
            Filters
          </Button>
          {hasActiveFilters && (
            <Button variant="ghost" onClick={clearAllFilters} className="gap-1 text-xs text-[color:var(--danger)]">
              <X size={14} />
              Clear
            </Button>
          )}
        </div>
      </div>

      {/* Filter Pills */}
      <AnimatePresence>
        {showFilters && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="flex flex-wrap gap-4 rounded-2xl border border-[color:var(--border)] bg-[color:var(--surface)] p-4">
              <div>
                <p className="mb-2 text-xs font-medium uppercase tracking-wider text-[color:var(--muted)]">Status</p>
                <div className="flex flex-wrap gap-1.5">
                  {STATUS_OPTIONS.map((s) => (
                    <button
                      key={s}
                      onClick={() => handleStatusFilter(statusFilter === s ? null : s)}
                      className={cn(
                        "rounded-full px-3 py-1 text-xs font-medium capitalize transition-all",
                        statusFilter === s
                          ? "bg-[color:var(--foreground)] text-white"
                          : "bg-black/5 text-[color:var(--foreground)] hover:bg-black/10"
                      )}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <p className="mb-2 text-xs font-medium uppercase tracking-wider text-[color:var(--muted)]">
                  Discrepancy Level
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {DISCREPANCY_OPTIONS.map((d) => (
                    <button
                      key={d}
                      onClick={() => handleDiscrepancyFilter(discrepancyFilter === d ? null : d)}
                      className={cn(
                        "rounded-full px-3 py-1 text-xs font-medium capitalize transition-all",
                        discrepancyFilter === d
                          ? "bg-[color:var(--foreground)] text-white"
                          : "bg-black/5 text-[color:var(--foreground)] hover:bg-black/10"
                      )}
                    >
                      {d}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Table */}
      <div className="overflow-hidden rounded-[1.75rem] border border-[color:var(--border)] bg-[color:var(--surface)] shadow-card">
        {table.getRowModel().rows.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center justify-center py-20"
          >
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-[color:var(--accent)]/10">
              <Ship size={28} className="text-[color:var(--accent)]" />
            </div>
            <h3 className="mt-4 text-lg font-semibold">No shipments found</h3>
            <p className="mt-1 max-w-sm text-center text-sm text-[color:var(--muted)]">
              {hasActiveFilters
                ? "Try adjusting your filters or search terms."
                : "Upload your first BOL or invoice to get started with reconciliation."}
            </p>
            {hasActiveFilters && (
              <Button variant="secondary" onClick={clearAllFilters} className="mt-4">
                Clear filters
              </Button>
            )}
          </motion.div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full border-collapse text-left text-sm">
              <thead className="bg-black/[0.03]">
                {table.getHeaderGroups().map((headerGroup) => (
                  <tr key={headerGroup.id}>
                    {headerGroup.headers.map((header) => (
                      <th
                        key={header.id}
                        className="cursor-pointer select-none px-5 py-4 text-xs font-semibold uppercase tracking-wider text-[color:var(--muted)] transition-colors hover:text-[color:var(--foreground)]"
                        onClick={header.column.getToggleSortingHandler()}
                      >
                        <span className="flex items-center gap-1.5">
                          {flexRender(header.column.columnDef.header, header.getContext())}
                          <SortIcon sorted={header.column.getIsSorted()} />
                        </span>
                      </th>
                    ))}
                  </tr>
                ))}
              </thead>
              <tbody>
                {table.getRowModel().rows.map((row, index) => (
                  <motion.tr
                    key={row.id}
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.02, duration: 0.2 }}
                    className="border-t border-[color:var(--border)] transition-colors hover:bg-black/[0.02]"
                  >
                    {row.getVisibleCells().map((cell) => (
                      <td key={cell.id} className="px-5 py-4">
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </td>
                    ))}
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Row count */}
      {table.getRowModel().rows.length > 0 && (
        <p className="text-xs text-[color:var(--muted)]">
          Showing {table.getRowModel().rows.length} of {shipments.length} shipments
        </p>
      )}
    </div>
  );
}
