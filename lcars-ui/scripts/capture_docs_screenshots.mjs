/** Capture the current documentation gallery from live, code-rendered demos.
 *
 * Run from lcars-ui/ with `make docs-screenshots`. The script launches five local
 * Python applications, exercises representative interactions, and refreshes every
 * checked-in README and Wiki PNG from live code-rendered pages.
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
const readmeViewport = { width: 1920, height: 1080 };
const wikiViewport = { width: 1280, height: 800 };
const kitchenSinkPreferencesKey =
  "lcars.webui.preferences.v1:LCARS%20Kitchen%20Sink";

const servers = [
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
  {
    name: "Layout gallery",
    port: 8125,
    code: [
      "import lcars_ui as lcars",
      "from examples.layout_gallery.app import ui",
      "lcars.run(ui, port=8125, open_browser=False)",
    ].join("; "),
  },
  {
    name: "Layered graph reader",
    port: 8126,
    code: [
      "import lcars_ui as lcars",
      "from examples.layered_graph.app import ui",
      "lcars.run(ui, port=8126, open_browser=False)",
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

async function filterAndSelectLayeredGraph(page) {
  await page.getByRole("button", { name: "Hide Layer Two layer" }).click();
  await page.getByRole("button", { name: "Emphasize Layer One layer" }).click();
  await page
    .locator('.react-flow__edge[data-id="forward-three"] .react-flow__edge-path')
    .click({ force: true });
}

async function capture(
  browser,
  name,
  url,
  interact,
  {
    destinations = ["readme", "wiki"],
    theme,
    viewport = readmeViewport,
  } = {},
) {
  const context = await browser.newContext({
    colorScheme: "dark",
    deviceScaleFactor: 1,
    reducedMotion: "reduce",
    viewport,
  });
  if (theme) {
    await context.addInitScript(
      ({ key, selectedTheme }) => {
        window.localStorage.setItem(key, JSON.stringify({ theme: selectedTheme }));
      },
      { key: kitchenSinkPreferencesKey, selectedTheme: theme },
    );
  }
  const page = await context.newPage();
  await page.goto(url, { waitUntil: "networkidle" });
  await settle(page);
  if (interact) {
    await interact(page);
    await page.waitForTimeout(500);
  }
  const readmePath = path.join(readmeImages, `${name}.png`);
  const wikiPath = path.join(wikiImages, `${name}.png`);
  if (destinations.includes("readme")) {
    await page.screenshot({ path: readmePath });
  }
  if (destinations.includes("wiki")) {
    if (destinations.includes("readme")) {
      await copyFile(readmePath, wikiPath);
    } else {
      await page.screenshot({ path: wikiPath });
    }
  }
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
    await capture(
      browser,
      "overview-galaxy",
      "http://127.0.0.1:8123/?page=console",
      undefined,
      { destinations: ["readme"], theme: "galaxy" },
    );
    await capture(
      browser,
      "theme-nemesis",
      "http://127.0.0.1:8123/?page=console",
      undefined,
      { destinations: ["readme"], theme: "nemesis" },
    );
    await capture(
      browser,
      "theme-tng",
      "http://127.0.0.1:8123/?page=console",
      undefined,
      { destinations: ["readme"], theme: "tng" },
    );
    await capture(
      browser,
      "layouts",
      "http://127.0.0.1:8125/?page=layouts",
      undefined,
      { destinations: ["readme"] },
    );
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
      "layered-node-canvas",
      "http://127.0.0.1:8126/?page=graph",
      undefined,
      { destinations: ["readme"] },
    );
    await capture(
      browser,
      "layered-node-canvas-filtered",
      "http://127.0.0.1:8126/?page=graph",
      filterAndSelectLayeredGraph,
      { destinations: ["readme"] },
    );
    await capture(
      browser,
      "enhanced-table",
      "http://127.0.0.1:8124/?page=repos",
      async (page) => {
        await page.getByRole("button", { name: "Expand row acme/widget" }).click();
        await page.getByText("main.py", { exact: true }).waitFor();
      },
    );
    const closeWidgetPopup = async (page) => {
      await page.getByRole("button", { name: "Close Movable Window" }).click();
    };
    const wikiCaptures = [
      ["kitchen-sink-overview", "http://127.0.0.1:8123/?page=console"],
      ["telemetry-panel", "http://127.0.0.1:8123/?page=telemetry"],
      ["data-readouts-panel", "http://127.0.0.1:8123/?page=telemetry"],
      ["display-widgets-states", "http://127.0.0.1:8123/?page=grid"],
      ["layout-containers", "http://127.0.0.1:8125/?page=layouts"],
      [
        "widgets-gallery",
        "http://127.0.0.1:8123/?page=widgets",
        closeWidgetPopup,
      ],
      [
        "input-widgets-initial",
        "http://127.0.0.1:8123/?page=widgets",
        closeWidgetPopup,
      ],
      [
        "input-widgets-active-states",
        "http://127.0.0.1:8123/?page=widgets",
        async (page) => {
          await closeWidgetPopup(page);
          await page.getByLabel("Text Input", { exact: true }).fill("OPS-1701");
          await page.getByRole("button", { name: "Toggle", exact: true }).click();
          await page.getByLabel("Select", { exact: true }).selectOption("Gamma");
        },
      ],
      ["sweep-container", "http://127.0.0.1:8125/?page=sweep"],
      ["padd-container", "http://127.0.0.1:8125/?page=padd"],
      ["diagnostic-container", "http://127.0.0.1:8125/?page=diagnostic"],
      ["layered-node-canvas", "http://127.0.0.1:8126/?page=graph"],
      [
        "layered-node-canvas-filtered",
        "http://127.0.0.1:8126/?page=graph",
        filterAndSelectLayeredGraph,
      ],
    ];
    await Promise.all(
      wikiCaptures.map(([name, url, interact]) =>
        capture(browser, name, url, interact, {
          destinations: ["wiki"],
          viewport: wikiViewport,
        }),
      ),
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
