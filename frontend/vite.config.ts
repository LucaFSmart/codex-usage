import { defineConfig } from "vite";

export default defineConfig({
  build: {
    emptyOutDir: false,
    lib: {
      entry: "src/index.ts",
      formats: ["es"],
      fileName: () => "codex-usage-card.js",
    },
    outDir: "../custom_components/codex_usage/frontend",
    rollupOptions: {
      output: {
        inlineDynamicImports: true,
      },
    },
  },
});
