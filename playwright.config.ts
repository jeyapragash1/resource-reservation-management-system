import { defineConfig, devices } from "@playwright/test";
import { loadEnvFile } from "node:process";
import { existsSync } from "node:fs";
if (existsSync(".env.local")) loadEnvFile(".env.local");
if (!process.env.TEST_DATABASE_URL || !process.env.SEED_PASSWORD)
  throw new Error(
    "Set TEST_DATABASE_URL and SEED_PASSWORD before browser tests. Migrate and seed the test database first.",
  );
export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: false,
  workers: 1,
  retries: 0,
  timeout: 120000,
  expect: { timeout: 15000 },
  use: { baseURL: "http://127.0.0.1:3100", trace: "retain-on-failure" },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"], channel: "chrome" },
    },
  ],
  webServer: {
    command:
      "node node_modules/next/dist/bin/next start --hostname 127.0.0.1 --port 3100",
    url: "http://127.0.0.1:3100/login",
    reuseExistingServer: process.env.E2E_REUSE_SERVER === "1",
    env: {
      DATABASE_URL: process.env.TEST_DATABASE_URL,
      APP_URL: "http://127.0.0.1:3100",
    },
    timeout: 120000,
  },
});
