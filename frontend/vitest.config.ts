import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "happy-dom",
    include: ["tests/**/*.test.ts"],
    coverage: {
      provider: "v8",
      include: ["src/card-data.ts", "src/config.ts", "src/status.ts", "src/view-model.ts"],
      thresholds: { lines: 95, functions: 95, statements: 95, branches: 90 },
    },
  },
});
