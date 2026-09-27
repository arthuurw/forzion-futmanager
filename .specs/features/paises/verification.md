# Países verification

**Verdict**: PASS
**Profile**: light
**Diff range**: 889aa71..f29bd2646f76953f9c16a574951d2c608cdc5c2c
**Round**: 1 - full
**Verifier**: independent sub-agent (author != verifier)

34/34 checks proven at `HEAD` (`f29bd26`) with a located assertion each. The full gate is green. Two findings about the old tests are recorded below. Neither one leaves a check unproven: one old expected value was changed outside the literal Superseded table, and one Superseded row predicted a count that AC 18 made wrong. The check verdicts are unchanged by them. See "Superseded audit".

Checks are read as they stand at `HEAD`. That includes the author-approved renegotiations inside the range: `ff97254` lowered the C24 median floor from 2× to 1.2×, and `ce5b404` reworded C8 and added AC 30 and C34.

## Proof run

One invocation over the 18 proof files with one `-t` alternation of all 39 distinct proof names, verbose reporter:

`npx vitest run src/engine/generate.test.ts src/engine/season.test.ts src/engine/live.test.ts src/engine/finance.test.ts src/engine/cup.test.ts src/engine/rollover.test.ts src/engine/board.test.ts src/ui/End.test.tsx src/engine/market.test.ts src/ui/Market.test.tsx src/ui/ChooseClub.test.tsx src/ui/Round.test.tsx src/ui/History.test.tsx src/ui/NewSeason.test.tsx src/app.test.tsx src/engine/balance.test.ts src/engine/migrate.test.ts src/persistence/save.test.ts --reporter=verbose -t "<39 names>"`

The run exited 0. Test Files: 18 passed. Tests: 40 passed, 229 skipped.

40 = 39 names + 1, because `caixa em 5 temporadas` matches two tests: C26's (`balance.test.ts` > «caixa em 5 temporadas», BR only, median 2×-4×) and C24's (`balance.test.ts` > «caixa em 5 temporadas dos países novos»). Both appear individually as ✓, and each row below cites the test that asserts its own claim. The verbose output also shows every other named test on its own line as ✓, so no name matched nothing.

Measured bands, from the same run:
- C24 AR: min 0.31, median 3.19, max 9.91
- C24 PT: min -0.34, median 1.67, max 8.96
- C26 BR 5 seasons: min -0.45, median 3.21, max 11.21
- C26 one season (Série A): min 1.01, median 1.50, max 2.25
- C25 largest drift: 3.13 (PT, seed 1)
- BR largest strength drift: 4.18

Independent confirmation of the v6 snapshot, which C6, C8, C27 and C28 lean on:
- I put `src/engine/__fixtures__/snapshot-v6.json` and `v6-saves.json` into a scratch worktree at `889aa71` and ran a throwaway test there.
- In `889aa71`'s own `newGame(1..3)`, the Série A, Série B, market, `rngState` and the round 1-2 results of both divisions all equal the snapshot.
- `v6-saves.round0` matches `889aa71`'s `newGame(5)` in Série A ids and free agents.
- So the snapshot really predates the engine change and is not tautological.
- The worktree was removed. The real tree's porcelain was empty before and after.

## Checks

| Check | Claim | Proof run | Evidence | Result |
| --- | --- | --- | --- | --- |
| C1 | 4 leagues l1-l4, BR BR AR PT, tier 0 1 0 0 | combined run: ✓ generate.test.ts > quatro ligas em ordem | `src/engine/generate.test.ts:236` - `expect(s.leagues.map((l) => [l.id, l.country, l.tier])).toEqual([["l1","BR",0],["l2","BR",1],["l3","AR",0],["l4","PT",0]])` | PASS |
| C2 | AR c41-c60, PT c61-c80, 22 players each as 3/7/7/5 | combined run: ✓ ligas novas com 20 clubes de 22 | `src/engine/generate.test.ts:251` - `toEqual(expectIds(41))`; `:252` - `toEqual(expectIds(61))`; `:259` - `expect(shape, c.id).toEqual(SQUAD_3775)` (literal `{GK:3,DF:7,MF:7,FW:5}`) | PASS |
| C3 | 20 identities each, unique across 80, 1-3 colours plus pattern, league names = list, deny-list of real clubs | combined run: ✓ identidades fictícias dos países novos | `src/engine/generate.test.ts:270` - `expect(new Set(all).size).toBe(80)`; `:275` - `expect(id.name.toLowerCase()).not.toContain(real.toLowerCase())` over the 18 literal names | PASS |
| C4 | AR/PT first names from their own list; lists differ; no name repeats across 4 leagues, free agents and juniors | combined run: ✓ nomes de jogador por país | `src/engine/generate.test.ts:293` - `expect(list, p.name).toContain(first(p.name))`; `:300` - `toHaveLength(80 * 22 + 40 + 3)`; `:301` - `expect(new Set(names).size).toBe(names.length)` | PASS |
| C5 | base AR 60-76, PT 58-80; strongest-weakest mean gap of at least 10 | combined run: ✓ força dos países novos | `src/engine/generate.test.ts:306` - `expect(LIGA_ARGENTINA.base).toEqual({ min: 60, max: 76 })`; `:307` PT `{ min: 58, max: 80 }`; `:312` - `toBeGreaterThanOrEqual(10)` | PASS |
| C6 | seeds 1-3: Série A, Série B, market and rngState equal the v6 snapshot | combined run: ✓ Brasil igual ao snapshot v6 | `src/engine/generate.test.ts:327` - `expect(withoutDoor1(s.leagues[0])).toEqual(v6.serieA)`; `:330` - `expect(s.rngState).toBe(v6.rngState)`. The snapshot was independently confirmed from 889aa71 | PASS |
| C7 | after playRound, the 4 leagues are at currentRound 1 and all 10 round-1 matches have results | combined run: ✓ quatro ligas jogam a rodada | `src/engine/season.test.ts:124` - `expect(league.currentRound, league.id).toBe(1)`; `:126` - `expect(m.result).not.toBeNull()` | PASS |
| C8 | k=2,3 round-1 scores equal the live engine with the door-2 seed written out; the rejected seed differs; Série A and B rounds 1-2 equal the snapshot | combined run: ✓ semente das ligas novas | `src/engine/live.test.ts:424` - `toEqual(replay((i) => mix32(mix32(mix32(s.rngState, 0xe0), k), 1 * 16 + i)))`; `:426` - `not.toEqual(replay((i) => mix32(mix32(s.rngState, 0xa + k), 1 * 16 + i)))`; `:432` - `toEqual(snapshot[seed]!.results)` | PASS |
| C9 | full sponsorship in round 1; prize (21 - pos) × 250,000 in round 38, AR and PT | combined run: ✓ patrocínio e prêmio dos países novos | `src/engine/finance.test.ts:444` - `expect(club.finance.lastRound!.sponsorship).toBe(club.finance.sponsorship)`; `:453` - `toBe((21 - (i + 1)) * 250_000)` | PASS |
| C10 | cup seeding = the 40 BR ids; no c41-c80 in any tie of the season | combined run: ✓ copa nacional só com o Brasil | `src/engine/cup.test.ts:523` - `expect(new Set(seeding)).toEqual(brazil)`; `:529`-`:530` - `expect(abroad(t.homeId / t.awayId)).toBe(false)` over all 39 ties | PASS |
| C11 | Série A and B swap 4 each; AR and PT id sets unchanged | combined run: ✓ sobe e desce só no Brasil | `src/engine/rollover.test.ts:572` - `expect([...now].filter((id) => !was.has(id))).toHaveLength(4)`; `:574` - `expect(ids(state, k)).toEqual(ids(before, k))` | PASS |
| C12 | history record has 4 divisions l1-l4 with champion and scorer; l3/l4 promoted and relegated empty | combined run: ✓ histórico com as quatro ligas | `src/engine/rollover.test.ts:581` - `toEqual(["l1", "l2", "l3", "l4"])`; `:584` topScorer not null; `:588`-`:589` - `expect(d.promotedIds / d.relegatedIds).toEqual([])` | PASS |
| C13 | no-relegation goal by rank 1/10/17/20 gives 4/13/20/20 with «até o Nº» | combined run: ✓ meta em liga sem rebaixamento | `src/engine/board.test.ts:117` - `expect(userBoardGoal(s)).toBe(goal)`; `:118` - `expect(goalLabel(divisionAt(s.leagues, k), goal)).toBe(label)` over literal rows, both leagues | PASS |
| C14 | goal 16 at 16/17/20 gives met/missed/missed; Série A 16 at 17 fired; goal 8 at 13 fired, at 12 missed | combined run: ✓ veredito em liga sem rebaixamento | `src/engine/board.test.ts:140` - `expect(verdictFor(divisionAt(leagues, k), goal, position)).toBe(verdict)` over the literal table, including `:133` `[0, 16, 17, "fired"]` and `:134` `[2, 8, 13, "fired"]` | PASS |
| C15 | offers = ranks p+1..p+3 of all 80 by best-11 mean (computed in the test); at least one offer from abroad | combined run: ✓ propostas de emprego de qualquer país | `src/engine/board.test.ts:154` - `expect(offers).toEqual(ranking.slice(p + 1, p + 4))` for p = 0..76; `:162` - `expect(fromAbroad).toBeGreaterThan(0)` | PASS |
| C16 | cup goal by the BR-only rank (fixture where rank among 40 and among 80 differ); AR/PT user gives -1 | combined run: ✓ meta de copa só com o Brasil | `src/engine/board.test.ts:180` - `expect(among80).not.toBe(among40)`; `:181` - `expect(userCupGoal(...)).toBe(among40)`; `:182` - `.toBe(-1)` for every club of l3 and l4 | PASS |
| C17 | Série A user buys from AR: contract 3; buyer cash drops by the price; seller cash rises by it | combined run: ✓ comprar de clube de outro país | `src/engine/market.test.ts:1189` - `contractSeasons).toBe(3)`; `:1190` - `toBe(cashBefore - price)`; `:1192` - `toBe(sellerBefore + price)` | PASS |
| C18 | Comprar filter starts on the user's country (BR, BR, AR, PT); «Portugal» lists only c61-c80, 20 × 22 rows counted against squads | combined run: ✓ filtro de país na lista comprar | `src/ui/Market.test.tsx:283` - `expect(select.selectedOptions[0]!.textContent).toBe(country)` for divisions 0-3; `:295` - `expect(squads).toBe(20 * 22)`; `:296` - `expect(rows).toHaveLength(squads)`; `:298` - every row's club is Portuguese | PASS |
| C19 | AI buy picks the BR second-best over the AR best; sale from the red goes to the richest PT club, not the richest overall (BR) | combined run: ✓ IA negocia só no próprio país | `src/engine/market.test.ts:1205` - `has(q.s, q.buyer.id, second.id)).toBe(true)`; `:1206` - best not bought; `:1224` - `has(s, portuguese.id, star.id)).toBe(true)`; `:1225` - `has(s, rich.id, star.id)).toBe(false)` | PASS |
| C20 | PT user gets offers only from c61-c80 over 20 window rounds | combined run: ✓ propostas vêm da liga do usuário | `src/engine/market.test.ts:1248` - `expect(windows).toBe(20)`; `:1250`-`:1251` - every buyer id between 61 and 80 | PASS |
| C21 | ChooseClub has 4 tabs; PT tab lists its 20 and picking one makes it the user's club; Tabela offers 4 leagues and opens on the user's | combined run: ✓ abas das quatro ligas; ✓ tabela escolhe entre as quatro ligas | `src/ui/ChooseClub.test.tsx:67` - tabs `toEqual(["Série A","Série B","Liga Argentina","Liga Portuguesa"])`; `:72` - `toHaveLength(20)`; `:76` - `userClubId).toBe(clubs[7]!.id)`; `src/ui/Round.test.tsx:214` - 4 options; `:215` - `toBe("Liga Argentina")` | PASS |
| C22 | History shows the 4 champions with league names; End and NewSeason show «Liga Portuguesa» and «até o Nº»; content inside `.fill` | combined run: ✓ campeões das quatro ligas; ✓ fim com usuário em Portugal; ✓ nova temporada com usuário em Portugal | `src/ui/History.test.tsx:178` - `headers(abroad)).toEqual(["Temp.", "Campeão Liga Argentina", "Campeão Liga Portuguesa"])`; `:179`; `:180` `.fill`; `src/ui/End.test.tsx:204` - `Sua posição: ${position}º na Liga Portuguesa`; `:206` - `Meta: até o 16º`; `:212` `.fill`; `src/ui/NewSeason.test.tsx:115` - `Temporada 2 · Liga Portuguesa · Meta: até o ${goal}º`; `:116` `.fill` | PASS |
| C23 | through the app: pick a PT club, play a round, Tabela shows PT with 20 rows including the user | combined run: ✓ usuário em Portugal joga e vê a tabela | `src/app.test.tsx:326` - `toBe("Liga Portuguesa")`; `:328` - `expect(rows).toHaveLength(20)`; `:331` - `expect(names).toContain(me.name)` | PASS |
| C24 | AR and PT cash after 5 seasons between -2× and 15×; median per league between 1.2× and 4× | combined run: ✓ caixa em 5 temporadas dos países novos | `src/engine/balance.test.ts:312` - `toHaveLength(60)`; `:315`-`:316` - `-2` / `15`; `:320` - `expect(median).toBeGreaterThanOrEqual(1.2)`; `:321` - `toBeLessThanOrEqual(4)` | PASS |
| C25 | AR/PT best-18 mean within 5 of season 1, every season | combined run: ✓ força estável dos países novos | `src/engine/balance.test.ts:335` - `expect(x).toBeLessThanOrEqual(5)` for d = 2, 3, every season and seed | PASS |
| C26 | the 4 BR bands measured only over BR, with today's limits | combined run: ✓ caixa em 5 temporadas; ✓ compras da IA em 5 temporadas; ✓ força estável em 5 temporadas; ✓ caixa equilibrado em uma temporada | `src/engine/balance.test.ts:243`-`:244` - BR filter and `toHaveLength(120)`; `:249`-`:253` - `-2`/`15`, median `2`/`4` (limits unchanged vs 889aa71); `:260` - `brazil(t.toId)`; `:274`-`:275` - `50`/`600`; `:231`/`:233` - BR only, `toBeLessThanOrEqual(5)`; `:119`-`:123` - Série A only (as before), `0.5`/`2.5` | PASS |
| C27 | v6 at round 0 migrates to v7; l3/l4 equal newGame; A/B gain BR/tier; the rest equals v6 | combined run: ✓ v6 vira v7 na rodada 0 | `src/engine/migrate.test.ts:435`-`:436` - `expect(s.leagues[2/3]).toEqual(fresh.leagues[2/3])`; `:441` - country/tier table; `:443` - `expect(backToV6(s)).toEqual(v6)` | PASS |
| C28 | v6 at round 12: new leagues at round 12; scores replayed with door 2 over mix32(seed, 10); initial cash; fitness 100; nothing of BR, market, cup or user changes | combined run: ✓ v6 no meio da temporada ganha os países | `src/engine/migrate.test.ts:452` - `backToV6(s)).toEqual(v6)`; `:455` - `currentRound).toBe(12)`; `:479` - `toEqual(replay)` with base `mix32(mix32(mix32(seed, 10), 0xe0), k)`; `:483` cash; `:485` - `fitness).toBe(100)` | PASS |
| C29 | v1-v5 fixtures reach v7 with 4 leagues | combined run: ✓ cadeia até v7 | `src/engine/migrate.test.ts:396` - `expect(s.schemaVersion).toBe(7)`; `:398`-`:403` - l1-l4 with country and tier, for each of v1..v5 (`:383` adds v5) | PASS |
| C30 | schemaVersion 8 incompatible; 7 loads | combined run: ✓ versão acima de 7 incompatível | `src/engine/migrate.test.ts:304` - `toEqual({ kind: "incompatible", version: 8 })`; `:310` - `expect(r.state).toBe(v7)` | PASS |
| C31 | v7 save with an AR user round-trips through fake-indexeddb with country and tier | combined run: ✓ save v7 com países | `src/persistence/save.test.ts:205` - `expect(loaded.state).toEqual(expected)`; `:212` - country/tier table | PASS |
| C32 | SCHEMA_VERSION is 7 | combined run: ✓ quatro ligas em ordem | `src/engine/generate.test.ts:242` - `expect(SCHEMA_VERSION).toBe(7)` | PASS |
| C33 | no club ever sits in a league of another country, over 5 seasons of seeds 1-3 | combined run: ✓ clube nunca muda de país | `src/engine/balance.test.ts:343` - `expect(run.countryMoves).toEqual([])` (collected after every round and every turn) | PASS |
| C34 | fired user's destination and old club both have at least 22; AI-renewable contracts renewed at the destination; userClubId is the destination; End «demitido escolhe proposta» unchanged | combined run: ✓ clube do demitido passa pela virada da IA; ✓ demitido escolhe proposta | `src/engine/rollover.test.ts:549` - `userClubId).toBe(pick)`; `:551`-`:552` - `toBeGreaterThanOrEqual(22)` for both; `:556` - renewed young players still there with `contractSeasons >= 1`; `:558` - 34-year-old gone (L-007); `src/ui/End.test.tsx:100` `user.click(offers[2]!)` and `:104` `toBe(below[2]!.id)`: `git diff 889aa71..HEAD` of that test is empty (896eaeb's change to `offers[0]` was reverted in 60792d8) | PASS |

## Superseded audit

I read every old test whose lines changed in `889aa71..HEAD` against the checks' Superseded table and its rule: fixture changes are allowed, but any other change to an expected value means stopping to ask.

| Old test (file:line) | Expected value changed? | Covered by | Judgment |
| --- | --- | --- | --- |
| rollover «histórico da temporada» `src/engine/rollover.test.ts:390`-`:403` | yes: two division records added (l3, l4 with empty lists); l1/l2 records identical | not literally in any row. Nearest is «contagens de ligas e clubes» | **Finding 1** (see below) |
| rollover «4 descem 4 sobem» `src/engine/rollover.test.ts:76` | no: the set of all clubs was narrowed to BR leagues | fixture/normalization rule | ok |
| season «propostas…» `src/engine/season.test.ts:81`-`:88` | yes: 40 to 80 ranking | multiplas-temporadas AC 34 row (C15) | ok |
| season verdict table `src/engine/season.test.ts:69` | no: the index becomes `divisionAt(...)`; rows unchanged | «índice da liga como divisão» row | ok |
| Live «gol muda placar» `src/ui/Live.test.tsx:111`-`:114` | no: the search is narrowed to the on-screen league; assertion intact | fixture/normalization rule | ok |
| Live and live.test 20 to 40 matches | yes | «contagens» row | ok |
| End «demitido escolhe proposta» | no (net diff empty) | C34 | ok |
| Market.test «mercado com as duas divisões» `src/ui/Market.test.tsx:191` | no: stays `39 * 22 + 40`; club loop narrowed to BR | see Finding 2 | ok |
| market.test aiOrder `src/engine/market.test.ts:515` | yes: 39 to 79 | «contagens» row | ok |
| market.test two heavy tests, balance «caixa equilibrado» (f29bd26) | no: only a `90_000` timeout added | n/a | ok |
| balance «caixa / compras / força em 5 temporadas» | no limit changed; BR-only filter | C26 row | ok |
| migrate, save, Home, generate version literals 6 to 7 and 7 to 8 | yes | version-literal row (C29, C30, C32) | ok |
| migrate v4/v5/v6 equality tests | no: country/tier stripped and leagues abroad sliced before the same `toEqual` | fixture/normalization rule | ok |
| calendar, store, app `currentRound` / `leagues` length 2 to 4 | yes | «contagens» row | ok |
| Squad, ChooseClub option/tab lists 2 to 4 labels | yes | «DIVISION_LABEL[i]» / «contagens» rows | ok |
| board «meta de copa pelos 40 clubes», `test-fixtures.expectedCupGoal` | no for BR users: the ranking over the BR clubs is the old 40-club ranking | fixture/normalization rule (C16) | ok |

**Finding 1 - old expected value changed outside the Superseded table.**
- In `rollover.test.ts` «histórico da temporada», the expected `history` gained two `DivisionRecord`s (`:402`-`:403`). The test's comment cites "Superseded checks", but no row names history divisions.
- The change is additive: the l1/l2 records are untouched. It is exactly what AC 12 and C12 require, so the new value is correct.
- Under the table's own rule, though, it should have gone to the author as a question, and there is no record that it did.
- It is a process deviation, not a failing check. It does not change the verdict.

**Finding 2 - a Superseded row predicted a count that AC 18 made wrong.**
- Row 2 said «lista Comprar» would go from 39 × 22 + 40 to 79 × 22 + 40.
- AC 18 and C18 make the list start on the user's country, so the default Brazilian list correctly stays 39 × 22 + 40. The builder left both old assertions (`Market.test.tsx:49`, `:191`) unchanged, which is right.
- Free agents are listed only under the user's own country (`src/ui/Market.tsx:128`). That is consistent with C18's exact 20 × 22 when switching to «Portugal», and no check or AC claims otherwise.
- AC 17 (buy from any of the 79 other clubs) is met through the filter, with the engine purchase proven by C17.

## Other scrutiny

- **C34 / AC 30 in the code.**
  - `src/engine/rollover.ts:211`-`:212`: `userId = fired && jobClubId ? jobClubId : state.userClubId` and `managed = fired ? null : userId`. So after a sacking, both clubs take the AI branch for renewal (`:230`) and for the academy (`:250`).
  - `state.userClubId = userId` is set only after that, at `:253`.
  - A fired manager with no pick cannot reach this code: it throws at `:163`.
- **Finance screen.** `src/ui/Finance.tsx:100` now passes the league's `tier` to `sponsorshipPaid`. Before, it passed the array index, which would have shown AR/PT at the Série B share, 60%. This is consistent with AC 9 and C9. No check claims the Finance screen, so it is correct but unproven at the screen level.
- **History.** The champions of AR and PT are in a separate «Campeões no exterior» table (`src/ui/History.tsx:150`). C22 asserts both tables, the league names in the headers, and `.fill`. No binding design source decides the arrangement (profile light, and the plan's Observable row points only to AC 22). No finding.
- **Observation on scope.** AC 22 names Histórico, Fim and Nova temporada for both «liga do usuário» and «campeões das 4 ligas». C22 splits this:
  - champions on History and End;
  - user league on End and NewSeason.
  - NewSeason shows no champions, and History's user-league cell for a PT user is untested.
  - This split is the approved check. I record it as an observation, not a gap.
- **Conventions.**
  - No `Math.random`, React, DOM, zustand or idb imports were added under `src/engine/**` in the range.
  - No «Brasfoot» in added lines.

## Coverage

Not run: the profile is light, so there is no Coverage recompute (verify.md "Read the profile first").

## Faults injected

Not run: the profile is light, so there is no fault injection.

## Gate

`npx vitest run` at `f29bd26` - 33 files, 369 passed, 0 failed (exit 0, 85 s).
