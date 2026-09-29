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
    // dev scripts (layout check) run on Node, which also has fetch and WebSocket
    files: ["scripts/**/*.mjs"],
    languageOptions: { globals: { ...globals.node } },
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
      // Correcoes-validacao AC 56: the indirect forms - `globalThis.Math.random` and import().
      "no-restricted-syntax": [
        "error",
        { selector: "MemberExpression[property.name='random'][object.type='MemberExpression'][object.property.name='Math']", message: "Use the injected Rng (door 2)." },
        { selector: "ImportExpression[source.value=/^(react|react-dom|zustand|idb)(\\u002F|$)/]", message: "The engine imports nothing from react, react-dom, zustand or idb (door 3)." },
        { selector: "ImportExpression > TemplateLiteral.source[quasis.0.value.raw=/^(react|react-dom|zustand|idb)(\\u002F|$)/]", message: "The engine imports nothing from react, react-dom, zustand or idb (door 3)." },
      ],
    },
  },
);
