#!/usr/bin/env node
/**
 * Selftest of door 1 (ajustes-audio C4): with an 800 px tall element in the squad screen the layout
 * check exits 1 naming `squad`; after that run and after a normal one, the preview port is free.
 */
import { spawnSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { PREVIEW_PORT, portFree } from "./layout-check.mjs";

const script = join(dirname(fileURLToPath(import.meta.url)), "layout-check.mjs");
const problems = [];

function run(args) {
  console.log(`\n$ node scripts/layout-check.mjs ${args.join(" ")}`);
  const r = spawnSync(process.execPath, [script, ...args], { encoding: "utf8", stdio: ["ignore", "pipe", "inherit"] });
  process.stdout.write(r.stdout);
  return r;
}

const broken = run(["--inject=squad"]);
if (broken.status !== 1) problems.push(`com o elemento injetado, saiu com ${broken.status} em vez de 1`);
if (!/^layout: FALHA em .*\bsquad\b/m.test(broken.stdout)) problems.push("com o elemento injetado, a falha não nomeia squad");
if (!(await portFree())) problems.push(`porta ${PREVIEW_PORT} ocupada depois da execução com falha`);

const normal = run(["--no-build"]);
console.log(`(execução normal saiu com ${normal.status})`);
if (!(await portFree())) problems.push(`porta ${PREVIEW_PORT} ocupada depois da execução normal`);

if (problems.length) {
  console.log(`\nselftest: FALHA\n- ${problems.join("\n- ")}`);
  process.exit(1);
}
console.log(`\nselftest: ok (falha nomeia squad; porta ${PREVIEW_PORT} livre depois das duas execuções)`);
