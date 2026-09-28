#!/usr/bin/env node
/**
 * Door 3 of lancamento: the build must run under any path. Exits 1 naming every file in `dist/`
 * that points at the site root (`src="/`, `href="/`, `url(/`, quoted or not), or when
 * `dist/index.html` does not load its assets through `./`. Run after `npm run build`.
 */
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const DIST = join(dirname(fileURLToPath(import.meta.url)), "..", "dist");
const ROOT_REF = /(?:src|href)=["']\/(?!\/)|url\(\s*["']?\/(?!\/)/g;

if (!existsSync(join(DIST, "index.html"))) {
  console.error("dist-check: dist/index.html not found - run npm run build first");
  process.exit(1);
}

const files = readdirSync(DIST, { recursive: true, withFileTypes: true })
  .filter((f) => f.isFile() && /\.(html|css|js)$/.test(f.name))
  .map((f) => join(f.parentPath, f.name));

const problems = [];
for (const file of files) {
  const text = readFileSync(file, "utf8");
  for (const m of text.matchAll(ROOT_REF)) {
    problems.push(`${relative(DIST, file)}: «${text.slice(m.index, m.index + 40)}»`);
  }
}

const index = readFileSync(join(DIST, "index.html"), "utf8");
if (!/<script[^>]+src="\.\/assets\//.test(index)) problems.push("index.html: script not loaded from ./assets/");
if (!/<link[^>]+href="\.\/assets\/[^"]+\.css"/.test(index)) problems.push("index.html: stylesheet not loaded from ./assets/");

if (problems.length > 0) {
  console.error(`dist-check: ${problems.length} root-relative reference(s):\n${problems.join("\n")}`);
  process.exit(1);
}
console.log(`dist-check: ${files.length} files, no root-relative reference`);
