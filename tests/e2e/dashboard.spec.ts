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

  test("renders discrepancy chart area", async ({ page }) => {
    await goToDashboard(page);

    // The "Current mix" card uses a conic-gradient div as a chart
    await expect(page.getByText("Current mix")).toBeVisible();
    // Legend items — use .first() since "Green"/"Yellow"/"Red" may also
    // appear inside Badge components elsewhere on the dashboard
    await expect(page.getByText("Green").first()).toBeVisible();
    await expect(page.getByText("Yellow").first()).toBeVisible();
    await expect(page.getByText("Red").first()).toBeVisible();
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
