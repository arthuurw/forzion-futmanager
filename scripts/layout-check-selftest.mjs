#!/usr/bin/env node
/**
 * Selftest of door 1 (ajustes-audio C4): with an 800 px tall element in the squad screen the layout
 * check exits 1 naming `squad`; after that run and after a normal one, the preview port is free.
 *
 * Correcoes-validacao:
 * - AC 60: the broken run plays seed 3 (`--seed=3`) and the normal one the default seed 1, each
 *   printing `seed <n>`;
 * - AC 64: the check waits up to 20 s for the animations, and neither run leaves its
 *   `layout-check-*` Chrome profile in the temp directory;
 * - AC 65: a normal run that does not exit 0 fails the selftest. `--fail-normal` injects that
 *   failure (the normal run gets the tall element too); without the flag, the selftest ends by
 *   running itself with it and requires a non-zero exit.
 *
 * The broken run also spreads `.round-body` over four columns at 1366 × 768 px (the news as a
 * fourth column): its failure must name `roundDesktop` and `liveDesktop` too.
 */
import { spawnSync } from "node:child_process";
import { readdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { ANIMATION_TIMEOUT_MS, PREVIEW_PORT, PROFILE_PREFIX, portFree } from "./layout-check.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const script = join(here, "layout-check.mjs");
const failNormal = process.argv.includes("--fail-normal");
const problems = [];

function run(file, args) {
  console.log(`\n$ node scripts/${file === script ? "layout-check.mjs" : "layout-check-selftest.mjs"} ${args.join(" ")}`);
  const r = spawnSync(process.execPath, [file, ...args], { encoding: "utf8", stdio: ["ignore", "pipe", "inherit"] });
  process.stdout.write(r.stdout);
  return r;
}

const profiles = () => new Set(readdirSync(tmpdir()).filter((name) => name.startsWith(PROFILE_PREFIX)));
const leftBehind = (before) => [...profiles()].filter((name) => !before.has(name));

if (ANIMATION_TIMEOUT_MS !== 20000) problems.push(`espera das animações de ${ANIMATION_TIMEOUT_MS} ms em vez de 20000`);

let before = profiles();
const broken = run(script, ["--inject=squad,roundDesktop,liveDesktop", "--seed=3"]);
if (broken.status !== 1) problems.push(`com o elemento injetado, saiu com ${broken.status} em vez de 1`);
if (!/^layout: FALHA em .*\bsquad\b/m.test(broken.stdout)) problems.push("com o elemento injetado, a falha não nomeia squad");
for (const screen of ["roundDesktop", "liveDesktop"]) {
  if (!new RegExp(`^layout: FALHA em .*\\b${screen}\\b`, "m").test(broken.stdout)) problems.push(`com quatro colunas em 1366 × 768, a falha não nomeia ${screen}`);
}
if (!/^seed 3$/m.test(broken.stdout)) problems.push("com --seed=3, não imprimiu «seed 3»");
if (!(await portFree())) problems.push(`porta ${PREVIEW_PORT} ocupada depois da execução com falha`);
for (const name of leftBehind(before)) problems.push(`perfil ${name} ficou em ${tmpdir()} depois da execução com falha`);

before = profiles();
const normal = run(script, failNormal ? ["--no-build", "--inject=squad"] : ["--no-build"]);
console.log(`(execução normal saiu com ${normal.status})`);
if (normal.status !== 0) problems.push(`a execução normal saiu com ${normal.status} em vez de 0`);
if (!/^seed 1$/m.test(normal.stdout)) problems.push("sem --seed, não imprimiu «seed 1»");
if (!(await portFree())) problems.push(`porta ${PREVIEW_PORT} ocupada depois da execução normal`);
for (const name of leftBehind(before)) problems.push(`perfil ${name} ficou em ${tmpdir()} depois da execução normal`);

if (!failNormal && problems.length === 0) {
  // AC 65: the same selftest with the normal run forced to fail must fail.
  const forced = run(join(here, "layout-check-selftest.mjs"), ["--fail-normal"]);
  if (forced.status === 0) problems.push("com a execução normal forçada a falhar (--fail-normal), o selftest saiu com 0");
  else console.log(`(selftest com --fail-normal saiu com ${forced.status}, como deve)`);
}

if (problems.length) {
  console.log(`\nselftest: FALHA\n- ${problems.join("\n- ")}`);
  process.exit(1);
}
console.log(
  `\nselftest: ok (falha nomeia squad, roundDesktop e liveDesktop; seeds 3 e 1; espera de ${ANIMATION_TIMEOUT_MS} ms; porta ${PREVIEW_PORT} livre e nenhum perfil deixado depois das duas execuções; a falha da execução normal derruba o selftest)`,
);
