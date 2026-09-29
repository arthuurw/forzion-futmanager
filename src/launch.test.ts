import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const read = (path: string) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8").replace(/\r\n/g, "\n");

describe("página (lancamento)", () => {
  test("index.html se apresenta", () => {
    const html = read("index.html");
    const icon = html.match(/<link[^>]+rel="icon"[^>]*>/)?.[0] ?? "";
    expect(icon).toMatch(/href="\/?favicon\.svg"/);
    expect(existsSync(new URL("../public/favicon.svg", import.meta.url))).toBe(true);
    expect(read("public/favicon.svg")).toContain("<svg");
    expect(html).toMatch(/<meta name="description" content="[^"]{20,}"/);
    expect(html).toMatch(/<meta name="theme-color" content="#[0-9a-f]{6}"/i);
    expect(html).toMatch(/<meta property="og:title" content="Forzion FutManager"/);
    expect(html).toMatch(/<meta property="og:description" content="[^"]{20,}"/);
    const noscript = html.match(/<noscript>([^<]+)<\/noscript>/)?.[1] ?? "";
    expect(noscript).toContain("JavaScript");
    expect(noscript).toMatch(/precisa|ative/);
  });
});

describe("publicação (lancamento door 2)", () => {
  const workflow = () => read(".github/workflows/deploy.yml");

  /** The text of one top-level job, from `  <name>:` to the next job. */
  function job(name: string): string {
    const text = workflow();
    const start = text.indexOf(`\n  ${name}:\n`);
    expect(start, name).toBeGreaterThan(-1);
    const rest = text.slice(start + 1);
    const next = rest.slice(1).search(/\n {2}[a-z-]+:\n/);
    return next === -1 ? rest : rest.slice(0, next + 1);
  }

  test("workflow roda test, lint e build antes de publicar", () => {
    const text = workflow();
    expect(text).toMatch(/on:\n\s+push:\n\s+branches: \[main\]\n\s+workflow_dispatch:/);
    const build = job("build");
    const steps = ["run: npm ci", "run: npm test", "run: npm run lint", "run: npm run build", "uses: actions/upload-pages-artifact@"];
    const at = steps.map((s) => build.indexOf(s));
    for (const [i, s] of steps.entries()) expect(at[i], s).toBeGreaterThan(-1);
    expect([...at].sort((a, b) => a - b)).toEqual(at);
    expect(build).toMatch(/upload-pages-artifact@v\d+\n\s+with:\n\s+path: dist/);
    expect(text).toMatch(/concurrency:\n\s+group: pages/);
  });

  test("publicação depende do build", () => {
    const deploy = job("deploy");
    expect(deploy).toMatch(/needs: build/);
    expect(deploy).toContain("uses: actions/deploy-pages@");
    expect(job("build")).not.toContain("deploy-pages");
  });
});

describe("guardas e metadados (correcoes-validacao)", () => {
  test("fonte mínima", () => {
    // C55 (AC 51): every rem/em/px value of every font size in styles.css, custom font-size properties included.
    const css = read("src/styles.css").replace(/\/\*[\s\S]*?\*\//g, "");
    const declarations = [...css.matchAll(/(?:^|[;{\s])(font-size|--[\w-]*font[\w-]*)\s*:\s*([^;}]+)/g)].map((m) => `${m[1]}: ${m[2]!.trim()}`);
    expect(declarations.length).toBeGreaterThan(60);
    const values: [string, number][] = declarations.flatMap((d) =>
      [...d.matchAll(/(\d*\.?\d+)(rem|em|px)\b/g)].map((m): [string, number] => [d, m[2] === "px" ? Number(m[1]) / 16 : Number(m[1])]),
    );
    expect(values.length).toBeGreaterThan(60);
    for (const [declaration, size] of values) expect(size, declaration).toBeGreaterThanOrEqual(0.65);
  });

  test("vitest limita workers", () => {
    // C67 (AC 63).
    const config = read("vite.config.ts");
    const test = config.slice(config.indexOf("test: {"));
    expect(test.slice(0, test.indexOf("}"))).toMatch(/\bmaxWorkers: 4,/);
  });

  test("deploy roda o dist-check", () => {
    // C70 (AC 66): after the build, before the upload.
    const build = read(".github/workflows/deploy.yml");
    const at = ["run: npm run build", "run: npm run check:dist", "uses: actions/upload-pages-artifact@"].map((s) => build.indexOf(s));
    expect(at.every((i) => i > -1)).toBe(true);
    expect([...at].sort((a, b) => a - b)).toEqual(at);
    const pkg = JSON.parse(read("package.json")) as { scripts: Record<string, string> };
    expect(pkg.scripts["check:dist"]).toBe("node scripts/dist-check.mjs");
  });

  test("metadados de compartilhamento", () => {
    // C71 (AC 67): absolute URLs for the share card, relative paths for what the page loads.
    const html = read("index.html");
    const meta = (property: string) => html.match(new RegExp(`<meta property="${property}" content="([^"]*)"`))?.[1];
    expect(meta("og:image")).toBe("https://arthuurw.github.io/forzion.tech-futmanager/og-image.png");
    expect(meta("og:url")).toBe("https://arthuurw.github.io/forzion.tech-futmanager/");
    const href = (rel: string) => html.match(new RegExp(`<link rel="${rel}" href="([^"]*)"`))?.[1];
    expect(href("apple-touch-icon")).toBe("./apple-touch-icon.png");
    expect(href("manifest")).toBe("./manifest.webmanifest");

    const manifest = JSON.parse(read("public/manifest.webmanifest")) as { name: string; start_url: string; icons: { src: string; sizes: string }[] };
    expect(manifest.name).toBe("Forzion FutManager");
    expect(manifest.start_url).toBe("./");
    for (const icon of manifest.icons) {
      expect(icon.src, icon.src).not.toMatch(/^\/|^[a-z]+:/);
      expect(existsSync(new URL(`../public/${icon.src}`, import.meta.url)), icon.src).toBe(true);
    }
    expect(manifest.icons.map((i) => [i.src, i.sizes])).toContainEqual(["apple-touch-icon.png", "180x180"]);

    // Width and height from the IHDR chunk, right after the 8-byte PNG signature.
    const size = (file: string) => {
      const png = readFileSync(new URL(`../public/${file}`, import.meta.url));
      expect([...png.subarray(0, 8)], file).toEqual([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
      expect(png.toString("ascii", 12, 16), file).toBe("IHDR");
      return [png.readUInt32BE(16), png.readUInt32BE(20)];
    };
    expect(size("og-image.png")).toEqual([1200, 630]);
    expect(size("apple-touch-icon.png")).toEqual([180, 180]);
  });

  test("provas dos checks existem", () => {
    // C62 (AC 58): the selector script over every checks.md ends with 0 orphans.
    type Scan = { selectors: number; superseded: number; orphans: { feature: string; check: string; file: string; name: string }[] };
    const script = fileURLToPath(new URL("../scripts/proof-check.mjs", import.meta.url));
    const scan = (...args: string[]) => {
      const r = spawnSync(process.execPath, [script, "--json", ...args], { encoding: "utf8" });
      return { status: r.status, result: JSON.parse(r.stdout) as Scan };
    };
    const all = scan();
    expect(all.result.orphans).toEqual([]);
    expect(all.status).toBe(0);
    expect(all.result.selectors).toBeGreaterThan(500);

    // The checks whose proof pointed at a test that is gone, each marked with what replaced it.
    const marked: [string, string, string][] = [
      ["copa-nacional", "C1", "copa-continental C9"],
      ["copa-nacional", "C61", "gastos-da-ia C30"],
      ["elenco-mercado-financas", "C19", "multiplas-temporadas C26"],
      ["elenco-mercado-financas", "C51", "multiplas-temporadas C49"],
      ["elenco-mercado-financas", "C52", "multiplas-temporadas C50"],
      ["elenco-mercado-financas", "C54", "multiplas-temporadas C51"],
      ["gastos-da-ia", "C29", "paises C29"],
      ["gastos-da-ia", "C30", "paises C30"],
      ["multiplas-temporadas", "C50", "copa-nacional C61"],
      ["multiplas-temporadas", "C51", "copa-nacional C56"],
      ["nucleo-liga-partida", "C15", "partida-ao-vivo C45"],
      ["nucleo-liga-partida", "C19", "partida-ao-vivo C23"],
      ["nucleo-liga-partida", "C33", "partida-ao-vivo C46"],
      ["paises", "C30", "copa-continental C24"],
      ["partida-ao-vivo", "C12", "correcoes-validacao C14"],
      ["partida-ao-vivo", "C42", "multiplas-temporadas C49"],
      ["partida-ao-vivo", "C43", "elenco-mercado-financas C52"],
      ["partida-ao-vivo", "C45", "elenco-mercado-financas C54"],
    ];
    for (const [feature, check, by] of marked) {
      const head = read(`.specs/features/${feature}/checks.md`)
        .split("\n")
        .find((l) => l.startsWith(`**${check}**`));
      expect(head, `${feature} ${check}`).toContain(`Superseded por ${by}`);
    }

    // The script finds an orphan, and a superseded check is not one.
    const dir = mkdtempSync(join(tmpdir(), "proof-check-"));
    try {
      mkdirSync(join(dir, "x"));
      writeFileSync(
        join(dir, "x", "checks.md"),
        [
          "**C1** - existe",
          'Proof: `npx vitest run src/launch.test.ts -t "provas dos checks existem"`',
          "**C2** - sumiu",
          'Proof: `npx vitest run src/launch.test.ts -t "teste que não existe"`',
          "**C3** - trocado - Superseded por x C1",
          'Proof: `npx vitest run src/launch.test.ts -t "outro que não existe"`',
        ].join("\n"),
      );
      const fixture = scan(`--features=${dir}`);
      expect(fixture.status).toBe(1);
      expect(fixture.result.selectors).toBe(3);
      expect(fixture.result.superseded).toBe(1);
      expect(fixture.result.orphans.map((o) => o.check)).toEqual(["C2"]);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
