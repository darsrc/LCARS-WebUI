import { expect, test } from "@playwright/test";

const CONSOLE_URL = "http://127.0.0.1:8101/";

test("lcars_console desktop 1920x1080", async ({ page }) => {
  await page.setViewportSize({ width: 1920, height: 1080 });
  await page.goto(CONSOLE_URL);
  await expect(page.locator(".lcars-content-frame")).toBeVisible();
  await expect(page.locator(".lcars-content-frame .lcars-strict-band").first()).toBeVisible();
  await expect(page.locator(".lcars-content-frame .lcars-sweep-control").first()).toBeVisible();
  await expect(page.locator(".lcars-content-frame .lcars-box-control, .lcars-content-frame .lcars-bracket-control").first()).toBeVisible();
  await expect(page).toHaveScreenshot("console-1920x1080.png", {
    fullPage: false,
    animations: "disabled",
    maxDiffPixelRatio: 0.001,
  });
});

test("lcars_console workstation 768x1024", async ({ page }) => {
  await page.setViewportSize({ width: 768, height: 1024 });
  await page.goto(CONSOLE_URL);
  await expect(page.locator(".lcars-content-frame")).toBeVisible();
  await expect(page.locator(".lcars-content-frame .lcars-strict-band").first()).toBeVisible();
  await expect(page.locator(".lcars-content-frame .lcars-sweep-control").first()).toBeVisible();
  await expect(page.locator(".lcars-content-frame .lcars-box-control, .lcars-content-frame .lcars-bracket-control").first()).toBeVisible();
  await expect(page).toHaveScreenshot("console-768x1024.png", {
    fullPage: false,
    animations: "disabled",
    maxDiffPixelRatio: 0.001,
  });
});
