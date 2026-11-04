import { expect, test, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

type Widget = Record<string, unknown>;

type SceneMode = {
  id: string;
  label: string;
  focal: string[];
  required: string[];
  optional?: string[];
  families: string[];
  returns_to?: string;
};

const sceneModes: SceneMode[] = [
  {
    id: "inspect",
    label: "INSPECT",
    focal: ["sample-a"],
    required: ["sample-a", "commands-a"],
    optional: ["notes-a"],
    families: ["wrap", "branch", "focus"],
  },
  {
    id: "compare",
    label: "COMPARE",
    focal: ["sample-a", "sample-b"],
    required: ["sample-a", "sample-b", "commands-a"],
    families: ["fork", "focus"],
    returns_to: "inspect",
  },
  {
    id: "annotate",
    label: "ANNOTATE",
    focal: ["notes-a"],
    required: ["notes-a", "sample-a"],
    families: ["contour", "focus"],
    returns_to: "inspect",
  },
  {
    id: "fault",
    label: "FAULT",
    focal: ["fault", "sample-a"],
    required: ["fault", "sample-a", "commands-a"],
    families: ["branch", "focus"],
    returns_to: "inspect",
  },
  {
    id: "review",
    label: "REVIEW",
    focal: ["sample-a"],
    required: ["sample-a", "notes-a", "commands-a"],
    families: ["wrap", "branch", "focus"],
  },
];

const sceneWidget: Widget = {
  id: "scene",
  type: "scene",
  visible: true,
  disabled: false,
  initial_mode: "inspect",
  modes: sceneModes,
  regions: [
    {
      id: "sample-a",
      type: "scene_region",
      visible: true,
      disabled: false,
      label: "SAMPLE A",
      role: "instrument",
      children: [
        {
          id: "sample-a-text",
          type: "text",
          visible: true,
          disabled: false,
          content: "Sample A telemetry",
          size: "body",
        },
      ],
    },
    {
      id: "sample-b",
      type: "scene_region",
      visible: true,
      disabled: false,
      label: "SAMPLE B",
      role: "instrument",
      children: [
        {
          id: "sample-b-text",
          type: "text",
          visible: true,
          disabled: false,
          content: "Sample B telemetry",
          size: "body",
        },
      ],
    },
    {
      id: "commands-a",
      type: "scene_region",
      visible: true,
      disabled: false,
      label: "COMMANDS",
      role: "commands",
      children: [
        {
          id: "compare-button",
          type: "button",
          visible: true,
          disabled: false,
          action_id: "scene.compare",
          label: "COMPARE",
        },
      ],
    },
    {
      id: "notes-a",
      type: "scene_region",
      visible: true,
      disabled: false,
      label: "NOTES",
      role: "detail",
      children: [
        {
          id: "note",
          type: "text_input",
          visible: true,
          disabled: false,
          value: "",
          password: false,
          autocomplete: false,
          placeholder: "Enter field note",
        },
      ],
    },
    {
      id: "fault",
      type: "scene_region",
      visible: true,
      disabled: false,
      label: "FAULT",
      role: "alert",
      fold: "never",
      children: [
        {
          id: "fault-alert",
          type: "alert",
          visible: true,
          disabled: false,
          severity: "yellow",
          message: "Sample A requires attention",
          blink: false,
        },
      ],
    },
  ],
  relations: [
    { id: "controls-sample", kind: "controls", source: "commands-a", target: "sample-a" },
    { id: "details-sample", kind: "details", source: "notes-a", target: "sample-a" },
    { id: "compares-samples", kind: "compares", source: "sample-a", target: "sample-b" },
    { id: "recovers-sample", kind: "recovers", source: "fault", target: "sample-a" },
  ],
};

const buildManifest = (scene: Widget = sceneWidget) => ({
  meta: {
    version: "2.0",
    app_name: "E2E LCARS",
    theme: "galaxy",
    theme_catalog: [
      { id: "galaxy", label: "Galaxy / 2357", base: "galaxy", colors: {}, fonts: {} },
    ],
    alert_condition: "normal",
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
    sidebar: { position: "left", items: [] },
  },
  pages: {
    main: {
      id: "main",
      title: "Scene Continuity",
      archetype: "scene",
      chrome: "none",
      sizing: "fill",
      rows: [
        {
          id: "scene-row",
          height: "1fr",
          columns: [{ id: "scene-column", width: "1fr", widgets: [scene] }],
        },
      ],
    },
  },
});

const openScene = async (page: Page, scene: Widget = sceneWidget) => {
  await page.setViewportSize({ width: 1920, height: 1080 });
  await page.addInitScript(() => {
    class MockSocket {
      static OPEN = 1;
      readyState = MockSocket.OPEN;
      onopen: ((event: Event) => void) | null = null;
      onclose: ((event: Event) => void) | null = null;
      onerror: ((event: Event) => void) | null = null;
      onmessage: ((event: MessageEvent) => void) | null = null;
      static latest: MockSocket | null = null;
      sent: string[] = [];

      constructor(_url: string) {
        MockSocket.latest = this;
        setTimeout(() => this.onopen?.(new Event("open")), 0);
      }

      send(payload: string) {
        this.sent.push(payload);
        window.dispatchEvent(new CustomEvent("mock-socket-send", { detail: payload }));
      }

      close() {
        this.onclose?.(new Event("close"));
      }
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (window as any).WebSocket = MockSocket;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (window as any).__pushWidgetUpdate = (data: Record<string, unknown>) => {
      const socket = MockSocket.latest;
      if (!socket?.onmessage) throw new Error("Mock WebSocket is not connected");
      socket.onmessage(
        new MessageEvent("message", {
          data: JSON.stringify({
            v: "2.0",
            type: "widget_update",
            payload: { id: "scene", data },
          }),
        }),
      );
    };
  });
  await page.route("**/lcars/action/**", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        v: "2.0",
        type: "action_ack",
        payload: { action_id: "scene.return", status: "ok" },
      }),
    });
  });
  await page.route("**/lcars/manifest", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      headers: { "X-Lcars-Session": "e2e-fixed-session-token" },
      body: JSON.stringify(buildManifest(scene)),
    });
  });
  await page.goto("/");
  await expect(page.locator(".lcars-scene")).toHaveAttribute(
    "data-scene-mode",
    String(scene.initial_mode),
  );
};

const pushMode = async (page: Page, mode: string, reason: "user" | "server") => {
  await page.evaluate(
    ({ nextMode, modeReason }) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (window as any).__pushWidgetUpdate({
        mode: nextMode,
        mode_subjects: {},
        mode_reason: modeReason,
        mode_seq: Date.now(),
      });
    },
    { nextMode: mode, modeReason: reason },
  );
};

test("mode changes topology at the same viewport", async ({ page }) => {
  await openScene(page);
  const scene = page.locator(".lcars-scene");
  await expect(scene).toHaveAttribute("data-scene-family", "wrap");

  await pushMode(page, "compare", "user");
  await expect(scene).toHaveAttribute("data-scene-family", "fork");
  await expect(page.locator('[data-region-id="sample-a"]')).toBeVisible();
  await expect(page.locator('[data-region-id="sample-b"]')).toBeVisible();

  await pushMode(page, "inspect", "user");
  await expect(scene).toHaveAttribute("data-scene-family", "wrap");
  await pushMode(page, "fault", "user");
  await expect(scene).toHaveAttribute("data-scene-family", "branch");
  await expect(page.locator('[data-region-id="fault"]')).toBeVisible();
});

test("user mode change keeps draft, focus and caret", async ({ page }) => {
  await openScene(page);
  await pushMode(page, "annotate", "user");
  const noteInput = page.locator('[data-region-id="notes-a"] input');
  await expect(noteInput).toBeVisible();
  await noteInput.fill("field note draft");
  await noteInput.evaluate((input: HTMLInputElement) => input.setSelectionRange(5, 5));
  await noteInput.evaluate((input) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (window as any).__noteBeforeUpdate = input;
  });

  await pushMode(page, "review", "user");
  await expect(page.locator(".lcars-scene")).toHaveAttribute("data-scene-mode", "review");
  const continuity = await noteInput.evaluate((input: HTMLInputElement) => ({
    sameNode: input.isSameNode((window as any).__noteBeforeUpdate),
    value: input.value,
    focused: document.activeElement === input,
    selectionStart: input.selectionStart,
  }));
  expect(continuity).toEqual({
    sameNode: true,
    value: "field note draft",
    focused: true,
    selectionStart: 5,
  });
});

test("background change defers while editing", async ({ page }) => {
  await openScene(page);
  await pushMode(page, "annotate", "user");
  const noteInput = page.locator('[data-region-id="notes-a"] input');
  await noteInput.fill("background draft");
  await pushMode(page, "compare", "server");

  const scene = page.locator(".lcars-scene");
  await expect(scene).toHaveAttribute("data-scene-pending", "true");
  await expect(scene).toHaveAttribute("data-scene-mode", "annotate");
  await expect(noteInput).toBeVisible();
  await expect(noteInput).toHaveValue("background draft");

  await page.getByRole("button", { name: "LAYOUT PENDING · APPLY" }).click();
  await expect(scene).toHaveAttribute("data-scene-mode", "compare");
});

test("return terminal sends the return action", async ({ page }) => {
  await openScene(page);
  await pushMode(page, "compare", "user");
  await expect(page.locator(".lcars-scene")).toHaveAttribute("data-scene-mode", "compare");

  await page.evaluate(() => {
    window.addEventListener(
      "mock-socket-send",
      (event) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (window as any).__lastSocketMessage = (event as CustomEvent<string>).detail;
      },
      { once: true },
    );
  });
  await page
    .locator(".lcars-scene-terminal")
    .filter({ hasText: /RETURN|INSPECT/ })
    .click();
  await expect
    .poll(() => page.evaluate(() => (window as any).__lastSocketMessage ?? ""))
    .toContain("scene.return");
});

test.describe("scene accessibility gates", () => {
  for (const mode of ["inspect", "compare"]) {
    for (const view of ["spatial", "linear"]) {
      test(`axe: ${mode} ${view}`, async ({ page }) => {
        await openScene(page);
        if (mode !== "inspect") await pushMode(page, mode, "user");
        await expect(page.locator(".lcars-scene")).toHaveAttribute("data-scene-mode", mode);
        if (view === "linear") await page.getByRole("button", { name: "LINEAR VIEW" }).click();
        await expect(page.locator(".lcars-scene")).toHaveAttribute("data-scene-view", view);
        const results = await new AxeBuilder({ page }).include(".lcars-scene").analyze();
        expect(
          results.violations.filter((violation) =>
            ["serious", "critical"].includes(violation.impact ?? ""),
          ),
        ).toEqual([]);
      });
    }
  }

  test("keyboard reaches visible enabled scene controls in DOM order", async ({ page }) => {
    await openScene(page);
    const controls = page.locator(
      ".lcars-scene button:visible:enabled, .lcars-scene input:visible:enabled",
    );
    const expected = await controls.evaluateAll((elements) =>
      elements.map((element) => {
        element.setAttribute("data-focus-test-id", String(elements.indexOf(element)));
        return element.getAttribute("data-focus-test-id");
      }),
    );
    const reached: string[] = [];
    for (let index = 0; index < 60; index++) {
      await page.keyboard.press("Tab");
      const focus = await page.evaluate(() => {
        const element = document.activeElement;
        return {
          id: element?.getAttribute("data-focus-test-id"),
          hidden: Boolean(element?.closest('[aria-hidden="true"], svg')),
        };
      });
      expect(focus.hidden).toBe(false);
      if (focus.id !== null && !reached.includes(focus.id)) reached.push(focus.id);
      if (reached.length === expected.length) break;
    }
    expect(reached).toEqual(expected);
  });

  for (const viewport of [
    { width: 1920, height: 1080 },
    { width: 390, height: 844 },
  ]) {
    test(`control targets at ${viewport.width}px`, async ({ page }) => {
      await openScene(page);
      await page.setViewportSize(viewport);
      const controls = page.locator(".lcars-scene button:visible, .lcars-scene input:visible");
      for (const control of await controls.all()) {
        const dimensions = await control.evaluate((element) => {
          const box = element.getBoundingClientRect();
          const label = element.closest("label");
          return {
            width: box.width,
            height: box.height,
            labelHeight: label?.getBoundingClientRect().height ?? 0,
            input: element.tagName === "INPUT",
            html: element.outerHTML,
          };
        });
        expect(dimensions.width, dimensions.html).toBeGreaterThanOrEqual(44);
        expect(
          Math.max(dimensions.height, dimensions.input ? dimensions.labelHeight : 0),
          dimensions.html,
        ).toBeGreaterThanOrEqual(44);
      }
    });
  }

  test("forced colors preserve bands and relation descriptions", async ({ page }) => {
    await openScene(page);
    await page.emulateMedia({ forcedColors: "active" });
    const paths = page.locator(".lcars-scene-geometry path");
    expect(await paths.count()).toBeGreaterThan(0);
    for (const path of await paths.all()) {
      const paint = await path.evaluate((element) => {
        const style = getComputedStyle(element);
        return [style.fill, style.stroke];
      });
      expect(
        paint.some((value) => !["none", "transparent", "rgba(0, 0, 0, 0)"].includes(value)),
      ).toBe(true);
    }
    for (const region of sceneWidget.regions as Array<{ id: string }>) {
      await expect(
        page.locator(`[data-region-id="${region.id}"] .lcars-scene-relations`),
      ).toHaveCount(1);
    }
  });

  for (const scenario of [
    { width: 390, height: 844, enlarged: true },
    { width: 320, height: 640, enlarged: false },
  ]) {
    test(`text fits at ${scenario.width}px${scenario.enlarged ? " with enlarged text" : ""}`, async ({
      page,
    }) => {
      await openScene(page);
      await page.setViewportSize({ width: scenario.width, height: scenario.height });
      const selector =
        ".lcars-scene-terminal:visible, .lcars-scene-linear-toggle:visible, .lcars-scene-layout-toggle:visible, .lcars-scene-region h3:visible";
      const baseline = await page.locator(selector).evaluateAll((elements) =>
        elements.map((element) => ({
          text: element.textContent,
          size: parseFloat(getComputedStyle(element).fontSize),
        })),
      );
      if (scenario.enlarged)
        await page.evaluate(() => {
          document.documentElement.style.fontSize = "200%";
        });
      await expect(page.locator(".lcars-scene")).toHaveAttribute(
        "data-scene-view",
        /^(spatial|linear)$/,
      );
      const measurements = await page.locator(selector).evaluateAll((elements) =>
        elements.map((element) => ({
          text: element.textContent,
          size: parseFloat(getComputedStyle(element).fontSize),
          scroll: element.scrollWidth,
          width: element.clientWidth,
        })),
      );
      for (const measurement of measurements) {
        expect(measurement.scroll, measurement.text ?? "").toBeLessThanOrEqual(
          measurement.width + 1,
        );
        const original = baseline.find((item) => item.text === measurement.text);
        if (original)
          expect(measurement.size, measurement.text ?? "").toBeGreaterThanOrEqual(original.size);
      }
    });
  }
});

test("occluded field keeps controls reachable", async ({ page }) => {
  await openScene(page);
  await page.setViewportSize({ width: 390, height: 844 });
  await pushMode(page, "annotate", "user");
  const input = page.locator('[data-region-id="notes-a"] input');
  await input.focus();
  await page.setViewportSize({ width: 390, height: 544 });
  await expect(input).toBeFocused();
  await expect(input).toBeInViewport({ ratio: 1 });
  for (const control of await page
    .locator(".lcars-scene button:visible, .lcars-scene input:visible")
    .all()) {
    const size = await control.evaluate((element) => {
      const box = element.getBoundingClientRect();
      const label = element.closest("label")?.getBoundingClientRect();
      return { width: box.width, height: Math.max(box.height, label?.height ?? 0) };
    });
    expect(size.width).toBeGreaterThanOrEqual(44);
    expect(size.height).toBeGreaterThanOrEqual(44);
  }
});

test("long labels refit", async ({ page }) => {
  const scene = structuredClone(sceneWidget);
  for (const region of scene.regions as Array<{
    label: string;
    children: Array<{ label?: string }>;
  }>) {
    region.label = `${region.label} EXTENDED DEMONSTRATION REGION LABEL FOR ACCESSIBLE REFITTING`;
    for (const child of region.children) {
      if (child.label)
        child.label = "EXTENDED DEMONSTRATION COMMAND LABEL FOR ACCESSIBLE REFITTING";
    }
  }
  await openScene(page, scene);
  for (const viewport of [
    { width: 1366, height: 768 },
    { width: 390, height: 844 },
  ]) {
    await page.setViewportSize(viewport);
    const root = page.locator(".lcars-scene");
    await expect(root).toHaveAttribute("data-scene-view", /^(spatial|linear)$/);
    const view = await root.getAttribute("data-scene-view");
    if (view === "spatial") await expect(root).toHaveAttribute("data-scene-family", /.+/);
    const labels = page.locator(".lcars-scene-terminal:visible, .lcars-scene-region h3:visible");
    for (const label of await labels.all()) {
      const size = await label.evaluate((element) => ({
        scroll: element.scrollWidth,
        width: element.clientWidth,
      }));
      expect(size.scroll).toBeLessThanOrEqual(size.width + 1);
    }
  }
});

test("pointer press defers background change", async ({ page }) => {
  const scene = structuredClone(sceneWidget);
  scene.policy = { quiet_window_ms: 200, min_background_interval_ms: 300 };
  await openScene(page, scene);
  const button = page.locator('[data-region-id="commands-a"] button');
  const before = await button.boundingBox();
  if (!before) throw new Error("Command button is not visible");
  await page.mouse.move(before.x + before.width / 2, before.y + before.height / 2);
  await page.mouse.down();
  // Measure after the press: the button's own :active styling may nudge it by a pixel.
  const pressed = await button.boundingBox();
  await pushMode(page, "compare", "server");
  await expect(page.locator(".lcars-scene")).toHaveAttribute("data-scene-pending", "true");
  expect(await button.boundingBox()).toEqual(pressed);
  await page.mouse.up();
  await expect(page.locator(".lcars-scene")).toHaveAttribute("data-scene-mode", "compare", {
    timeout: 5000,
  });
});

test("pinned region is never silently unpinned", async ({ page }) => {
  await openScene(page);
  await page.getByRole("button", { name: "LAYOUT", exact: true }).click();
  const pin = page.locator(".lcars-scene-layout-panel").getByRole("button", { name: "NOTES" });
  await pin.click();
  await expect(pin).toHaveAttribute("aria-pressed", "true");
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(pin).toHaveAttribute("aria-pressed", "true");
  const region = page.locator('[data-region-id="notes-a"]');
  const terminal = page.locator(".lcars-scene-terminal").filter({ hasText: "NOTES" });
  expect((await region.isVisible()) || (await terminal.isVisible())).toBe(true);
  if (!(await region.isVisible())) {
    const root = page.locator(".lcars-scene");
    expect(await root.getAttribute("data-scene-family")).toBe("focus");
  }
});

test("zoom 400% from 1280 equals 320 css px", async ({ page }) => {
  await openScene(page);
  await page.setViewportSize({ width: 320, height: 720 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(320);
  const controls = page.locator(
    ".lcars-scene button:visible:enabled, .lcars-scene input:visible:enabled",
  );
  const expected = await controls.evaluateAll((elements) =>
    elements.map((element, index) => {
      element.setAttribute("data-tab-check", String(index));
      return String(index);
    }),
  );
  const reached: string[] = [];
  for (let index = 0; index < 100 && reached.length < expected.length; index++) {
    await page.keyboard.press("Tab");
    const id = await page.evaluate(() => document.activeElement?.getAttribute("data-tab-check"));
    if (id != null && !reached.includes(id)) reached.push(id);
  }
  expect(reached).toEqual(expected);
});

test("dense records adapt wide to tall to narrow", async ({ page }) => {
  const scene: Widget = {
    id: "scene",
    type: "scene",
    visible: true,
    disabled: false,
    initial_mode: "browse",
    modes: [
      {
        id: "browse",
        label: "BROWSE",
        focal: ["register"],
        required: ["register", "filters"],
        optional: ["selection"],
        families: ["contour", "wrap", "focus"],
      },
    ],
    regions: [
      {
        id: "register",
        type: "scene_region",
        visible: true,
        disabled: false,
        label: "SOIL REGISTER · DEMO DATA",
        role: "data",
        children: [
          {
            id: "register-table",
            type: "table",
            visible: true,
            disabled: false,
            headers: ["Sample", "Plot"],
            rows: Array.from({ length: 40 }, (_, index) => ({
              id: `soil-${index}`,
              cells: [`SOIL-${index}`, `Plot ${index}`],
            })),
            options: {
              selection: { mode: "single", selected_ids: [] },
              sort: [],
              filters: [],
              expanded_ids: [],
              density: "normal",
            },
          },
        ],
      },
      {
        id: "filters",
        type: "scene_region",
        visible: true,
        disabled: false,
        label: "FILTERS",
        role: "commands",
        children: [
          {
            id: "search",
            type: "text_input",
            visible: true,
            disabled: false,
            value: "",
            placeholder: "Search",
            password: false,
            autocomplete: false,
          },
        ],
      },
      {
        id: "selection",
        type: "scene_region",
        visible: true,
        disabled: false,
        label: "SELECTION",
        role: "detail",
        children: [
          {
            id: "selected",
            type: "text",
            visible: true,
            disabled: false,
            content: "Selected record",
            size: "body",
          },
        ],
      },
    ],
    relations: [
      { id: "controls", kind: "controls", source: "filters", target: "register" },
      { id: "details", kind: "details", source: "selection", target: "register" },
    ],
  };
  await openScene(page, scene);
  const pip = page.locator('[data-region-id="register"] .lcars-check').last();
  await pip.click();
  await expect(pip).toHaveAttribute("aria-checked", "true");
  for (const viewport of [
    { width: 1920, height: 1080 },
    { width: 1080, height: 1920 },
    { width: 390, height: 844 },
  ]) {
    await page.setViewportSize(viewport);
    await expect(page.locator('[data-region-id="register"]')).toBeVisible();
    await expect(pip).toHaveAttribute("aria-checked", "true");
    const scroll = await page.locator('[data-region-id="register"]').evaluate((region) => {
      const elements = [region, ...region.querySelectorAll("*")];
      return {
        local: elements.some(
          (element) =>
            element.scrollHeight > element.clientHeight &&
            ["auto", "scroll"].includes(getComputedStyle(element).overflowY),
        ),
        page: document.documentElement.scrollHeight,
        height: innerHeight,
      };
    });
    expect(scroll.local).toBe(true);
    expect(scroll.page).toBeLessThanOrEqual(scroll.height);
  }
});
