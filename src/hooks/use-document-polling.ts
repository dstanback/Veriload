import { useEffect, useRef, useState } from "react";

export interface DocumentStatus {
  id: string;
  status: string;
  docType: string | null;
  docTypeConfidence: number | null;
  processingError: string | null;
  processedAt: string | null;
}

const TERMINAL_STATUSES = new Set(["extracted", "failed", "needs_review"]);
const POLL_INTERVAL_MS = 2_000;
const POLL_TIMEOUT_MS = 2 * 60 * 1_000; // 2 minutes

export function useDocumentPolling(documentIds: string[]) {
  const [statuses, setStatuses] = useState<Map<string, DocumentStatus>>(new Map());
  const idsKey = documentIds.join(",");

  // Keep a stable ref for the current statuses so we can read them in the
  // polling loop without adding them to the effect dependency array.
  const statusesRef = useRef(statuses);
  statusesRef.current = statuses;

  useEffect(() => {
    if (documentIds.length === 0) return;

    const startTime = Date.now();
    let timer: ReturnType<typeof setTimeout> | null = null;
    let abortController: AbortController | null = null;
    let cancelled = false;

    // Seed initial pending entries
    setStatuses((prev) => {
      const next = new Map(prev);
      for (const id of documentIds) {
        if (!next.has(id)) {
          next.set(id, {
            id,
            status: "pending",
            docType: null,
            docTypeConfidence: null,
            processingError: null,
            processedAt: null
          });
        }
      }
      return next;
    });

    const poll = async () => {
      // Filter to only IDs that aren't terminal yet
      const current = statusesRef.current;
      const activeIds = documentIds.filter((id) => {
        const s = current.get(id);
        return !s || !TERMINAL_STATUSES.has(s.status);
      });

      if (activeIds.length === 0 || cancelled) return;

      abortController = new AbortController();
      try {
        const response = await fetch(
          `/api/documents/status?ids=${activeIds.join(",")}`,
          { signal: abortController.signal }
        );
        if (!response.ok || cancelled) return;

        const payload = (await response.json()) as { documents: DocumentStatus[] };

        setStatuses((prev) => {
          const next = new Map(prev);
          for (const doc of payload.documents) {
            next.set(doc.id, doc);
          }
          return next;
        });
      } catch {
        // Swallow fetch errors (abort, network) — next poll will retry
      }
    };

    const tick = async () => {
      if (cancelled) return;
      await poll();
      if (cancelled) return;

      // After polling, check the updated statuses via ref
      const current = statusesRef.current;
      const allTerminal = documentIds.every((id) => {
        const s = current.get(id);
        return s && TERMINAL_STATUSES.has(s.status);
      });
      const timedOut = Date.now() - startTime > POLL_TIMEOUT_MS;

      if (!allTerminal && !timedOut && !cancelled) {
        timer = setTimeout(tick, POLL_INTERVAL_MS);
      }
    };

    // Start first poll immediately
    tick();

    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
      if (abortController) abortController.abort();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idsKey]);

  return statuses;
}
