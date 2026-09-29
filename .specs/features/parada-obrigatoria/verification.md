# Parada obrigatória verification

**Verdict**: PASS
**Profile**: light
**Diff range**: e9fdd10..8f2e50f
**Round**: 2 - scoped
**Verifier**: independent sub-agent (author != verifier)

Scope: round 1 (at `06d7c74`) failed only C4. The fix is `06d7c74..8f2e50f`, a test-only change to `src/engine/live.test.ts` (test `pular preenche as vagas do usuário`, lines 682-742; nothing above line 680 moved). Per the re-verify rules: every proof re-run at `8f2e50f`, C4 re-judged in full, citations refreshed in the touched file, everything else carried from `06d7c74` and marked so.

## Binding sources

Carried from 06d7c74. Profile light: step 1 does not run. There is no `plan.md` (small-change escape); the `## Intent` section of `checks.md` and AD-022 / AD-019 in `.specs/STATE.md` were read as the plan. The design was approved in chat, so there is no binding source to open. The fix did not touch the interface.

## Proof runs (verified at 8f2e50f)

- One invocation over the three proof files: `npx vitest run src/engine/live.test.ts src/store.test.ts src/ui/Live.test.tsx --reporter=verbose` - exit 0, 3 files, 91 tests passed, 0 failed.
- Each of the 14 named proofs appears on its own `✓` line in that run:
  - `src/engine/live.test.ts > rodada ao vivo (engine) > playRound equivale a rodada ao vivo sem decisões`
  - `src/engine/live.test.ts > parada obrigatória (parada-obrigatoria) > parada só do usuário no minuto`
  - `... > troca obrigatória: tabela`
  - `... > goleiro expulso: reserva entra no gol`
  - `... > pular preenche as vagas do usuário`
  - `src/store.test.ts > o save sobrevive (correcoes-validacao) > reload no ao vivo fecha a rodada`
  - `src/store.test.ts > parada obrigatória (parada-obrigatoria) > lesão do usuário para o relógio`
  - `... > continuar bloqueado até a troca`
  - `... > pular para o fim preenche a lesão`
  - `... > reabrir com lesão preenche a vaga`
  - `src/ui/Live.test.tsx > parada obrigatória (parada-obrigatoria) > aviso da parada`
  - `... > continuar desabilitado até substituir`
  - `... > seguir com 10`
  - `... > parada abre seu time`
- Existence: `src/engine/live.test.ts:78, 609, 631, 657, 682` (unchanged by the fix, which only edits lines 683-741); `src/store.test.ts:679, 772, 797, 815, 827` and `src/ui/Live.test.tsx:643, 659, 671, 687` carried from 06d7c74 (files untouched by the fix).

## Checks

| Check | Claim | Proof run | Evidence | Result |
| --- | --- | --- | --- | --- |
| C1 | `userStops` returns the user's `injury`/`red` of `live.minute`, in narration order; not other clubs, earlier minutes or `yellow`; `[]` with null `userClubId` | batch at 8f2e50f, `parada só do usuário no minuto` ✓ | carried from 06d7c74: `src/engine/live.test.ts:624` - `expect(userStops(live)).toEqual([{ minute: 10, type: "injury", clubId: me, playerId: "a" }, { minute: 10, type: "red", clubId: me, playerId: "c" }])` with the minute-9 injury, the `yellow`, the rival's injury and the other match's red pushed beside them (616-623); `:628` - `expect(userStops({ ...live, userClubId: null })).toEqual([])` | PASS |
| C2 | `forcedVacancy` over all 8 cases | batch at 8f2e50f, `troca obrigatória: tabela` ✓ | carried from 06d7c74: `src/engine/live.test.ts:647` - `expect(cases).toHaveLength(8)`; `:653` - `expect(forcedVacancy(live), name).toEqual(expected(side))`, literal expectations at 634-645 (`{ slot: 10, why: "injury" }`, `{ slot: gkSlot(s), why: "red" }`, `null` for the other 6); preconditions at 650-651 | PASS |
| C3 | Keeper sent off: bench keeper for an outfield slot goes in goal, outfield player to `subbedOff`, vacancy moves to the outfield slot, `subsUsed` +1, `substitution` narrated; a non-keeper does a plain swap | batch at 8f2e50f, `goleiro expulso: reserva entra no gol` ✓ | carried from 06d7c74: `src/engine/live.test.ts:667` `expect(s.slots[gk]).toBe(keeper)`; `:669` `expect(s.vacancy[outSlot]).toEqual({ why: "red", playerId: expelled })`; `:671` `expect(s.subbedOff).toContain(outId)`; `:672` `expect(s.subsUsed).toBe(1)`; `:673` `toEqual({ minute: 10, type: "substitution", clubId, playerId: outId, playerInId: keeper })`; plain swap `:677-679` `plain.slots[outSlot]).toBe(other)`, `plain.slots[gk]).toBeNull()` | PASS |
| C4 | `runToEnd(live, { fillUserVacancies: true })` fills the user's vacancies by the AI rule: injury -> best same-position reserve, or any reserve if none; keeper sent off -> bench keeper in goal and the worst outfield player goes off; user side has no injury vacancy at the end while `subsUsed < 5` and a reserve exists; without the option, same as `step` to 90 | batch at 8f2e50f, `pular preenche as vagas do usuário` ✓ and `playRound equivale a rodada ao vivo sem decisões` ✓ | verified at 8f2e50f. **Best same-position:** `src/engine/live.test.ts:700` `expect(sameBench.length).toBeGreaterThan(1)` (makes "best" discriminating); `:705` `expect(sub.playerId).toBe(injured)`; `:706` `expect(sub.playerInId).toBe(best(live, sameBench))`. **Any reserve if none:** bench stripped of the slot's position at `:718`; `:723` `expect(n.live.players[anySub.playerInId!]!.position).not.toBe(nPos)`; `:724` `expect(anySub.playerInId).toBe(best(n.live, others))`. **Keeper sent off:** `:737` `expect(keepers).toContain(keeperSub.playerInId)`; `:738` `expect(outfield).toContain(keeperSub.playerId)`; `:739` `expect(k.live.players[keeperSub.playerId!]!.rating).toBe(lowest)`; `:740` `expect(userSide(done).subbedOff).toContain(keeperSub.playerId)`; `:741` `expect(keepers).toContain(userSide(done).slots[gk])`. **No injury hole at the end:** `:708` `expect(end.subsUsed === MAX_SUBS <or> end.bench.length === 0).toBe(true)` for every injury vacancy (logical-or written as `<or>` so the table parses). **Without the option:** `:712-713` vacancy stays; `:85-86` `expect(viaLive).toEqual(direct)` / `expect(viaSteps).toEqual(direct)`. **Independence:** `best` (`:692-693`, sort by raw `rating` desc, ties by id) and `lowest` (`:733`, `Math.min` over raw ratings) are computed in the test; neither calls `bestFor`, `ownSlotRating` or `effectiveRating` (`src/engine/live.ts:265-271, 306-309`). They agree with production only because the fixture neutralizes the other factors: fitness 100 and morale 0 on every player and in `side.fitness` (`:688-689`), every starter in his own position (asserted at `:732`), and `OUT_OF_POSITION_FACTOR` is a single constant (`src/engine/strength.ts:4, 14`), so `effectiveRating` is monotone in `rating` for both the same-position and cross-position candidates. The test states that premise in its comment (683-685) | PASS |
| C5 | `tick()` with a user injury/red at 1-89 -> `paused` + `liveStop`; at 45 -> `halftime` + `liveStop`; rival injury -> `running`, `liveStop = null` | batch at 8f2e50f, `lesão do usuário para o relógio` ✓ | carried from 06d7c74: `src/store.test.ts:781` `expect(useGame.getState().clock).toBe("paused")`; `:782` `expect(useGame.getState().liveStop).toEqual(stops)`; `:787` `toBe("halftime")`; `:788` `liveStop!.map((e) => e.minute)).toContain(45)`; `:793` `toBe("running")`; `:794` `liveStop).toBeNull()` | PASS |
| C6 | `resume()` blocked while `forcedVacancy` is non-null; after `substitute`, `running` and `liveStop = null`; outfield red resumes at once | batch at 8f2e50f, `continuar bloqueado até a troca` ✓ | carried from 06d7c74: `src/store.test.ts:803` `expect(useGame.getState().clock).toBe("paused")`; `:806` `toBe("running")`; `:807` `liveStop).toBeNull()`; `:812` `toBe("running")` for the outfield red | PASS |
| C7 | `skipToEnd()` fills the user's injury vacancy; reopening with `pendingLive` closes the date as `runToEnd(startRound(save), { fillUserVacancies: true })` | batch at 8f2e50f, `pular para o fim preenche a lesão` ✓, `reload no ao vivo fecha a rodada` ✓, `reabrir com lesão preenche a vaga` ✓ | carried from 06d7c74: `src/store.test.ts:822-824` `expect(sub).toBeDefined()`, `expect(sub!.minute).toBe(11)`, `expect(bench).toContain(sub!.playerInId)`; `:720` / `:722` `toEqual(expected)` with `expected` built in the test from `makeMatch` + `runToEnd(..., { fillUserVacancies: true })` (668-675); `:840` `expect(sub).toBeDefined()` after `init()` | PASS |
| C8 | Stop notice `role="status"` named «Parada», exact text for the 4 cases | batch at 8f2e50f, `aviso da parada` ✓ | carried from 06d7c74: `src/ui/Live.test.tsx:655` `expect(notice().textContent, name).toBe(text(who!))` with the 4 literal templates at 646-649; `notice()` = `getByRole("status", { name: "Parada" })` (:641) | PASS |
| C9 | «Continuar» disabled with a forced swap, «Sai» preselected on the injury slot, enabled after «Substituir», notice gone on resume | batch at 8f2e50f, `continuar desabilitado até substituir` ✓ | carried from 06d7c74: `src/ui/Live.test.tsx:662` `toBeDisabled()`; `:663` `(getByLabelText("Sai")).value).toBe("10")`; `:665` `toBeEnabled()`; `:667` `clock).toBe("running")`; `:668` `queryByRole("status", { name: "Parada" })).toBeNull()` | PASS |
| C10 | After an outfield red, the button reads «Seguir com 10» (9 with two) and starts the clock | batch at 8f2e50f, `seguir com 10` ✓ | carried from 06d7c74: `src/ui/Live.test.tsx:674` `queryByRole("button", { name: "Continuar" })).toBeNull()`; `:675-676` click «Seguir com 10» then `clock).toBe("running")`; `:684` `getByRole("button", { name: "Seguir com 9" })).toBeEnabled()` | PASS |
| C11 | On a stop, «Seu time» is `aria-selected="true"` | batch at 8f2e50f, `parada abre seu time` ✓ | carried from 06d7c74: `src/ui/Live.test.tsx:695` `toHaveAttribute("aria-selected", "false")` before the stop; `:697` `toHaveAttribute("aria-selected", "true")` after `liveStop` is set | PASS |

## Pre-existing assertions (weakening check)

Carried from 06d7c74 for the feature range: in `src/store.test.ts`, `reload no ao vivo fecha a rodada` moved `seededGame(13)` -> `seededGame(16)` (store.test.ts:703) and `expectedScore` now uses `runToEnd(..., { fillUserVacancies: true })` (668-675); both legitimate, all assertions unchanged.

Verified at 8f2e50f for the fix: `git diff 06d7c74..8f2e50f` touches only `src/engine/live.test.ts`, inside the feature's own test `pular preenche as vagas do usuário`. Every round-1 assertion is kept or tightened: `toContain(sub.playerInId)` became `toBe(best(live, sameBench))`, `sameBench.length > 0` became `> 1`, and the keeper case gained the outfield-player assertions (737-741). The `:708` end-of-match loop and the no-option case (712-713) are unchanged. No production file changed, so no other check's evidence could move.

## Swept

Carried from 06d7c74 (the fix touched no production code):

- validation (C3): present. `substitute` has the keeper branch at `src/engine/live.ts:651-662`; otherwise `bringOn` in the chosen slot. Proven by C3.
- failure modes (C2): present. `forcedVacancy` returns `null` when `subsUsed >= MAX_SUBS` or the bench is empty (`src/engine/live.ts:628`) and when there is no bench keeper (:630). `resume` then proceeds (`src/store.ts:573`). Proven by C2 and C6.
- concurrency (n/a): the constraint it cites is present. `tick` returns early unless `clock === "running"` and not `finishing` (`src/store.ts:555`), and `resume` returns early on `!live || finishing` (`:573`).
- state transitions (C5, C6, C10), observability (C8): covered by those rows.
- idempotency, authorization, data lifecycle, dependency failure: `n/a`, approved policy.

## Gate

Verified at 8f2e50f:

- `npx vitest run` - 45 files, 567 passed, 0 failed (exit 0). Same count as round 1: the fix edited an existing test and added none.
- Real tree `git status --porcelain` unchanged (only this report, untracked).

## Observations (non-blocking)

- C5 (carried from 06d7c74, still true): the red-card stop is proven only at engine level (C1). The store's `tick` (`src/store.ts:560-561`) treats both types the same way. The 1-89 range is sampled at minute 21; the `< MATCH_MINUTES` bound at 89/90 is not exercised.
- C8 (carried from 06d7c74, still true): `stopLine` renders a fifth string, `Goleiro expulso: {nome}.`, for a keeper sent off with no swap possible (`src/ui/Live.tsx`, `stopLine`). No check names it or proves it. The checks' `avisos (4)` set is smaller than what the code renders.
- C4 (new, verified at 8f2e50f): the expected values are independent of production only under the fixture's neutral fitness/morale (688-689) and all-in-position starters (732). If the rule later weighs something other than `rating`, `best`/`lowest` would need to follow. The "any reserve" case does not assert `others.length > 1`, so on this seed "best of any position" may be trivially the only candidate; the claim ("any reserve") is still met. The keeper case asserts the leaving player's rating equals the minimum rather than a specific id, so a tie at the minimum would pass either way, which matches the claim ("the worst").
