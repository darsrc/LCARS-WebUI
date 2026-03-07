import { expect, test } from "@playwright/test";
import { assertStrictInteriorComposition } from "./assertStrictInterior";

const PADD_URL = "http://127.0.0.1:8102/";

test("lcars_padd desktop 1920x1080", async ({ page }) => {
  await page.setViewportSize({ width: 1920, height: 1080 });
  await page.goto(PADD_URL);
  await assertStrictInteriorComposition(page, {
    minBands: 1,
    minLanes: 1,
    minInteriorNodes: 8,
    minTerminalNodes: 2,
    minPageCoverage: 0.18,
  });
  await expect(page.locator(".lcars-content-frame")).toHaveScreenshot("padd-1920x1080.png", {
    fullPage: false,
    animations: "disabled",
    maxDiffPixelRatio: 0.001,
  });
});

test("lcars_padd tablet 768x1024", async ({ page }) => {
  await page.setViewportSize({ width: 768, height: 1024 });
  await page.goto(PADD_URL);
  await assertStrictInteriorComposition(page, {
    minBands: 1,
    minLanes: 1,
    minInteriorNodes: 6,
    minTerminalNodes: 1,
    minPageCoverage: 0.16,
  });
  await expect(page.locator(".lcars-content-frame")).toHaveScreenshot("padd-768x1024.png", {
    fullPage: false,
    animations: "disabled",
    maxDiffPixelRatio: 0.001,
  });
});
