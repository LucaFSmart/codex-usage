import eslint from "@eslint/js";
import tseslint from "typescript-eslint";

export default tseslint.config(
  {
    ignores: ["node_modules/", "dist/", "playwright-report/", "test-results/"],
  },
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
);
