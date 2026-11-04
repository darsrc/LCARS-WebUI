import { chromium } from "@playwright/test";
import { existsSync, mkdirSync, readdirSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

/** Find the locally installed Playwright Chromium binary. */
function findChrome() {
  const root = join(homedir(), ".cache", "ms-playwright");
  for (const directory of readdirSync(root)
    .filter((name) => name.startsWith("chromium-"))
    .sort()
    .reverse()) {
    const executablePath = join(root, directory, "chrome-linux64", "chrome");
    if (existsSync(executablePath)) {
      return executablePath;
    }
  }
  return undefined;
}

/** Return a short scene metadata record for the current rendered mode. */
async function readSceneMetadata(page, shot) {
  return page.locator(".lcars-scene").evaluate(
    (sceneRoot, shotName) => ({
      shot: shotName,
      family: sceneRoot.dataset.sceneFamily ?? null,
      orientation: sceneRoot.dataset.sceneOrientation ?? null,
      explanation: sceneRoot.dataset.sceneExplanation ?? null,
    }),
    shot,
  );
}

/** Capture one scene mode and print its layout metadata. */
async function captureShot(page, outputPath, shot) {
  await page.screenshot({ path: outputPath });
  console.log(JSON.stringify(await readSceneMetadata(page, shot)));
}

/** Click a named scene button, opening its folded region terminal if needed. */
async function clickSceneButton(page, name) {
  const button = page.getByRole("button", { name, exact: true });
  try {
    await button.click({ timeout: 900 });
    return true;
  } catch {
    const terminals = page.locator(
      ".lcars-scene [data-fold-terminal], .lcars-scene button[aria-expanded]",
    );
    const terminalCount = await terminals.count();
    for (let terminalIndex = 0; terminalIndex < terminalCount; terminalIndex += 1) {
      try {
        await terminals.nth(terminalIndex).click({ timeout: 400 });
        await button.click({ timeout: 900 });
        return true;
      } catch {
        continue;
      }
    }
    console.log(`Skipping ${name}: button is hidden or unavailable.`);
    return false;
  }
}

const url = process.env.SHOT_URL || "http://127.0.0.1:8077/";
const outputDirectory = process.env.SHOT_DIR;
if (!outputDirectory) {
  throw new Error("SHOT_DIR is required.");
}
mkdirSync(outputDirectory, { recursive: true });

const viewports = [
  { width: 1920, height: 1080 },
  { width: 1366, height: 768 },
  { width: 1080, height: 1920 },
  { width: 390, height: 844 },
];
const browser = await chromium.launch({
  executablePath: process.env.SHOT_CHROME || findChrome() || "/usr/bin/chromium",
});

try {
  for (const viewport of viewports) {
    const page = await browser.newPage({ viewport, deviceScaleFactor: 1 });
    await page.goto(url, { waitUntil: "networkidle", timeout: 10000 });
    await page.waitForSelector(".lcars-scene", { timeout: 5000 });
    await page.waitForTimeout(800);
    const viewportName = `${viewport.width}x${viewport.height}`;
    await captureShot(
      page,
      join(outputDirectory, `${viewportName}-inspect.png`),
      `${viewportName}-inspect`,
    );

    if (await clickSceneButton(page, "COMPARE")) {
      await page.waitForTimeout(800);
      await captureShot(
        page,
        join(outputDirectory, `${viewportName}-compare.png`),
        `${viewportName}-compare`,
      );
    }
    if (await clickSceneButton(page, "DONE")) {
      await page.waitForTimeout(800);
      if (await clickSceneButton(page, "ANNOTATE")) {
        await page.waitForTimeout(800);
        await captureShot(
          page,
          join(outputDirectory, `${viewportName}-annotate.png`),
          `${viewportName}-annotate`,
        );
        if (await clickSceneButton(page, "DONE")) {
          await page.waitForTimeout(800);
          if (await clickSceneButton(page, "SIMULATE FAULT")) {
            await page.waitForTimeout(800);
            await captureShot(
              page,
              join(outputDirectory, `${viewportName}-fault.png`),
              `${viewportName}-fault`,
            );
          }
        }
      }
    }
    await page.close();
  }
} finally {
  await browser.close();
}
