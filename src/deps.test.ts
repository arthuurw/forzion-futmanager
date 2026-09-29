import { readdirSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

describe("package.json (door 5)", () => {
  test("dependências de runtime", () => {
    const pkg = JSON.parse(readFileSync(new URL("../package.json", import.meta.url), "utf8")) as {
      dependencies: Record<string, string>;
    };
    expect(Object.keys(pkg.dependencies).sort()).toEqual(["idb", "react", "react-dom", "zustand"]);
  });
});

describe("módulo de áudio (audio door 2)", () => {
  const filesIn = (dir: string) => {
    const base = new URL(`./${dir}/`, import.meta.url);
    return readdirSync(base, { recursive: true, withFileTypes: true })
      .filter((f) => f.isFile() && /\.tsx?$/.test(f.name))
      .map((f) => ({ name: `${f.parentPath}/${f.name}`, text: readFileSync(`${f.parentPath}/${f.name}`, "utf8") }));
  };

  test("áudio sem Math.random e fora do motor", () => {
    const audio = filesIn("audio");
    expect(audio.some((f) => f.name.endsWith("/music.ts"))).toBe(true);
    for (const f of audio) expect(f.text, f.name).not.toContain("Math.random");
    const engine = filesIn("engine");
    expect(engine.length).toBeGreaterThan(10);
    for (const f of engine) expect(f.text, f.name).not.toMatch(/from\s+["'][^"']*audio/);
  });
});

describe("guardas do AD-002 (correcoes-validacao)", () => {
  /** Every .ts/.tsx file under src/, as a path relative to it with forward slashes. */
  const sources = () => {
    const base = new URL("./", import.meta.url);
    return readdirSync(base, { recursive: true, withFileTypes: true })
      .filter((f) => f.isFile() && /\.tsx?$/.test(f.name))
      .map((f) => {
        const path = `${f.parentPath}/${f.name}`.replace(/[\\/]+/g, "/");
        return { name: path.slice(path.lastIndexOf("/src/") + 5), text: readFileSync(path, "utf8") };
      });
  };
  /** `Math.random`, however it is reached: `globalThis.Math.random`, spaces, `Math["random"]`. */
  const RANDOM = /\bMath\s*(?:\?\.|\.)\s*random\b|\bMath\s*\[\s*["'`]random["'`]\s*\]/;
  /** A static import, a re-export or a dynamic import() of react, react-dom, zustand or idb (and their subpaths). */
  const UI_IMPORT = /(?:\bfrom\s*|\bimport\s*\(\s*|\bimport\s+|\brequire\s*\(\s*)["'`](?:react|react-dom|zustand|idb)(?:\/[^"'`]*)?["'`]/;

  test("Math.random fora do Rng", () => {
    // C59 (AC 55): the search catches each form, and misses what only looks like it.
    for (const text of ["const x = Math.random();", "globalThis.Math.random()", "window.Math .random()", 'Math["random"]()', "Math?.random()"]) expect(text, text).toMatch(RANDOM);
    for (const text of ["Mathematics.random()", "rng.random()", "const random = 1;"]) expect(text, text).not.toMatch(RANDOM);

    const files = sources();
    expect(files.some((f) => f.name === "store.ts")).toBe(true);
    expect(files.some((f) => f.name === "engine/rng.ts")).toBe(true);
    const scanned = files.filter((f) => f.name !== "engine/rng.ts" && !/\.test\.tsx?$/.test(f.name));
    expect(scanned.length).toBeGreaterThan(40);
    for (const f of scanned) expect(f.text, f.name).not.toMatch(RANDOM);
  });

  test("motor sem dependência de UI", () => {
    // C59 (AC 55, L-005): the 4 packages, statically and through import().
    const forms = ['import { useState } from "react";', 'import "idb";', "const z = await import('zustand');", 'export { createRoot } from "react-dom/client";', 'import type { StoreApi } from "zustand/vanilla";', "import(`react`)"];
    for (const text of forms) expect(text, text).toMatch(UI_IMPORT);
    for (const pkg of ["react", "react-dom", "zustand", "idb"]) {
      expect(`import x from "${pkg}";`, pkg).toMatch(UI_IMPORT);
      expect(`await import("${pkg}")`, pkg).toMatch(UI_IMPORT);
    }
    for (const text of ['import { x } from "./reactions";', 'import { y } from "../idbish";', "const react = 1;"]) expect(text, text).not.toMatch(UI_IMPORT);

    const engine = sources().filter((f) => f.name.startsWith("engine/"));
    expect(engine.length).toBeGreaterThan(20);
    for (const f of engine) expect(f.text, f.name).not.toMatch(UI_IMPORT);
  });

  test("eslint barra as formas indiretas", async () => {
    // C60 (AC 56): the engine's rules, run by ESLint itself over two texts.
    const { ESLint } = await import("eslint");
    const eslint = new ESLint({ cwd: fileURLToPath(new URL("../", import.meta.url)) });
    const errorsOf = async (text: string) => (await eslint.lintText(text, { filePath: "src/engine/x.ts" }))[0]!.messages.filter((m) => m.severity === 2);
    const random = await errorsOf("export const n = globalThis.Math.random();\n");
    expect(random.map((m) => m.message).join(" | ")).toMatch(/Rng/);
    const dynamic = await errorsOf('export const m = import("react");\n');
    expect(dynamic.map((m) => m.message).join(" | ")).toMatch(/react/);
    // And the plain forms stay barred.
    expect((await errorsOf("export const n = Math.random();\n")).length).toBeGreaterThan(0);
    expect((await errorsOf('import { create } from "zustand";\nexport const c = create;\n')).length).toBeGreaterThan(0);
  }, 30_000);
});
