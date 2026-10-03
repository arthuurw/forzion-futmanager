# Jogar offline e instalar verification

**Verdict**: PASS
**Profile**: light
**Diff range**: 4f84454..184db13 (plan, checks and AD-027 in 683c5c7; service worker in f0f0dd3; manifest, icons and «Sobre» in 7373bb9; `check:offline` and the layout change in 184db13); proofs run at HEAD 184db13
**Round**: 1 - full
**Verifier**: independent sub-agent (author != verifier)

All 11 checks are proven with located evidence. The 8 named Vitest proofs passed at 184db13 in one invocation, each with its own ✓ line. `npm run check:offline` exited 0 and printed «instalável: sem erros» and «offline: o jogo abre e joga sem rede». `npm run check:layout` exited 0 with «layout: as 21 telas cabem em 400 × 700 px». `tsc`, `lint`, `build` and `check:dist` are clean.

I also ran the HEAD tests against the pre-feature code at 4f84454. All 8 proofs fail there:

- C8 fails on a real assertion (`display` is still `browser`).
- The other seven fail because `src/pwa/build.ts` and `src/pwa/register.ts` do not exist yet. I accept this as pre-feature evidence, because the function each check names does not exist there.

The HEAD `offline-check.mjs` also fails on the base build, at its first step (`timeout: service worker no controle`).

The full suite had 2 failures, and neither comes from this feature:

- `provas dos checks existem` lists 15 orphans. All of them belong to the untracked `.specs/features/noticias/checks.md`, which another agent is writing at the same time.
- `fim da rodada ao vivo grava e mostra resultados` hit a 30 s timeout. A rerun of that file passed 21/21.

The findings below are all minor. The main one is that `ignoreVary`, the fix found mid-build, is proven only by `check:offline`. The vm fake ignores the option.

## Binding sources

None. The plan's `## Sources` lists the author's request and some STATE ADs as context, and marks nothing as binding. Step 1 runs only under `ui`, and this feature is `light`.

## Proof run

Verified at `184db13`. Before the run, I recorded `git status --porcelain -- . ':!.specs/features/noticias'`, and it was empty. After the last step it was still empty, apart from this report. The only file I wrote in the real tree is this report.

The pre-feature comparison ran in a separate scratch worktree with its own `npm ci` and no junction. I removed the worktree afterwards with `git worktree remove --force`. `git worktree list` then showed only the main tree, and the real `node_modules` was intact: 151 entries, with `node_modules/.bin/vitest` present. The two Chrome checks ran one after the other. After the run, nothing was listening on port 4179.

1. **Named proofs, one invocation.** I ran `npx vitest run src/pwa/build.test.ts src/pwa/register.test.ts src/pwa/sw.test.ts src/launch.test.ts src/ui/About.test.tsx -t "lista do cache|versão do cache|registro do service worker|instala o cache da versão|ativa e apaga as versões velhas|responde da rede ou do cache|manifesto instalável|seção instalar" --reporter=verbose`. It exited 0 over 5 files: **8 passed**, 12 skipped. There are 8 names, and each matched exactly one test. Each test printed its own ✓ line:
   - `src/pwa/build.test.ts > service worker no build (offline-instalar) > lista do cache` ✓ (C1)
   - `... > versão do cache` ✓ (C2)
   - `src/pwa/register.test.ts > registro (offline-instalar) > registro do service worker` ✓ (C3)
   - `src/pwa/sw.test.ts > service worker gerado (offline-instalar) > instala o cache da versão` ✓ (C4)
   - `... > ativa e apaga as versões velhas` ✓ (C5)
   - `... > responde da rede ou do cache` ✓ (C6)
   - `src/launch.test.ts > instalar (offline-instalar) > manifesto instalável` ✓ (C8)
   - `src/ui/About.test.tsx > instalar em Sobre (offline-instalar) > seção instalar` ✓ (C10)
2. **Existence and diff membership.** I located each test:
   - `src/pwa/build.test.ts:28` and `:47`
   - `src/pwa/register.test.ts:6`
   - `src/pwa/sw.test.ts:55`, `:63` and `:71`
   - `src/launch.test.ts:187`
   - `src/ui/About.test.tsx:83`

   The three `src/pwa/*.test.ts` files are new in f0f0dd3. `launch.test.ts` (+20) and `About.test.tsx` (+56) changed in 7373bb9. Every proof sits in a describe block tagged `(offline-instalar)`, and every one is added in this range. No proof resolves to a test the feature did not touch.
3. **`npm run check:offline` (C7, C9).** Exit 0. The script built the app (`tsc` ×2 and `vite build`), then printed these lines:
   - `ok    service worker controla a página e o cache está pronto`
   - `ok    instalável: sem erros`
   - `ok    jogo novo gravado com o servidor no ar`
   - `ok    servidor derrubado`
   - `ok    sem rede: título com «Continuar»`
   - `ok    sem rede: elenco aberto`
   - `ok    sem rede: rodada jogada até a tela da rodada`

   The last line was `offline: o jogo abre e joga sem rede`. The generated `dist/sw.js` has `CACHE = PREFIX + "20ebf87e8da8"` and a 14-entry `PRECACHE`. That list includes `./` and `./index.html`, the hashed JS and CSS, the 5 fonts and the icons. It has no `sw.js`, no `og-image.png` and no `audio/`.
4. **`npm run check:layout` (C11).** I ran it after `check:offline` had finished, never alongside it. Exit 0 at 400 × 700 with seed 1. The `about` line was `ok    about      scrollHeight 700 scrollWidth 400 · ... · Instalar «Instalar o jogo» 122,298-278,333`. The run printed 22 `ok` lines: the 21 required screens plus `roundOffer`. The last line was `layout: as 21 telas cabem em 400 × 700 px`.
5. **Full suite**, `npx vitest run`: exit 1, 52 files, **672 passed, 2 failed** (674), 249 s.
   - `src/launch.test.ts > guardas e metadados (correcoes-validacao) > provas dos checks existem` failed with 15 orphans. I ran `node scripts/proof-check.mjs --json`: 741 selectors, 15 orphans, and every orphan has `feature: "noticias"`. They are the proofs of the next feature's untracked `checks.md`, which its tests do not exist for yet. None of the orphans is from offline-instalar (Finding 5).
   - `src/app.test.tsx > fluxo do app > fim da rodada ao vivo grava e mostra resultados` failed with `Test timed out in 30000ms`. I reran the file (`npx vitest run src/app.test.tsx`): **21 passed**, 0 failed. That test does not import `main.tsx` or `src/pwa`.
6. **Types, lint, build.**
   - `npx tsc -b --noEmit`: exit 0.
   - `npm run lint`: exit 0.
   - `npm run build`: exit 0.
   - `npm run check:dist`: exit 0, `dist-check: 4 files, no root-relative reference`.
7. **Pre-feature comparison at 4f84454 (L-029/L-030).** I created a scratch worktree at `4f84454` and copied in the five HEAD test files plus `scripts/offline-check.mjs` and `scripts/layout-check.mjs`. After `npm ci`, I ran the same named batch: **5 files failed, 1 test failed, 0 passed**.
   - **Missing modules.** `build.test.ts`, `sw.test.ts` (`Cannot find module './build'`), `register.test.ts` (`'./register'`) and `About.test.tsx` (`Failed to resolve import "../pwa/register"`) fail at import. That covers C1-C6 and C10. I accept this as pre-feature evidence: the module each check names does not exist there.
   - **Real assertion.** C8 fails with `expected { name: 'Forzion FutManager', …(9) } to match object { display: 'standalone', …(3) }` at `src/launch.test.ts:191`.
   - **Chrome check.** `npm run build` fails in the scratch, because `tsc` cannot find the new modules for the copied tests. So I built the base with `npx vite build`, which produced no `sw.js`, and ran `node scripts/offline-check.mjs --no-build`. It exited 1 with `FALHA timeout: service worker no controle`. C7 therefore fails there at its first step. C9 is never reached on the base, so this run does not show C9 failing on its own.
8. **`Vary: Origin`.** I confirmed that the `Vary` behaviour the handoff describes is real. I started `vite preview` on 4179 and requested `curl -H "Origin: ..." /assets/index-DXwbc1nO.js`. The response was `HTTP/1.1 200 OK` with `Vary: Origin`. `dist/index.html` loads `<script type="module" crossorigin ...>`. I stopped the server afterwards, and nothing was left listening on 4179.

## Checks

Verified at `184db13`.

| Check | Claim | Proof run | Evidence | Result |
| --- | --- | --- | --- | --- |
| C1 | `precacheList` over the 10-file fixture returns the 8 paths in order, without `sw.js`, `og-image.png` or `audio/` | «lista do cache» ✓; fails on 4f84454 (missing module) | `src/pwa/build.test.ts:32-41` `expect(precacheList(dir)).toEqual(["./", "./assets/app-x1.css", "./assets/app-x1.js", "./favicon.svg", "./fonts/exo.woff2", "./icon-192.png", "./index.html", "./manifest.webmanifest"])`, with the fixture at `:9-20` holding all 10 named files. Code: `src/pwa/build.ts:10` `skipped`, `:19` `return ["./", ...]`. The real `dist/sw.js` list matches (Proof run item 3) | PASS |
| C2 | `cacheVersion` returns 12 hex digits; the same folder gives the same version; 1 byte changed in `assets/app-x1.js` gives another; the generated `sw.js` holds `forzion-futmanager-<version>` and the list | «versão do cache» ✓; fails on 4f84454 | `src/pwa/build.test.ts:53` `toMatch(/^[0-9a-f]{12}$/)`; `:54` `expect(cacheVersion(dir, list)).toBe(v)`; `:55` rewrites the file `app-x1` → `app-x2` (1 byte); `:58` `expect(changed).not.toBe(v)`; `:60` `` toContain(`const PREFIX = "forzion-futmanager-";`) ``; `:61` `` toContain(`const CACHE = PREFIX + "${v}";`) ``; `:62` `` toContain(`const PRECACHE = ${JSON.stringify(list)};`) ``. The cache name is asserted as two literals that compose it (Finding 6) | PASS |
| C3 | `registerServiceWorker` table: production with `serviceWorker` → one `register("./sw.js", { scope: "./" })`; not production → none; no `serviceWorker` → none, no error; `register` rejecting → resolves, no `console.error` | «registro do service worker» ✓; fails on 4f84454 | `src/pwa/register.test.ts:10` `expect(register).toHaveBeenCalledTimes(1)`; `:11` `toHaveBeenCalledWith("./sw.js", { scope: "./" })`; `:16` `expect(notProd).not.toHaveBeenCalled()`; `:18` `navigator: {}` → `resolves.toBeUndefined()`; `:22` failing → `resolves.toBeUndefined()`; `:23` `expect(failing).toHaveBeenCalledTimes(1)` (precondition, L-031); `:24` `expect(error).not.toHaveBeenCalled()`. Wiring: `src/main.tsx:9` `registerServiceWorker({ production: import.meta.env.PROD, navigator })` | PASS |
| C4 | the generated `sw.js` in a vm with fake `self`/`caches`/`fetch`: `install` stores the 3 listed paths in `forzion-futmanager-abc123def456` | «instala o cache da versão» ✓; fails on 4f84454 | `src/pwa/sw.test.ts:59` `expect([...w.stores.keys()]).toEqual([CACHE])` (`CACHE` = `` `forzion-futmanager-${VERSION}` ``, `VERSION = "abc123def456"`, `:6-7`); `:60` `expect([...w.stores.get(CACHE)!.keys()].sort()).toEqual(LIST.map((u) => abs(u)).sort())` with `LIST` the 3 paths (`:8`). The source runs through `runInNewContext(serviceWorkerSource(VERSION, LIST), ...)` at `:36` | PASS |
| C5 | `activate` with `forzion-futmanager-abc123def456`, `forzion-futmanager-velho000000` and `outro-site` deletes only the old version and calls `clients.claim()` | «ativa e apaga as versões velhas» ✓; fails on 4f84454 | `src/pwa/sw.test.ts:65` seeds the three caches; `:67` `expect([...w.stores.keys()].sort()).toEqual([CACHE, "outro-site"].sort())`; `:68` `expect(w.claim).toHaveBeenCalledTimes(1)`. Code: `src/pwa/build.ts:52-53`. In Chrome, `check:offline` reaching `controller !== null` on the first visit, with no reload, also exercises `claim()` (`scripts/offline-check.mjs:41`, `:84`) | PASS |
| C6 | `fetch` table: navigation online → network; navigation offline → cached `./index.html`; `./assets/app.js` cached → cache, no network call; music not cached → network; `POST` and another origin → no `respondWith` | «responde da rede ou do cache» ✓; fails on 4f84454 | `src/pwa/sw.test.ts:78` «navegação com rede» `toEqual(response("network", BASE))`; `:79` «navegação sem rede» `toEqual(response("cache", abs("./index.html")))`; `:82` «arquivo no cache» `toEqual(response("cache", asset))`; `:83` fetch calls `not.toContain(asset)`; `:86` «fora do cache» `toEqual(response("network", music))`; `:88` «POST» `toBeNull()`; `:89` «outro site» `toBeNull()`. The fake `match` at `:24` ignores its options, so `ignoreVary` is not asserted here (Finding 1) | PASS |
| C7 | `check:offline` exits 0: controlled by the SW and a new game saved with the server up; with the port free, reload shows the title with «Continuar», «Continuar» opens the squad, «Jogar rodada» + «Pular para o fim» reach the round screen, no error screen; last line «offline: o jogo abre e joga sem rede» | `npm run check:offline` exit 0 (Proof run item 3); fails on the 4f84454 build (`service worker no controle`) | `scripts/offline-check.mjs:84` `wait("service worker no controle", CONTROLLED, 30000)` with `:41` `navigator.serviceWorker.controller !== null && caches.keys()...startsWith("forzion-futmanager-")`; `:96` `wait("jogo gravado", SAVED)` (slot-1 with `userClubId`, `:30-40`); `:101` `until("servidor fora do ar", () => portFree(), 10000)`; `:105` `enabledJs("Continuar")`; `:108` `enabledJs("Jogar rodada")`; `:111-113` «Pular para o fim» then `h1` starting with `Rodada` and «Escalação»; `:114` `if (await js(ERROR_SCREEN)) throw` («Algo deu errado», `:28`); `:117-118` any failure → `FALHA` → exit 1 (`:134`); `:135` `console.log("offline: o jogo abre e joga sem rede")` | PASS |
| C8 | manifest: `display: "standalone"`, `id`/`start_url`/`scope` `"./"`, icons `icon-192.png` («192x192», `image/png`) and `icon-512.png` («512x512»); the PNGs' IHDR is 192 × 192 and 512 × 512 | «manifesto instalável» ✓; fails on 4f84454 at `:191` (real assertion) | `src/launch.test.ts:191` `expect(manifest).toMatchObject({ display: "standalone", id: "./", start_url: "./", scope: "./" })`; `:192` `toContainEqual({ src: "icon-192.png", sizes: "192x192", type: "image/png" })`; `:193` the same for `icon-512.png`, «512x512»; `:197-198` PNG signature and `"IHDR"`; `:201` `expect(size("icon-192.png")).toEqual([192, 192])`; `:202` `expect(size("icon-512.png")).toEqual([512, 512])` | PASS |
| C9 | `check:offline` prints «instalável: sem erros» because `Page.getInstallabilityErrors` is empty, and exits 1 on any error | `npm run check:offline` exit 0, `ok    instalável: sem erros` printed; on 4f84454 the run stops before this step | `scripts/offline-check.mjs:88` `const { installabilityErrors } = await page.send("Page.getInstallabilityErrors")`; `:89` `if (installabilityErrors.length) throw new Error(...)`, which leads to `return false` (`:124`) and then `process.exit(1)` (`:134`); `:90` `console.log("ok    instalável: sem erros")` | PASS |
| C10 | «Instalar» section, 4 states: invitation → «Instalar o jogo», tap calls `prompt()` once and the button goes; `display-mode: standalone` → «O jogo está instalado neste aparelho.», no button; after `appinstalled` → same text; none → the exact menu text, no button | «seção instalar» ✓; fails on 4f84454 (missing module) | `src/ui/About.test.tsx:67` `MENU` and `:68` `INSTALLED`, both the exact AC 11/12 texts; `:87` heading «Instalar» present (precondition, L-031); `:88` `getByText(MENU)`; `:89` no «Instalar o jogo»; `:97` `user.click(getByRole("button", { name: "Instalar o jogo" }))` after the invitation; `:98` `expect(e.prompt).toHaveBeenCalledTimes(1)`; `:99` button gone; `:105` `getByText(INSTALLED)` after `appinstalled`; `:106` no button; `:114` `getByText(INSTALLED)` with `matchMedia` stubbed to `(display-mode: standalone)` and an invitation dispatched (`:111-113`); `:115` no button. Code: `src/ui/About.tsx:28-35` | PASS |
| C11 | `check:layout` seed 1 exits 0; `about` measured with what follows the «Instalar» heading inside the window (headless Chrome invites, so it is the button); missing or outside → failure; last line «layout: as 21 telas cabem em 400 × 700 px» | `npm run check:layout` exit 0 (Proof run item 4) | `scripts/layout-check.mjs:122` `install = [...querySelectorAll(".about h3")].find((h) => h.textContent.trim() === "Instalar")?.nextElementSibling ?? null`; `:186-188` `if (screen === "about") { if (!m.install) out.push("sem a seção «Instalar»"); else if (!within(m.install)) ... }`, with `within` at `:156` (0..400 × 0..700, non-empty); `:162` `scrollHeight > HEIGHT` fails (AC 13 no scroll); `:463` `measure("about")`; `:539` `about` in the required list; `:558` the final line. Run: `Instalar «Instalar o jogo» 122,298-278,333`. The menu-text state has no automated measurement (Finding 3) | PASS |

## Swept existing

Verified at `184db13`.

No `Swept` row in `checks.md` resolves to existing code. Each row cites a new check (C2, C3, C5, C6, C7 or C10) or says `n/a`, so there is no pre-existing constraint to re-read.

I did read one row against the code. It is the `concurrency` row: «C5 (a aba aberta segue na versão com que abriu; o SW novo só ativa depois - door 2)». The behaviour is present by omission: `grep -rn skipWaiting src scripts` finds nothing, and the `install` handler at `src/pwa/build.ts:44-46` only fills the cache. But C5 does not assert it (Finding 2).

## Coverage

Not a gate step under `light`. I did not recompute the coverage rows. I read each member against the assertions cited above, and every set in `checks.md`'s Coverage table has an assertion for each member.

## Faults injected

Not run under `light`. The only discrimination evidence is the pre-feature run (Proof run item 7): all 8 Vitest proofs and `check:offline` fail on 4f84454.

## Findings

All non-blocking. Each check has a located assertion that targets its check-defined value.

**Level and sampling judgment, AC 4-7.** Together, the vm tests and the Chrome check prove AC 4-7, with the gaps listed below.

- **AC 4 (install).** Two levels. The vm test (C4) sees all 3 paths stored. In Chrome, the offline reload can only succeed if `index.html` and the hashed JS and CSS were actually cached.
- **AC 5 (activate).** Two levels for `clients.claim()`: the vm test (C5) asserts it, and Chrome reaches `controller !== null` on the first visit with no reload. The deletion of other versions is proven in the vm only (Finding 4).
- **AC 6 (fetch).**
  - Offline navigation fallback and cache-first assets: two levels, vm (C6) and Chrome.
  - Network-first navigation online, music to the network, and the `POST` / other-origin pass-through: vm only. With the server up, Chrome cannot tell network from cache.
- **AC 7.** Chrome only, as it should be.

1. **Minor, `ignoreVary` is proven only by `check:offline`, and only because of the preview server.** C6's fake cache `match: (r) => Promise.resolve(store.get(abs(r)))` at `src/pwa/sw.test.ts:24` ignores the options argument. So deleting `{ ignoreVary: true }` at `src/pwa/build.ts:76` would leave C1-C6 green. The only proof that would catch it is C7.
   - C7 catches it only because `vite preview` answers `Vary: Origin` to the `crossorigin` module script. I confirmed that header (Proof run item 8), and the handoff records that C7 found the bug this way.
   - A host that does not send `Vary: Origin` would not exercise the option at all. GitHub Pages is the deploy target, and I did not check what it sends.
   - A one-row vm case would pin the option at the unit level: a fake `match` that misses when `ignoreVary` is absent and the stored entry carries a `Vary` header.
2. **Minor, door 2's «sem `skipWaiting`» has no assertion.** The plan's door 2 rejects `skipWaiting`, and `checks.md`'s Swept `concurrency` row cites C5 for «o SW novo só ativa depois». But C5 asserts only the cache deletions and `claim()` (`src/pwa/sw.test.ts:67-68`). The code has no `skipWaiting` today (`src/pwa/build.ts:44-46`), so the behaviour is correct, but nothing pins it. One assertion would do: for example, `expect(source).not.toContain("skipWaiting")` in C2, or a vm `self.skipWaiting` spy that must stay uncalled in C4.
3. **Minor, sampling gap on AC 13: the menu-text state of «Instalar» is not measured automatically.** C11 was reworded mid-build. Headless Chrome now gets the invitation, so `check:layout` measures only the button state (`122,298-278,333`). The longer AC 12 text is what Safari and Firefox users see. According to the handoff, it was measured once by hand at `29,295-371,329` with `About` forced into that state, and the code was then restored. That is a recorded self-report, not a reproducible proof. A future copy change to the text would not be caught.
4. **Minor, AC 5's cache deletion has only unit-level proof.** `check:offline` runs a single build version, so no real browser ever replaces an old `forzion-futmanager-*` cache. That leaves the path from an old cache to a new SW untested at the browser level, and so is the claim that the open tab stays on its version until every tab closes. Both are proven only at the vm level (C5) or not at all (Finding 2).
5. **Minor, gate noise from concurrent work.** The full suite's `provas dos checks existem` (`src/launch.test.ts:128`) fails while `.specs/features/noticias/checks.md` is untracked and names tests that do not exist yet. All 15 orphans are `noticias`. This is not a defect of this feature, but it will stay red until noticias lands or its checks file is removed. The second failure is the `src/app.test.tsx` «fim da rodada ao vivo» 30 s timeout, which passed on rerun (21/21). It is unrelated, and I could not find it recorded as a known flake in the specs.
6. **Cosmetic, C2 precision.** AC 2 hashes «os caminhos e o conteúdo». The test changes only content (`src/pwa/build.test.ts:55`), so the path part of the hash (`src/pwa/build.ts:28`) has no assertion. The cache name is asserted as the two literals `PREFIX` and `CACHE = PREFIX + "<v>"` (`:60-61`) rather than the composed string. The composition is plain JS, so this is wording, not a gap.
7. **Cosmetic, AC 3's dev and test half is read in code, not proven end to end.** C3 proves `production: false` makes no call. The wiring `import.meta.env.PROD` at `src/main.tsx:9` is not tested. It is a one-liner, and the tests never import `main.tsx`.
8. **Cosmetic, build warning.** Every Vite run now prints `import "./src/pwa/build" without a file extension (vite.config.ts:3:37)`. That is the warning for `configLoader: 'native'`, which is planned to become Vite's default. It does nothing today. Under the native loader, the extensionless import would need a `.ts` extension.

## Gate

- Named-proof batch: 8 passed, 0 failed, 5 files (8 names). Every proof belongs to this feature's diff.
- Pre-feature batch at 4f84454 (scratch worktree, HEAD tests): 5 files failed, and 0 proofs passed. C8 failed on a real assertion. C1-C6 and C10 failed because their modules are missing. The HEAD `offline-check.mjs` on the base build exited 1 at `service worker no controle`.
- `npm run check:offline`: exit 0, `ok    instalável: sem erros`, `offline: o jogo abre e joga sem rede`.
- `npm run check:layout`: exit 0, `layout: as 21 telas cabem em 400 × 700 px`.
- `npx vitest run`: 672 passed, 2 failed. One is `provas dos checks existem`, with 15 orphans, all from the concurrent `noticias` checks (Finding 5). The other is the `app.test.tsx` timeout; its rerun gave 21 passed, 0 failed.
- `npx tsc -b --noEmit`: exit 0. `npm run lint`: exit 0. `npm run build`: exit 0. `npm run check:dist`: exit 0.
