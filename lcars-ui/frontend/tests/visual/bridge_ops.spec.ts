import { expect, test } from "@playwright/test";
import { assertStrictInteriorComposition } from "./assertStrictInterior";

const BRIDGE_OPS_URL = "http://127.0.0.1:8103/";

test("bridge_ops desktop 1920x1080", async ({ page }) => {
  await page.setViewportSize({ width: 1920, height: 1080 });
  await page.goto(BRIDGE_OPS_URL);
  await assertStrictInteriorComposition(page, {
    minBands: 1,
    minLanes: 2,
    minInteriorNodes: 10,
    minTerminalNodes: 2,
    minPageCoverage: 0.2,
  });
  await expect(page.locator(".lcars-content-frame")).toHaveScreenshot("bridge-ops-1920x1080.png", {
    fullPage: false,
    animations: "disabled",
    maxDiffPixelRatio: 0.001,
  });
});
