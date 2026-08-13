/** Capture LCARS_TRUTH recreations from the live LCARS WebUI example. */

import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { mkdir } from "node:fs/promises";
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const packageRoot = path.resolve(scriptDir, "..");
const repositoryRoot = path.resolve(packageRoot, "..");
const outputDir = path.join(repositoryRoot, "docs", "CANON_RECREATION");
const requireFromFrontend = createRequire(path.join(packageRoot, "frontend", "package.json"));
const { chromium } = requireFromFrontend("playwright");
const python = existsSync(path.join(packageRoot, ".venv", "bin", "python"))
  ? path.join(packageRoot, ".venv", "bin", "python")
  : "python";

const screens = [
  { design: "seismic", port: 8141, width: 984, height: 750, output: "seismographic-recreation.png" },
  { design: "periodic", port: 8142, width: 1476, height: 1080, output: "periodic-table-recreation.png" },
  { design: "holodeck", port: 8143, width: 1388, height: 1080, output: "holodeck-recreation.png" },
  { design: "access", port: 8144, width: 1682, height: 1080, output: "access-console-recreation.png" },
];
const requestedDesign = process.env.LCARS_CANON_DESIGN;
const selectedScreens = requestedDesign
  ? screens.filter((screen) => screen.design === requestedDesign)
  : screens;
if (selectedScreens.length === 0) {
  throw new Error(`Unknown LCARS_CANON_DESIGN ${JSON.stringify(requestedDesign)}.`);
}

const children = [];

function launch(screen) {
  const child = spawn(python, ["examples/canon_recreation/app.py"], {
    cwd: packageRoot,
    env: {
      ...process.env,
      PYTHONPATH: "src",
      LCARS_CANON_DESIGN: screen.design,
      LCARS_PORT: String(screen.port),
    },
    stdio: ["ignore", "pipe", "pipe"],
  });
  let diagnostics = "";
  const append = (chunk) => { diagnostics = `${diagnostics}${chunk}`.slice(-6000); };
  child.stdout.on("data", append);
  child.stderr.on("data", append);
  children.push(child);
  return { ...screen, child, diagnostics: () => diagnostics };
}

async function waitForServer(screen) {
  const deadline = Date.now() + 30_000;
  while (Date.now() < deadline) {
    if (screen.child.exitCode !== null) {
      throw new Error(`${screen.design} exited early.\n${screen.diagnostics()}`);
    }
    try {
      const response = await fetch(`http://127.0.0.1:${screen.port}/lcars/manifest`, {
        signal: AbortSignal.timeout(1000),
      });
      if (response.ok) return;
    } catch {
      // Still starting.
    }
    await new Promise((resolve) => setTimeout(resolve, 150));
  }
  throw new Error(`${screen.design} did not become ready.\n${screen.diagnostics()}`);
}

async function capture(browser, screen) {
  const context = await browser.newContext({
    colorScheme: "dark",
    deviceScaleFactor: 1,
    reducedMotion: "reduce",
    viewport: { width: screen.width, height: screen.height },
  });
  const page = await context.newPage();
  const imageRequests = [];
  page.on("request", (request) => {
    if (request.resourceType() === "image") imageRequests.push(request.url());
  });
  await page.goto(`http://127.0.0.1:${screen.port}/`, { waitUntil: "networkidle" });
  await page.locator(".lcars-frame, .lcars-authored-page").first().waitFor({ state: "visible" });
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(900);
  await page.addStyleTag({
    content: "*, *::before, *::after { animation: none !important; transition: none !important; caret-color: transparent !important; }",
  });
  if (imageRequests.length > 0) {
    throw new Error(`${screen.design} unexpectedly requested image resources: ${imageRequests.join(", ")}`);
  }
  const forbiddenOutput = await page.evaluate(() => {
    const forbiddenNodes = document.querySelectorAll("img, svg image, canvas").length;
    const rasterStyles = [...document.querySelectorAll("*")].filter((element) => {
      const style = getComputedStyle(element);
      return style.backgroundImage !== "none" || (style.maskImage && style.maskImage !== "none");
    }).length;
    return { forbiddenNodes, rasterStyles };
  });
  if (forbiddenOutput.forbiddenNodes > 0 || forbiddenOutput.rasterStyles > 0) {
    throw new Error(`${screen.design} emitted forbidden parity output: ${JSON.stringify(forbiddenOutput)}`);
  }
  if (screen.design === "periodic") {
    const geometry = await page.evaluate(() => {
      const rect = (selector) => {
        const box = document.querySelector(selector)?.getBoundingClientRect();
        return box ? { x: box.x, y: box.y, width: box.width, height: box.height } : null;
      };
      return {
        elementCount: document.querySelectorAll(".lcars-data-tile").length,
        shellCount: document.querySelectorAll(".lcars-shell").length,
        stage: rect(".lcars-authored-stage"),
        hydrogen: rect('[data-area="element-area-00"]'),
        mega: rect('[data-area="mega-series"]'),
      };
    });
    const close = (actual, expected) => Math.abs(actual - expected) <= 4;
    if (
      geometry.elementCount !== 75
      || geometry.shellCount !== 0
      || !geometry.stage
      || !geometry.hydrogen
      || !geometry.mega
      || !close(geometry.stage.width, 1476)
      || !close(geometry.stage.height, 1080)
      || !close(geometry.hydrogen.x, 109)
      || !close(geometry.hydrogen.y, 238)
      || !close(geometry.hydrogen.width, 119)
      || !close(geometry.hydrogen.height, 51)
      || !close(geometry.mega.x, 362)
      || !close(geometry.mega.y, 745)
    ) {
      throw new Error(`periodic geometry drifted outside tolerance: ${JSON.stringify(geometry)}`);
    }
  }
  await page.screenshot({ path: path.join(outputDir, screen.output) });
  console.log(`captured ${screen.output} from LCARS WebUI at ${screen.width}x${screen.height}`);
  await context.close();
}

await mkdir(outputDir, { recursive: true });
const running = selectedScreens.map(launch);

try {
  await Promise.all(running.map(waitForServer));
  const browser = await chromium.launch({ executablePath: "/usr/bin/chromium", headless: true });
  try {
    for (const screen of running) await capture(browser, screen);
  } finally {
    await browser.close();
  }
} finally {
  const exits = children.map((child) => new Promise((resolve) => {
    if (child.exitCode !== null) {
      resolve();
      return;
    }
    child.once("exit", resolve);
    child.kill("SIGTERM");
  }));
  await Promise.all(exits);
}
