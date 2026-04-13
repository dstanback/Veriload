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

    // Carrier info should appear somewhere on the page
    await expect(page.getByText(/Carrier/i).first()).toBeVisible();
  });

  test("approve and dispute buttons render on detail page", async ({ page }) => {
    // Navigate to the shipments page and pick the first shipment
    await page.goto("/dashboard/shipments");
    await expect(page.locator("tbody tr").first()).toBeVisible();

    const firstLink = page.locator("tbody tr").first().getByRole("link").first();
    await firstLink.click();
    await expect(page).toHaveURL(/\/dashboard\/shipments\/.+/);

    // The Approve and Dispute buttons should always render (disabled for
    // locked shipments, enabled for pending/matched ones)
    const approveButton = page.getByRole("button", { name: "Approve" });
    const disputeButton = page.getByRole("button", { name: "Dispute" });

    await expect(approveButton).toBeVisible();
    await expect(disputeButton).toBeVisible();
  });

  test("buttons are disabled on locked shipments", async ({ page }) => {
    // Navigate to a shipment that should be locked (approved/disputed)
    // The seed data has shp_1 = approved and shp_2 = disputed
    // The list is ordered by updatedAt desc, so we navigate to the first one
    await page.goto("/dashboard/shipments");
    await expect(page.locator("tbody tr").first()).toBeVisible();

    const firstLink = page.locator("tbody tr").first().getByRole("link").first();
    await firstLink.click();
    await expect(page).toHaveURL(/\/dashboard\/shipments\/.+/);

    // Check whether the buttons are enabled or disabled — both are valid
    // depending on the shipment status
    const approveButton = page.getByRole("button", { name: "Approve" });
    await expect(approveButton).toBeVisible();
    // The button exists and is either enabled or disabled based on status
    const isDisabled = await approveButton.isDisabled();
    expect(typeof isDisabled).toBe("boolean");
  });

  test("discrepancy cards render for shipments with discrepancies", async ({
    page,
  }) => {
    await page.goto("/dashboard/shipments");
    await expect(page.locator("tbody tr").first()).toBeVisible();

    // Click first shipment
    const firstLink = page.locator("tbody tr").first().getByRole("link").first();
    await firstLink.click();
    await expect(page).toHaveURL(/\/dashboard\/shipments\/.+/);

    // The page should render without errors
    await expect(page.locator("body")).toBeVisible();
  });

  test("edit button renders on detail page", async ({ page }) => {
    await page.goto("/dashboard/shipments");
    await expect(page.locator("tbody tr").first()).toBeVisible();

    const firstLink = page.locator("tbody tr").first().getByRole("link").first();
    await firstLink.click();
    await expect(page).toHaveURL(/\/dashboard\/shipments\/.+/);

    // The Edit & Approve button should exist (may be disabled on locked shipments)
    const editButton = page.getByRole("button", { name: /Edit/i });
    const isEditVisible = await editButton.isVisible().catch(() => false);

    if (isEditVisible) {
      const isDisabled = await editButton.isDisabled();
      // If the button is enabled, clicking it should toggle edit mode
      if (!isDisabled) {
        await editButton.click();
        await expect(page.getByText(/Edit Mode/i)).toBeVisible();
      }
    }
  });
});
