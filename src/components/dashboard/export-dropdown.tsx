"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Download, FileSpreadsheet, FileText, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";

interface ExportDropdownProps {
  /** Query params appended to both export URLs (e.g. "status=approved&dateFrom=2026-01-01") */
  queryString?: string;
  /** Show only specific formats */
  formats?: Array<"csv" | "pdf">;
}

export function ExportDropdown({
  queryString = "",
  formats = ["csv", "pdf"],
}: ExportDropdownProps) {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState<"csv" | "pdf" | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  const handleExport = useCallback(
    async (format: "csv" | "pdf") => {
      setOpen(false);
      setLoading(format);

      try {
        const baseUrl =
          format === "csv"
            ? "/api/export/shipments"
            : "/api/export/report";
        const sep = queryString ? "?" : "";
        const url = `${baseUrl}${sep}${queryString}`;

        const res = await fetch(url);

        if (!res.ok) {
          const body = await res.json().catch(() => null);
          throw new Error(
            (body as { error?: string } | null)?.error ?? `Export failed (${res.status})`,
          );
        }

        // Download the file
        const blob = await res.blob();
        const a = document.createElement("a");
        a.href = URL.createObjectURL(blob);
        const disposition = res.headers.get("Content-Disposition") ?? "";
        const filenameMatch = disposition.match(/filename="?([^"]+)"?/);
        a.download =
          filenameMatch?.[1] ??
          (format === "csv"
            ? `veriload-shipments-${new Date().toISOString().slice(0, 10)}.csv`
            : `veriload-report-${new Date().toISOString().slice(0, 10)}.pdf`);
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(a.href);

        toast(
          `${format.toUpperCase()} export downloaded successfully.`,
          "success",
        );
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Export failed.";
        toast(message, "error");
      } finally {
        setLoading(null);
      }
    },
    [queryString, toast],
  );

  const isLoading = loading !== null;

  return (
    <div ref={menuRef} className="relative inline-block">
      <Button
        variant="secondary"
        onClick={() => setOpen(!open)}
        disabled={isLoading}
      >
        {isLoading ? (
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        ) : (
          <Download className="mr-2 h-4 w-4" />
        )}
        {isLoading ? "Exporting..." : "Export"}
      </Button>

      {open && (
        <div className="absolute right-0 z-50 mt-2 w-48 rounded-2xl border border-[color:var(--border)] bg-[color:var(--surface)] p-1 shadow-card">
          {formats.includes("csv") && (
            <button
              type="button"
              onClick={() => handleExport("csv")}
              className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-left text-sm transition hover:bg-[color:var(--border)]"
            >
              <FileSpreadsheet size={16} className="text-emerald-600 dark:text-emerald-400" />
              Export CSV
            </button>
          )}
          {formats.includes("pdf") && (
            <button
              type="button"
              onClick={() => handleExport("pdf")}
              className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-left text-sm transition hover:bg-[color:var(--border)]"
            >
              <FileText size={16} className="text-red-600 dark:text-red-400" />
              Export PDF Report
            </button>
          )}
        </div>
      )}
    </div>
  );
}
