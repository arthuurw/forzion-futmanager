#!/usr/bin/env node
/**
 * Correcoes-validacao AC 58: every `Proof:` selector `npx vitest run <file> -t "<name>"` in
 * `.specs/features/*\/checks.md` must still select a test, unless its check is marked «Superseded por
 * <feature> C<n>».
 * A selector selects a test when its pattern (a regex, as vitest reads `-t`) matches a test title
 * of that file, alone or after one of the file's describe titles. Prints each orphan and exits 1
 * when there is any; `--json` prints `{ selectors, superseded, orphans }` instead.
 * Test files are read from the repository root, whatever `--features` says.
 */
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
/** `--features=<dir>` scans another folder of features (the test's own fixture). */
const FEATURES = process.argv.find((a) => a.startsWith("--features="))?.slice("--features=".length) ?? join(ROOT, ".specs", "features");
const SELECTOR = /npx vitest run (\S+) -t "([^"]+)"/g;
/** The mark of a check another one replaced: «Superseded por <feature> C<n>». */
const SUPERSEDED = /Superseded (?:por|by) [a-z0-9-]+ C\d+/;
const TITLE = /\b(describe|test|it)(?:\.\w+)?\(\s*(["'`])((?:\\.|(?!\2).)*)\2/g;

/** The checks of one checks.md: id, whether it is superseded, and its selectors. */
function checksOf(text) {
  const checks = [];
  let current = null;
  for (const line of text.replace(/\r\n/g, "\n").split("\n")) {
    const head = line.match(/^\*\*(C\d+)\*\*/);
    if (head) {
      current = { id: head[1], superseded: SUPERSEDED.test(line), selectors: [] };
      checks.push(current);
      continue;
    }
    if (/^#{1,3} /.test(line)) current = null;
    if (!current) continue;
    if (SUPERSEDED.test(line)) current.superseded = true;
    if (/^Proof:/.test(line)) for (const m of line.matchAll(SELECTOR)) current.selectors.push({ file: m[1], name: m[2] });
  }
  return checks;
}

/** Test titles of a file, alone and prefixed by each describe title (vitest joins them with a space). */
function titlesOf(path) {
  const text = readFileSync(path, "utf8");
  const describes = [];
  const tests = [];
  for (const m of text.matchAll(TITLE)) (m[1] === "describe" ? describes : tests).push(m[3]);
  return [...tests, ...describes.flatMap((d) => tests.map((t) => `${d} ${t}`))];
}

export function scan() {
  const selectors = [];
  for (const feature of readdirSync(FEATURES, { withFileTypes: true }).filter((d) => d.isDirectory())) {
    const file = join(FEATURES, feature.name, "checks.md");
    if (!existsSync(file)) continue;
    for (const check of checksOf(readFileSync(file, "utf8")))
      for (const s of check.selectors) selectors.push({ feature: feature.name, check: check.id, superseded: check.superseded, ...s });
  }
  const cache = new Map();
  const orphans = [];
  let superseded = 0;
  for (const s of selectors) {
    if (s.superseded) {
      superseded++;
      continue;
    }
    const path = join(ROOT, s.file);
    if (!cache.has(path)) cache.set(path, existsSync(path) ? titlesOf(path) : []);
    let pattern;
    try {
      pattern = new RegExp(s.name);
    } catch {
      pattern = null;
    }
    if (!pattern || !cache.get(path).some((t) => pattern.test(t))) orphans.push(s);
  }
  return { selectors: selectors.length, superseded, orphans };
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const result = scan();
  if (process.argv.includes("--json")) console.log(JSON.stringify(result));
  else {
    for (const o of result.orphans) console.log(`órfão ${o.feature} ${o.check}: ${o.file} -t "${o.name}"`);
    console.log(`proof-check: ${result.selectors} seletores, ${result.superseded} de checks Superseded, ${result.orphans.length} órfãos`);
  }
  process.exit(result.orphans.length ? 1 : 0);
}
