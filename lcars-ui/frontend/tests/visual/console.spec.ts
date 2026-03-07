import { expect, test } from "@playwright/test";
import { assertStrictInteriorComposition } from "./assertStrictInterior";

const CONSOLE_URL = "http://127.0.0.1:8101/";

test("overview console 1920x1080", async ({ page }) => {
  await page.setViewportSize({ width: 1920, height: 1080 });
  await page.goto(CONSOLE_URL);
  const overview = page.locator('.lcars-strict-page[data-lcars-page="overview"]');
  await expect(overview).toBeVisible();
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
