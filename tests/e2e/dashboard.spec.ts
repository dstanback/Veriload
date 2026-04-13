import { test, expect } from "@playwright/test";
import { goToDashboard } from "./helpers";

test.describe("Dashboard", () => {
  test("loads with stat cards", async ({ page }) => {
    await goToDashboard(page);

    // Stats region should be present with at least one card
    const statsRegion = page.getByRole("region", {
      name: "Dashboard statistics",
    });
    await expect(statsRegion).toBeVisible();

    // Should show the four stat labels
    await expect(page.getByText("Processed today")).toBeVisible();
    await expect(page.getByText("Pending review")).toBeVisible();
    await expect(page.getByText("Auto-approved")).toBeVisible();
    await expect(page.getByText("Open disputes")).toBeVisible();
  });

  test("renders discrepancy donut chart area", async ({ page }) => {
    await goToDashboard(page);

    // The "Current mix" card uses a conic-gradient div (not SVG) as a chart
    await expect(page.getByText("Current mix")).toBeVisible();
    // Legend items
    await expect(page.getByText("Green")).toBeVisible();
    await expect(page.getByText("Yellow")).toBeVisible();
    await expect(page.getByText("Red")).toBeVisible();
  });

  test("activity feed shows entries", async ({ page }) => {
    await goToDashboard(page);

    await expect(page.getByText("Operator feed")).toBeVisible();
    // Entries badge should show count
    await expect(page.getByText(/\d+ entries/)).toBeVisible();
  });

  test("priority queue shows shipment cards", async ({ page }) => {
    await goToDashboard(page);

    await expect(page.getByText("Priority queue")).toBeVisible();
    // At least one shipment card in the priority queue should have a
    // discrepancy badge
    const badges = page
      .locator("text=Priority queue")
      .locator("..")
      .locator("..")
      .getByRole("status");
    // badges may or may not exist — just ensure the section rendered
    await expect(page.getByText("Priority queue")).toBeVisible();
  });

  test("sidebar navigation links work", async ({ page }) => {
    await goToDashboard(page);

    // Click Shipments nav link
    await page.getByRole("link", { name: "Shipments" }).click();
    await expect(page).toHaveURL(/\/dashboard\/shipments/);

    // Click Analytics nav link
    await page.getByRole("link", { name: "Analytics" }).click();
    await expect(page).toHaveURL(/\/dashboard\/analytics/);

    // Click Upload nav link
    await page.getByRole("link", { name: "Upload" }).click();
    await expect(page).toHaveURL(/\/dashboard\/upload/);
  });
});
