import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import { serviceWorkerPlugin } from "./src/pwa/build";

export default defineConfig({
  // Lancamento door 3: relative paths, so the build runs under any path (GitHub Pages, a domain root).
  base: "./",
  // Offline-instalar door 1: `dist/sw.js`, written once the build is out.
  plugins: [react(), serviceWorkerPlugin()],
  test: {
    globals: true,
    environment: "node",
    setupFiles: ["./src/test-setup.ts"],
    testTimeout: 30000,
    // Correcoes-validacao AC 63: a loaded machine starves the workers of a wider pool (they time out on start).
    maxWorkers: 4,
  },
});
