import "server-only";

import { createCanvas } from "@napi-rs/canvas";

import { env } from "@/lib/env";
import { saveFile, readFileBuffer } from "@/lib/storage";
import type { VisionPageImage } from "@/lib/ai/shared";

function assertSupportedImageMimeType(mimeType: string): VisionPageImage["mediaType"] {
  if (mimeType === "image/png" || mimeType === "image/jpeg" || mimeType === "image/gif" || mimeType === "image/webp") {
    return mimeType;
  }

  return "image/png";
}

export async function convertPdfToImages(params: {
  documentId: string;
  storagePath: string;
  mimeType: string;
}): Promise<{ pageCount: number; pageImagePaths: string[]; pageImages: VisionPageImage[] }> {
  const inputBuffer = await readFileBuffer(params.storagePath);

  if (params.mimeType !== "application/pdf") {
    return {
      pageCount: 1,
      pageImagePaths: [params.storagePath],
      pageImages: [
        {
          storagePath: params.storagePath,
          mediaType: assertSupportedImageMimeType(params.mimeType),
          data: inputBuffer.toString("base64")
        }
      ]
    };
  }

  const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");

  const loadingTask = pdfjs.getDocument({
    data: new Uint8Array(inputBuffer),
    useSystemFonts: true,
    isEvalSupported: false
  });
  const pdfDocument = await loadingTask.promise;
  const pageImagePaths: string[] = [];
  const pageImages: VisionPageImage[] = [];
  const scale = env.PDF_RENDER_DPI / 72;

  for (let pageNumber = 1; pageNumber <= pdfDocument.numPages; pageNumber += 1) {
    const page = await pdfDocument.getPage(pageNumber);
    const viewport = page.getViewport({ scale });
    const canvas = createCanvas(Math.ceil(viewport.width), Math.ceil(viewport.height));
    const context = canvas.getContext("2d");

    await page.render({
      canvas: canvas as never,
      canvasContext: context as never,
      viewport
    }).promise;

    const pngBuffer = canvas.toBuffer("image/png");
    const pageStoragePath = `pages/${params.documentId}/page_${String(pageNumber).padStart(3, "0")}.png`;

    await saveFile(pageStoragePath, pngBuffer, "image/png");
    pageImagePaths.push(pageStoragePath);
    pageImages.push({
      storagePath: pageStoragePath,
      mediaType: "image/png",
      data: pngBuffer.toString("base64")
    });

    page.cleanup();
  }

  await pdfDocument.cleanup();
  await pdfDocument.destroy();

  return {
    pageCount: pdfDocument.numPages,
    pageImagePaths,
    pageImages
  };
}
