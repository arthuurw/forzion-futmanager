# Treino e evolução verification

**Verdict**: PASS
**Profile**: light
**Diff range**: 61a48fe..fa478af
**Round**: 1 - full
**Verifier**: independent sub-agent (author != verifier)

## Binding sources

None: the plan marks no binding source (Sources is the 29/09/2026 chat brainstorm). Step 1 runs under `ui` only; this feature is `light`.

## Proof run

One invocation at HEAD `fa478af`:
`npx vitest run src/engine/training.test.ts src/engine/rollover.test.ts src/engine/balance.test.ts src/engine/condition.test.ts src/engine/live.test.ts src/store.test.ts src/ui/Squad.test.tsx src/ui/NewSeason.test.tsx src/ui/End.test.tsx --reporter=verbose` - exit 0, 9 files, 176 passed, 0 failed. Every named proof below printed its own `✓` line (e.g. `✓ src/engine/training.test.ts > evolução por rodada (treino-evolucao) > chances por idade: tabela`). Balance stdout at HEAD: C21 max drift 1.77 (5 seasons); C19 cash min/median/max 0.69 / 5.71 / 15.22; C31 20-season drift max 2.69; C73 median/initial max 18.82.

## Checks

| Check | Claim | Proof run | Evidence | Result |
| --- | --- | --- | --- | --- |
| C1 | chances by the 6 age bands, Normal, played, 38 rounds; 19 at 30 rounds | `training.test.ts` «chances por idade: tabela» ✓ | `src/engine/training.test.ts:57` - `expect(c.up).toBeCloseTo((u * 1.3) / 38, 12)`; `:58` - `expect(c.down).toBeCloseTo(d / 38, 12)` over rows `[[17,20],2.5,0]`...`[[34,36],0,4]` (:47-52, all 6 bands, both samples); `:61` - `toBeCloseTo((2.5 * 1.3) / 30, 12)` | PASS |
| C2 | T 0.5/1/1.5, absent = Normal, M 1.3/0.65; down of 32 is 2.5/38 in all 8 combos | `training.test.ts` «treino e minutos: tabela» ✓ | `src/engine/training.test.ts:73` - `toBeCloseTo((up * 1.3) / 38, 12)`; `:74` - `toBeCloseTo((up * 0.65) / 38, 12)` with cases light 1.25, normal 2.5, hard 3.75, undefined 2.5 (:67-70); `:75` - down `toBeCloseTo(2.5 / 38, 12)` for 4 trainings x 2 played | PASS |
| C3 | fake Rng: 0.2 up, 0.5 down, 0.8 stays; 95 and 40 limits; one draw per player, clubs then players | `training.test.ts` «sorteio sobe, desce ou fica» ✓ | `src/engine/training.test.ts:94-95` - `toBe(71)`, `ratingLog toEqual([...earlier, { round: 7, delta: 1 }])`; `:97-98` - `toBe(69)`, `[{ round: 7, delta: -1 }]`; `:100-101` stays 70, log unchanged; `:103-104` 95 and log `[]`; `:106-107` 40 and log `[]`; `:89` - `expect(rng.left()).toBe(0)` per single-player run; `:115-117` - `[60, 60]`, `toBe(61)` with draws `[0.8, 0.8, 0.2]` | PASS |
| C4 | finishRound: log tail `{round n, delta}`; >=2 leagues changed; changes = evolveRound on the stream `mix32(mix32(rngState,0x7e), n*16+d)` written in the test; rngState advanced once | `training.test.ts` «rodada da liga evolui pelo finishRound» ✓ | `src/engine/training.test.ts:132` - `createRng(mix32(mix32(before.rngState, 0x7e), n * 16 + d))`; `:137-138` - rating and log `toBe`/`toEqual` expected; `:142` - `expect(got.ratingLog!.at(-1)).toEqual({ round: n, delta: got.rating - old.rating })`; `:146` - `leaguesChanged.size toBeGreaterThanOrEqual(2)`; `:149` - `expect(after.rngState).toBe(advanced.getState())` | PASS |
| C5 | a cup date changes no rating and no log | `training.test.ts` «data de copa não evolui» ✓ | `src/engine/training.test.ts:162-163` - `expect(p.rating).toBe(old.rating)`, `expect(p.ratingLog ?? []).toEqual(old.ratingLog ?? [])`; `:165` - `seen toBeGreaterThan(1000)` | PASS |
| C6 | nextSeason keeps every staying rating, empties every ratingLog, advances rngState once; retirement by age still green | `rollover.test.ts` «virada sem delta de idade» ✓ and «aposentadoria por idade» ✓ | `src/engine/rollover.test.ts:185` - `expect(after.get(p.id)!.rating).toBe(60)` for ages 17..33 (`:184` each age present); `:186` - every stayer of every club `toBe(stayers.get(p.id))`; `:188` - `expect(p.ratingLog ?? []).toEqual([])` over clubs, free agents and juniors; `:192` - `expect(state.rngState).toBe(advanced.getState())`; `:240-246` retirement shares 0 / 0.15-0.25 / 0.45-0.55 / 1 / 1 | PASS |
| C7 | turn still draws on `mix32(rngState, 0x5E45 + season)` with the age draw consumed; other rngState gives another turn | `rollover.test.ts` «virada usa o próprio Rng» ✓ | `src/engine/rollover.test.ts:156` - `expect(gone).toEqual(retirements(createRng(mix32(before.rngState, 0x5e45 + before.season)), true))`; `:158-159` - not equal without the dropped draw nor with the save's Rng; `:160` - survivors `toBe(60)`; `:147` rngState advanced once; `:163` - `expect(ratings(other)).not.toEqual(ratings(a))` (clubs, free agents, juniors) | PASS |
| C8 | best-18 mean within 5 points: Brazil leagues 5 seasons (seeds 1,2,3), Série A 20 seasons (seed 5) | `balance.test.ts` «força estável em 5 temporadas» ✓, «força estável em 20 temporadas» ✓ | `src/engine/balance.test.ts:235` - `expect(Math.abs(mean - run.strength[0]![d]!)).toBeLessThanOrEqual(5)` (BR only, :233); `:512` - `expect(d).toBeLessThanOrEqual(5)` over 20 seasons of `newGame(5)` (:489); observed max 1.77 and 2.69 | PASS |
| C18 | cash guards: one club at most 18x, median 2x to 6.5x; AI median at most 20x in 20 seasons | `balance.test.ts` «caixa em 5 temporadas» ✓, «caixa da IA limitado em 20 temporadas» ✓ | `src/engine/balance.test.ts:254-255` - `toBeGreaterThanOrEqual(-2)`, `toBeLessThanOrEqual(18)`; `:257-258` - median `>= 2`, `<= 6.5`; `:528` - `expect(m).toBeLessThanOrEqual(20 * initialMedian)`; observed max 15.22x, AI median max 18.82x | PASS |
| C9 | applyRound recovery by training, 7 rows from 50 plus clamps 100 and 5 | `condition.test.ts` «recuperação pelo treino: tabela» ✓ | `src/engine/condition.test.ts:282` - `expect(club(training, 50, played)).toBe(expected)` over light/normal/hard rest 90/80/70, played 75/65/55, undefined rest 80 (:273-279); `:283` - `toBe(100)`; `:284` - `toBe(5)` | PASS |
| C10 | injuryChance 0.00125 x 0.8 / 1 / 1.3, absent 0.00125 | `live.test.ts` «chance de lesão pelo treino» ✓ | `src/engine/live.test.ts:756-759` - `toBeCloseTo(0.00125 * 0.8, 15)`, `toBeCloseTo(0.00125, 15)`, `toBeCloseTo(0.00125 * 1.3, 15)`, `injuryChance(undefined) toBeCloseTo(0.00125, 15)` | PASS |
| C11 | sideFor copies training; same events and rngState in a quiet seed; hard injures where normal does not | `live.test.ts` «treino na partida» ✓ | `src/engine/live.test.ts:768` - `expect(userSide(full).training).toBe("hard")`; `:771` - rival (absent) `toBeCloseTo(0.00125, 15)`; `:786-789` - events `toEqual(normal!.events)`, `rngState toBe(normal!.rngState)`; `:802` - normal has no injury at that minute `toBe(false)`; `:806` - `expect(found).toBe(true)` | PASS |
| C12 | setTraining("hard") in state and save; reopened Squad shows «Forte» | `store.test.ts` «treino gravado» ✓ | `src/store.test.ts:851` - `training toBe("hard")`; `:852` - `loadGame()` state `training toBe("hard")`; `:858-859` - `select.value toBe("hard")`, `selectedOptions[0].textContent toBe("Forte")` | PASS |
| C13 | selector options Leve, Normal, Forte in order; each saves light/normal/hard and shows its exact line; absent shows Normal | `Squad.test.tsx` «seletor de treino» ✓ | `src/ui/Squad.test.tsx:504` - `toEqual(["Leve", "Normal", "Forte"])`; `:505` - `toBe("Normal")` with training undefined (:500); `:514` - `training toBe(value)`; `:515` - `getByText(line)` for the 3 exact lines (:508-510) | PASS |
| C14 | ▲ «+1 na rodada 14», ▼ «−1 na rodada 20», no arrow for empty and absent log | `Squad.test.tsx` «seta de evolução» ✓ | `src/ui/Squad.test.tsx:534` - `getByLabelText("+1 na rodada 14").textContent toBe("▲")`; `:535` - `getByLabelText("−1 na rodada 20").textContent toBe("▼")`; `:537` - `queryByLabelText(/na rodada/) toBeNull()` for empty and deleted log | PASS |
| C15 | report before = rating minus the season log, after = rating: 69 to 70 and 70 to 70 | `rollover.test.ts` «relatório da temporada pelo ratingLog» ✓ | `src/engine/rollover.test.ts:203` - `toMatchObject({ before: 69, after: 70 })`; `:204` - `toMatchObject({ before: 70, after: 70 })` | PASS |
| C16 | «Nova temporada» shows Antes and Depois from the report | `NewSeason.test.tsx` «mostra aposentados contratos evolução e meta» ✓ | `src/ui/NewSeason.test.tsx:56` - `expect([cells[2], cells[3]]).toEqual([String(before.get(p.id)), String(p.rating)])` with `before` = rating minus log sum (:45); `:58` some row up/down | PASS |
| C17 | save without training and ratingLog plays a season and turns, club in Normal | `training.test.ts` «save antigo sem os campos» ✓ | `src/engine/training.test.ts:172-173` - neither field present; `:177` - `expect(user.training).toBeUndefined()`; `:178` - some log non-empty after the season; `:182` - `expect(turned.season).toBe(s.season + 1)` | PASS |

## Coverage

Under `light` the join is not recomputed as a gate step; each row below was nevertheless checked against the proof it names while citing the checks above.

| Set (size) | Recomputed from | Member -> proof | Unproven |
| --- | --- | --- | --- |
| age bands (6) | `EVOLUTION` in `src/engine/training.ts:14-21` | C1 table, all 6 bands, both samples | - |
| training with absent (4) | `Training` in `src/engine/types.ts` | C2 light, normal, hard, undefined | - |
| played (2) | `PLAYED_UP` / `BENCH_UP` | C2 true, false | - |
| draw outcome (3) | `evolvePlayer` | C3 up, down, stays | - |
| rating limits (2) | `RATING_MAX` / `RATING_MIN` | C3 95, 40 | - |
| date kind (2) | `finishRound` / `finishCupDate` | C4 league, C5 cup | - |
| recovery by training with absent (7) | `TRAINING_RECOVERY` x rest/played | C9 all 7 rows | - |
| injury by training with absent (4) | `TRAINING_INJURY` | C10 all 4 | - |
| training lines (3) | `TRAINING_LINE` in `src/ui/Squad.tsx` | C13 all 3 exact | - |
| arrow states (4) | `Trend` in `src/ui/Squad.tsx` | C14 up, down, empty, absent | - |
| doors (3) | plan Landing | door 1 C12, C17; door 2 C4, C6, C17; door 3 C4, C7 | - |

## Swept existing

- failure modes (C12): `setTraining` goes through `editLineup` (`src/store.ts:522`, `:315-326`) to `persist`, which sets `saveStatus: "failed"` on a failed write (`src/store.ts:240-241`). The cited constraint is there.
- concurrency (n/a): the write goes through `writeQueue` (`src/store.ts:235-236`). Present.
- idempotency (C4): the expected changes come from a fresh `createRng` of the same seed (`training.test.ts:132`), so the same state gives the same changes.

## Superseded and modified pre-existing tests

| Test | Change | Documented | Judgment |
| --- | --- | --- | --- |
| `rollover.test.ts` «virada usa o próprio Rng» | probe from 8 age-22 deltas to 8 age-34 retirements, with the dropped age draw | Superseded row multiplas-temporadas C19 -> C7; `multiplas-temporadas/checks.md` C19 annotated | legitimate: stream, salt and consumed draw still pinned by `toEqual` plus two `not.toEqual` controls |
| `rollover.test.ts` «evolução por idade» -> «virada sem delta de idade» | band min/max and 95/40 clamps replaced by delta 0 at the turn | Superseded row multiplas-temporadas C21 -> C1, C6; C21 annotated | legitimate: behaviour removed by AC 9; the clamps moved to C3 |
| `balance.test.ts` «caixa em 5 temporadas» | max 15 -> 18 | Superseded row C19/C34 -> C18, AD-023, Handoff | legitimate by the author's decision; observed 15.22 needs it; median and min unchanged |
| `live.test.ts` «semente das ligas novas» | fixture undoes round 1 evolution | Superseded row paises C8 | legitimate: snapshot expectation unchanged |
| `End.test.tsx` «resumo da temporada» | `getByText` single -> `getAllByText` length `1 + cupTitles` | Superseded row, marked fixture | legitimate: count is still exact, cup titles read from the finals |
| `NewSeason.test.tsx` «mostra...» | `before` = rating minus log sum | Superseded row multiplas-temporadas C17 -> C15, C16 | legitimate: matches the plan's Impact redefinition |
| `store.test.ts`, `condition.test.ts`, `Squad.test.tsx` | additions only | n/a | no pre-existing assertion changed |

## Observations (non-blocking)

1. C6 - `src/engine/rollover.test.ts:177-178`: the seeded logs on the juniors are moot, since juniors are regenerated at the turn (`src/engine/rollover.ts:265`) before the log is deleted; the free agent seeded at `freeAgents[0]` may be cut at `rollover.ts:239-252`. The end-state assertion at `:188` still covers every player, so the claim holds; only the per-list exercise of `delete p.ratingLog` (`rollover.ts:282`) is unshown.
2. C6 - `src/engine/rollover.test.ts:172`: the explicit fixture samples ages 17..33; the 34+ band is covered only through generated stayers in the all-stayers loop (`:186`), not asserted to be present. The implementation has no per-age branch at the turn.
3. C17 - `src/engine/training.test.ts:170`: «abre» is exercised in memory from `newGame`, not through `loadGame`/`decodeSaveFile`; the loaders are untouched by the diff and C12 proves the load round trip with the new field.
4. C4 - `src/engine/training.test.ts:133`: the expected value is built with production `evolveRound` and `applyRound` (tension with L-004), as the approved check text prescribes; `evolveRound` itself is pinned by C3's literals.
5. C18 - AI median reached 18.82x against the 20x bound (`balance.test.ts:528`), little headroom.

## Gate

`node scripts/proof-check.mjs` - 627 selectors, 23 from Superseded checks, 0 orphans, exit 0
`npx vitest run` - 46 files, 580 passed, 0 failed
`npx eslint src` - exit 0, no findings
`npx tsc --noEmit -p .` - exit 0
