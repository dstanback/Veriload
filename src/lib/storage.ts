import "server-only";

import { GetObjectCommand, HeadObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { Upload } from "@aws-sdk/lib-storage";
import { access, mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import { DEV_STORAGE_ROOT } from "@/lib/constants";
import { env } from "@/lib/env";

const localRoot = path.resolve(process.cwd(), DEV_STORAGE_ROOT);

function getS3Client() {
  if (!env.STORAGE_ENDPOINT || !env.STORAGE_ACCESS_KEY || !env.STORAGE_SECRET_KEY) {
    return null;
  }

  return new S3Client({
    endpoint: env.STORAGE_ENDPOINT,
    region: "auto",
    forcePathStyle: true,
    credentials: {
      accessKeyId: env.STORAGE_ACCESS_KEY,
      secretAccessKey: env.STORAGE_SECRET_KEY
    }
  });
}

export async function saveFile(
  storagePath: string,
  buffer: Buffer,
  contentType: string
): Promise<{ storagePath: string; publicUrl: string | null }> {
  const s3 = getS3Client();

  if (s3 && env.STORAGE_BUCKET) {
    const upload = new Upload({
      client: s3,
      params: {
        Bucket: env.STORAGE_BUCKET,
        Key: storagePath,
        Body: buffer,
        ContentType: contentType
      }
    });
    await upload.done();
    return {
      storagePath,
      publicUrl: env.STORAGE_PUBLIC_BASE_URL
        ? `${env.STORAGE_PUBLIC_BASE_URL.replace(/\/$/, "")}/${storagePath}`
        : null
    };
  }

  const absolutePath = path.join(localRoot, storagePath);
  await mkdir(path.dirname(absolutePath), { recursive: true });
  await writeFile(absolutePath, buffer);
  return {
    storagePath,
    publicUrl: null
  };
}

export async function saveJson(storagePath: string, data: unknown) {
  const buffer = Buffer.from(JSON.stringify(data, null, 2));
  return saveFile(storagePath, buffer, "application/json");
}

export async function readFileBuffer(storagePath: string) {
  const s3 = getS3Client();

  if (s3 && env.STORAGE_BUCKET) {
    const response = await s3.send(
      new GetObjectCommand({
        Bucket: env.STORAGE_BUCKET,
        Key: storagePath
      })
    );
    const body = await response.Body?.transformToByteArray();
    if (!body) {
      throw new Error(`Missing storage object: ${storagePath}`);
    }
    return Buffer.from(body);
  }

  return readFile(path.join(localRoot, storagePath));
}

export function getStoragePublicUrl(storagePath: string) {
  if (env.STORAGE_PUBLIC_BASE_URL) {
    return `${env.STORAGE_PUBLIC_BASE_URL.replace(/\/$/, "")}/${storagePath}`;
  }

  return null;
}

export async function objectExists(storagePath: string) {
  try {
    const s3 = getS3Client();
    if (s3 && env.STORAGE_BUCKET) {
      await s3.send(
        new HeadObjectCommand({
          Bucket: env.STORAGE_BUCKET,
          Key: storagePath
        })
      );
      return true;
    }

    const absolutePath = path.join(localRoot, storagePath);
    await access(absolutePath);
    return true;
  } catch {
    return false;
  }
}
