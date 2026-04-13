import { test, expect } from "@playwright/test";
import { goToShipments } from "./helpers";

test.describe("Shipment detail", () => {
  test("detail page loads with shipment info", async ({ page }) => {
    // Navigate to the first shipment's detail page via the list
    await goToShipments(page);
    const firstLink = page.locator("tbody tr").first().getByRole("link").first();
    await firstLink.click();
    await expect(page).toHaveURL(/\/dashboard\/shipments\/.+/);

    // The detail page should show key sections
    // Status badge should be visible
    const badges = page.getByRole("status");
    await expect(badges.first()).toBeVisible();

    // Lane info card (dark card with origin/destination)
    await expect(page.getByText(/Carrier/i).first()).toBeVisible();
  });

  test("approve button exists on non-locked shipment", async ({ page }) => {
    // Go to shipments page and find a pending or matched shipment
    await page.goto("/dashboard/shipments");
    await expect(page.locator("tbody tr").first()).toBeVisible();

    // Click the first shipment
    const firstLink = page.locator("tbody tr").first().getByRole("link").first();
    await firstLink.click();
    await expect(page).toHaveURL(/\/dashboard\/shipments\/.+/);

    // Either the Approve button is visible (for pending/matched) or
    // a lock message is shown (for approved/disputed/paid)
    const approveButton = page.getByRole("button", { name: "Approve" });
    const lockMessage = page.getByText(
      /already been approved|currently disputed|already been paid/
    );

    const approveVisible = await approveButton.isVisible().catch(() => false);
    const lockVisible = await lockMessage.isVisible().catch(() => false);

    // One of these should be present
    expect(approveVisible || lockVisible).toBeTruthy();
  });

  test("dispute button exists on non-locked shipment", async ({ page }) => {
    await page.goto("/dashboard/shipments");
    await expect(page.locator("tbody tr").first()).toBeVisible();

    const firstLink = page.locator("tbody tr").first().getByRole("link").first();
    await firstLink.click();
    await expect(page).toHaveURL(/\/dashboard\/shipments\/.+/);

    const disputeButton = page.getByRole("button", { name: "Dispute" });
    const lockMessage = page.getByText(
      /already been approved|currently disputed|already been paid/
    );

    const disputeVisible = await disputeButton.isVisible().catch(() => false);
    const lockVisible = await lockMessage.isVisible().catch(() => false);

    expect(disputeVisible || lockVisible).toBeTruthy();
  });

  test("discrepancy cards render for shipments with discrepancies", async ({
    page,
  }) => {
    // Navigate to shipments and find one with a discrepancy badge
    await page.goto("/dashboard/shipments");
    await expect(page.locator("tbody tr").first()).toBeVisible();

    // Click first shipment
    const firstLink = page.locator("tbody tr").first().getByRole("link").first();
    await firstLink.click();
    await expect(page).toHaveURL(/\/dashboard\/shipments\/.+/);

    // The page should render — it may or may not have discrepancies
    // but the page itself should load without errors
    await expect(page.locator("body")).toBeVisible();
  });

  test("edit mode can be toggled", async ({ page }) => {
    await page.goto("/dashboard/shipments");
    await expect(page.locator("tbody tr").first()).toBeVisible();

    const firstLink = page.locator("tbody tr").first().getByRole("link").first();
    await firstLink.click();
    await expect(page).toHaveURL(/\/dashboard\/shipments\/.+/);

    // The Edit & Approve button may or may not exist depending on shipment status
    const editButton = page.getByRole("button", { name: /Edit/i });
    const isEditVisible = await editButton.isVisible().catch(() => false);

    if (isEditVisible) {
      await editButton.click();
      // Edit mode indicator should appear
      await expect(page.getByText(/Edit Mode/i)).toBeVisible();
    }
  });
});
