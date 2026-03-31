import { defineConfig, devices } from "@playwright/test";

const frontendWebServerCommand = "npm run build && npm run preview -- --host 127.0.0.1 --port 4173";

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
      name: "phase14-target-bank",
      testDir: "./tests/visual",
      use: {
        ...devices["Desktop Chrome"],
      },
    },
  ],
});
