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

    // The button text is "Upload and queue"
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

    // Use Playwright's setInputFiles which triggers the change event
    await fileInput.setInputFiles(fixturePath);

    // Wait for React state to update and re-render the button as enabled
    const submitButton = page.getByRole("button", {
      name: /Upload and queue/i,
    });
    await expect(submitButton).toBeEnabled({ timeout: 5000 });
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
    await expect(submitButton).toBeEnabled({ timeout: 5000 });
    await submitButton.click();

    // After upload, the "Processing status" section should appear with
    // document cards showing status indicators (Queued, Processing, etc.)
    await expect(
      page.getByText("Processing status")
    ).toBeVisible({ timeout: 15_000 });
  });
});
