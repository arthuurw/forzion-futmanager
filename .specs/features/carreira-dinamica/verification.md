# Carreira dinâmica verification

**Verdict**: PASS
**Profile**: light
**Diff range**: 2c5ab03..24b0b88
**Round**: 2 - full (every check C1..C20 re-verified at 24b0b88, not only the round-1 gaps)
**Verifier**: independent sub-agent (author != verifier)

## Binding sources

None. The plan marks no binding source; `Sources` is the 30/09/2026 chat. Step 1 runs only under `ui`, and this feature was approved under `light`.

## Proof run

Verified at `24b0b88`. The tree was clean before the run: `git status --porcelain` showed only this report, untracked.

1. **Batched named proofs, one invocation**: `npx vitest run src/engine/career.test.ts src/ui/History.test.tsx src/ui/Round.test.tsx src/ui/Squad.test.tsx src/ui/Job.test.tsx src/store.test.ts src/ui/End.test.tsx src/engine/saveFile.test.ts src/audio/music.test.ts src/app.test.tsx src/ui/Home.test.tsx -t "<the 23 names, alternated>" --reporter=verbose` exited 0: 11 files, **25 passed**, 151 skipped, 0 failed. Each named test printed its own ✓ line:
   - career.test.ts: «reputação: tabela», «avisos da diretoria: tabela», «quarta rodada demite», «finishRound checa a diretoria», «assumir no meio da temporada», «assumir clube fora da lista», «propostas por reputação», «proposta na rodada do meio», «jogar recusa a proposta», «propostas da virada», «save antigo sem os campos»
   - History.test.tsx: «reputação e carreira», «artilharia top 10» · Job.test.tsx: «tela demitido» · End.test.tsx: «propostas com a meta cumprida» · saveFile.test.ts: «proposta pendente no arquivo» · music.test.ts: «contexto de cada tela»
   - store.test.ts: «demitido trava o calendário», «assumir grava e abre o elenco» · Round.test.tsx: «aviso da diretoria», «proposta de emprego» · Squad.test.tsx: «aviso da diretoria», «proposta de emprego»
   - superseded or fixture-adjusted: app.test.tsx «recarregar no fim mostra o mesmo resumo» · Home.test.tsx «importar sem save grava e abre o jogo»
2. **C11 and C15 in isolation.** Each proof command was run exactly as `checks.md` writes it, 3 times, sequentially:
   - `npx vitest run src/store.test.ts -t "assumir grava e abre o elenco"`: exit 0 all 3 times, 1 passed and 30 skipped each time
   - `npx vitest run src/ui/Round.test.tsx -t "proposta de emprego"`: exit 0 all 3 times, 1 passed and 13 skipped each time
   - `npx vitest run src/ui/Squad.test.tsx -t "proposta de emprego"`: exit 0 all 3 times, 1 passed and 28 skipped each time
   - None of these runs printed a `not wrapped in act(...)` warning.
3. **Full suite**, `npx vitest run`: exit 1, 48 files, **600 passed, 1 failed**. The failure is `src/ui/Market.test.tsx > oferta digitada (correcoes-validacao) > oferta inválida`, which hit `Test timed out in 30000ms` (`Market.test.tsx:344`). It is not caused by this feature:
   - Neither `Market.test.tsx` nor `Market.tsx` is in `2c5ab03..HEAD`.
   - Run alone at HEAD, it failed again in 36.8 s.
   - Run in a scratch worktree at the feature base `2c5ab03`, it failed the same way in 31.1 s. The worktree was removed afterwards and the real tree's porcelain was unchanged.
   - It is a timing test that exceeds its 30 s limit on this machine under current load. Round 1 saw it pass. The full-suite log had 0 `act(...)` warnings.
4. **Layout**, `npm run check:layout`: exit 0, using headless Chrome at 400 × 700 with seed 1. Measured lines, in order: `home`, `chooseClub`, `squad`, `market`, `finance`, `history`, `cup`, `cupCont`, `live`, `round`, `job`, `roundOffer`, `end`, `newSeason`, `homeSave`, `about`, `squadOffer`, every one `scrollHeight 700 scrollWidth 400`. Last line: `layout: as 16 telas cabem em 400 × 700 px`. The required list has 16 screens, including `job` and `squadOffer` (`scripts/layout-check.mjs:420`). Seed 1 also reached the optional `roundOffer`. No preview port was left listening afterwards.
5. **`check:layout:selftest` was not re-run**, on the caller's instruction, because the machine is short on memory and an earlier run was killed. The author's partial run passed the selftest's broken-run and normal-run legs. Its `--fail-normal` leg (`scripts/layout-check-selftest.mjs:57-59`) was not re-run here. The fix touched `layout-check.mjs` only by adding measurements and screens, not the failure or exit paths the selftest exercises.

Every named test exists. The `rg -n` / `awk` hits are at the lines cited below. The fix `0949c0b..24b0b88` touched only tests, `scripts/layout-check.mjs` and `checks.md`, with no product source. Citations in `career.test.ts` after line 219, and in the Round, Squad, store and End tests, were refreshed; the others are unchanged from round 1 and were re-read at HEAD.

## Checks

Verified at `24b0b88`.

| Check | Claim | Proof run | Evidence | Result |
| --- | --- | --- | --- | --- |
| C1 | reputation table: 50, each weight, window of 5, null club ignored, career fired/offer, floor 0, ceiling 100 | «reputação: tabela» ✓ | `src/engine/career.test.ts:92` - `toBe(50)`; `:94-104` rows 56/47/42/64/60/62/66/76/80/62 checked by `:105` `expect(rep(history), ...).toBe(expected)`; `:107` `toBe(42)`; `:108` `toBe(50)`; `:110` `toBe(0)`; `:112` `toBe(100)`; tiers pinned `:90-91` | PASS |
| C2 | History with 3 «met» and a Série A title shows «Reputação: 76/100» | «reputação e carreira» ✓ | `src/ui/History.test.tsx:265` - `expect(screen.getByText("Reputação: 76/100")).toBeInTheDocument()` | PASS |
| C3 | window 9/10/34/35, outside the zone, relegation zone, last place with no relegation, absent counts as 0 | «avisos da diretoria: tabela» ✓ | `src/engine/career.test.ts:131-134` - `toBe(0)`, `toBe(2)`, `toBe(2)`, `toBe(0)`; `:136` `toBe(0)`; `:138` `toBe(1)`; `:140` `toBe(1)` (Argentina, `:123`); `:142` absent `toBe(1)`; R = 38 `:122` | PASS |
| C4 | 4th round in the zone sets `pendingJob` fired with the 3 clubs just below in the all-club ranking; warnings reset to 0 | «quarta rodada demite» ✓ | `src/engine/career.test.ts:155` - `expect(after.pendingJob).toEqual({ reason: "fired", clubIds: ranking.slice(at + 1, at + 4) })`; `:156` `boardWarnings toBe(0)` | PASS |
| C5 | via `finishRound`, round 13 fires; a cup date keeps 2 at 2 | «finishRound checa a diretoria» ✓ | `src/engine/career.test.ts:164` `currentRound toBe(13)`; `:165` position `> 5`; `:166` - `expect(after.pendingJob?.reason).toBe("fired")`; `:171` - `expect(cupAfter.boardWarnings).toBe(2)` | PASS |
| C6 | Round and Squad show the exact warning at 1, 2 and 3; nothing at 0 or absent | Round and Squad «aviso da diretoria» ✓ | `src/ui/Round.test.tsx:311` - ``getByText(`Aviso da diretoria (${warnings}/3): a campanha está abaixo do aceitável.`)``; `:312` `queryByText(/Aviso da diretoria/)` not present, over `[1, 2, 3, 0, undefined]` (`:305`); `src/ui/Squad.test.tsx:552-553` the same, over `:547` | PASS |
| C7 | via the store, the sacking round opens `job`: «Demitido», exact line at round 13, reputation, 3 «Assumir» with name · division · força | «tela demitido» ✓ | `src/ui/Job.test.tsx:34` `phase toBe("job")`; `:37` heading «Demitido»; `:38` - ``getByText(`Você foi demitido do ${club.name} na rodada 13.`)``; `:39` `getByText("Reputação: 50/100")`; `:44` `toHaveLength(3)`; `:48` - ``li.textContent toBe(`${offered.name} · ${LABEL[division]} · força ${best11(offered).toFixed(1)} Assumir`)`` | PASS |
| C8 | with a fired `pendingJob`, `playRound` changes nothing; «Continuar» opens «Demitido» | «demitido trava o calendário» ✓ | `src/store.test.ts:877` `game toBe(game)`; `:878` `phase toBe("squad")`; `:879` `live toBeNull()`; `:883` after `continueGame`, `phase toBe("job")`; `:885` heading «Demitido» | PASS |
| C9 | `takeJob`: user, pending marker, warnings, career entry, old club, new lineup, goal 18 / 12, `cupGoal` −1 | «assumir no meio da temporada» ✓ | `src/engine/career.test.ts:202-204` - `userClubId`, `"pendingJob" in got` false, `boardWarnings toBe(0)`; `:205` - `career toEqual([{ season: 2, round: 13, fromId: table[10], toId: table[17], reason: "fired" }])`; `:207-210` - old club `lineup` null, no `training`, `forSale` `[]`, `market.offers` `[]`; `:212` - lineup `toEqual(autoLineup(..., AI_FORMATION, "balanced", 0, nextCompetition(...)))`; `:196`+`:213` 16 gives 18; `:197`+`:218` 12 gives 12; `:214` `cupGoal toBe(-1)`; **new** `:225` - `career toEqual([{ season: 2, round: 13, fromId: table[10], toId: table[4], reason: "offer" }])` | PASS |
| C10 | outside the list, own club, or no `pendingJob`: returns `{ ok: false }` and leaves the state unchanged | «assumir clube fora da lista» ✓ | `src/engine/career.test.ts:232`, `:233`, `:236` - `toEqual({ ok: false })`; `:237` - `expect(JSON.stringify(s)).toBe(before)` | PASS |
| C11 | via the store, «Assumir» saves the new `userClubId` (read back by `loadGame`) and opens its squad | `npx vitest run src/store.test.ts -t "assumir grava e abre o elenco"` exit 0, 3/3 in isolation; ✓ in batch | `src/store.test.ts:897` - `await waitFor(() => expect(useGame.getState().phase).toBe("squad"))`; `:899` - `expect(saved.userClubId).toBe(others[1])` with `saved` from `loadGame()` (`:898`); `:900` `pendingJob toBeUndefined()`; `:902` - `expect(await screen.findByRole("heading", { name })).toBeInTheDocument()` | PASS |
| C12 | reputation 90: ceiling 8, 2 distinct ids in ranks 8-15 (not 7, not 16), own stream, `rngState` unchanged; reputation 50: `[]`; 100: ceiling 1; 1 candidate: 1 id | «propostas por reputação» ✓ | `src/engine/career.test.ts:253` - `expect(offers).toEqual(shuffle(createRng(mix32(mix32(rngState, 0xca), s.season * 64 + 19)), window).slice(0, 2))`, `window = ranking.slice(7, 15)` (`:252`); `:254-258` length 2, distinct, in window, not `ranking[6]`, not `ranking[15]`; `:259` `s.rngState toBe(rngState)`; `:264` `toEqual([])`; `:270-271` 2 ids in the top 8; `:275` `toEqual([ranking[7]])` | PASS |
| C13 | via `finishRound`: offer only at round 19, on target, with a candidate; a fired `pendingJob` is kept | «proposta na rodada do meio» ✓ | `src/engine/career.test.ts:293` - `expect(s19.pendingJob).toEqual({ reason: "offer", clubIds: expected })`, `expected = reputationOffers(s19, 19)` (`:291`); `:287`, `:297` rounds 18 and 20 `toBeUndefined()`; `:301` off target; `:305` reputation 50; `:310` `toEqual(firedJob)` | PASS |
| C14 | a league date and a cup date clear the offer; the club is unchanged | «jogar recusa a proposta» ✓ | `src/engine/career.test.ts:318-319` - `pendingJob toBeUndefined()`, `userClubId toBe(league.userClubId)`; `:325-326` the same after `finishCupDate` | PASS |
| C15 | Round and Squad: panel with 2 «Aceitar» and 1 «Recusar»; «Recusar» saves without `pendingJob` and keeps the club; «Aceitar» on the 2nd saves its id and opens its squad | both `checks.md` commands exit 0, 3/3 each in isolation; ✓ in batch | `src/ui/Round.test.tsx:327` / `src/ui/Squad.test.tsx:568` - `getAllByRole("button", { name: /^Aceitar/ })).toHaveLength(2)`; `Round:328` / `Squad:569` `getByRole("button", { name: "Recusar" })`, which throws unless exactly one; `Round:330` / `Squad:571` - `await waitFor(() => expect(screen.queryByRole("dialog", { name: "Proposta de emprego" })).not.toBeInTheDocument())`; `Round:332-333` / `Squad:573-574` - saved `pendingJob toBeUndefined()`, `userClubId toBe(me)`; `Round:340` / `Squad:581` - `expect(await screen.findByRole("heading", { name: b!.name }))`, the Squad `h1` (`src/ui/Squad.tsx:121`; Round's `h1` is «Rodada N», `src/ui/Round.tsx:50`); `Round:342` / `Squad:583` - `saved.userClubId toBe(b!.id)` | PASS |
| C16 | season turn: met gives `reputationOffers(state, 38)`, missed `[]`, fired the board's 3; offer and fired recorded; no pick keeps the club; an outside id throws | «propostas da virada» ✓ | `src/engine/career.test.ts:339` - `review.jobOffers toEqual(offers)`; `:345` `toEqual([])`; `:351` - `toEqual(ranking.slice(at + 1, at + 4))`; `:355` - `career toEqual([{ season: met.season, round: 38, fromId: ranking[29], toId: offers[0], reason: "offer" }])`; `:358-359` club kept, career `[]`; `:362` `reason: "fired"`; `:365` `toThrow()` | PASS |
| C17 | End with «met» and **2** offers lists both; «Próxima temporada» enabled with no pick; no pick keeps the club; picking the 1st moves to it | «propostas com a meta cumprida» ✓ | `src/ui/End.test.tsx:280` - `expect(offers).toHaveLength(2)` (**new**); `:287` - offer button names `toEqual(offers.map(... name))` inside region «Propostas de emprego» (`:286`); `:288` `toBeEnabled()`; `:291` `userClubId toBe(me.id)`; `:301` `userClubId toBe(again.offers[0])` | PASS |
| C18 | Carreira lines, oldest first, for fired and offer; empty and absent show «Nenhuma troca de clube ainda.» | «reputação e carreira» ✓ | `src/ui/History.test.tsx:268` - ``expect(lines).toEqual([`Temporada 2, rodada 13: demitido do ${name(x!)}, assumiu o ${name(y!)}`, `Temporada 3, rodada 38: trocou o ${name(y!)} pelo ${name(z!)}`])``; `:280` - `getByText("Nenhuma troca de clube ainda.")` over `[[], undefined]` (`:273`) | PASS |
| C19 | a v8 save without the 3 fields plays 38 rounds and turns the season; import rejects an unknown id and the user's own id; accepts valid ids and a save with none | «save antigo sem os campos» ✓, «proposta pendente no arquivo» ✓ | `src/engine/career.test.ts:375-376` - `schemaVersion toBe(8)`, keys absent; `:378` `currentRound toBe(38)`; `:381` `season toBe(s.season + 1)`; `src/engine/saveFile.test.ts:161-162` - `kind toBe("malformed")`; `:165` - `pendingJob toEqual({ reason: "offer", clubIds: [other] })`; `:167` no `pendingJob` gives `toBe("ok")` | PASS |
| C20 | `check:layout` exits 0; `job` is measured, then «Assumir»; the offer panel, when it appears, is followed by «Recusar»; nothing scrolls | `npm run check:layout` exit 0, `as 16 telas cabem em 400 × 700 px` | `scripts/layout-check.mjs:324-325` - `measure("job")`, `click("Assumir")`; `:386-387` the reopened fired save; `:338-339` - `measure("roundOffer")`, `click("Recusar")` whenever the dialog is present; `:390` `jobInSave("offer", 3)`; `:396` waits for `__lc.enabled('Recusar') && ...includes('Aviso da diretoria (3/3)')`; `:397` `measure("squadOffer")`; `:398` `click("Recusar")`; `:420` required list ends with `"job", "squadOffer"`. Run output: all 17 measured screens `scrollHeight 700 scrollWidth 400` | PASS |

## Round-1 gaps

| # | Round-1 gap | Fix in 24b0b88 | Status at 24b0b88 |
| --- | --- | --- | --- |
| 1 | C11 and C15 proofs failed in isolation: they asserted before the async `persist` resolved | `waitFor` on the phase (`src/store.test.ts:897`) and on the dialog leaving (`src/ui/Round.test.tsx:330`, `src/ui/Squad.test.tsx:571`); the accept leg now awaits the new heading before reading the save (`Round:340`, `Squad:581`) | **closed**: each `checks.md` command exited 0 in 3/3 isolated runs, passed in the batch, and printed no `act(...)` warnings |
| 2 | C20: `layout-check.mjs` never clicked «Recusar» and never measured the offer panel or the board warning | `scripts/layout-check.mjs:336-341` measures `roundOffer` when the panel appears and declines it; `:389-398` reopens a save with an offer and `boardWarnings` 3 and measures `squadOffer` with both on screen; `squadOffer` is required (`:420`) | **closed**: 16 required screens measured; `roundOffer` was also reached with seed 1 |
| 3 | AC 10: no assertion that an offer taken mid-season records `reason: "offer"` | `src/engine/career.test.ts:220-225` | **closed**: `:225` pins `reason: "offer"`, round 13 and both ids |
| 4 | C17 did not pin the 2 offers (`offers.length > 0`) | `src/ui/End.test.tsx:280` `toHaveLength(2)` | **closed** |
| 5 (minor) | the `checks.md` note said `job` was measured twice | note rewritten: `job` measured once, plus `roundOffer` and `squadOffer` | **closed**: matches `scripts/layout-check.mjs:324`, `:386` (both guarded by `!measured.has("job")`) |
| 6 (minor) | L-004: C13, C16 and C17 build the expected value with `reputationOffers` | not changed | **open, minor**: still at `src/engine/career.test.ts:291`, `:337`, and `src/ui/End.test.tsx:277`; mitigated because C12 pins the formula literally (`career.test.ts:253`) |

## Coverage

Under `light` the join is not a gate step. Each row was re-read against the proof it names, verified at `24b0b88`.

| Set (size) | Recomputed from | Member -> proof | Unproven |
| --- | --- | --- | --- |
| reputation weights (8) | `src/engine/career.ts:17-22` | C1, all 8 | - |
| reputation limits (4) | `managerReputation` | C1: floor, ceiling, window of 5, null club | - |
| round window (4 edges) | `boardAfterRound` | C3: 9, 10, 34, 35 | - |
| firing zones (3) | `verdictFor` | C3: goal + 5, relegation, last with no relegation | - |
| warning outcome (3) | `boardAfterRound` | C3 add and reset; C4 and C5 fire | - |
| date kind (2) | `finishRound` / `finishCupDate` | league C5, C13; cup C5, C14 | - |
| warning screens (2) | `BoardWarning` in Round and Squad | C6 | - |
| move effects (6) | `takeJob` (`career.ts:129-146`) | C9, all 6 | - |
| refused move (3) | `takeJob` guard | C10, all 3 | - |
| offer rule (4) | `reputationOffers` (`career.ts:67-77`) | C12, all 4 | - |
| mid-season offer triggers (5) | `boardAfterRound` | C13, all 5 | - |
| answers to an offer (3) | accept, decline, play | C15 accept and decline; C14 play | - |
| offer screens (3) | Round, Squad, End | C15 Round and Squad; C17 End | - |
| turn verdict (3) | `seasonReview` | C16 met, missed, fired; C17 met | - |
| reason in `career` (2 x 2 moments) | `CareerMove.reason` at `career.ts:141` and in `nextSeason` | fired mid-season C9 `:205`; offer mid-season C9 `:225`; offer at the turn C16 `:355`; fired at the turn C16 `:362` | - |
| career lines (3) | `moveText` in `History.tsx` | C18, all 3 | - |
| doors (2) | plan Landing | door 1: C9, C16, C19; door 2: C12 | - |

## Swept existing

Verified at `24b0b88`. `src/store.ts` is unchanged since `0949c0b`.

- **failure modes**: `takeJob` and `declineJob` go through `persist` (`src/store.ts:650`, `:661`), and a failed write sets `saveStatus: "failed"` (`src/store.ts:247`). This is present. The C8 lock is at `src/store.ts:552`, and «Continuar» and every date close route a fired save to `job` (`:266`, `:272`).
- **concurrency (AD-020)**: writes are chained on `writeQueue` (`src/store.ts:241-242`), and a tab without the lock returns early (`:240`). This is present.

## Superseded and modified pre-existing tests

Verified over `2c5ab03..24b0b88` with `git diff --numstat` and `-U0`, looking at removed lines. The fix commit touched only tests this feature introduced, plus the layout script.

| Test | Change | Documented | Judgment |
| --- | --- | --- | --- |
| `History.test.tsx` «artilharia top 10» | tabs go from 3 to 4 with «Carreira» (the only removed assertion in any pre-existing test) | Superseded row, marked _achado na build_ | legitimate; the 3 old tabs are unchanged |
| `music.test.ts` «contexto de cada tela» | adds `["job", "gestao"]`; the one removed line is a comment | Superseded row | legitimate; no old row changed |
| `app.test.tsx` «recarregar no fim mostra o mesmo resumo» | fixture `delete game.pendingJob` | rule paragraph under the Superseded table | fixture only; no expected value changed |
| `Home.test.tsx` «importar sem save grava e abre o jogo» | fixture `delete over.pendingJob` | same paragraph | fixture only |
| `scripts/layout-check.mjs` required screens | 14 grows to 16 (`job`, `squadOffer`) | C20 | additive; no earlier screen removed or relaxed |
| `store.test.ts`, `Round.test.tsx`, `Squad.test.tsx`, `End.test.tsx`, `saveFile.test.ts` | new tests and import lines only; the fix changed only this feature's own assertions (C11, C15, C17) | n/a | no pre-existing expected value changed |

## Plan criteria checked in the code

Carried from `0949c0b`. The product source is unchanged in `0949c0b..24b0b88`, and each line was re-read at HEAD. No contradiction was found.

- **AC 8**: `playRound` returns on a fired `pendingJob` (`src/store.ts:552`). `openingPhase` and `afterDatePhase` go to `job` (`src/store.ts:266`, `:272`).
- **AC 10**: the reason comes from the pending job, `reason: job.reason` (`src/engine/career.ts:141`).
- **AC 13**: `boardGoal = Math.max(userBoardGoal(state), positionOf(...))` (`src/engine/career.ts:144`), and `cupGoal = -1` (`:145`).
- **AC 19**: `dropOffer` runs at the top of `finishRound` (`src/engine/season.ts:67`) and in `finishCupDate` (`src/engine/cup.ts:292`).
- **Door 2**: `createRng(mix32(mix32(state.rngState, OFFER_SALT), state.season * 64 + round))` (`src/engine/career.ts:75`) never writes `rngState`, and `boardAfterRound` runs on the state after the round (`src/engine/season.ts:102`).
- **Unplanned but harmless**: `nextSeason` resets `boardWarnings` and deletes `pendingJob` (`src/engine/rollover.ts:295-296`).

## Findings

1. **Minor, outside the feature: full-suite timeout.** `src/ui/Market.test.tsx:344` «oferta inválida» exceeds the 30 s `testTimeout` on this machine: 38.4 s in the full run, 36.8 s alone at HEAD, and 31.1 s at the base `2c5ab03`. It fails identically before the feature, so no check depends on it. Still, the suite is not green on this machine. The fix is to give the test an explicit timeout, or to make it lighter.
2. **Minor, precision (L-004), carried from round 1.** C13, C16 and C17 build their expected offers with `reputationOffers` (`src/engine/career.test.ts:291`, `:337`; `src/ui/End.test.tsx:277`). That function is not on the checks' allowed list. The risk is mitigated because C12 pins the formula literally (`src/engine/career.test.ts:253`).
3. **Minor, layout coverage beyond the claim.** The Round screen with `BoardWarning` on screen is never measured. `round` is measured once, at first reach (`scripts/layout-check.mjs:335`), before any warning can exist. `roundOffer` is measured only when the seed reaches an offer and is not in the required list (`:420`). The Squad screen carries the warning together with the panel (`squadOffer`, `:396-397`), and the Round panel was measured in this run. C20's wording («quando aparece») does not claim more, so this is not a failed check.
4. **Note, not re-run: `check:layout:selftest`.** The `--fail-normal` leg (`scripts/layout-check-selftest.mjs:57-59`) was not re-run at 24b0b88 because of the memory constraint. The broken-run and normal-run legs passed in the author's partial run.

## Gate

- Named-proof batch: 25 passed, 0 failed (11 files).
- C11 and C15 isolated proofs: 9 of 9 runs exited 0.
- `npx vitest run`: 600 passed, 1 failed (48 files). The failure is the pre-existing `Market.test.tsx` «oferta inválida» timeout, reproduced at `2c5ab03`.
- `npm run check:layout`: exit 0, 16 required screens measured, plus `roundOffer`.
