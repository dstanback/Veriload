"use client";

import { useRouter } from "next/navigation";
import { startTransition, useState } from "react";

import { Button } from "@/components/ui/button";

export function ApprovalActions({
  shipmentId,
  canApprove
}: {
  shipmentId: string;
  canApprove: boolean;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState<"approve" | "dispute" | null>(null);

  const handleApprove = async () => {
    setLoading("approve");
    await fetch(`/api/shipments/${shipmentId}/approve`, {
      method: "POST"
    });
    startTransition(() => {
      router.refresh();
    });
    setLoading(null);
  };

  const handleDispute = async () => {
    const notes = window.prompt("Dispute note", "Invoice contains an unapproved charge.");
    if (notes == null) {
      return;
    }

    setLoading("dispute");
    await fetch(`/api/shipments/${shipmentId}/dispute`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ notes })
    });
    startTransition(() => {
      router.refresh();
    });
    setLoading(null);
  };

  return (
    <div className="flex flex-wrap gap-3">
      <Button disabled={!canApprove || loading !== null} onClick={handleApprove}>
        {loading === "approve" ? "Approving..." : "Approve"}
      </Button>
      <Button disabled={loading !== null} onClick={handleDispute} variant="danger">
        {loading === "dispute" ? "Submitting..." : "Dispute"}
      </Button>
    </div>
  );
}
