import { chromium } from "@playwright/test";
import { existsSync, readdirSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

function findChrome() {
  const root = join(homedir(), ".cache", "ms-playwright");
  for (const d of readdirSync(root).filter((x) => x.startsWith("chromium-")).sort().reverse()) {
    const p = join(root, d, "chrome-linux64", "chrome");
    if (existsSync(p)) return p;
  }
  return undefined;
}

const browser = await chromium.launch({ executablePath: findChrome() });
const page = await browser.newPage({ viewport: { width: 1682, height: 1080 }, deviceScaleFactor: 1 });
await page.goto("file://" + process.env.PARITY_HTML, { waitUntil: "networkidle" });
await page.waitForTimeout(1500);
await page.screenshot({ path: process.env.SHOT_OUT });
console.log("wrote", process.env.SHOT_OUT);
await browser.close();
