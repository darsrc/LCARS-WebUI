import { expect, test, type Page } from "@playwright/test";

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

const buildManifest = () => ({
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
          columns: [{ id: "scene-column", width: "1fr", widgets: [sceneWidget] }],
        },
      ],
    },
  },
});

const openScene = async (page: Page) => {
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
      body: JSON.stringify(buildManifest()),
    });
  });
  await page.goto("/");
  await expect(page.locator(".lcars-scene")).toHaveAttribute("data-scene-mode", "inspect");
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
