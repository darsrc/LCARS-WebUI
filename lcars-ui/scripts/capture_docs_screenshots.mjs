/** Capture the current documentation gallery from live, code-rendered demos.
 *
 * Run from lcars-ui/ with `make docs-screenshots`. The script launches four local
 * Python applications, exercises representative interactions, and writes the same
 * PNG set to the repository README assets and checked-in Wiki mirror.
 */

import { spawn } from "node:child_process";
import { copyFile, mkdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const packageRoot = path.resolve(scriptDir, "..");
const repositoryRoot = path.resolve(packageRoot, "..");
const readmeImages = path.join(repositoryRoot, "docs", "screenshots");
const wikiImages = path.join(repositoryRoot, "wiki", "images");
const requireFromFrontend = createRequire(
  path.join(packageRoot, "frontend", "package.json"),
);
const { chromium } = requireFromFrontend("playwright");

const localPython = path.join(packageRoot, ".venv", "bin", "python");
const python = process.env.PYTHON || (existsSync(localPython) ? localPython : "python");
const systemChromium = "/usr/bin/chromium";
const chromiumPath =
  process.env.LCARS_CHROMIUM_PATH ||
  process.env.PLAYWRIGHT_CHROMIUM_PATH ||
  (existsSync(systemChromium) ? systemChromium : undefined);

const servers = [
  {
    name: "The Web",
    port: 8121,
    code: [
      "import lcars_ui as lcars",
      "from examples.the_web.app import ui",
      "lcars.run(ui, port=8121, open_browser=False)",
    ].join("; "),
  },
  {
    name: "Widget capabilities",
    port: 8122,
    code: [
      "import lcars_ui as lcars",
      "from examples.widget_capabilities.app import ui",
      "lcars.run(ui, port=8122, open_browser=False)",
    ].join("; "),
  },
  {
    name: "Kitchen sink",
    port: 8123,
    code: [
      "import lcars_ui as lcars",
      "from examples.kitchen_sink.app import ui",
      "lcars.run(ui, port=8123, open_browser=False, assets_dir='examples/kitchen_sink/assets')",
    ].join("; "),
  },
  {
    name: "Enhanced table",
    port: 8124,
    code: [
      "import lcars_ui as lcars",
      "from examples.table_repositories.app import ui",
      "lcars.run(ui, port=8124, open_browser=False)",
    ].join("; "),
  },
];

const children = [];

function launchServer(server) {
  const child = spawn(python, ["-c", server.code], {
    cwd: packageRoot,
    env: { ...process.env, PYTHONPATH: "src" },
    stdio: ["ignore", "pipe", "pipe"],
  });
  let diagnostics = "";
  child.stdout.on("data", (chunk) => {
    diagnostics = `${diagnostics}${chunk}`.slice(-8000);
  });
  child.stderr.on("data", (chunk) => {
    diagnostics = `${diagnostics}${chunk}`.slice(-8000);
  });
  children.push(child);
  return { ...server, child, diagnostics: () => diagnostics };
}

async function waitForServer(server) {
  const endpoint = `http://127.0.0.1:${server.port}/lcars/manifest`;
  const deadline = Date.now() + 30_000;
  while (Date.now() < deadline) {
    if (server.child.exitCode !== null) {
      throw new Error(`${server.name} exited early.\n${server.diagnostics()}`);
    }
    try {
      const response = await fetch(endpoint);
      if (response.ok) return;
    } catch {
      // The process is still starting.
    }
    await new Promise((resolve) => setTimeout(resolve, 200));
  }
  throw new Error(`${server.name} did not become ready.\n${server.diagnostics()}`);
}

async function settle(page) {
  await page.locator(".lcars-frame").waitFor({ state: "visible" });
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(500);
  await page.addStyleTag({
    content: [
      "* { caret-color: transparent !important; }",
      "*, *::before, *::after { transition-duration: 0s !important; }",
    ].join("\n"),
  });
}

async function capture(browser, name, url, interact) {
  const context = await browser.newContext({
    colorScheme: "dark",
    deviceScaleFactor: 1,
    reducedMotion: "reduce",
    viewport: { width: 1920, height: 1080 },
  });
  const page = await context.newPage();
  await page.goto(url, { waitUntil: "networkidle" });
  await settle(page);
  if (interact) {
    await interact(page);
    await page.waitForTimeout(500);
  }
  const readmePath = path.join(readmeImages, `${name}.png`);
  const wikiPath = path.join(wikiImages, `${name}.png`);
  await page.screenshot({ path: readmePath });
  await copyFile(readmePath, wikiPath);
  console.log(`captured ${name}.png`);
  await context.close();
}

async function main() {
  await mkdir(readmeImages, { recursive: true });
  await mkdir(wikiImages, { recursive: true });
  const running = servers.map(launchServer);
  await Promise.all(running.map(waitForServer));

  const launchOptions = chromiumPath ? { executablePath: chromiumPath } : {};
  const browser = await chromium.launch({ headless: true, ...launchOptions });
  try {
    await capture(browser, "the-web-evidence", "http://127.0.0.1:8121/?page=evidence");
    await capture(browser, "the-web-limits", "http://127.0.0.1:8121/?page=limits");
    await capture(
      browser,
      "widget-capabilities-data",
      "http://127.0.0.1:8122/?page=data",
    );
    await capture(
      browser,
      "widget-capabilities-controls",
      "http://127.0.0.1:8122/?page=controls",
    );
    await capture(
      browser,
      "rich-hint-notification",
      "http://127.0.0.1:8123/?page=console",
      async (page) => {
        await page.getByRole("button", { name: "Red Alert", exact: true }).click();
        await page.getByText("Red Alert Briefing", { exact: true }).waitFor();
      },
    );
    await capture(
      browser,
      "interaction-overlays",
      "http://127.0.0.1:8123/?page=widgets",
      async (page) => {
        await page.locator('input[type="file"]').setInputFiles({
          name: "bridge-config.json",
          mimeType: "application/json",
          buffer: Buffer.from('{"theme":"galaxy"}'),
        });
        await page.getByText(/configuration file.*received/i).waitFor();
      },
    );
    await capture(browser, "three-scene", "http://127.0.0.1:8123/?page=scene");
    await capture(browser, "node-canvas", "http://127.0.0.1:8123/?page=graph");
    await capture(
      browser,
      "enhanced-table",
      "http://127.0.0.1:8124/?page=repos",
      async (page) => {
        await page.getByRole("button", { name: "Expand row acme/widget" }).click();
        await page.getByText("main.py", { exact: true }).waitFor();
      },
    );
  } finally {
    await browser.close();
  }
}

try {
  await main();
} finally {
  for (const child of children) {
    if (child.exitCode === null) child.kill("SIGTERM");
  }
}
