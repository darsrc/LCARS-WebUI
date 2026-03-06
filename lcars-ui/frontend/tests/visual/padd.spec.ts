import { expect, test } from "@playwright/test";

const PADD_URL = "http://127.0.0.1:8102/";

test("lcars_padd desktop 1920x1080", async ({ page }) => {
  await page.setViewportSize({ width: 1920, height: 1080 });
  await page.goto(PADD_URL);
  await expect(page.locator(".lcars-content-frame")).toBeVisible();
  await expect(page).toHaveScreenshot("padd_1920x1080.png", {
    fullPage: false,
    animations: "disabled",
    maxDiffPixelRatio: 0.001,
  });
});

test("lcars_padd tablet 768x1024", async ({ page }) => {
  await page.setViewportSize({ width: 768, height: 1024 });
  await page.goto(PADD_URL);
  await expect(page.locator(".lcars-content-frame")).toBeVisible();
  await expect(page).toHaveScreenshot("padd_768x1024.png", {
    fullPage: false,
    animations: "disabled",
    maxDiffPixelRatio: 0.001,
  });
});
