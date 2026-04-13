import path from "node:path";
import { test, expect } from "@playwright/test";

test.describe("Upload page", () => {
  test("upload page loads with dropzone", async ({ page }) => {
    await page.goto("/dashboard/upload");

    // Header text
    await expect(
      page.getByText("Upload PDFs or images into the extraction queue")
    ).toBeVisible();

    // File input should exist
    const fileInput = page.locator("input[type='file']");
    await expect(fileInput).toBeAttached();
  });

  test("file input accepts PDF files", async ({ page }) => {
    await page.goto("/dashboard/upload");

    // The file input should accept pdf, png, jpeg
    const fileInput = page.locator("input[type='file']");
    const accept = await fileInput.getAttribute("accept");
    expect(accept).toContain(".pdf");
  });

  test("upload button is disabled without files", async ({ page }) => {
    await page.goto("/dashboard/upload");

    const submitButton = page.getByRole("button", {
      name: /Upload and queue/i,
    });
    await expect(submitButton).toBeDisabled();
  });

  test("selecting a file enables the upload button", async ({ page }) => {
    await page.goto("/dashboard/upload");

    const fileInput = page.locator("input[type='file']");
    const fixturePath = path.resolve(
      __dirname,
      "fixtures",
      "test-invoice.pdf"
    );

    await fileInput.setInputFiles(fixturePath);

    const submitButton = page.getByRole("button", {
      name: /Upload and queue/i,
    });
    await expect(submitButton).toBeEnabled();
  });

  test("upload flow submits the file", async ({ page }) => {
    await page.goto("/dashboard/upload");

    const fileInput = page.locator("input[type='file']");
    const fixturePath = path.resolve(
      __dirname,
      "fixtures",
      "test-invoice.pdf"
    );

    await fileInput.setInputFiles(fixturePath);

    const submitButton = page.getByRole("button", {
      name: /Upload and queue/i,
    });
    await submitButton.click();

    // After upload, status indicators should appear (pending/processing/etc.)
    // or a success result card. Wait for any processing status indicator.
    await expect(
      page.getByText(
        /pending|processing|extracted|queued|uploaded/i
      ).first()
    ).toBeVisible({ timeout: 15_000 });
  });
});
