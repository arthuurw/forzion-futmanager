# Gastos da IA - verification report

**Verdict**: PASS
**Profile**: light
**Diff range**: 3b119b8..6155fd0 (feature commits `5f7992e` engine and `4d28663` ui; `e5a15bf` is the author-delegated redesign of plan and checks after the calibration stop; `6155fd0` records the orchestrator rulings under that delegation, which are part of the approved checks)
**Round**: 1 - full (all 34 checks, C1-C34)
**Verifier**: independent fresh sub-agent (author != verifier). It did not build the feature, fixed nothing, and wrote only this report and the lessons files

All 34 checks are proven at `6155fd0`. The checks have 35 `Proof:` selectors (C1 has two). Each one resolves to a test that exists in the tree, ran by name at HEAD, and passed. Each check has at least one located assertion that targets the value the check names. The full suite, the build and the lint are green. Three precision notes follow. None of them fails a check.

## Binding sources

None. The plan's `Surface` is `None - nothing consumed outside` (static SPA, AD-001). `Sources` lists only `.specs/STATE.md`, the multiplas-temporadas checks, and the author's requests. There is no mockup or contract. Step 1 runs only under `ui`, and this feature was approved under `light`.

## Proof run (verified at 6155fd0)

- `git status --porcelain` was empty before the runs. After the runs it shows only this report and the lessons files.
- **Batched proof run.** One invocation covered the 10 files named by the `Proof:` lines, with one `-t` alternation of all 35 names: `npx vitest run src/engine/market.test.ts src/engine/season.test.ts src/engine/finance.test.ts src/engine/cup.test.ts src/engine/balance.test.ts src/engine/rollover.test.ts src/ui/Market.test.tsx src/engine/migrate.test.ts src/persistence/save.test.ts src/engine/generate.test.ts -t "<35 names joined by |>" --reporter=verbose`. It exited 0 with **10 files, 35 passed, 135 skipped, 0 failed**.
- **Each named test exists and ran.** The verbose log has one `✓` line per selector, and it names the file and the test. The 35 selectors matched exactly 35 tests, so the filter picked up no extra tests. Each name hits a `test("…")` declaration in the source, for example `src/engine/market.test.ts:478 test("sobra da IA"`, `src/engine/season.test.ts:88 test("rodada de janela dispara compras da IA"`, `src/engine/balance.test.ts:239 test("compras da IA em 5 temporadas"` and `src/ui/Market.test.tsx:231 test("aba transferências"`.
- **The proofs cover new behaviour.** Of the 35 tests, 34 are added in the range (`+  test(` in `git diff 3b119b8..HEAD`). `versão acima de 6 incompatível` is the renamed copa-nacional C61 test «versão acima de 5 incompatível», which the Superseded table lists, and it gained the "6 loads" assertion. Three balance tests (`caixa em 5 temporadas`, `força estável em 5 temporadas`, `caixa equilibrado em uma temporada`) are older tests that the range rewrote, and the Superseded table lists each of them. The diff adds no `.skip` or `.only`. The only removed `test(` line is the rename.
- **Simulation note.** The four 5-season checks share one memoised run (`multiSeason()`, `balance.test.ts:166`). `caixa em 5 temporadas`, `compras da IA em 5 temporadas` and `boletim só com os três tipos` take a few ms each because `força estável em 5 temporadas` builds the run first. The log prints the measured bands: C19 `-0.29 / 2.94 / 11.74`, C21 drift `4.26`, C34 `0.99 / 1.50 / 2.25`, C20 buys per seed `288 / 253 / 300`. These match the Handoff.
- **AGENTS.md conventions.** `grep Math.random` over non-test `src` finds nothing. No `src/engine/**` file imports react, zustand or idb. `tsconfig.engine.json` type-checks as part of `npm run build`.

## Checks

| Check | Claim | Proof run | Evidence | Result |
| --- | --- | --- | --- | --- |
| C1 | sobra = caixa − 10 × (folha + s) = R$ 4.500.000; price exactly equal to the sobra is bought, R$ 10.000 less cash means no buy | ✓ `sobra da IA`; ✓ `compra no limite da sobra` | `src/engine/market.test.ts:483` `expect(aiBudget(club, 50_000)).toBe(4_500_000)`; `:504` `expect(run(10_480_000)).toEqual({ bought: true, unchanged: false })`; `:506` `expect(run(10_470_000)).toEqual({ bought: false, unchanged: true })` | PASS |
| C2 | one draw per AI club from `mix32(mix32(rngState,0xA1),round)`, Série A then B, skipping the user; buy when < 0,25 | ✓ `chance de compra pelo fluxo da door 3` | `src/engine/market.test.ts:529` `expect(gained.sort(byId)).toEqual([...drawn].sort(byId))`, with the draws recomputed by the literal door-3 formula (`buyDraws`, `:376-379`) and the user in the middle of Série A; `:533` the rejected flat salt draws a different set | PASS |
| C3 | AI buys do not shift the match, offer or junior draws | ✓ `compras da IA não mudam os outros sorteios` | `src/engine/market.test.ts:560` offers `(id, playerId, amount)` equal; `:561` juniors equal; `:567` `expect(rich2.results).toEqual(poor2.results)`; `:575` juniors at round 17 equal | PASS |
| C4 | closing rounds 1, 4, 17 and 21 buys; closing 5, 16, 22 and 38 changes nothing | ✓ `compras só em rodada de janela` | `src/engine/market.test.ts:587` `expect(snapshot(s)).not.toBe(before)` over `[1, 4, 17, 21]`; `:594` `expect(snapshot(s)).toBe(before)` over `[5, 16, 22, 38]` (squads, cash, pending, free agents) | PASS |
| C5 | the 8-row candidate table (+4, 32 years, seller with 21, starter, user, free agent, other position) | ✓ `candidatos da compra da IA` | `src/engine/market.test.ts:664` `expect(rows).toHaveLength(8)`; `:670` `expect(has(q.s, q.buyer.id, player.id), what).toBe(eligible)` with only row 1 eligible | PASS |
| C6 | tie-break by strength, then price, then id; price is the reserve's `marketValue` | ✓ `escolha do reforço da IA` | `src/engine/market.test.ts:695` `{ first: false, second: true, spent: 1_410_000 }`; `:698` `spent: 950_000` (price); `:700` `{ first: true, second: false, spent: 950_000 }` (id) | PASS |
| C7 | R$ 1.990.000 moves cash and pending on both sides; 3-season contract; salary max(had, 1,2 × table) | ✓ `compra da IA move jogador e dinheiro` | `src/engine/market.test.ts:720` `toBe(100_000_000 - 1_990_000)`; `:721` pendingOut `1_990_000`; `:723` seller pendingIn `1_990_000`; `:734` `toEqual({ ...r.before, contractSeasons: 3, salary: gets })` over `[20_000→31_800, 40_000→40_000]` | PASS |
| C8 | a buyer above 22 releases the weakest DF off its eleven, contract 0, paying 4 × salary; the weaker starting DF stays | ✓ `dispensa ao passar de 22` | `src/engine/market.test.ts:753` released is out; `:754` weak starter stays; `:755` `contractSeasons).toBe(0)`; `:756` `toBe(100_000_000 - price - 4 * released.salary)`; `:757` pendingOut | PASS |
| C9 | a drawn club with no candidate at +4, or only above the sobra, is unchanged | ✓ `tentativa sem candidato não muda nada` | `src/engine/market.test.ts:766` and `:777` `JSON.stringify(buyer)` equal before and after | PASS |
| C10 | the user holding the 5 best of each position loses no one over rounds 1-4 | ✓ `IA nunca compra do usuário` | `src/engine/market.test.ts:802` `expect(ids(user(s))).toEqual(mine)`, with the AI shown buying (`:801`) | PASS |
| C11 | `playRound` of a window round writes a `buy` line to club 0 (L-003 wiring) | ✓ `rodada de janela dispara compras da IA` | `src/engine/season.test.ts:109` `expect(state.market.transfers.some((t) => t.kind === "buy" && t.toId === club.id)).toBe(true)` | PASS |
| C12 | the red club sells its most valuable player (a starter) at `marketValue` to the biggest sobra, AC 5 salary, before the buys | ✓ `vermelho vende o mais valioso` | `src/engine/market.test.ts:862` salary `75_400`; `:863` `toBe(-1_000_000 + 3_770_000)`; `:865` `toMatchObject({ kind: "buy", fromId: from.id, toId: b.id, amount: 3_770_000 })`; `:868` order `[star.id, gk.id]`; `:869` buyer spent `3_770_000 + 3_060_000` | PASS |
| C13 | equal sobra goes to the smaller id; a club with 30 players is skipped; a buyer above 22 releases as in C8 | ✓ `comprador da venda do vermelho` | `src/engine/market.test.ts:881` smaller id wins; `:892` the next club gets the player (`:893` the full club keeps 30); `:913` `toEqual(["buy", "release"])`; `:914` cash minus `4 * released.salary` | PASS |
| C14 | 18 players means no sale; no buyer with a sobra for value + AC 5 salary means no sale | ✓ `vermelho sem venda` | `src/engine/market.test.ts:928` seller unchanged; `:937` the sobra with the old salary would cover it; `:941-942` seller and buyer unchanged | PASS |
| C15 | closing round 5 does not sell | ✓ `vermelho só vende com janela aberta` | `src/engine/market.test.ts:953` seller unchanged; `:954` `transfers).toEqual([])` | PASS |
| C16 | a full 30.000 stadium expands (cash −4M, 6 rounds); 5 guard rows do not | ✓ `IA amplia estádio lotado` | `src/engine/finance.test.ts:381` `toBe(20_000_000 + 1_200_000 + 300_000 - 500_000 - 4_000_000)`; `:382` `toBe(6)`; `:400` 5 rows; `:406-407` cash and rounds left per row | PASS |
| C17 | the user's full stadium does not expand | ✓ `usuário não amplia sozinho` | `src/engine/finance.test.ts:427` `toEqual([0, 10_000])`; `:431` the AI club at home in the same round expands (wiring through `playRound`) | PASS |
| C18 | a cup date does not expand, buy or sell | ✓ `data de copa não mexe no mercado da IA` | `src/engine/cup.test.ts:499` squads equal; `:500` transfers equal; `:507` cash delta `toBe(gate)`; `:508` `toEqual([0, 20_000])` | PASS |
| C19 | 5-season cash between −2× and 15×, median between 2× and 4× | ✓ `caixa em 5 temporadas` | `src/engine/balance.test.ts:233` `toBeLessThanOrEqual(15)` (`:232` ≥ −2); `:235-236` median in `[2, 4]` | PASS |
| C20 | 50-600 `buy` lines per seed, none per season zero, checked against the squads (ruling 2: replay) | ✓ `compras da IA em 5 temporadas` | `src/engine/balance.test.ts:248` `expect(run.unexplained).toEqual([0, 0, 0, 0, 0])`; `:251` buys ≥ players moved; `:253` > 0 per season; `:255-256` total in `[50, 600]` | PASS |
| C21 | top-18 mean within 5 points of season 1 | ✓ `força estável em 5 temporadas` | `src/engine/balance.test.ts:217` `toBeLessThanOrEqual(5)` per seed, season and division | PASS |
| C34 | running result of 38 league rounds (tickets + sponsorship − salaries − interest) between 50% and 250%, median between 90% and 160% | ✓ `caixa equilibrado em uma temporada` | `src/engine/balance.test.ts:116` `expect(leagueRounds).toBe(38)`; `:122-123` `[0.5, 2.5]`; `:127-128` median `[0.9, 1.6]` | PASS |
| C22 | 5 sources, each with all literal fields | ✓ `boletim registra cada movimento da IA` | `src/engine/market.test.ts:1042` `expect(got, what).toEqual(expected)` over 5 rows with literal records (`:959-1039`); `:1045` kinds `["buy", "free", "release"]` | PASS |
| C23 | the 4 user actions add no line | ✓ `ações do usuário fora do boletim` | `src/engine/market.test.ts:1060` 4 actions; `:1063` `toEqual([earlier])` | PASS |
| C24 | `nextSeason` empties 5 lines | ✓ `virada esvazia o boletim` | `src/engine/rollover.test.ts:523` `toHaveLength(0)` | PASS |
| C25 | the «Transferências» tab lists newest first, «Livre» for null, club names, `formatMoney`; a closed window shows no tabs and the list beside the notice | ✓ `aba transferências` | `src/ui/Market.test.tsx:241` `expect(transferRows()).toEqual(expected)` (rows 3, 2, 1, «Livre», written-out `brl`); `:247` no `role="tab"`; `:248` notice text; `:249` heading; `:250` same rows | PASS |
| C26 | an empty list shows «Nenhuma transferência nesta temporada» | ✓ `transferências vazio` | `src/ui/Market.test.tsx:259` `getByText("Nenhuma transferência nesta temporada")` | PASS |
| C27 | the list sits inside `.fill` | ✓ `transferências rolam no painel` | `src/ui/Market.test.tsx:268` `table.parentElement!.classList.contains("fill")).toBe(true)` | PASS |
| C28 | v5 becomes v6 with `transfers: []` and nothing else changed | ✓ `v5 vira v6` | `src/engine/migrate.test.ts:356` `toBe(6)`; `:357` `toEqual([])`; `:362` `expect(without).toEqual(doc)` | PASS |
| C29 | v1, v2, v3 and v4 each reach v6 with `transfers: []` | ✓ `cadeia até v6` | `src/engine/migrate.test.ts:381` `toBe(6)`; `:382` `toEqual([])` per version | PASS |
| C30 | version 7 is incompatible and 6 loads | ✓ `versão acima de 6 incompatível` | `src/engine/migrate.test.ts:299` `toEqual({ kind: "incompatible", version: 7 })`; `:304` `expect(r.state).toBe(v6)` | PASS |
| C31 | 2 lines survive saving through fake-indexeddb | ✓ `boletim sobrevive ao save` | `src/persistence/save.test.ts:140` `expect(loaded.state.market.transfers).toEqual(lines)` | PASS |
| C32 | `SCHEMA_VERSION` is 6 and a new game starts with `transfers: []` | ✓ `jogo novo com boletim vazio` | `src/engine/generate.test.ts:200` `toBe(6)`; `:204` `toEqual([])` | PASS |
| C33 | only `buy`, `free` and `release` appear, in C22 and in 5 seasons × 3 seeds | ✓ `boletim só com os três tipos` | `src/engine/balance.test.ts:266` `toContain(kind)` against `["buy","free","release"]` per season; `src/engine/market.test.ts:1045` | PASS |

## Level and sampling

- **Level.** Each engine rule is proven at `closeRoundMarket`, the flow's entry point, or through `playRound` (C3, C10, C11, C17). No proof relies only on a private helper (L-003). C16 calls `closeRoundFinances` directly, which is where the plan puts the expansion. C17 then shows through `playRound` that `finishRound` passes `userClubId` and that the AI club at home expands (`finance.test.ts:431`). The screen checks render `Market` and read the DOM by role and text.
- **Sampling.** Every "each" claim is table-driven over the whole set (L-005): C4 over the 8 round borders, C5 over the 8 candidate rows, C16 over the expansion plus 5 guards, C22 over the 5 sources, C23 over the 4 user actions, C29 over v1 to v4, and C19-C21, C33 and C34 over every seed, season and club. Exclusions are exercised by fixtures that include the excluded member (L-007): a user DF at 90, a free agent at 70, a seller with 20 players, a starter at 70, and a club with 30 players.
- **Independent expected values (L-004).** Salaries, market values and the 1,2× floor are written out in the test (`expectedSalary`, `valueOf`, `raised`), and so are the door-3 draws (`buyDraws`) and money formatting (`brl`). C20 checks the count against a replay of the squads, not against the lines alone (L-015, ruling 2).

## Superseded checks of earlier features

The older tests changed in the range, with each change matched to the table or to the fixture rule:

| Changed test | Change | Covered by |
| --- | --- | --- |
| `balance.test` `caixa em 5 temporadas` | band 30× → 15×, median 3-10 → 2-4 | table row multiplas-temporadas C53 → C19 |
| `balance.test` `força estável em 5 temporadas` | limit 4 → 5 | table row → C21 |
| `balance.test` `caixa equilibrado em uma temporada` | now sums the running result of the league rounds; bands unchanged | table row elenco-mercado-financas C13 → C34 |
| `migrate.test` `expectV4Finances`, `v5 passa direto`, `v4 no meio da temporada ganha copa`, `v1 v2 e v3 viram v5` | `schemaVersion` 5 → 6 | table row «literais de versão» |
| `migrate.test` `v5 passa direto`, `versão acima de 5 incompatível` (renamed `…6…`), `Home.test` `save de versão 6 incompatível` | incompatible version 6 → 7 | table row copa-nacional C61 → C30 |
| `migrate.test` «migra v3 para v4» | `transfers` added to the stripped keys | table row «migra v3 para v4» |
| `save.test` `documento tem schemaVersion 5 com copa`, `carrega save v1 migrado` | `schemaVersion` 5 → 6 | table row «literais de versão» |
| `rollover.test` `ended()`, `End.test` `endedSeason()`, `test-fixtures` `v3Document` | `zeroAiSurplus` before each round (AI cash = 5 × payroll) | fixture rule, ruling (3) |
| `test-fixtures` `v3Document`, `v4Document` | `delete doc.market.transfers` so the documents keep the old shape | fixture rule and the «migra v3 para v4» row, ruling (3) |

`End.test` also re-picks the user's eleven after the loop. That line reproduces what `seededGame` did before (`test-utils.ts:39`), and it changes no expected value. The diff changes no expected value outside the table.

## Swept existing

- **dependency failure: existing.** `saveGame` and `loadGame` throw when IndexedDB is unavailable (`src/persistence/save.ts:24,39`), and the store catches both (`src/store.ts:168`, `:258`). The v6 document goes through the same path. The constraint is present.
- The other rows point to checks verified above, or are `n/a` (idempotency, which is policy).

## Not run under `light`

Step 1 (binding sources), the recomputed `Coverage` join, `Test policy` verdicts and fault injection do not run under `light`. So this report cannot catch an enumerated set member that nobody proved, or a test that passes under a wrong implementation. `checks.md` carries no `Test policy` section.

## Gate

- `npm test -- --maxWorkers=2`: 33 files, 326 passed, 0 failed, exit 0
- `npm run build` (`tsc` app, `tsc` engine, `vite build`): exit 0
- `npm run lint` (`eslint src`): exit 0

## Precision notes (not failures)

1. **Ruling (1), purchase side, has no discriminating fixture.** The AC 1 sobra in an AC 3 purchase counts the player's current salary (`market.ts` `tryAiPurchase`: `aiBudget(buyer, c.player.salary)`). Both C1 fixtures that reach the purchase (`market.test.ts:486-506`, and the `dear` case at `:768-777`) pay the target above 1,2 × table on purpose, so the current salary and the AC 5 salary are equal. A build that counted the AC 5 salary would pass C1 and C9. The red-sale side is discriminated: C14 at `:937` shows the old salary would have covered the sale. The checks as written do not claim the purchase side, so this is a gap in the checks, not a failed check.
2. **C25 "ao lado do aviso" is asserted as presence, not arrangement.** The test shows the notice and the «Transferências» heading and rows on the closed-window screen (`Market.test.tsx:248-250`). It does not assert that both panels sit in the same `.closed-body` grid. Under `light` this is outside the profile, but the claim's arrangement word has no assertion.
3. **C20 replay would accept a line whose `fromId` equals its `toId`.** The replay (`balance.test.ts:188-196`) sets the player at `toId` after checking `fromId`, so a self-transfer `buy` line would inflate the count without breaking `unexplained`. The engine cannot produce one (`tryAiPurchase` and `sellFromTheRed` exclude the buyer from the sellers), and ruling (2) accepts the replay as the proof. So this is only a note.

## Lessons recorded

Recorded through `lessons.py` from precision notes 1 and 2: L-018 (candidate, `tests`, a fixture whose two candidate values differ) and L-019 (candidate, `ui`, assert the shared container for "beside"). Note 3 is not recorded: the ruling accepted the replay, and the engine cannot produce the case.
