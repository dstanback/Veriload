import "server-only";

import { Queue } from "bullmq";
import IORedis from "ioredis";

import { PROCESS_DOCUMENT_QUEUE, RECONCILE_DOCUMENT_QUEUE } from "@/lib/constants";
import { env } from "@/lib/env";

type QueueJobPayload = {
  documentId: string;
};

let redisConnection: IORedis | null = null;
let processDocumentQueue: Queue<QueueJobPayload> | null = null;
let reconcileDocumentQueue: Queue<QueueJobPayload> | null = null;

function getRedisConnection() {
  if (!env.REDIS_URL) {
    return null;
  }

  if (!redisConnection) {
    redisConnection = new IORedis(env.REDIS_URL, {
      maxRetriesPerRequest: null
    });
  }

  return redisConnection;
}

export function isProcessingQueueAvailable() {
  return Boolean(getRedisConnection());
}

export function getProcessDocumentQueue() {
  const connection = getRedisConnection();
  if (!connection) {
    return null;
  }

  if (!processDocumentQueue) {
    processDocumentQueue = new Queue<QueueJobPayload>(PROCESS_DOCUMENT_QUEUE, {
      connection
    });
  }

  return processDocumentQueue;
}

export function getReconcileDocumentQueue() {
  const connection = getRedisConnection();
  if (!connection) {
    return null;
  }

  if (!reconcileDocumentQueue) {
    reconcileDocumentQueue = new Queue<QueueJobPayload>(RECONCILE_DOCUMENT_QUEUE, {
      connection
    });
  }

  return reconcileDocumentQueue;
}

export async function enqueueProcessDocument(documentId: string) {
  const queue = getProcessDocumentQueue();
  if (!queue) {
    throw new Error("REDIS_URL is not configured.");
  }

  await queue.add("process-document", { documentId }, { removeOnComplete: 200, removeOnFail: 200 });
}

export async function enqueueReconcileDocument(documentId: string) {
  const queue = getReconcileDocumentQueue();
  if (!queue) {
    throw new Error("REDIS_URL is not configured.");
  }

  await queue.add("reconcile-document", { documentId }, { removeOnComplete: 200, removeOnFail: 200 });
}

export function getQueueConnection() {
  return getRedisConnection();
}
