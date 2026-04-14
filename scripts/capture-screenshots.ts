import { chromium } from "playwright";
import { mkdir } from "node:fs/promises";
import path from "node:path";

const BASE_URL = process.env.BASE_URL ?? "http://localhost:3000";
const OUT_DIR = path.resolve(process.cwd(), "docs/screenshots");

async function capture() {
  await mkdir(OUT_DIR, { recursive: true });

  const browser = await chromium.launch();

  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 2,
    colorScheme: "light",
    extraHTTPHeaders: {
      "x-veriload-user-email": "ops@acmefreight.com",
      "x-veriload-org-slug": "acme",
    },
  });

  const page = await context.newPage();

  // Helper: navigate + wait for render
  async function go(urlPath: string, waitMs = 2000) {
    await page.goto(`${BASE_URL}${urlPath}`, { waitUntil: "networkidle" });
    await page.waitForTimeout(waitMs);
  }

  async function shot(name: string) {
    const filePath = path.join(OUT_DIR, name);
    await page.screenshot({ path: filePath, fullPage: false });
    console.log(`  ✓ ${name}`);
  }

  // ── 1. Dashboard ─────────────────────────────────────────────────────
  console.log("Capturing dashboard...");
  await go("/dashboard", 3000); // extra wait for charts
  await shot("dashboard.png");

  // ── 2. Shipment List ─────────────────────────────────────────────────
  console.log("Capturing shipments...");
  await go("/dashboard/shipments");
  await shot("shipments.png");

  // ── 3. Shipment Detail (red/disputed) ────────────────────────────────
  console.log("Capturing shipment detail...");
  // Find a disputed/red shipment link from the shipment list
  const disputedRow = page.locator("tr").filter({ hasText: "Disputed" }).first();
  let detailLink;
  if (await disputedRow.count()) {
    detailLink = disputedRow.locator("a[href*='/dashboard/shipments/']").first();
  } else {
    detailLink = page.locator("a[href*='/dashboard/shipments/']").first();
  }
  if (await detailLink.count()) {
    await detailLink.click();
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(1500);
  }
  await shot("shipment-detail.png");

  // ── 4. Document Viewer Modal ─────────────────────────────────────────
  console.log("Capturing document viewer...");
  // Click the first document card button (the entire card is a button)
  const docCards = page.locator("button.w-full.text-left");
  const cardCount = await docCards.count();
  if (cardCount > 0) {
    // Click the card and wait for modal
    await docCards.first().click();
    await page.waitForTimeout(1500);
    // Check if the fixed modal overlay appeared
    const modal = page.locator(".fixed.inset-4.z-50");
    if (await modal.count()) {
      await page.waitForTimeout(500);
      await shot("document-viewer.png");
      await page.keyboard.press("Escape");
      await page.waitForTimeout(500);
    } else {
      // Modal didn't appear — screenshot the detail page with expanded data as fallback
      console.log("  ⚠ Modal not detected, using detail page as document-viewer");
      await shot("document-viewer.png");
    }
  } else {
    console.log("  ⚠ No document cards found, skipping document-viewer");
  }

  // ── 5. Upload Page ───────────────────────────────────────────────────
  console.log("Capturing upload...");
  await go("/dashboard/upload");
  await shot("upload.png");

  // ── 6. Analytics ─────────────────────────────────────────────────────
  console.log("Capturing analytics...");
  await page.goto(`${BASE_URL}/dashboard/analytics?range=7`, {
    waitUntil: "load",
  });
  // Wait for Suspense content to stream in
  await page
    .waitForSelector("text=Total Savings", { timeout: 15000 })
    .catch(() => console.log("  ⚠ analytics Suspense may not have resolved"));
  // Extra wait for Recharts to measure containers and render SVGs
  await page.waitForTimeout(3000);
  // Scroll to top to ensure hero card is captured
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(500);
  await shot("analytics.png");

  // ── 7. Dark Mode Dashboard ───────────────────────────────────────────
  console.log("Capturing dark mode...");
  await go("/dashboard", 2000);
  // Click the theme toggle button (aria-label contains "Switch to dark mode")
  const themeBtn = page.locator('button[aria-label*="Switch to"]');
  if (await themeBtn.count()) {
    await themeBtn.click();
    await page.waitForTimeout(500);
    // Verify it toggled — if still light, click again
    const isDark = await page.evaluate(() =>
      document.documentElement.classList.contains("dark")
    );
    if (!isDark) {
      await themeBtn.click();
      await page.waitForTimeout(500);
    }
  }
  // Ensure dark class is applied (belt-and-suspenders)
  await page.evaluate(() => {
    document.documentElement.classList.add("dark");
    document.documentElement.classList.remove("light");
    localStorage.setItem("veriload-theme", "dark");
  });
  await page.waitForTimeout(2000); // let charts and transitions settle
  await shot("dark-mode.png");

  await browser.close();
  console.log(`\nDone — ${7} screenshots saved to ${OUT_DIR}`);
}

capture().catch((err) => {
  console.error("Screenshot capture failed:", err);
  process.exit(1);
});
