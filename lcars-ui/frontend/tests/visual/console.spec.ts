import { expect, test } from "@playwright/test";
import { assertStrictInteriorComposition } from "./assertStrictInterior";

const CONSOLE_URL = "http://127.0.0.1:8101/";

test("overview console 1920x1080", async ({ page }) => {
  await page.setViewportSize({ width: 1920, height: 1080 });
  await page.goto(CONSOLE_URL);
  const overview = page.locator('.lcars-strict-page[data-lcars-page="overview"]');
  await expect(overview).toBeVisible();
  await expect(overview.locator(".lcars-parity-sweep")).toHaveCount(2);
  await expect(overview.locator(".lcars-parity-mass-svg")).toHaveCount(2);
  await expect(
    overview.locator(
      '.lcars-sweep-control[data-widget-id="overview_sweep_top"], .lcars-sweep-control[data-widget-id="overview_sweep_bottom"]',
    ),
  ).toHaveCount(0);
  const rasterUsage = await overview.evaluate((overviewRoot) => {
    const elementNodes = Array.from(overviewRoot.querySelectorAll<HTMLElement>("*"));
    const rasterNodeCount = overviewRoot.querySelectorAll("img, image, canvas").length;
    const hasRasterSourceAttr = Array.from(overviewRoot.querySelectorAll<HTMLElement>("[src], [href]")).some((node) => {
      const src = node.getAttribute("src") ?? "";
      const href = node.getAttribute("href") ?? "";
      return /(README-sweep|overview-reference-parity|\.png|\.jpg|\.jpeg|\.webp)$/i.test(`${src} ${href}`);
    });
    const hasRasterBackground = elementNodes.some((node) => {
      const style = window.getComputedStyle(node);
      return /url\(|image-set\(/i.test(`${style.backgroundImage} ${style.maskImage}`);
    });
    return {
      parityShapeCount: overviewRoot.querySelectorAll(".lcars-parity-sweep-shape").length,
      hasRasterBackground,
      hasRasterSourceAttr,
      rasterNodeCount,
    };
  });
  expect(rasterUsage.parityShapeCount).toBeGreaterThan(0);
  expect(rasterUsage.rasterNodeCount).toBe(0);
  expect(rasterUsage.hasRasterSourceAttr).toBe(false);
  expect(rasterUsage.hasRasterBackground).toBe(false);
  await expect(overview).not.toContainText(
    /\b(BAND|CORE|TITLE|DATA|AUTO-ROW|TERMINAL|PHASE13|B\d{2}|L\d{2})\b/,
  );
  await assertStrictInteriorComposition(page, {
    minBands: 1,
    minLanes: 1,
    minInteriorNodes: 9,
    minTerminalNodes: 0,
    minPageCoverage: 0.22,
  });
  await expect(page).toHaveScreenshot("overview-1920x1080.png", {
    fullPage: false,
    animations: "disabled",
    maxDiffPixelRatio: 0.001,
  });
});
