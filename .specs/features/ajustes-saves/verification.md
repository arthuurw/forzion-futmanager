# Ajustes dos saves verification

**Verdict**: PASS
**Profile**: light
**Diff range**: a3a7052..dfeda92 (checks in 3e703b2, fix and tests in 3897bf1, layout script in dfeda92); proofs run at HEAD dfeda92
**Round**: 1 - full
**Verifier**: independent sub-agent (author != verifier)

All 8 checks are proven with located evidence, and every named proof passed at dfeda92. The eight points in the `## Intent` (the varios-saves round-1 Findings 1-8) are closed by this diff. C7 is the only behaviour change, and its proof fails on the pre-feature code a3a7052 at `src/ui/Home.test.tsx:429`. The other nine named proofs pass on a3a7052. For C1, C5 and C6 that is what the checks declare under L-029. For C2, C3 and C4 the declaration is imprecise, because they also pin behaviour that already existed (Finding 1). Two cheap faults, injected in a scratch worktree, show that C1 and C3 now catch the regressions their findings named. In the same scratch, the new `homeSave` guard fired when I changed the name it looks for (C8). `check:layout` passed. The full suite had one timeout, the known «oferta inválida» flake in `Market.test.tsx`, and a rerun of that file was green (Finding 2).

## Binding sources

None. There is no `plan.md`. The `## Intent` in `checks.md` is the spec. Step 1 runs only under `ui`, and this feature is `light`.

## Proof run

Verified at `dfeda92`. `git status --porcelain` of the real tree was empty before the run and after every step. All pre-fix and mutation runs happened in a separate scratch worktree (with its own `npm ci`, no junction), and I removed it afterwards with `git worktree remove --force`. The real `node_modules` was intact after removal.

1. **Named proofs, one invocation**: `npx vitest run src/store.test.ts src/ui/Saves.test.tsx src/ui/Home.test.tsx -t "abertura sem jogo legível escolhe o menor vazio|fim da data grava só no espaço ativo|resumo com a liga do clube|falha real de leitura pede confirmação com foco|menu principal mantém o espaço|arquivo inválido mostra o aviso e mantém o save|JSON que não é arquivo de save mostra o aviso e mantém o save|versão não suportada mostra o aviso|arquivo corrompido mostra o aviso e mantém o save|aviso de incompatível só sem jogo legível" --reporter=verbose` exited 0. It ran 3 files: **10 passed**, 66 skipped. Each test printed its own ✓ line:
   - `src/store.test.ts > vários espaços (varios-saves) > abertura sem jogo legível escolhe o menor vazio` ✓ (C1)
   - `src/store.test.ts > vários espaços (varios-saves) > fim da data grava só no espaço ativo` ✓ (C2)
   - `src/ui/Saves.test.tsx > tela Jogos salvos (varios-saves) > resumo com a liga do clube` ✓ (C3)
   - `src/ui/Home.test.tsx > confirmação com foco (correcoes-validacao) > falha real de leitura pede confirmação com foco` ✓ (C4)
   - `src/ui/Saves.test.tsx > novo jogo nos espaços (varios-saves) > menu principal mantém o espaço` ✓ (C5)
   - `src/ui/Home.test.tsx > exportar e importar (lancamento) > arquivo inválido mostra o aviso e mantém o save` ✓ (C6)
   - `... > JSON que não é arquivo de save mostra o aviso e mantém o save` ✓ (C6)
   - `... > versão não suportada mostra o aviso` ✓ (C6)
   - `... > arquivo corrompido mostra o aviso e mantém o save` ✓ (C6)
   - `src/ui/Home.test.tsx > ajustes dos saves (ajustes-saves) > aviso de incompatível só sem jogo legível` ✓ (C7)
2. **Existence** (`rg -n`): `src/store.test.ts:991` and `:1053`; `src/ui/Saves.test.tsx:78` and `:224`; `src/ui/Home.test.tsx:244`, `:248`, `:252`, `:256`, `:349` and `:420`. The only other hit for any of these names is `src/engine/saveFile.test.ts:84` («JSON que não é arquivo de save»), an engine test that the filter did not load because the file was not passed. Every proof is in this diff. C1, C2, C3, C4 and C7 are new tests added in `3897bf1`. The proofs for C5 (`Saves.test.tsx:242`) and C6 (the `refused` helper at `Home.test.tsx:232-241`) were edited there.
3. **Pre-fix comparison at a3a7052 (L-029)**: I created a scratch worktree at `a3a7052`, checked out the three test files from `dfeda92` and ran the same 10-name batch. **9 passed and 1 failed.**
   - **C7 FAILS there**: `Error: com jogo legível: expect(element).not.toBeInTheDocument()` at `src/ui/Home.test.tsx:429:64`. The pre-fix title shows «Jogo salvo incompatível (versão 9)» even though «Continuar» opens slot 1. That is the behaviour in Intent 8.
   - **C1, C5 and the four C6 proofs pass there**, which `checks.md`'s «Lições aplicadas» declares («nos casos 1, 5 e 6, prende um comportamento que já existe»).
   - **C2, C3 and C4 also pass there.** The declaration does not list them, but Intent points 2, 3 and 4 were weak tests over code that was already correct, so a pass is the correct outcome. See Finding 1.
4. **Discrimination of the pinning proofs (supplementary; not required under `light`)**: I moved the scratch to `dfeda92` and made two edits in `src/store.ts`. First, `okView` was changed to use `game.leagues[0]`, which is the regression L-018 and Intent 3 describe. Second, the `activeSlotOf` empty-slot fallback was changed to `best?.slot ?? 1`, which is the regression Intent 1 describes. `-t "abertura sem jogo legível escolhe o menor vazio|resumo com a liga do clube"` then gave **2 failed**: C1 at `src/store.test.ts:1005:51` (`só o 1 incompatível: expected 1 to be 2`) and C3 at `src/ui/Saves.test.tsx:88:42` (`liga 1: ... toHaveTextContent()`). I reverted both edits with `git checkout -- src/store.ts`.
5. **C8 guard fires**: In the same scratch at `dfeda92`, I changed the guard's lookup at `scripts/layout-check.mjs:167` to `"button «Jogos guardados»"`. `npm run check:layout` then exited 1 with `FALHA homeSave   scrollHeight 700 scrollWidth 400 · Música 272,12-325,33 · Efeitos 329,12-384,33 · sem o botão «Jogos salvos»`, and the last line was `layout: FALHA em homeSave`. I reverted the edit and then removed the scratch worktree. No Vite or Chrome port was left listening.
6. **Full suite**, `npx vitest run`: exit 1, 49 files, **640 passed, 1 failed** (641), 192 s. The failure was `src/ui/Market.test.tsx > oferta digitada (correcoes-validacao) > oferta inválida`, a timeout at 35.8 s (the known flake). I reran the file once (`npx vitest run src/ui/Market.test.tsx`): **18 passed**, 0 failed, 43 s. Every test in `src/store.test.ts`, `src/ui/Saves.test.tsx` and `src/ui/Home.test.tsx` passed. See Finding 2.
7. **Layout**, `npm run check:layout`: exit 0 at 400 × 700 with seed 1. The output included `ok    homeSave   scrollHeight 700 scrollWidth 400 · Música 272,12-325,33 · Efeitos 329,12-384,33`, and the last line was `layout: as 19 telas cabem em 400 × 700 px`. It printed 20 `ok` lines, which matches the `roundOffer` convention that `checks.md` declares out of scope.

## Checks

Verified at `dfeda92`.

| Check | Claim | Proof run | Evidence | Result |
| --- | --- | --- | --- | --- |
| C1 | opened from IndexedDB with no readable game, before any click: no «Continuar», and the active slot is the lowest empty one; table: only 1 unsupported -> 2, only 2 -> 1, 1 and 2 -> 3 | «abertura sem jogo legível escolhe o menor vazio» ✓; passes on a3a7052 (declared pinning); killed by the `activeSlotOf` fallback fault at `:1005` | `src/store.test.ts:994-996` table `[1] -> 2`, `[2] -> 1`, `[1, 2] -> 3`; `:1001` `put(n, { schemaVersion: 9 })`, `render(createElement(App))` (the app's own `init`); `:1004` `expect(screen.queryByRole("button", { name: "Continuar" }), name).not.toBeInTheDocument()`; `:1005` `expect(useGame.getState().activeSlot, name).toBe(slot)`. Code: `src/store.ts:75` | PASS |
| C2 | A in slot-1 and B in slot-2 (active), `Date.now()` = 1700000000000: the live date writes `pendingLive: true` to slot-2 at the start; after «Pular para o fim», slot-2 holds the club's league one round on, no `pendingLive`, `savedAt` 1700000000000; slot-1 unchanged, slot-3 absent | «fim da data grava só no espaço ativo» ✓; passes on a3a7052 (Finding 1) | `src/store.test.ts:1059` `activeSlot toBe(2)`; `:1068` `expect(await raw(2)).toMatchObject({ pendingLive: true })`; `skipToEnd` at `:1070` (the action behind «Pular para o fim», `src/ui/Live.tsx:417`); `:1072` `expect((await raw(2))?.pendingLive).toBeUndefined()`; `:1074` `expect(saved.savedAt).toBe(1700000000000)`; `:1075` `leagues[0]!.currentRound toBe(round + 1)` (B = `seededGame(9, 3)`, division 0, so `leagues[0]` is the club's league); `:1076` `expect(await raw(1)).toEqual(one)`; `:1077` `expect(await raw(3)).toBeUndefined()` | PASS |
| C3 | «Jogos salvos» row for a club outside the first league reads «<club> · <club's league> · Temporada <n>»; table `leagues[1]` and `leagues[2]`; `leagues[0]`'s name absent | «resumo com a liga do clube» ✓; passes on a3a7052 (Finding 1); killed by the `okView` -> `leagues[0]` fault at `:88` | `src/ui/Saves.test.tsx:79` `for (const division of [1, 2])` with `seededGameIn(division, 7, 2)` (the club is set from `leagues[division]`, `src/ui/test-utils.ts:33`); `:84` guards that the names differ; `:88` ``expect(row(1)).toHaveTextContent(`${clubName(game)} · ${game.leagues[division]!.name} · Temporada ${game.season}`)``; `:89` `expect(row(1)).not.toHaveTextContent(game.leagues[0]!.name)`. Code: `src/store.ts:64` | PASS |
| C4 | game in slot-1, the slot read genuinely failing in `init` (IndexedDB refusing to open): «Novo jogo» opens «Confirmar novo jogo» with «Isso apaga o jogo salvo. Continuar?» and focus on «Sim, apagar» | «falha real de leitura pede confirmação com foco» ✓; passes on a3a7052 (Finding 1) | `src/ui/Home.test.tsx:353-355` `failNextOpen()` (`indexedDB.open` throws, `:30-33`), `await useGame.getState().init()`, `expect(useGame.getState().loadFailed).toBe(true)`, so it is not set by hand; `:359` `expect(dialog).toHaveTextContent("Isso apaga o jogo salvo. Continuar?")`; `:360` `expect(document.activeElement).toBe(within(dialog).getByRole("button", { name: "Sim, apagar" }))` | PASS |
| C5 | varios-saves C22 case: slot-3 stays absent, besides slot-2 written and slot-1 unchanged | «menu principal mantém o espaço» ✓; passes on a3a7052 (declared pinning) | `src/ui/Saves.test.tsx:239` `expect((await raw(2))?.savedAt).toBe(1700000000000)`; `:240` `expect(await raw(1)).toEqual(at(a, 100))`; `:242` `expect(await raw(3)).toBeUndefined()` | PASS |
| C6 | the four refused imports start from the app opened from IndexedDB with a game in slot-1 (store read by `init`); after the refusal the same message, slot-1 unchanged, slot-2 and slot-3 absent | 4 proofs ✓; pass on a3a7052 (declared pinning) | `src/ui/Home.test.tsx:233` `await useGame.getState().init()`; `:234` `toMatchObject({ phase: "home", hasSave: true, activeSlot: 1 })`; `:237` `expect(await screen.findByText(message)).toBeInTheDocument()` with the unchanged messages at `:245`, `:249`, `:253`, `:257`; `:239` `expect(await loadGame()).toEqual({ kind: "ok", state: saved })` (`loadGame(slot = 1)`); `:240` `expect(await raw(2)).toBeUndefined()`; `:241` `expect(await raw(3)).toBeUndefined()` | PASS |
| C7 | the title's «Jogo salvo incompatível (versão N)», from IndexedDB; table: readable slot-1 + unsupported slot-2 -> no notice, «Continuar» and «Jogos salvos»; only unsupported slot-2 -> notice, no «Continuar»; after deleting Jogo 1 in «Jogos salvos» and «Voltar» -> notice | «aviso de incompatível só sem jogo legível» ✓; **fails on a3a7052** at `:429` | `src/ui/Home.test.tsx:427` `findByRole("button", { name: "Continuar" })`; `:428` «Jogos salvos» present; `:429` `expect(screen.queryByText(notice), "com jogo legível").not.toBeInTheDocument()`; deletion `:433-437`, then `:438` `expect(await screen.findByText(notice)).toBeInTheDocument()`; `:447` `expect(screen.getByText(notice), "sem jogo legível").toBeInTheDocument()`; `:448` no «Continuar». `notice` = `"Jogo salvo incompatível (versão 9)"` at `:418`. Code: `src/store.ts:80` `if (slots.some((s) => s.kind === "ok")) return null;`, recomputed in `init` `:483`, `persist` `:302` and `deleteSlot` `:822` | PASS |
| C8 | `check:layout` (seed 1) exits 0; `homeSave` fails with «sem o botão «Jogos salvos»» when the title menu lacks that button inside 400 × 700; last line «layout: as 19 telas cabem em 400 × 700 px» | `npm run check:layout` exit 0; guard fired with its lookup changed (Proof run item 5) | Script: `scripts/layout-check.mjs:166-169` `if (screen === "homeSave") { const saves = m.title.find((t) => t.name === "button «Jogos salvos»"); `, then pushes `"sem o botão «Jogos salvos»"` when `saves` is missing or `!within(saves)`. The name format matches `:117` (`"button" + " «" + textContent + "»"`), and `within` at `:143` requires the rect inside 400 × 700 with a non-zero size. `homeSave` is in the required list at `:470`. Run: `ok    homeSave ...` and `layout: as 19 telas cabem em 400 × 700 px` | PASS |

## Intent points: status

1. **Open-time slot choice without a readable game: closed.** C1 reads `activeSlot` on the title before any click, with a three-row table. A broken `activeSlotOf` fallback now fails it (Proof run item 4).
2. **C10 observed only the `pendingLive` start mark: closed.** C2 also waits for the end-of-date write (`pendingLive` gone, `savedAt` and round advanced) in slot 2, with slots 1 and 3 untouched.
3. **League summary pinned to `leagues[0]` (L-018): closed.** C3 uses `leagues[1]` and `leagues[2]` and excludes `leagues[0]`'s name. A `leagues[0]` summary now fails it.
4. **C21's exact text and the hand-built read failure: closed.** C4 fails the read inside `init` and asserts the exact text and the focus.
5. **C22 slot 3: closed.** `src/ui/Saves.test.tsx:242`.
6. **C23's hand-built store, slot 1 only: closed.** `refused` now goes through `init` and asserts slots 2 and 3 as well.
7. **`check:layout` not requiring «Jogos salvos» on `homeSave`: closed.** `scripts/layout-check.mjs:166-169`, and the guard is shown to fire.
8. **Title notice with a readable game in another slot: closed.** `src/store.ts:80`, proven by C7, which fails on the pre-feature code. The unsupported slot stays in «Jogos salvos» with «Apagar», because C7's deletion path goes through that screen.

## Coverage

Not a gate step under `light`. I re-read each row against the cited assertions above: all 7 sets are covered by the proofs that their rows name (C1 table of 3, C2 two writes, C3 two leagues, C5 slots 1/3, C6 slots 1-3 and the 4 refusals, C7 three states).

| Set (size) | Recomputed from | Member -> proof | Unproven |
| --- | --- | --- | --- |
| title notice states (3) | `src/store.ts:79-83` and its three callers `:302`, `:483`, `:822` | with a readable game C7 `:429` · without C7 `:447` · after deleting the readable game C7 `:438` | - |

## Faults injected

Not required under `light`. As supplementary evidence for the pinning proofs (Proof run items 4-5), I made three edits in the scratch worktree and none in the real tree:

| Mutation | Location | Killed |
| --- | --- | --- |
| `okView` league -> `game.leagues[0]` | `src/store.ts:64` | yes - C3 at `src/ui/Saves.test.tsx:88` |
| `activeSlotOf` empty fallback removed (`best?.slot ?? 1`) | `src/store.ts:75` | yes - C1 at `src/store.test.ts:1005` |
| `homeSave` guard looks for another name | `scripts/layout-check.mjs:167` | yes - `FALHA homeSave ... sem o botão «Jogos salvos»` |

## Swept existing

Verified at `dfeda92`.

- **validation** (import refusals, `src/store.ts` `importFile`): present. At `src/store.ts:832-834`, the three refusal kinds set `importMessage` and return before any write, and C6 now asserts that all three slots stay untouched.
- **concurrency** (write queue, `persist` / `writeQueue`): present. `src/store.ts:296-298` `const slot = get().activeSlot; const write = get().writeQueue.then(() => saveGame(game, slot)); set({ writeQueue: ... })`. `deleteSlot` chains on the same queue at `:807-808`. C2 runs through it with both writes landing in slot 2.

## Findings

All non-blocking. Each check has a located assertion that targets its value.

1. **Minor, precision of the checks' L-029 declaration.** `checks.md` says each new proof fails on the earlier code «ou, nos casos 1, 5 e 6, prende um comportamento que já existe». On a3a7052, the proofs for C2, C3 and C4 also pass (Proof run item 3). This is correct behaviour, not a weak proof. Intent points 2, 3 and 4 were test gaps over code that was already correct (the end-of-date save, `okView`'s league lookup at `src/store.ts:64`, and `init`'s `loadFailed` at `:478`), so no pre-fix failure exists to reproduce. The declaration should have listed 1-6. For C3 (and C1), the fault runs show that the new proofs catch the regression their finding named. C2 and C4 were not mutated.
2. **Minor, gate noise outside the diff.** The full suite was 640/641 at dfeda92. `src/ui/Market.test.tsx > oferta inválida` timed out at 35.8 s, which is the known flake. A rerun of that file passed 18/18. Neither `Market.test.tsx` nor `Market.tsx` changes in `a3a7052..dfeda92`.
3. **Cosmetic, C1 row «só o 2 incompatível -> 1».** The expected slot 1 equals the store's initial `activeSlot: 1` (`src/store.ts:515`), so that row alone would pass even if `init` never set the slot. The other two rows (-> 2, -> 3) do not have this weakness, and one of them killed the fallback fault, so the table as a whole holds.

## Gate

- Named-proof batch: 10 passed, 0 failed, 3 files; all proofs belong to this feature's diff.
- Pre-feature batch at a3a7052 (scratch, HEAD tests): 9 passed, 1 failed (C7 at `src/ui/Home.test.tsx:429`, the intended behaviour change).
- `npx vitest run`: 640 passed, 1 failed (Market «oferta inválida» timeout, Finding 2); rerun of `Market.test.tsx`: 18 passed, 0 failed.
- `npm run check:layout`: exit 0, `layout: as 19 telas cabem em 400 × 700 px`.
