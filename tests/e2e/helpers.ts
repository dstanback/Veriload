import { type Page, expect } from "@playwright/test";

/**
 * Navigate to the dashboard as the authenticated demo user.
 * Auth is header-based in dev mode — the extraHTTPHeaders in
 * playwright.config.ts handle it automatically.
 */
export async function goToDashboard(page: Page) {
  await page.goto("/dashboard");
  // Wait for the sidebar brand to confirm the page has loaded
  await expect(page.locator("text=Ops Console")).toBeVisible();
}

/**
 * Wait until a table has at least `minCount` data rows (tbody > tr).
 */
export async function waitForTableRows(page: Page, minCount: number) {
  await expect(async () => {
    const rows = page.locator("tbody tr");
    const count = await rows.count();
    expect(count).toBeGreaterThanOrEqual(minCount);
  }).toPass({ timeout: 10_000 });
}

/**
 * Navigate to the shipment list page and wait for the table to render.
 */
export async function goToShipments(page: Page) {
  await page.goto("/dashboard/shipments");
  await waitForTableRows(page, 1);
}
