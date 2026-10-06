import { defineConfig } from "@playwright/test";
import { resolve } from "node:path";
const baseURL = "http://127.0.0.1:5181";
const testDataDir = resolve(".runtime", `e2e-${Date.now()}`);
export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: false,
  workers: 1,
  timeout: 45000,
  use: {
    baseURL,
    locale: "fr-FR",
    timezoneId: "Europe/Paris",
    trace: "retain-on-failure",
  },
  projects: [
    { name: "mobile-390", use: { viewport: { width: 390, height: 844 } } },
    { name: "mobile-360", use: { viewport: { width: 360, height: 800 } } },
  ],
  webServer: {
    command: "npm run dev",
    url: `${baseURL}/api/config`,
    env: {
      APP_URL: baseURL,
      PORT: "3011",
      MESURA_WEB_PORT: "5181",
      MESURA_API_URL: "http://127.0.0.1:3011",
      DATA_DIR: testDataDir,
      TRUST_PROXY: "127.0.0.1",
      SMTP_HOST: "",
      MAIL_FROM: "",
    },
    reuseExistingServer: false,
    timeout: 30000,
  },
});
