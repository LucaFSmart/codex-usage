import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "visual-tests",
  fullyParallel: true,
  use: {
    baseURL: "http://127.0.0.1:4173",
    browserName: "chromium",
  },
  webServer: {
    command: "npm run dev:visual",
    url: "http://127.0.0.1:4173/visual/",
    reuseExistingServer: !process.env.CI,
  },
});
