import { chromium } from "@playwright/test";

const url = process.argv[2] ?? "http://127.0.0.1:8121/";
const out = process.argv[3] ?? "/tmp/shot.png";

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
const errors = [];
page.on("console", (m) => { if (m.type() === "error") errors.push(m.text()); });
page.on("pageerror", (e) => errors.push(String(e)));
await page.goto(url, { waitUntil: "networkidle" });
await page.waitForTimeout(900);
await page.screenshot({ path: out });
await browser.close();
if (errors.length) {
  console.log("PAGE ERRORS:\n" + errors.slice(0, 8).join("\n"));
} else {
  console.log("no page errors");
}
console.log("saved " + out);
