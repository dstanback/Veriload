"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Calendar } from "lucide-react";
import { useCallback, useState } from "react";

import { cn } from "@/lib/utils";

const presets = [
  { label: "7 days", value: "7" },
  { label: "30 days", value: "30" },
  { label: "90 days", value: "90" },
  { label: "Custom", value: "custom" },
] as const;

export function DateRangeSelector() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const currentRange = searchParams.get("range") ?? "30";
  const customFrom = searchParams.get("from") ?? "";
  const customTo = searchParams.get("to") ?? "";
  const [showCustom, setShowCustom] = useState(currentRange === "custom");

  const updateParams = useCallback(
    (params: Record<string, string>) => {
      const sp = new URLSearchParams(searchParams.toString());
      for (const [k, v] of Object.entries(params)) {
        if (v) sp.set(k, v);
        else sp.delete(k);
      }
      router.push(`${pathname}?${sp.toString()}`);
    },
    [router, pathname, searchParams],
  );

  function handlePreset(value: string) {
    if (value === "custom") {
      setShowCustom(true);
      return;
    }
    setShowCustom(false);
    updateParams({ range: value, from: "", to: "" });
  }

  function handleCustomApply(from: string, to: string) {
    if (from && to) {
      updateParams({ range: "custom", from, to });
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-3">
      <Calendar size={16} className="text-[color:var(--muted)]" />
      <div className="flex gap-1.5">
        {presets.map((p) => (
          <button
            key={p.value}
            type="button"
            onClick={() => handlePreset(p.value)}
            className={cn(
              "rounded-full px-3.5 py-1.5 text-xs font-medium transition",
              (currentRange === p.value || (p.value === "custom" && showCustom))
                ? "bg-[color:var(--accent)] text-white"
                : "bg-[color:var(--surface)] text-[color:var(--muted)] border border-[color:var(--border)] hover:bg-[color:var(--border)]",
            )}
          >
            {p.label}
          </button>
        ))}
      </div>

      {showCustom && (
        <CustomRangeInputs
          initialFrom={customFrom}
          initialTo={customTo}
          onApply={handleCustomApply}
        />
      )}
    </div>
  );
}

function CustomRangeInputs({
  initialFrom,
  initialTo,
  onApply,
}: {
  initialFrom: string;
  initialTo: string;
  onApply: (from: string, to: string) => void;
}) {
  const [from, setFrom] = useState(initialFrom);
  const [to, setTo] = useState(initialTo);

  return (
    <div className="flex items-center gap-2">
      <input
        type="date"
        value={from}
        onChange={(e) => setFrom(e.target.value)}
        className="rounded-xl border border-[color:var(--border)] bg-[color:var(--surface)] px-3 py-1.5 text-xs text-[color:var(--foreground)]"
      />
      <span className="text-xs text-[color:var(--muted)]">to</span>
      <input
        type="date"
        value={to}
        onChange={(e) => setTo(e.target.value)}
        className="rounded-xl border border-[color:var(--border)] bg-[color:var(--surface)] px-3 py-1.5 text-xs text-[color:var(--foreground)]"
      />
      <button
        type="button"
        onClick={() => onApply(from, to)}
        className="rounded-full bg-[color:var(--accent)] px-3.5 py-1.5 text-xs font-medium text-white transition hover:opacity-90"
      >
        Apply
      </button>
    </div>
  );
}
