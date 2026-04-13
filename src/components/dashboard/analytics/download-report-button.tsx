"use client";

import { useSearchParams } from "next/navigation";
import { useState, useCallback } from "react";
import { Download, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";

function parseDateRange(searchParams: URLSearchParams) {
  const range = searchParams.get("range") ?? "30";
  const now = new Date();

  if (range === "custom") {
    const from = searchParams.get("from") ?? "";
    const to = searchParams.get("to") ?? "";
    if (from && to) return { dateFrom: from, dateTo: to };
  }

  const days = parseInt(range, 10) || 30;
  const endDate = new Date(now);
  const startDate = new Date(now);
  startDate.setDate(startDate.getDate() - days);

  return {
    dateFrom: startDate.toISOString().slice(0, 10),
    dateTo: endDate.toISOString().slice(0, 10),
  };
}

export function DownloadReportButton() {
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  const handleDownload = useCallback(async () => {
    setLoading(true);
    try {
      const { dateFrom, dateTo } = parseDateRange(searchParams);
      const carrier = searchParams.get("carrier") ?? "";
      const params = new URLSearchParams();
      if (dateFrom) params.set("dateFrom", dateFrom);
      if (dateTo) params.set("dateTo", dateTo);
      if (carrier) params.set("carrier", carrier);

      const res = await fetch(`/api/export/report?${params.toString()}`);
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(
          (body as { error?: string } | null)?.error ?? `Export failed (${res.status})`,
        );
      }

      const blob = await res.blob();
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      const disposition = res.headers.get("Content-Disposition") ?? "";
      const filenameMatch = disposition.match(/filename="?([^"]+)"?/);
      a.download =
        filenameMatch?.[1] ??
        `veriload-report-${new Date().toISOString().slice(0, 10)}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(a.href);

      toast("PDF report downloaded successfully.", "success");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Export failed.";
      toast(message, "error");
    } finally {
      setLoading(false);
    }
  }, [searchParams, toast]);

  return (
    <Button variant="secondary" onClick={handleDownload} disabled={loading}>
      {loading ? (
        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
      ) : (
        <Download className="mr-2 h-4 w-4" />
      )}
      {loading ? "Generating..." : "Download Report"}
    </Button>
  );
}
