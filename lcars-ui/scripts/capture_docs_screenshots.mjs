/** Capture the current documentation gallery from live, code-rendered demos.
 *
 * Run from lcars-ui/ with `make docs-screenshots`. The script launches the local
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
const requestedGroup = process.env.LCARS_DOCS_CAPTURE_GROUP ?? "all";
const groupedCaptures = {
  secondary: ["layers", "table", "workspace"],
  wiki: ["wiki-kitchen", "wiki-layout", "wiki-layers"],
};
const wants = (group) => requestedGroup === "all"
  || requestedGroup === group
  || (groupedCaptures[requestedGroup] ?? []).includes(group);

const servers = [
  {
    name: "Knowledge graph",
    port: 8121,
    code: [
      "import lcars_ui as lcars",
      "from examples.knowledge_graph.app import ui",
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
  {
    name: "Graph proposal workspace",
    port: 8127,
    code: [
      "import lcars_ui as lcars",
      "from examples.graph_workspace.app import ui",
      "lcars.run(ui, port=8127, open_browser=False)",
    ].join("; "),
  },
  ...[
    ["Seismic monitor", 8130, "seismic_monitor"],
    ["Tactical sensor", 8131, "tactical_sensor"],
    ["EPS distribution PADD", 8132, "eps_distribution_padd"],
    ["Warp field diagnostic", 8133, "warp_field_diagnostic"],
    ["Neural bioscan", 8134, "neural_bioscan"],
  ].map(([name, port, screen]) => ({
    name,
    port,
    screen,
    env: { LCARS_GAUNTLET_SCREEN: screen },
    code: [
      "import lcars_ui as lcars",
      "from examples.shape_gallery.app import build",
      `lcars.run(build, port=${port}, open_browser=False)`,
    ].join("; "),
  })),
];

const children = [];

function serversForGroup() {
  if (requestedGroup === "primary") return servers.filter(({ port }) => [8121, 8122, 8123, 8125].includes(port));
  if (requestedGroup === "secondary") return servers.filter(({ port }) => [8124, 8126, 8127].includes(port));
  if (requestedGroup === "wiki") return servers.filter(({ port }) => [8123, 8125, 8126].includes(port));
  if (requestedGroup === "layers" || requestedGroup === "wiki-layers") return servers.filter(({ port }) => port === 8126);
  if (requestedGroup === "table") return servers.filter(({ port }) => port === 8124);
  if (requestedGroup === "workspace") return servers.filter(({ port }) => port === 8127);
  if (requestedGroup === "wiki-kitchen") return servers.filter(({ port }) => port === 8123);
  if (requestedGroup === "wiki-layout") return servers.filter(({ port }) => port === 8125);
  if (requestedGroup === "surface") return servers.filter(({ port }) => port >= 8130 && port <= 8134);
  return servers;
}

function launchServer(server) {
  const child = spawn(python, ["-c", server.code], {
    cwd: packageRoot,
    env: { ...process.env, PYTHONPATH: "src", ...(server.env ?? {}) },
    stdio: ["ignore", "pipe", "pipe"],
  });
  let diagnostics = "";
  child.stdout.on("data", (chunk) => {
    diagnostics = `${diagnostics}${chunk}`.slice(-8000);
    if (process.env.LCARS_DOCS_CAPTURE_DEBUG) process.stdout.write(chunk);
  });
  child.stderr.on("data", (chunk) => {
    diagnostics = `${diagnostics}${chunk}`.slice(-8000);
    if (process.env.LCARS_DOCS_CAPTURE_DEBUG) process.stderr.write(chunk);
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
      if (response.ok) {
        console.log(`ready: ${server.name}`);
        return;
      }
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

async function settleSurface(page) {
  await page.locator(".lcars-surface-viewport").waitFor({ state: "visible" });
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

async function zoomLayerTreatments(page) {
  const field = page.locator(".lcars-gcanvas-field");
  const bounds = await field.boundingBox();
  if (!bounds) throw new Error("Layered graph field has no visible bounds.");

  await page.mouse.move(bounds.x + bounds.width * 0.34, bounds.y + bounds.height * 0.4);
  await page.mouse.wheel(0, -180);
  await page.waitForFunction(() => {
    const viewport = document.querySelector(".react-flow__viewport");
    if (!viewport) return false;
    return new DOMMatrixReadOnly(getComputedStyle(viewport).transform).a >= 1.05;
  });
}

async function assertWorkspaceFlow(page) {
  const geometry = await page.evaluate(() => {
    const rect = (selector) => {
      const box = document.querySelector(selector)?.getBoundingClientRect();
      return box ? { top: box.top, bottom: box.bottom } : null;
    };
    return {
      planes: rect(".lcars-workspace-planes"),
      fans: rect(".lcars-workspace-fans"),
      diff: rect(".lcars-workspace-diff"),
      authoring: rect(".lcars-workspace-authoring"),
      errors: document.querySelectorAll('.lcars-note[data-level="error"]').length,
    };
  });
  if (
    !geometry.planes
    || !geometry.fans
    || !geometry.diff
    || !geometry.authoring
    || geometry.fans.top < geometry.planes.bottom
    || geometry.diff.top < geometry.fans.bottom
    || geometry.authoring.top < geometry.diff.bottom
    || geometry.errors > 0
  ) {
    throw new Error(`graph workspace flow or transport validation failed: ${JSON.stringify(geometry)}`);
  }
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

async function assertSurfaceLayout(page, spec, viewportName) {
  const report = await page.evaluate(({ designWidth, designHeight, requiredIds }) => {
    const viewport = document.querySelector(".lcars-surface-viewport");
    const stage = document.querySelector(".lcars-surface-stage");
    const geometry = document.querySelector(".lcars-surface-geometry");
    const base = geometry?.querySelector('[id$="viewport-base"]');
    if (!viewport || !stage || !geometry || !base || !(base instanceof SVGGraphicsElement)) {
      return { error: "surface viewport, stage, geometry, or base silhouette is missing" };
    }
    const baseBounds = base.getBBox();
    const regionOverflow = [...document.querySelectorAll(".lcars-surface-region")]
      .filter((region) => (
        region.scrollWidth > region.clientWidth + 1 || region.scrollHeight > region.clientHeight + 1
      ))
      .map((region) => ({
        id: region.getAttribute("data-region"),
        client: [region.clientWidth, region.clientHeight],
        scroll: [region.scrollWidth, region.scrollHeight],
      }));
    const forbidden = geometry.parentElement?.querySelectorAll("img, image, canvas").length ?? 0;
    const imageBackdrops = [...geometry.parentElement?.querySelectorAll("*") ?? []]
      .filter((element) => getComputedStyle(element).backgroundImage !== "none")
      .map((element) => element.className || element.tagName);
    return {
      baseBounds: {
        x: baseBounds.x,
        y: baseBounds.y,
        width: baseBounds.width,
        height: baseBounds.height,
      },
      forbidden,
      geometryCount: geometry.querySelectorAll("path, rect, circle, ellipse").length,
      missingRequiredIds: requiredIds.filter((id) => !document.getElementById(id)),
      imageBackdrops,
      regionOverflow,
      viewportOverflow: {
        client: [viewport.clientWidth, viewport.clientHeight],
        scroll: [viewport.scrollWidth, viewport.scrollHeight],
      },
      viewBox: geometry.getAttribute("viewBox"),
      expectedViewBox: `0 0 ${designWidth} ${designHeight}`,
    };
  }, {
    designWidth: spec.native.width,
    designHeight: spec.native.height,
    requiredIds: spec.requiredIds,
  });

  if (
    report.error
    || report.viewBox !== report.expectedViewBox
    || report.forbidden !== 0
    || report.imageBackdrops.length > 0
    || report.geometryCount < 8
    || report.missingRequiredIds.length > 0
    || report.regionOverflow.length > 0
    || report.viewportOverflow.scroll[0] > report.viewportOverflow.client[0] + 1
    || report.viewportOverflow.scroll[1] > report.viewportOverflow.client[1] + 1
    || report.baseBounds.width < spec.native.width * 0.72
    || report.baseBounds.height < spec.native.height * 0.70
  ) {
    throw new Error(
      `${spec.name} failed ${viewportName} surface layout validation: ${JSON.stringify(report)}`,
    );
  }
}

async function captureSurface(browser, spec) {
  const context = await browser.newContext({
    colorScheme: "dark",
    deviceScaleFactor: 1,
    reducedMotion: "reduce",
    viewport: spec.native,
  });
  const page = await context.newPage();
  await page.goto(`http://127.0.0.1:${spec.port}/`, { waitUntil: "networkidle" });
  await settleSurface(page);
  await assertSurfaceLayout(page, spec, "native");
  await page.getByRole("button", { name: spec.action, exact: true }).click();
  await page.getByText(spec.expected, { exact: true }).waitFor();
  for (const close of await page.locator(".lcars-note-close").all()) {
    await close.click();
  }
  await page.locator(".lcars-note").first().waitFor({ state: "detached", timeout: 2000 }).catch(() => {});

  const readmePath = path.join(readmeImages, `${spec.name}.png`);
  const wikiPath = path.join(wikiImages, `${spec.name}.png`);
  await page.screenshot({ path: readmePath });
  await copyFile(readmePath, wikiPath);
  console.log(`captured ${spec.name}.png`);

  if (spec.transparentName) {
    await page.addStyleTag({
      content: [
        "html, body, #root, .lcars-root, .lcars-authored-page { background: transparent !important; }",
        ".lcars-surface-viewport, .lcars-surface-stage { background: transparent !important; }",
      ].join("\n"),
    });
    const transparentReadmePath = path.join(readmeImages, `${spec.transparentName}.png`);
    const transparentWikiPath = path.join(wikiImages, `${spec.transparentName}.png`);
    await page.screenshot({ path: transparentReadmePath, omitBackground: true });
    await copyFile(transparentReadmePath, transparentWikiPath);
    console.log(`captured ${spec.transparentName}.png`);
  }

  await page.setViewportSize(spec.compact);
  await page.waitForTimeout(150);
  await assertSurfaceLayout(page, spec, "compact");
  await page.getByRole("button", { name: spec.action, exact: true }).waitFor({ state: "visible" });
  await context.close();
}

async function main() {
  console.log(`capture group: ${requestedGroup}`);
  await mkdir(readmeImages, { recursive: true });
  await mkdir(wikiImages, { recursive: true });
  const running = serversForGroup().map(launchServer);
  await Promise.all(running.map(waitForServer));

  const launchOptions = chromiumPath ? { executablePath: chromiumPath } : {};
  const browser = await chromium.launch({ headless: true, ...launchOptions });
  try {
    if (wants("primary")) {
    await capture(browser, "knowledge-evidence", "http://127.0.0.1:8121/?page=evidence");
    await capture(browser, "knowledge-limits", "http://127.0.0.1:8121/?page=limits");
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
    }
    if (wants("layers")) {
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
      "layer-treatments",
      "http://127.0.0.1:8126/?page=graph",
      zoomLayerTreatments,
      { destinations: ["readme"] },
    );
    }
    if (wants("table")) {
    await capture(
      browser,
      "enhanced-table",
      "http://127.0.0.1:8124/?page=repos",
      async (page) => {
        await page.getByRole("button", { name: "Expand row acme/widget" }).click();
        await page.getByText("main.py", { exact: true }).waitFor();
      },
    );
    }
    if (wants("workspace")) {
    await capture(
      browser,
      "graph-workspace",
      "http://127.0.0.1:8127/?page=workspace",
      assertWorkspaceFlow,
    );
    await capture(
      browser,
      "graph-workspace-authoring",
      "http://127.0.0.1:8127/?page=workspace",
      async (page) => {
        await assertWorkspaceFlow(page);
        const interactionMetric = page.locator(".lcars-workspace-metrics span").first();
        const beforeReview = await interactionMetric.textContent();
        const tree = page.locator(".lcars-tree-editor").first();
        await tree.locator("input").last().fill("Draft A reviewed");
        await tree.getByRole("button", { name: "REVIEW TREE" }).click();
        if (await tree.getAttribute("data-phase") !== "review") {
          throw new Error("tree editor did not enter review phase");
        }
        const afterReview = await interactionMetric.textContent();
        if (beforeReview !== afterReview) {
          throw new Error(`tree compose/review changed interactions: ${beforeReview} -> ${afterReview}`);
        }
        await page.locator(".lcars-workspace-authoring").scrollIntoViewIfNeeded();
      },
    );
    }
    if (wants("surface")) {
    const surfaceCaptures = [
      {
        name: "surface-seismic-monitor",
        port: 8130,
        native: { width: 1200, height: 900 },
        compact: { width: 800, height: 600 },
        action: "ANALYZE EVENT",
        expected: "ARRAY RESOLVED",
        requiredIds: ["seismic-primary-elbow", "seismic-data-elbow", "seismic-waveform"],
      },
      {
        name: "surface-tactical-sensor",
        port: 8131,
        native: { width: 960, height: 840 },
        compact: { width: 600, height: 525 },
        action: "DEEP SCAN",
        expected: "06 CONTACTS TRACKED",
        requiredIds: ["tactical-header-elbow", "tactical-scan-rim", "tactical-contact-terminal"],
      },
      {
        name: "surface-eps-distribution-padd",
        transparentName: "surface-eps-distribution-padd-viewport",
        port: 8132,
        native: { width: 640, height: 1080 },
        compact: { width: 400, height: 675 },
        action: "ISOLATE 7A",
        expected: "ALTERNATE FEED ONLINE",
        requiredIds: ["eps-header-elbow", "eps-route-b", "eps-monitor-terminal"],
      },
      {
        name: "surface-warp-field-diagnostic",
        port: 8133,
        native: { width: 900, height: 900 },
        compact: { width: 600, height: 600 },
        action: "BALANCE FIELD",
        expected: "PHASE VARIANCE 0.7%",
        requiredIds: ["warp-header-elbow", "warp-field-rim", "warp-field-pointer"],
      },
      {
        name: "surface-neural-bioscan",
        port: 8134,
        native: { width: 1200, height: 600 },
        compact: { width: 720, height: 360 },
        action: "REFINE SCAN",
        expected: "FOCAL LOCK 99.8%",
        requiredIds: ["neural-header-elbow", "neural-coherence-wave", "neural-focus-reticle"],
      },
    ];
    for (const spec of surfaceCaptures) {
      await captureSurface(browser, spec);
    }
    }
    if (wants("wiki-kitchen") || wants("wiki-layout") || wants("wiki-layers")) {
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
    const selectedWikiCaptures = wikiCaptures.filter(([, url]) =>
      (wants("wiki-kitchen") && url.includes(":8123"))
      || (wants("wiki-layout") && url.includes(":8125"))
      || (wants("wiki-layers") && url.includes(":8126")),
    );
    await Promise.all(
      selectedWikiCaptures.map(([name, url, interact]) =>
        capture(browser, name, url, interact, {
          destinations: ["wiki"],
          viewport: wikiViewport,
        }),
      ),
    );
    }
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
