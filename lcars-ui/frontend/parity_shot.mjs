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

const url = process.env.SHOT_URL || "file://" + process.env.PARITY_HTML;
const W = Number(process.env.SHOT_W || 1682);
const H = Number(process.env.SHOT_H || 1080);
const browser = await chromium.launch({ executablePath: findChrome() });
const page = await browser.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: 1 });
await page.goto(url, { waitUntil: "networkidle" });
await page.waitForTimeout(1800);
await page.screenshot({ path: process.env.SHOT_OUT });
console.log("wrote", process.env.SHOT_OUT, "from", url);
await browser.close();
