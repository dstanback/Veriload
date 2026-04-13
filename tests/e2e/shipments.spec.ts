import { test, expect } from "@playwright/test";
import { goToShipments, waitForTableRows } from "./helpers";

test.describe("Shipment list", () => {
  test("table renders with shipment rows", async ({ page }) => {
    await goToShipments(page);

    // Header should be visible
    await expect(page.getByText("Reconciliation review list")).toBeVisible();

    // Table should have multiple rows (seeded data has 14 shipments)
    const rows = page.locator("tbody tr");
    await expect(rows.first()).toBeVisible();
    const count = await rows.count();
    expect(count).toBeGreaterThanOrEqual(1);
  });

  test("table has expected column headers", async ({ page }) => {
    await goToShipments(page);

    await expect(page.locator("thead").getByText("Shipment")).toBeVisible();
    await expect(page.locator("thead").getByText("Carrier")).toBeVisible();
    await expect(page.locator("thead").getByText("Lane")).toBeVisible();
    await expect(page.locator("thead").getByText("Status")).toBeVisible();
    await expect(page.locator("thead").getByText("Discrepancy")).toBeVisible();
  });

  test("clicking a shipment row navigates to detail page", async ({ page }) => {
    await goToShipments(page);

    // Click the first shipment link in the table
    const firstLink = page.locator("tbody tr").first().getByRole("link").first();
    const href = await firstLink.getAttribute("href");
    expect(href).toMatch(/\/dashboard\/shipments\/.+/);

    await firstLink.click();
    await expect(page).toHaveURL(/\/dashboard\/shipments\/.+/);
  });

  test("row checkbox selection works", async ({ page }) => {
    await goToShipments(page);

    // Click the first row's checkbox
    const firstCheckbox = page
      .locator("tbody tr")
      .first()
      .locator("input[type='checkbox']");
    await firstCheckbox.check();

    // Bulk action bar renders as a fixed bar at the bottom.
    // The text pattern is: "N shipment(s) selected"
    await expect(page.getByText(/\d+ shipments? selected/)).toBeVisible({
      timeout: 5000,
    });
  });

  test("select-all checkbox toggles all rows", async ({ page }) => {
    await goToShipments(page);

    // Click the header checkbox to select all
    const headerCheckbox = page
      .locator("thead")
      .locator("input[type='checkbox']");
    await headerCheckbox.check();

    // Bulk action bar should show selected count
    await expect(page.getByText(/\d+ shipments? selected/)).toBeVisible({
      timeout: 5000,
    });

    // Uncheck
    await headerCheckbox.uncheck();
    // Bar should disappear (animated exit)
    await expect(page.getByText(/\d+ shipments? selected/)).not.toBeVisible({
      timeout: 5000,
    });
  });
});
