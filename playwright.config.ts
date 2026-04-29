// Playwright config for E2E smoke tests.
//
// To run locally:
//   npm install --save-dev @playwright/test
//   npx playwright install chromium
//   npx playwright test
//
// Tests live under e2e/ and target either localhost (npm run dev) or
// the production URL via PLAYWRIGHT_BASE_URL=https://www.odudoc.com.
//
// We intentionally do NOT add @playwright/test to package.json's
// dependencies array — it adds 200+ MB and most contributors won't
// run E2E. CI / pre-release runs install on demand.

import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  timeout: 60_000,
  expect: { timeout: 10_000 },
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? "github" : "list",
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL || "http://localhost:3000",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
});
