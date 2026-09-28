import { defineConfig, devices } from "@playwright/test";

const frontendPort = Number(process.env.ITEM_INTEGRATION_FRONTEND_PORT ?? "43183");
const backendPort = Number(process.env.ITEM_INTEGRATION_BACKEND_PORT ?? "48123");
const nodePath = process.env.ITEM_INTEGRATION_NODE_PATH ?? "node";
const baseURL = `http://127.0.0.1:${frontendPort}`;

export default defineConfig({
  testDir: "./tests/integration",
  fullyParallel: false,
  workers: 1,
  retries: 0,
  timeout: 60_000,
  reporter: "line",
  use: {
    baseURL,
    trace: "retain-on-failure",
  },
  projects: [{
    name: "chrome-real-backend",
    use: { ...devices["Desktop Chrome"], channel: "chrome" },
  }],
  webServer: {
    command: `${nodePath} ./node_modules/vite/bin/vite.js --host 127.0.0.1 --port ${frontendPort}`,
    url: baseURL,
    reuseExistingServer: false,
    timeout: 30_000,
    env: {
      ...process.env,
      VITE_API_PROXY_TARGET: `http://127.0.0.1:${backendPort}`,
    },
  },
});
