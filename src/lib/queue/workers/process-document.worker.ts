import "server-only";

import { Worker } from "bullmq";

import { PROCESS_DOCUMENT_QUEUE } from "@/lib/constants";
import { env } from "@/lib/env";
import { processPendingDocumentById } from "@/lib/repository";
import { enqueueReconcileDocument, getQueueConnection } from "@/lib/queue/client";

export async function startProcessDocumentWorker() {
  const connection = getQueueConnection();

  if (!connection) {
    return {
      status: "disabled",
      reason: "REDIS_URL is not configured."
    };
  }

  const worker = new Worker(
    PROCESS_DOCUMENT_QUEUE,
    async (job) => {
      await processPendingDocumentById(job.data.documentId);
      await enqueueReconcileDocument(job.data.documentId);
    },
    {
      connection,
      concurrency: env.PROCESS_DOCUMENT_CONCURRENCY
    }
  );

  worker.on("failed", (job, error) => {
    console.error("process-document worker failed", {
      documentId: job?.data.documentId,
      error
    });
  });

  return {
    status: "running",
    queue: PROCESS_DOCUMENT_QUEUE,
    concurrency: env.PROCESS_DOCUMENT_CONCURRENCY,
    worker
  };
}
