import { startProcessDocumentWorker } from "@/lib/queue/workers/process-document.worker";
import { startReconcileWorker } from "@/lib/queue/workers/reconcile.worker";

async function main() {
  const [processDocumentWorker, reconcileWorker] = await Promise.all([
    startProcessDocumentWorker(),
    startReconcileWorker()
  ]);

  console.log("Workers initialized", {
    processDocumentWorker:
      "queue" in processDocumentWorker
        ? {
            status: processDocumentWorker.status,
            queue: processDocumentWorker.queue,
            concurrency: processDocumentWorker.concurrency
          }
        : processDocumentWorker,
    reconcileWorker:
      "queue" in reconcileWorker
        ? {
            status: reconcileWorker.status,
            queue: reconcileWorker.queue,
            concurrency: reconcileWorker.concurrency
          }
        : reconcileWorker
  });
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
