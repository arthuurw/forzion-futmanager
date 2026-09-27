import { readdirSync, readFileSync } from "node:fs";

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
