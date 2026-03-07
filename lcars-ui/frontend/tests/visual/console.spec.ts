import { expect, test } from "@playwright/test";
import { assertStrictInteriorComposition } from "./assertStrictInterior";

const CONSOLE_URL = "http://127.0.0.1:8101/";

test("lcars_console desktop 1920x1080", async ({ page }) => {
  await page.setViewportSize({ width: 1920, height: 1080 });
  await page.goto(CONSOLE_URL);
  await assertStrictInteriorComposition(page, {
    minBands: 1,
    minLanes: 2,
    minInteriorNodes: 10,
    minTerminalNodes: 2,
    minPageCoverage: 0.22,
  });
  await expect(page.locator(".lcars-content-frame")).toHaveScreenshot("console-1920x1080.png", {
    fullPage: false,
    animations: "disabled",
    maxDiffPixelRatio: 0.001,
  });
});

test("lcars_console workstation 768x1024", async ({ page }) => {
  await page.setViewportSize({ width: 768, height: 1024 });
  await page.goto(CONSOLE_URL);
  await assertStrictInteriorComposition(page, {
    minBands: 1,
    minLanes: 1,
    minInteriorNodes: 8,
    minTerminalNodes: 2,
    minPageCoverage: 0.2,
  });
  await expect(page.locator(".lcars-content-frame")).toHaveScreenshot("console-768x1024.png", {
    fullPage: false,
    animations: "disabled",
    maxDiffPixelRatio: 0.001,
  });
});
