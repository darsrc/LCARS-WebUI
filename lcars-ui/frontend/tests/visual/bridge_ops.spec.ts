import { expect, test } from "@playwright/test";

const BRIDGE_OPS_URL = "http://127.0.0.1:8103/";

test("bridge_ops desktop 1920x1080", async ({ page }) => {
  await page.setViewportSize({ width: 1920, height: 1080 });
  await page.goto(BRIDGE_OPS_URL);
  await expect(page.locator(".lcars-content-frame")).toBeVisible();
  await expect(page).toHaveScreenshot("bridge_ops_1920x1080.png", {
    fullPage: false,
    animations: "disabled",
    maxDiffPixelRatio: 0.001,
  });
});
