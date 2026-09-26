import js from "@eslint/js";
import tseslint from "typescript-eslint";
import globals from "globals";

export default tseslint.config(
  { ignores: ["dist/**", "node_modules/**"] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ["src/**/*.{ts,tsx}"],
    languageOptions: { globals: { ...globals.browser, ...globals.node } },
    rules: {
      // door 6: identifiers stay ASCII (\w is ASCII-only in JS regexes)
      "id-match": ["error", "^[\\w$]+$", { properties: false }],
    },
  },
  {
    // door 3: the engine imports nothing from the UI or persistence layers
    files: ["src/engine/**/*.ts"],
    rules: {
      "no-restricted-imports": [
        "error",
        { paths: ["react", "react-dom", "zustand", "idb"], patterns: ["react/*", "react-dom/*", "zustand/*", "idb/*", "../ui/*", "../persistence/*", "../store*"] },
      ],
      // door 2: no Math.random in the engine, only the injected Rng
      "no-restricted-properties": [
        "error",
        { object: "Math", property: "random", message: "Use the injected Rng (door 2)." },
      ],
    },
  },
);
