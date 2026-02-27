import "server-only";

import { Worker } from "bullmq";

import { RECONCILE_DOCUMENT_QUEUE } from "@/lib/constants";
import { env } from "@/lib/env";
import { reconcileProcessedDocumentById } from "@/lib/repository";
import { getQueueConnection } from "@/lib/queue/client";

export async function startReconcileWorker() {
  const connection = getQueueConnection();

  if (!connection) {
    return {
      status: "disabled",
      reason: "REDIS_URL is not configured."
    };
  }

  const worker = new Worker(
    RECONCILE_DOCUMENT_QUEUE,
    async (job) => {
      await reconcileProcessedDocumentById(job.data.documentId);
    },
    {
      connection,
      concurrency: env.RECONCILE_CONCURRENCY
    }
  );

  worker.on("failed", (job, error) => {
    console.error("reconcile-document worker failed", {
      documentId: job?.data.documentId,
      error
    });
  });

  return {
    status: "running",
    queue: RECONCILE_DOCUMENT_QUEUE,
    concurrency: env.RECONCILE_CONCURRENCY,
    worker
  };
}
