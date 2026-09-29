import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

export default defineConfig({
  // Lancamento door 3: relative paths, so the build runs under any path (GitHub Pages, a domain root).
  base: "./",
  plugins: [react()],
  test: {
    globals: true,
    environment: "node",
    setupFiles: ["./src/test-setup.ts"],
    testTimeout: 30000,
    // Correcoes-validacao AC 63: a loaded machine starves the workers of a wider pool (they time out on start).
    maxWorkers: 4,
  },
});
