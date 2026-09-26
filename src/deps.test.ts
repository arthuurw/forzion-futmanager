import { readFileSync } from "node:fs";

describe("package.json (door 5)", () => {
  test("dependências de runtime", () => {
    const pkg = JSON.parse(readFileSync(new URL("../package.json", import.meta.url), "utf8")) as {
      dependencies: Record<string, string>;
    };
    expect(Object.keys(pkg.dependencies).sort()).toEqual(["idb", "react", "react-dom", "zustand"]);
  });
});
