import { defineConfig, devices } from "@playwright/test";

const skipBackendServers = process.env.LCARS_PLAYWRIGHT_SKIP_BACKENDS === "1";
const frontendWebServerCommand = skipBackendServers
  ? "npm run build && npm run preview -- --host 127.0.0.1 --port 4173"
  : "npm run dev -- --host 127.0.0.1 --port 4173";

export default defineConfig({
  timeout: 30_000,
  use: {
    trace: "on-first-retry",
  },
  webServer: {
    command: frontendWebServerCommand,
    port: 4173,
    reuseExistingServer: true,
    timeout: 120_000,
  },
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
  ],
});
