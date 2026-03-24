import { defineConfig, devices } from "@playwright/test";

const skipBackendServers = process.env.LCARS_PLAYWRIGHT_SKIP_BACKENDS === "1";
const frontendWebServerCommand = skipBackendServers
  ? "npm run build && npm run preview -- --host 127.0.0.1 --port 4173"
  : "npm run dev -- --host 127.0.0.1 --port 4173";

export default defineConfig({
  timeout: 30_000,
  snapshotPathTemplate: "{testDir}/golden/{arg}{ext}",
  use: {
    trace: "on-first-retry",
  },
  webServer: [
    {
      command: frontendWebServerCommand,
      port: 4173,
      reuseExistingServer: true,
      timeout: 120_000,
    },
    ...(
      skipBackendServers
        ? []
        : [
            {
              command: "cd .. && LCARS_PORT=8101 LCARS_OPEN_BROWSER=0 PYTHONPATH=src python examples/lcars_console/app.py",
              port: 8101,
              reuseExistingServer: true,
              timeout: 120_000,
            },
            {
              command: "cd .. && LCARS_PORT=8102 LCARS_OPEN_BROWSER=0 PYTHONPATH=src python examples/lcars_padd/app.py",
              port: 8102,
              reuseExistingServer: true,
              timeout: 120_000,
            },
            {
              command: "cd .. && LCARS_PORT=8103 LCARS_OPEN_BROWSER=0 PYTHONPATH=src python examples/bridge_ops/app.py",
              port: 8103,
              reuseExistingServer: true,
              timeout: 120_000,
            },
          ]
    ),
  ],
  projects: [
    {
      name: "chromium",
      testDir: "./e2e",
      use: {
        ...devices["Desktop Chrome"],
        baseURL: "http://127.0.0.1:4173",
      },
    },
    {
      name: "mobile-chrome",
      testDir: "./e2e",
      use: {
        ...devices["Pixel 7"],
        baseURL: "http://127.0.0.1:4173",
      },
    },
    {
      name: "legacy-visual-regression",
      testDir: "./tests/visual",
      use: {
        ...devices["Desktop Chrome"],
      },
    },
  ],
});
