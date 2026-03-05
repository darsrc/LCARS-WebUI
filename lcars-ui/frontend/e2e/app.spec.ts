import { expect, test } from "@playwright/test";

const manifest = {
  meta: {
    version: "1.0.0",
    app_name: "E2E LCARS",
    theme: "galaxy",
    lang: "en-US",
    sound_enabled: true,
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
          columns: [
            {
              id: "col_1",
              width: "1fr",
              widgets: [
                {
                  id: "txt_1",
                  type: "text",
                  content: "Bridge Online",
                  size: "h1",
                  visible: true,
                  disabled: false,
                },
              ],
            },
          ],
        },
      ],
    },
  },
};

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

  await page.route("**/lcars/manifest", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(manifest),
    });
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

test("renders manifest-driven shell", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByText("USS E2E")).toBeVisible();
  await expect(page.getByText("Main Deck")).toBeVisible();
  await expect(page.getByText("Bridge Online")).toBeVisible();
});

test("is navigable in mobile viewport", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("button", { name: "MAIN" })).toBeVisible();
  await expect(page.getByText("Bridge Online")).toBeVisible();
});
