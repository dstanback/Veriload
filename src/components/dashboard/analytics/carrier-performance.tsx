"use client";

import { useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ArrowUpDown } from "lucide-react";

import type { CarrierPerformanceRow } from "@/lib/analytics";
import { cn, formatCurrency } from "@/lib/utils";

type SortKey = keyof CarrierPerformanceRow;

export function CarrierPerformanceTable({
  data,
  activeCarrier,
}: {
  data: CarrierPerformanceRow[];
  activeCarrier: string | null;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [sortKey, setSortKey] = useState<SortKey>("totalShipments");
  const [sortAsc, setSortAsc] = useState(false);

  function handleSort(key: SortKey) {
    if (sortKey === key) {
      setSortAsc(!sortAsc);
    } else {
      setSortKey(key);
      setSortAsc(false);
    }
  }

  function handleRowClick(carrierName: string) {
    const sp = new URLSearchParams(searchParams.toString());
    if (activeCarrier === carrierName) {
      sp.delete("carrier");
    } else {
      sp.set("carrier", carrierName);
    }
    router.push(`${pathname}?${sp.toString()}`);
  }

  const sorted = [...data].sort((a, b) => {
    const av = a[sortKey];
    const bv = b[sortKey];
    if (av == null && bv == null) return 0;
    if (av == null) return 1;
    if (bv == null) return -1;
    if (typeof av === "string" && typeof bv === "string") {
      return sortAsc ? av.localeCompare(bv) : bv.localeCompare(av);
    }
    return sortAsc ? (av as number) - (bv as number) : (bv as number) - (av as number);
  });

  const columns: { key: SortKey; label: string; align?: "right" }[] = [
    { key: "carrierName", label: "Carrier" },
    { key: "totalShipments", label: "Shipments", align: "right" },
    { key: "discrepancyRate", label: "Discrepancy Rate", align: "right" },
    { key: "avgVarianceAmount", label: "Avg Variance", align: "right" },
    { key: "avgResolutionDays", label: "Avg Resolution", align: "right" },
  ];

  const highDiscrepancyThreshold = 0.3;

  return (
    <div className="overflow-x-auto">
      {activeCarrier && (
        <div className="mb-3 flex items-center gap-2">
          <span className="text-xs text-[color:var(--muted)]">Filtered to:</span>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-[color:var(--accent)] px-3 py-1 text-xs font-medium text-white">
            {activeCarrier}
            <button
              type="button"
              onClick={() => handleRowClick(activeCarrier)}
              className="ml-0.5 hover:opacity-70"
              aria-label="Clear carrier filter"
            >
              &times;
            </button>
          </span>
        </div>
      )}
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-[color:var(--border)]">
            {columns.map((col) => (
              <th
                key={col.key}
                className={cn(
                  "pb-3 pt-1 font-medium text-[color:var(--muted)]",
                  col.align === "right" ? "text-right" : "text-left",
                )}
              >
                <button
                  type="button"
                  onClick={() => handleSort(col.key)}
                  className="inline-flex items-center gap-1 hover:text-[color:var(--foreground)] transition"
                >
                  {col.label}
                  <ArrowUpDown size={12} className={sortKey === col.key ? "opacity-100" : "opacity-30"} />
                </button>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {sorted.map((row) => {
            const isWorst = row.discrepancyRate >= highDiscrepancyThreshold;
            return (
              <tr
                key={row.carrierName}
                onClick={() => handleRowClick(row.carrierName)}
                className={cn(
                  "cursor-pointer border-b border-[color:var(--border)] transition last:border-0 hover:bg-[color:var(--border)]",
                  isWorst && "border-l-2 border-l-[color:var(--danger)]",
                  activeCarrier === row.carrierName && "bg-[color:var(--border)]",
                )}
              >
                <td className="py-2.5 font-medium">{row.carrierName}</td>
                <td className="py-2.5 text-right font-[family-name:var(--font-code)] tabular-nums">
                  {row.totalShipments}
                </td>
                <td className={cn(
                  "py-2.5 text-right font-[family-name:var(--font-code)] tabular-nums",
                  isWorst && "text-[color:var(--danger)] font-semibold",
                )}>
                  {(row.discrepancyRate * 100).toFixed(1)}%
                </td>
                <td className="py-2.5 text-right font-[family-name:var(--font-code)] tabular-nums">
                  {formatCurrency(row.avgVarianceAmount)}
                </td>
                <td className="py-2.5 text-right font-[family-name:var(--font-code)] tabular-nums">
                  {row.avgResolutionDays != null ? `${row.avgResolutionDays}d` : "\u2014"}
                </td>
              </tr>
            );
          })}
          {sorted.length === 0 && (
            <tr>
              <td colSpan={5} className="py-8 text-center text-[color:var(--muted)]">
                No carrier data in this period
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
