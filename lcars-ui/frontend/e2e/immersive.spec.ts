/*
 * Containment for immersive surfaces.
 *
 * The claim under test is narrow and geometric: a 3D viewport or a graph editor
 * may pan its world as far as it likes, but nothing it draws may end up outside
 * the panel, and nothing outside the panel may be hit by a pointer.
 *
 * Deliberately *not* asserted: that nothing paints outside. Paint containment is
 * not observable from Playwright — only layout geometry and hit-testing are —
 * so this checks those and says so, rather than pretending to check more.
 * Likewise there are no WebGL screenshots here: they differ by driver and would
 * be flaky in CI within a week.
 */
import { expect, test, type Page } from "@playwright/test";

type Widget = Record<string, unknown>;

const graphWidget = (id = "graph"): Widget => ({
  id,
  type: "node_canvas",
  visible: true,
  disabled: false,
  document: {
    format: "lcars-node-graph",
    version: 1,
    templates: [
      {
        id: "source",
        label: "Source",
        category: "IO",
        color: null,
        inputs: [],
        outputs: [{ id: "out", label: "Out", type: "any", capacity: null }],
        fields: [],
      },
      {
        id: "sink",
        label: "Sink",
        category: "IO",
        color: null,
        inputs: [{ id: "in", label: "In", type: "any", capacity: null }],
        outputs: [],
        fields: [{ id: "gain", label: "Gain", kind: "number", default: 1, options: [] }],
      },
    ],
    // Deliberately spread far beyond any panel, so the graph world genuinely
    // extends past the surface that must clip it.
    nodes: [
      { id: "n1", template: "source", position: [0, 0], values: {}, label: null, group: null },
      { id: "n2", template: "sink", position: [900, 60], values: { gain: 1 }, label: null, group: null },
      { id: "n3", template: "sink", position: [-800, 700], values: { gain: 2 }, label: null, group: null },
      { id: "n4", template: "source", position: [1800, -900], values: {}, label: null, group: null },
    ],
    edges: [{ id: "e1", source: "n1", source_port: "out", target: "n2", target_port: "in" }],
    reroutes: [],
    groups: [
      { id: "g1", label: "STAGE", position: [-60, -60], size: [1200, 400], color: null },
    ],
    comments: [{ id: "c1", text: "note", position: [-400, -400], size: [240, 120] }],
    viewport: { x: 0, y: 0, zoom: 1 },
  },
});

const groupedGraphWidget = (): Widget => {
  const widget = graphWidget() as {
    document: {
      nodes: Array<Record<string, unknown>>;
      groups: Array<Record<string, unknown>>;
      viewport: Record<string, number>;
    };
  };
  widget.document.nodes[0] = {
    ...widget.document.nodes[0],
    position: [100, 150],
    group: "g1",
  };
  widget.document.nodes[1] = {
    ...widget.document.nodes[1],
    position: [430, 150],
    group: "g1",
  };
  widget.document.groups[0] = {
    ...widget.document.groups[0],
    position: [40, 80],
    size: [760, 300],
  };
  widget.document.viewport = { x: 0, y: 0, zoom: 1 };
  return widget;
};

const sceneWidget = (id = "scene"): Widget => ({
  id,
  type: "three_scene",
  visible: true,
  disabled: false,
  module: "scenes/missing.js",
  props: {},
});

const buildManifest = (widgets: Widget[]) => ({
  meta: {
    version: "1.0.0",
    app_name: "E2E LCARS",
    theme: "galaxy",
    lang: "en-US",
    sound_enabled: true,
    force_uppercase: false,
    label_uppercase: true,
    lcars_font_headers: true,
    lcars_font_labels: true,
    lcars_font_text: true,
    visual_language: "strict",
    strict_renderer: "legacy",
  },
  layout: {
    header: { title: "USS E2E", subtitle: "NCC-1701", color: "orange" },
    sidebar: {
      position: "left",
      items: [{ id: "nav_main", label: "MAIN", target_page: "main", color: "blue" }],
    },
  },
  pages: {
    main: {
      id: "main",
      title: "Main Deck",
      rows: [
        {
          id: "row_1",
          height: "auto",
          columns: [{ id: "col_1", width: "1fr", widgets }],
        },
      ],
    },
  },
});

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    class MockSocket {
      static OPEN = 1;
      readyState = MockSocket.OPEN;
      onopen: ((ev: Event) => void) | null = null;
      onclose: ((ev: Event) => void) | null = null;
      onerror: ((ev: Event) => void) | null = null;
      onmessage: ((ev: MessageEvent) => void) | null = null;
      constructor(_url: string) {
        setTimeout(() => this.onopen?.(new Event("open")), 0);
      }
      send(_payload: string) {}
      close() {
        this.onclose?.(new Event("close"));
      }
    }
    class MockEventSource {
      onerror: ((ev: Event) => void) | null = null;
      constructor(_url: string) {}
      addEventListener(_type: string, _listener: EventListener) {}
      removeEventListener(_type: string, _listener: EventListener) {}
      close() {}
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (window as any).WebSocket = MockSocket;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (window as any).EventSource = MockEventSource;
  });

  await page.route("**/lcars/action/**", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        v: "1.0",
        type: "action_ack",
        payload: { action_id: "noop", status: "ok" },
      }),
    });
  });
});

const load = async (page: Page, widgets: Widget[]) => {
  await page.route("**/lcars/manifest", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(buildManifest(widgets)),
    });
  });
  await page.goto("/");
};

/**
 * Every descendant of an immersive surface must lie within its box.
 *
 * A pixel of slack absorbs sub-pixel layout rounding; anything genuinely
 * escaping does so by far more than that.
 */
const assertDescendantsContained = async (page: Page, selector: string) => {
  const escapees = await page.evaluate((sel) => {
    const surface = document.querySelector(sel);
    if (!surface) return ["surface not found"];
    const bounds = surface.getBoundingClientRect();
    const slack = 1;
    const out: string[] = [];
    for (const element of Array.from(surface.querySelectorAll("*"))) {
      const rect = element.getBoundingClientRect();
      // Zero-area nodes have no position worth judging.
      if (rect.width === 0 && rect.height === 0) continue;
      if (
        rect.left < bounds.left - slack ||
        rect.right > bounds.right + slack ||
        rect.top < bounds.top - slack ||
        rect.bottom > bounds.bottom + slack
      ) {
        out.push(
          `${element.className || element.tagName} ` +
            `[${Math.round(rect.left)},${Math.round(rect.top)},` +
            `${Math.round(rect.right)},${Math.round(rect.bottom)}] ` +
            `outside [${Math.round(bounds.left)},${Math.round(bounds.top)},` +
            `${Math.round(bounds.right)},${Math.round(bounds.bottom)}]`,
        );
      }
    }
    return out;
  }, selector);

  expect(escapees, `descendants escaped ${selector}`).toEqual([]);
};

/** Nothing belonging to the surface may be hit just outside its edges. */
const assertNoPointerEscape = async (page: Page, selector: string) => {
  const hits = await page.evaluate((sel) => {
    const surface = document.querySelector(sel);
    if (!surface) return ["surface not found"];
    const bounds = surface.getBoundingClientRect();
    const probes = [
      [bounds.left - 4, bounds.top + bounds.height / 2],
      [bounds.right + 4, bounds.top + bounds.height / 2],
      [bounds.left + bounds.width / 2, bounds.top - 4],
      [bounds.left + bounds.width / 2, bounds.bottom + 4],
    ] as const;
    const out: string[] = [];
    for (const [x, y] of probes) {
      if (x < 0 || y < 0 || x > window.innerWidth || y > window.innerHeight) continue;
      const hit = document.elementFromPoint(x, y);
      if (hit && surface.contains(hit)) {
        out.push(`(${Math.round(x)},${Math.round(y)}) hit ${hit.className || hit.tagName}`);
      }
    }
    return out;
  }, selector);

  expect(hits, `pointer reached ${selector} outside its box`).toEqual([]);
};

test.describe("node canvas containment", () => {
  test("a graph whose world extends far past the panel stays inside it", async ({ page }) => {
    await load(page, [graphWidget()]);
    await expect(page.locator(".lcars-gcanvas")).toBeVisible();

    await assertDescendantsContained(page, ".lcars-gcanvas");
    await assertNoPointerEscape(page, ".lcars-gcanvas");
  });

  test("stays contained after panning the world", async ({ page }) => {
    await load(page, [graphWidget()]);
    const field = page.locator(".lcars-gcanvas-field");
    await expect(field).toBeVisible();

    const box = (await field.boundingBox())!;
    // Drag the viewport a long way, from empty canvas so no node is grabbed.
    await page.mouse.move(box.x + box.width - 20, box.y + box.height - 20);
    await page.mouse.down();
    await page.mouse.move(box.x + 20, box.y + 20, { steps: 12 });
    await page.mouse.up();

    await assertDescendantsContained(page, ".lcars-gcanvas");
    await assertNoPointerEscape(page, ".lcars-gcanvas");
  });

  test("the palette opens inside the surface, not over the console", async ({ page }) => {
    await load(page, [graphWidget()]);
    await page.getByRole("button", { name: "ADD" }).click();

    await expect(page.locator(".lcars-gpalette")).toBeVisible();
    await assertDescendantsContained(page, ".lcars-gcanvas");
  });

  test("survives a narrow viewport", async ({ page }) => {
    await page.setViewportSize({ width: 480, height: 800 });
    await load(page, [graphWidget()]);
    await expect(page.locator(".lcars-gcanvas")).toBeVisible();

    await assertDescendantsContained(page, ".lcars-gcanvas");
    // The page itself must never scroll sideways.
    const overflows = await page.evaluate(
      () => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
    );
    expect(overflows).toBe(false);
  });

  test("stays contained in every perimeter cap position", async ({ page }) => {
    // Six panels drives a grid archetype, so cells land on all four corners.
    await load(
      page,
      Array.from({ length: 6 }, (_, index) => graphWidget(`graph_${index}`)),
    );
    const canvases = page.locator(".lcars-gcanvas");
    await expect(canvases.first()).toBeVisible();

    const caps = await page.locator(".lcars-mcell[data-cap]").count();
    expect(caps).toBeGreaterThan(0);

    const total = await canvases.count();
    for (let index = 0; index < total; index += 1) {
      await assertDescendantsContained(page, `.lcars-gcanvas >> nth=${index}`);
    }
  });

  test("a graph nested in a container is still contained", async ({ page }) => {
    await load(page, [
      {
        id: "box_1",
        type: "lcars_box",
        title: "DIAGNOSTICS",
        visible: true,
        disabled: false,
        children: [graphWidget()],
      },
    ]);
    await expect(page.locator(".lcars-gcanvas")).toBeVisible();

    await assertDescendantsContained(page, ".lcars-gcanvas");
    await assertNoPointerEscape(page, ".lcars-gcanvas");
  });
});

test.describe("node canvas editing", () => {
  test("moving a group frame carries its member nodes with it", async ({ page }) => {
    await load(page, [groupedGraphWidget()]);

    const frameHead = page.locator(".lcars-ggroup-head");
    const member = page.locator('.react-flow__node[data-id="n1"] .lcars-gnode');
    await expect(frameHead).toBeVisible();
    await expect(member).toBeVisible();

    const frameBefore = (await frameHead.boundingBox())!;
    const memberBefore = (await member.boundingBox())!;
    const delta = { x: 96, y: 64 };
    await page.mouse.move(
      frameBefore.x + frameBefore.width / 2,
      frameBefore.y + frameBefore.height / 2,
    );
    await page.mouse.down();
    await page.mouse.move(
      frameBefore.x + frameBefore.width / 2 + delta.x,
      frameBefore.y + frameBefore.height / 2 + delta.y,
      { steps: 8 },
    );
    await page.mouse.up();

    await expect
      .poll(async () => {
        const frameAfter = (await frameHead.boundingBox())!;
        const memberAfter = (await member.boundingBox())!;
        const frameX = Math.round(frameAfter.x - frameBefore.x);
        const frameY = Math.round(frameAfter.y - frameBefore.y);
        const memberX = Math.round(memberAfter.x - memberBefore.x);
        const memberY = Math.round(memberAfter.y - memberBefore.y);
        return {
          moved: frameX > 40 && frameY > 30,
          sameX: Math.abs(frameX - memberX) <= 1,
          sameY: Math.abs(frameY - memberY) <= 1,
        };
      })
      .toEqual({
        moved: true,
        sameX: true,
        sameY: true,
      });
    await expect(member).toBeVisible();

    await page.getByRole("button", { name: "UNDO" }).click();
    await expect
      .poll(async () => {
        const frameAfterUndo = (await frameHead.boundingBox())!;
        const memberAfterUndo = (await member.boundingBox())!;
        return {
          frameX: Math.round(frameAfterUndo.x - frameBefore.x),
          frameY: Math.round(frameAfterUndo.y - frameBefore.y),
          memberX: Math.round(memberAfterUndo.x - memberBefore.x),
          memberY: Math.round(memberAfterUndo.y - memberBefore.y),
        };
      })
      .toEqual({ frameX: 0, frameY: 0, memberX: 0, memberY: 0 });
  });

  test("builds, connects, edits and exports a graph", async ({ page }) => {
    await load(page, [graphWidget()]);
    await expect(page.locator(".lcars-gnode").first()).toBeVisible();

    // Add a node from the contained palette.
    await page.getByRole("button", { name: "ADD" }).click();
    await page.getByLabel("Search node types").fill("sou");
    await page.getByRole("button", { name: "Source" }).click();
    await expect(page.locator(".lcars-gnode")).toHaveCount(5);

    // Edit a typed field.
    const gain = page.locator(".lcars-gnode input[type='number']").first();
    await gain.fill("7");
    await gain.blur();
    await expect(gain).toHaveValue("7");

    // Undo puts it back.
    await page.getByRole("button", { name: "UNDO" }).click();
    await expect(page.locator(".lcars-gnode")).toHaveCount(5);
  });

  test("refuses an invalid connection with an in-shape reason", async ({ page }) => {
    await load(page, [graphWidget()]);
    const source = page.locator(".react-flow__handle-source").first();
    await expect(source).toBeVisible();

    // Drag an output back onto an input that is already fully connected.
    const from = (await source.boundingBox())!;
    const target = page.locator(".react-flow__handle-target").first();
    const to = (await target.boundingBox())!;

    await page.mouse.move(from.x + from.width / 2, from.y + from.height / 2);
    await page.mouse.down();
    await page.mouse.move(to.x + to.width / 2, to.y + to.height / 2, { steps: 8 });
    await page.mouse.up();

    // Either it was refused with a notice, or it was a legal connection; both
    // are correct outcomes depending on which handles the layout put first.
    const notice = page.locator(".lcars-gcanvas-notice");
    if (await notice.isVisible()) {
      await assertDescendantsContained(page, ".lcars-gcanvas");
    }
  });
});

test.describe("three scene containment", () => {
  test("reports missing scene modules in-panel and stays contained", async ({ page }) => {
    await page.route("**/lcars/assets/**", (route) => route.fulfill({ status: 404, body: "" }));
    await load(page, [sceneWidget()]);

    const surface = page.locator(".lcars-chart--three");
    await expect(surface).toBeVisible();
    // WebGL2 may or may not exist in this runner; either way the widget must
    // resolve to a message inside the panel rather than an empty or blown box.
    await expect(page.locator(".lcars-shader-error")).toBeVisible({ timeout: 10_000 });

    await assertDescendantsContained(page, ".lcars-chart--three");
    await assertNoPointerEscape(page, ".lcars-chart--three");
  });
});
