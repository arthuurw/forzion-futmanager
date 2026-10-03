# Nível de dificuldade verification

**Verdict**: PASS
**Profile**: light
**Diff range**: 122b8e8..f26198c (plan, checks and AD-029 in a24771f; engine in 7771cae; screens, store and `check:layout` in f26198c); proofs run at HEAD f26198c
**Round**: 1 - full
**Verifier**: independent sub-agent (author != verifier)

All 8 checks are proven with located evidence. The 8 named Vitest proofs passed at f26198c in one invocation, each with its own ✓ line. `npm run check:layout` exited 0 with «layout: as 23 telas cabem em 400 × 700 px» on the second run; the first run failed on an unrelated screen (`marketLoans`, Finding 8). The full suite is green (698/698), and `tsc` and `lint` are clean.

I ran the HEAD tests against the pre-feature code at 122b8e8:

- 7 of the 8 proofs fail there, and none of them fails on a missing module (the tests import no new module).
- C4, C5, C6 and C8 fail on a real assertion.
- C1, C2 and C3 fail because the «Dificuldade» group and its radios are not on the screen. I accept this as pre-feature evidence: the control each check drives does not exist there.
- C7 passes there, as `checks.md` declares (L-030). The «Lições aplicadas» line labels it C6, which is wrong (Finding 7). No undeclared proof passes on the old code.

## Binding sources

None. The plan's `## Sources` lists the author's request and STATE AD-010, AD-018 and AD-024 as context, and marks nothing as binding. Step 1 runs only under `ui`, and this feature is `light`.

## Proof run

Verified at `f26198c`.

**Tree state.** Before the run, `git status --porcelain` was empty. After the last step it was still empty, apart from this report. During the run the orchestrator started editing `README.md`, `LICENSE` and `package.json` (license field) at the user's request, so the closing comparison was `git status --porcelain -- . ':!README.md' ':!LICENSE' ':!package.json'`. The only file I wrote in the real tree is this report.

**Scratch worktree.** The pre-feature comparison ran in a separate detached worktree at `122b8e8` under the session scratchpad. It had its own `npm ci`: 151 entries, a real directory, no junction or symlink. I removed it with `git worktree remove --force` and `git worktree prune`. `git worktree list` then showed only the main tree. The real `node_modules` was intact, with 151 entries and `node_modules/.bin/vitest` present. After `check:layout`, nothing was listening on port 4179.

1. **Named proofs, one invocation.** I ran this command:

   ```
   npx vitest run src/ui/ChooseClub.test.tsx src/engine/board.test.ts src/engine/market.test.ts src/ui/Saves.test.tsx -t "campo dificuldade|dificuldade gravada|caixa pela dificuldade|folga da meta pela dificuldade|meta difícil na virada e na troca|chance de compra pela dificuldade|normal joga como antes|nível no resumo" --reporter=verbose
   ```

   It exited 0 over 4 files: **8 passed**, 90 skipped. Each name matched exactly one test, and each printed its own ✓ line:
   - `src/ui/ChooseClub.test.tsx > dificuldade na escolha do clube (dificuldade) > campo dificuldade` ✓ (C1)
   - `... > dificuldade gravada` ✓ (C2)
   - `... > caixa pela dificuldade` ✓ (C3)
   - `src/engine/board.test.ts > meta pela dificuldade (dificuldade) > folga da meta pela dificuldade` ✓ (C4)
   - `... > meta difícil na virada e na troca` ✓ (C5)
   - `src/engine/market.test.ts > compra da IA pela dificuldade (dificuldade) > chance de compra pela dificuldade` ✓ (C6)
   - `src/engine/board.test.ts > meta pela dificuldade (dificuldade) > normal joga como antes` ✓ (C7)
   - `src/ui/Saves.test.tsx > dificuldade em Jogos salvos (dificuldade) > nível no resumo` ✓ (C8)
2. **Existence and diff membership.** I located each test with `grep -rn` over `src`: `src/ui/ChooseClub.test.tsx:90`, `:123`, `:130`; `src/engine/board.test.ts:245`, `:273`, `:299`; `src/engine/market.test.ts:1777`; `src/ui/Saves.test.tsx:247`. Each sits in a describe block tagged `(dificuldade)` that the range adds. No proof resolves to a test the feature did not touch.
3. **`npm run check:layout` (C8).** I ran it alone. The first run exited 1: `ERRO timeout: emprestado a você`, `FALHA telas não medidas: marketLoans`. Every other screen was `ok`, among them `ok    chooseClub scrollHeight 700 scrollWidth 400`. I reran it at once with nothing else running, and it exited 0 with 23 required screens plus `roundOffer`, all `ok`. The last line was `layout: as 23 telas cabem em 400 × 700 px` (Finding 8).
4. **Full suite**, `npx vitest run`: exit 0, 54 files, **698 passed, 0 failed**, 125 s. The known flaky `app.test.tsx` «fim da rodada ao vivo grava e mostra resultados» passed with no timeout. The `provas dos checks existem` guard passed, so every `checks.md` selector resolves.
5. **Types, lint, purity.**
   - `npx tsc -b --noEmit`: exit 0.
   - `npm run lint`: exit 0.
   - `src/engine/difficulty.ts` imports only `import type { Difficulty, GameState } from "./types"` and has no `Math.random`, React, DOM, zustand or idb (AD-002). The diff touches no migration and no `SCHEMA_VERSION`, so the save stays v8 (door 1).
6. **Pre-feature comparison at 122b8e8 (L-029/L-030).** In the scratch worktree I copied in the four HEAD test files and ran the same named batch: exit 1, **4 files failed, 7 tests failed, 1 passed**.
   - **Real assertions.**
     - C4: `Série A 5º Fácil: expected 8 to be 10`.
     - C5: `virada: expected 6 not to be 6`.
     - C6: `Fácil: expected [ 'c22', 'c25', 'c26', 'c29', …(13) ] to deeply equal [ 'c22', 'c25', 'c26', 'c29', …(7) ]`.
     - C8: at `src/ui/Saves.test.tsx:256`, expected `… · Temporada 1 · Fácil`, received `…Temporada 1Salvo em …`.
   - **Missing control.**
     - C1: `Unable to find an accessible element with the role "group" and name "Dificuldade"`.
     - C2: `... role "radio" and name "Difícil"`.
     - C3: `... role "radio" and name "Fácil"`.
   - **Missing module.** None.
   - **C7 passes** (`normal joga como antes` ✓), as declared in its claim («AC 6, L-030») and in the test comment at `src/engine/board.test.ts:300`.
7. **Fixture probe (C3).** In the scratch worktree only, a throwaway test read the cash of the club C3 clicks: `newGame(31)`, league `l1`, the first card alphabetically, which is `c8`. Its cash is 3,200,000, so C / 2 = 1,600,000 is already a multiple of R$ 100.000 (Finding 1). The probe was deleted with the worktree.

## Checks

Verified at `f26198c`.

| Check | Claim | Proof run | Evidence | Result |
| --- | --- | --- | --- | --- |
| C1 | group «Dificuldade» with radios «Fácil», «Normal», «Difícil» in order, «Normal» checked; the line under it, per marked level, is the AC 1 sentence | «campo dificuldade» ✓; fails on 122b8e8 (no group) | `src/ui/ChooseClub.test.tsx:95` `getByRole("group", { name: "Dificuldade" })`; `:97` `expect(radios.map((r) => r.closest("label")!.textContent)).toEqual(["Fácil", "Normal", "Difícil"])`; `:98` `getByRole("radio", { name: "Normal" })).toBeChecked()`; `:99` `toHaveTextContent(LINES.Normal)`; `:101-103` for each level, click then `toBeChecked()` and `expect(group, level).toHaveTextContent(LINES[level])`, with the three literal sentences at `:85-87`. The line check is a substring check (Finding 5). Code: `src/ui/ChooseClub.tsx:43-51` | PASS |
| C2 | «Difícil» then a club saves `difficulty: "hard"` in IndexedDB; untouched, `"normal"` | «dificuldade gravada» ✓; fails on 122b8e8 (no radio) | `src/ui/ChooseClub.test.tsx:125` `expect((await choose("Difícil")).saved.difficulty).toBe("hard")`; `:127` `expect((await choose(null)).saved.difficulty).toBe("normal")`. `choose` renders `<App />`, clicks the radio and a `club-card`, and reads `loadGame()` (`:108-121`, L-001). Code: `src/store.ts:603`, `:607` | PASS |
| C3 | chosen club's cash: Fácil 2 × C, Normal C, Difícil C / 2 rounded to R$ 100.000; another club unchanged in all three | «caixa pela dificuldade» ✓; fails on 122b8e8 (no radio) | `src/ui/ChooseClub.test.tsx:132-135` the table `["Fácil", (c) => 2 * c]`, `["Normal", (c) => c]`, `["Difícil", (c) => Math.round(c / 2 / 100_000) * 100_000]`; `:142` `expect(cashOf(saved, id), level).toBe(expected(cashOf(game, id)))`; `:144` `expect(cashOf(saved, other), level).toBe(cashOf(game, other))`. Through the screen to the saved game. The fixture's C is 3,200,000, so the rounding is never exercised (Finding 1). Code: `src/store.ts:606` | PASS |
| C4 | `userBoardGoal` table by level and rank: A 5º 10/8/6/none 8; A 14º 16/16/15; B 2º 4/4/4; B 10º 15/13/11; no-relegation 15º 17/17/16 | «folga da meta pela dificuldade» ✓; fails on 122b8e8 (`expected 8 to be 10`) | `src/engine/board.test.ts:248-252` the five literal rows `[10, 8, 6, 8]`, `[16, 16, 15, 16]`, `[4, 4, 4, 4]`, `[15, 13, 11, 13]`, `[17, 17, 16, 17]`; `:254` `expect(divisionAt(newGame(13).leagues, 2)).toEqual({ relegates: false, promotes: false })` (precondition, L-031); `:256-259` `expect(userBoardGoal(ranked(division, rank, "easy"))).toBe(easy)`, and the same for `"normal"`, `"hard"` and no level. Code: `src/engine/board.ts:50-53`, `:67` | PASS |
| C5 | in a Difícil game, the goal after `nextSeason` and after a mid-season `takeJob` uses margin 1: equal to `userBoardGoal` of the game, different from the same game in Normal | «meta difícil na virada e na troca» ✓; fails on 122b8e8 (`virada: expected 6 not to be 6`) | `src/engine/board.test.ts:282` `expect(state.boardGoal, "virada").toBe(userBoardGoal(state))`; `:283` `.not.toBe(userBoardGoal({ ...state, difficulty: "normal" }))`; `:291` `expect(leader).not.toBe(m.userClubId)`, so `career.ts:144`'s `Math.max(…, position)` cannot mask the margin; `:293` the real `takeJob(m, leader)`; `:295` `.toBe(userBoardGoal(moved.state))`; `:296` `.not.toBe(userBoardGoal({ ...moved.state, difficulty: "normal" }))`. The oracle for «folga 1» is `userBoardGoal` itself, whose numbers C4 pins | PASS |
| C6 | in `everyoneBuys`, a window round's buyers are exactly the draws < 0.15 (Fácil), < 0.25 (Normal and no level), < 0.35 (Difícil) on the door-3 stream; the three sets differ | «chance de compra pela dificuldade» ✓; fails on 122b8e8 (Fácil got 17 buyers, expected 11) | `src/engine/market.test.ts:1781-1783` `buyDraws(s.rngState, 2, …)` and `[below(0.15), below(0.25), below(0.35)]`; `:1797` `expect(easy.length).toBeLessThan(normal.length)`; `:1798` `expect(normal.length).toBeLessThan(hard.length)`; `:1799` `expect(buyers("easy"), "Fácil").toEqual(easy)`; `:1800` `buyers("normal")` `toEqual(normal)`; `:1801` `buyers(undefined)` `toEqual(normal)`; `:1802` `buyers("hard")` `toEqual(hard)`. Code: `src/engine/market.ts:614-616` | PASS |
| C7 | the same game, 3 rounds with `playRound`, with no `difficulty` and with `"normal"`, reaches the same state (minus the field) | «normal joga como antes» ✓; **also passes on 122b8e8, as declared** (L-030) | `src/engine/board.test.ts:304-305` `play(clone(start), 3)` and `play({ ...clone(start), difficulty: "normal" }, 3)`; `:306` `expect(difficulty).toBe("normal")`; `:307` `expect(rest).toEqual(a)`. Rounds 1-3 are window rounds (`src/engine/market.ts:40-43`). It pins absent = `"normal"` at HEAD, not «como hoje» (Finding 4) | PASS |
| C8 | «Jogos salvos» summaries for Fácil / no level / Difícil end in « · Fácil», « · Normal», « · Difícil» after «Temporada <n>»; `check:layout` measures `chooseClub` with the group inside the window and ends «layout: as 23 telas cabem em 400 × 700 px» | «nível no resumo» ✓; fails on 122b8e8 (no level in the summary); `npm run check:layout` exit 0 on the rerun (Proof run item 3) | `src/ui/Saves.test.tsx:250-252` slot 1 `difficulty: "easy"`, slot 2 none, slot 3 `"hard"`; `:255` `summary = … Temporada ${game.season} · ${level}`; `:256-258` `expect(row(1)).toHaveTextContent(summary(a, "Fácil"))`, `row(2)` `"Normal"`, `row(3)` `"Difícil"`. Layout: `scripts/layout-check.mjs:133` measures `fieldset.difficulty`; `:177` `if (!m.difficulty) out.push("sem o grupo «Dificuldade»")`; `:178` `else if (!within(m.difficulty))` is a problem, with `within` at `:157` bounding it to 400 × 700; `:355` `measure("chooseClub")`; `:588` the final line. Run: `ok    chooseClub scrollHeight 700 scrollWidth 400` | PASS |

## Swept existing

Verified at `f26198c`.

One `Swept` row resolves to existing code: `concurrency`, «existing - a gravação da escolha passa pela fila da store (`src/store.ts` `persist`), como hoje». The constraint is there:

- `src/store.ts:615` `await persist(next, set, get)` in `chooseClub`.
- `src/store.ts:305` `async function persist(…)` chains every write on `get().writeQueue.then(() => saveGame(game, slot))` at `:314`.
- `src/persistence/save.ts:35` `db.put(STORE, { ...state, savedAt: Date.now() }, slotKey(slot))` writes the whole state, so `difficulty` goes with the rest. The diff does not touch it.

The other rows cite checks (C2, C5, C7) or say `n/a`. One of them, `validation: n/a - o rádio só oferece os três níveis`, overlooks the imported file (Finding 3).

## Coverage

Not a gate step under `light`. I did not recompute the coverage rows. Two of its members rest on a proof that does not reach them: «caminhos da meta: escolha do clube C4» (Finding 2) and «caixa» on the Difícil rounding (Finding 1).

## Faults injected

Not run under `light`. The only discrimination evidence is the pre-feature run (Proof run item 6), where 7 of the 8 proofs fail. C7 passes, as declared.

## Findings

All non-blocking. Each check has a located assertion that targets its check-defined value.

**Level and sampling judgment.**

- **AC 1-3 (choice, saved level, cash).** Proven at the boundary where the user acts: `<App />`, a radio click, a club-card click, and the game read back from IndexedDB (C2, C3). The store's `chooseClub` cash rule is therefore proven through the store, not beside it.
- **AC 4 (goal).** Proven at the engine on a 5-row by 4-level table (C4). The turn (`nextSeason`) and the move (the real `takeJob` from `src/engine/career.ts`, which the store's `takeJob` calls at `src/store.ts:756`) are proven at the engine (C5).
- **AC 5 (AI purchases).** Proven at `closeRoundMarket` on a window round, against the door-3 draws (C6).
- **AC 6 (Normal unchanged).** See Finding 4.
- **AC 7-8 (screens).** Proven at component level against literal text, and in Chrome at 400 × 700 (C8).

The gaps:

1. **Minor, C3: the rounding to R$ 100.000 is never exercised.** The club C3 chooses (`newGame(31)`, `l1`, `c8`) has C = 3,200,000, so C / 2 = 1,600,000 exactly. Generated cash is always a multiple of R$ 100.000 (`src/engine/finance.ts:76` `roundTo(wages * INITIAL_CASH_ROUNDS, 100_000)`), so only an odd number of hundred-thousands would exercise it. With no rounding at all, or with `Math.floor` or `Math.ceil`, at `src/store.ts:606`, `src/ui/ChooseClub.test.tsx:142` would still pass. AC 3 names the rounding explicitly, so the fixture should pick a club with an odd number of hundred-thousands (L-018).
2. **Minor, AC 4 «na escolha do clube» is not proven through the store.** The Coverage row lists C4 for that path, but C4 calls `userBoardGoal` directly on a hand-built state (`src/engine/board.test.ts:256-259`). C2 and C3 go through `chooseClub` but assert only `difficulty` and `cash`. No test asserts the saved `boardGoal` after a Difícil choice. The code is right today: `src/store.ts:607` puts `difficulty` into `chosen` before `:613` computes `userBoardGoal(chosen)`. A reorder that computed the goal from `{ ...game, userClubId }` would pass every proof.
3. **Minor, an imported file's `difficulty` is not shape-checked.** The plan's Surface says the exported file (AD-018) carries `difficulty`, so the value can come from the user through import. `hasGameShape` (`src/engine/saveFile.ts:54-67`) does not look at it. A file with `"difficulty": "x"` decodes `ok`, and then:
   - `difficultyOf` (`src/engine/difficulty.ts:17`) returns `undefined`.
   - The game then throws at `.aiBuyChance` (`src/engine/market.ts:614`) on the next window round, and at `.goalMargin` (`src/engine/board.ts:67`) at the turn or on `takeJob`.
   - «Jogos salvos» shows an empty level (`src/ui/Saves.tsx:28`).

   `news` and `career` have the same exposure (noticias Finding 4), so this follows precedent. But the Swept row's reason, «o rádio só oferece os três níveis», is inaccurate.
4. **Minor, AC 6 «exatamente como hoje» is not proven by C7 alone.** C7 compares no level with `"normal"` at HEAD, and both resolve through the same `DIFFICULTY.normal` entry. If Normal's numbers changed (say `aiBuyChance: 0.3`), C7 would still pass. «Como hoje» rests on three other proofs:
   - C4's Normal and no-level column, which is rank + 3.
   - C6's Normal and no-level set, the draws < 0.25 (`src/engine/market.test.ts:1800-1801`), which is the evidence that Normal is unchanged across a window round with AI purchases.
   - The pre-existing pins at `src/engine/market.test.ts:529` (`draws[i]! < 0.25`) and `src/engine/board.test.ts:111` (rank + 3), which run on games with no level.

   C7 also does not assert that any AI purchase happened in its 3 rounds, although rounds 1-3 are window rounds (precondition, L-031). Normal cash is unchanged because the rounding at `src/store.ts:606` is a no-op on generated cash (Finding 1).
5. **Cosmetic, C1's sentence check does not exclude the other levels' sentences.** `src/ui/ChooseClub.test.tsx:103` `toHaveTextContent(LINES[level])` is a substring check on the whole group. A group that rendered all three sentences at once would pass. The code shows only the marked one (`src/ui/ChooseClub.tsx:51`).
6. **Cosmetic, AC 2's `"easy"` is never read back from the saved game.** C2 covers `"hard"` and untouched `"normal"` (`src/ui/ChooseClub.test.tsx:125`, `:127`). C3's Fácil case implies `"easy"` reached the store only through the doubled cash.
7. **Cosmetic, the L-030 declaration names the wrong check.** `checks.md` «Lições aplicadas» says «L-030 (C6 prende comportamento que já existe: o jogo Normal igual ao de hoje)». The check that pins it is C7, and C7's own text and `src/engine/board.test.ts:300` say so correctly. C6 fails on the pre-feature code, as it should.
8. **Note, `check:layout` flaked once on an unrelated screen.** The first run timed out waiting for `Emprestados (2)` (`scripts/layout-check.mjs:545`, 20 s `until`), so `marketLoans` was not measured. An immediate rerun passed with all 23. `marketLoans` is not on this feature's surface: the script plays Normal, and Normal cash is unchanged. I read it as load-related timing, but it should be watched.
9. **Note, `loanLimit` keeps the generated cash.** `chooseClub` changes `finance.cash` only. `loanLimit` stays `2 * generated cash` (`src/engine/finance.ts:85`), so the limit is 1× the starting cash in Fácil and 4× in Difícil. No AC speaks to it, and the plan names only cash. I record it as a calibration question, not a defect.

## Gate

- Named-proof batch: 8 passed, 0 failed, 4 files. Every proof belongs to this feature's diff.
- Pre-feature batch at 122b8e8 (scratch worktree, HEAD tests): 4 files failed, 7 tests failed, 1 passed.
  - C4, C5, C6 and C8 failed on real assertions.
  - C1, C2 and C3 failed because the control is missing.
  - None failed on a missing module.
  - C7 passed, as declared (L-030).
- `npm run check:layout`: exit 0 on the rerun, `layout: as 23 telas cabem em 400 × 700 px`. The first run failed on `marketLoans` (Finding 8).
- `npx vitest run`: 698 passed, 0 failed, 54 files.
- `npx tsc -b --noEmit`: exit 0. `npm run lint`: exit 0.
