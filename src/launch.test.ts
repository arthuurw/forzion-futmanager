import { existsSync, readFileSync } from "node:fs";

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
