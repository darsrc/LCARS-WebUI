// One-shot wiki screenshot capture — all pages, no reruns.
import { chromium } from "playwright";
import { join } from "path";

const BASE = "http://127.0.0.1:8077";
const OUT = "/home/darius/Documents/Projects/LCARS-WebUI/wiki/images";
const W = 1280, H = 800;

const SHOTS = [
  // [nav-button-text-or-null, filename]
  [null,        "kitchen-sink-overview.png"],   // landing page (console archetype)
  ["Telemetry", "telemetry-panel.png"],
  ["Telemetry", "data-readouts-panel.png"],
  ["Grid",      "widgets-gallery.png"],
  ["Grid",      "display-widgets-states.png"],
  ["Grid",      "layout-containers.png"],
  ["Widgets",   "input-widgets-initial.png"],
  ["Widgets",   "input-widgets-active-states.png"],
  ["Widgets",   "sweep-container.png"],
  ["Widgets",   "padd-container.png"],
  ["Widgets",   "diagnostic-container.png"],
];

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: W, height: H } });

await page.goto(BASE, { waitUntil: "networkidle" });
await page.waitForTimeout(800);

let lastNav = null;
for (const [nav, filename] of SHOTS) {
  if (nav !== lastNav) {
    if (nav) {
      await page.getByRole("button", { name: new RegExp(nav, "i") }).first().click();
      await page.waitForTimeout(600);
    }
    lastNav = nav;
  }
  await page.screenshot({ path: join(OUT, filename), fullPage: false });
  console.log("captured", filename);
}

await browser.close();
console.log("done");
