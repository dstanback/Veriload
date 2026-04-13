import { test, expect } from "@playwright/test";
import { goToShipments } from "./helpers";

test.describe("Shipment list", () => {
  test("table renders with shipment rows", async ({ page }) => {
    await goToShipments(page);

    await expect(page.getByText("Reconciliation review list")).toBeVisible();

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

    const firstLink = page.locator("tbody tr").first().getByRole("link").first();
    const href = await firstLink.getAttribute("href");
    expect(href).toMatch(/\/dashboard\/shipments\/.+/);

    await firstLink.click();
    await expect(page).toHaveURL(/\/dashboard\/shipments\/.+/);
  });

  test("row checkbox selection works", async ({ page }) => {
    await goToShipments(page);

    // shipment-table.tsx line 70-77: standard <input type="checkbox"> with
    // aria-label, controlled via TanStack React Table row selection state.
    // Use .click() instead of .check() for reliability with controlled inputs.
    const firstCheckbox = page
      .locator("tbody tr")
      .first()
      .locator("input[type='checkbox']");
    await firstCheckbox.click();

    // shipment-table.tsx line 276-278: bulk action bar renders
    // "{selectedCount} shipment{selectedCount !== 1 ? 's' : ''} selected"
    // For 1 selected row: "1 shipment selected"
    await expect(
      page.locator("text=shipment selected").first()
    ).toBeVisible({ timeout: 5000 });
  });

  test("select-all checkbox toggles all rows", async ({ page }) => {
    await goToShipments(page);

    // shipment-table.tsx line 93-99: header checkbox with aria-label
    // "Select all shipments", controlled via getToggleAllPageRowsSelectedHandler
    const headerCheckbox = page.getByLabel("Select all shipments");
    await headerCheckbox.click();

    // shipment-table.tsx line 277: "N shipments selected" (plural for > 1)
    await expect(
      page.locator("text=shipments selected").first()
    ).toBeVisible({ timeout: 5000 });

    // Deselect
    await headerCheckbox.click();

    // Bar should disappear (framer-motion exit animation)
    await expect(
      page.locator("text=shipments selected")
    ).not.toBeVisible({ timeout: 5000 });
  });
});
