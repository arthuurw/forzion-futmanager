# Múltiplas temporadas - verification report

**Verdict**: FAIL
**Profile**: light
**Diff range**: 66c86da..31cae35 (feature range; the plan landed in b2f4973). Fix range under review: c60980d..31cae35
**Round**: 2 - scoped (C19, C52 and the new C56 re-verified at 31cae35; the other 53 checks carried from c60980d, with proofs re-run in full at 31cae35)
**Verifier**: independent fresh sub-agent (author != verifier), dispatched for round 2 with no inherited build context; it wrote only this report

55 of 56 checks are proven with located evidence. C52 and C56 now hold: the door-5 literals are pinned, and the faults injected against them were caught. **C19 fails.** Its only assertion on the rollover stream compares one draw in `[1, 4]`. For this fixture, door 3's rejected alternative (drawing from the last round's `Rng`) produces that same draw, so a rollover built on the rejected alternative passes the whole test. Details under Faults injected and Ranked gaps.

## Scope of this round

- The fix range `c60980d..31cae35` touches `src/engine/migrate.test.ts` (2 new tests, +3 import lines), `src/engine/rollover.test.ts` (C19's fixture and assertions, +6 lines net), `checks.md` and the round 1 report. No production file changed (`git diff --stat c60980d..HEAD -- src/` lists only the two test files).
- Re-verified: C52 (round 1 FAIL), C56 (new) and C19 (round 1 precision note, test changed).
- Carried from c60980d: every other check. Their production code and test bodies are byte-identical to what round 1 verified. The only changes are shifted citations in the two touched test files, refreshed below: `migrate.test.ts` +3 throughout, and `rollover.test.ts` +6 after line 119.

## Binding sources

None. The plan's `Surface` is `None - nothing consumed outside` and there are no mockups. Step 1 (`ui`) does not apply. Carried from c60980d, and the fix range touched no interface.

## Proof run (verified at 31cae35)

- `npx vitest run --reporter=verbose` at 31cae35: **28 files, 219 tests passed, 0 failed** (75.6 s). I extracted all 65 distinct `file | name` pairs from the `Proof:` lines in checks.md and matched each one against a `✓` line naming that file. All 65 matched and none is missing, including the three new ones:
  - `✓ src/engine/migrate.test.ts > migração do save > partidas migradas da série B usam a semente da porta 5`
  - `✓ src/engine/migrate.test.ts > migração do save > contratos migrados da série A vêm de mix32(seed, 5)`
  - `✓ src/engine/rollover.test.ts > virada de temporada > virada usa o próprio Rng`
- `npx tsc -p tsconfig.json --noEmit`: exit 0.
- `npx eslint src`: exit 0, no findings.
- `npm run build`: exit 0. Bundle 311.48 kB JS, 34.03 kB CSS (the same as round 1, as expected with no production change).
- The worktree needed `npm ci` first (no `node_modules`). `git status --porcelain` was empty before and after every probe and fault.

## Checks

C19, C52 and C56 are verified at 31cae35. Every other row is carried from c60980d (round 1 evidence, citations refreshed where the fix shifted lines), and its proof re-ran green at 31cae35.

| Check | Claim | Proof run | Evidence | Result |
| --- | --- | --- | --- | --- |
| C1 | 2 leagues l1/l2, the AD-009 and AD-011 names, B ids c21-c40, no player name repeats | ✓ `duas divisões com identidades fixas` | carried from c60980d: `src/engine/generate.test.ts:128` `toEqual(["l1","l2"])`; `:130-131` names; `:132` ids; `:136` `new Set(names).size` == `names.length` | PASS |
| C2 | per-club and division strength bands over 5 seeds | ✓ `série B mais fraca` | carried from c60980d: `src/engine/generate.test.ts:147-152`, `:158-163` | PASS |
| C3 | Série A/B tabs, 20 alphabetical cards with «força», B pick saved and opened | ✓ `abas Série A e Série B` | carried from c60980d: `src/ui/ChooseClub.test.tsx:34`, `:38-41`, `:51`, `:54` `saved.state.userClubId` toBe `chosen.id` | PASS |
| C4 | a B user's round plays both divisions; 38 rounds -> 380 played each | ✓ `rodada joga as duas divisões`, ✓ `temporada inteira nas duas divisões` | carried from c60980d: `src/app.test.tsx:224-231`; `src/engine/live.test.ts:357`, `:361` `toHaveLength(380)` | PASS |
| C5 | 20 live matches with the door-2 seeds | ✓ `sementes das partidas das duas divisões` | carried from c60980d: `src/engine/live.test.ts:331`, `:336-337` `mix32(state.rngState, n*16+i)`, `:341-342` `mix32(mix32(state.rngState, 0xb), n*16+i)` | PASS |
| C6 | «Jogos da rodada» has 10 items from the user's division (B and A) | ✓ `jogos da rodada só da divisão do usuário` | carried from c60980d: `src/ui/Live.test.tsx:250`, `:262` `toHaveLength(10)`, `:266-267` | PASS |
| C7 | Squad table plus the «Divisão» selector | ✓ `classificação com seletor de divisão` (Squad) | carried from c60980d: `src/ui/Squad.test.tsx:224-229` | PASS |
| C8 | Round screen table plus selector | ✓ `classificação com seletor de divisão` (Round) | carried from c60980d: `src/ui/Round.test.tsx:121-124` | PASS |
| C9 | market lists 39 clubs + free agents; buying across divisions | ✓ `mercado com as duas divisões`, ✓ `compra de clube da outra divisão` | carried from c60980d: `src/ui/Market.test.tsx:191` `39 * 22 + 40`, `:197-203`; `src/engine/market.test.ts:348-349` | PASS |
| C10 | B sponsorship 60%, A 100%; Finanças shows 60% | ✓ `série B recebe 60% do patrocínio`, ✓ `patrocínio da série B` | carried from c60980d: `src/engine/finance.test.ts:317-321`; `src/ui/Finance.test.tsx:138` | PASS |
| C11 | core goal and home-win bands unchanged | ✓ `times iguais` | carried from c60980d: `src/engine/balance.test.ts:54-57` (untouched test, `match.ts` not in the diff) | PASS |
| C12 | End screen summary | ✓ `resumo da temporada` | carried from c60980d: `src/ui/End.test.tsx:56-64` (`"Sua posição: 7º na Série A"`, `Prêmio: ${brl(14 * 250_000)}`) | PASS |
| C13 | 4 up / 4 down, promoted appended in B-table order | ✓ `4 sobem e 4 descem` | carried from c60980d: `src/engine/rollover.test.ts:54-59` (above the fix hunk, unshifted) | PASS |
| C14 | new schedule, market open, juniors jr-2-1-1..3 | ✓ `calendário novo e mercado aberto` | carried from c60980d: `src/engine/rollover.test.ts:77`, `:79`, `:80` | PASS |
| C15 | fitness/cards/suspension reset; injury and morale kept | ✓ `condição renovada mantém lesão e moral` | carried from c60980d: `src/engine/rollover.test.ts:91`, `:97` | PASS |
| C16 | offers cleared; finance unchanged | ✓ `caixa estádio e empréstimo continuam` | carried from c60980d: `src/engine/rollover.test.ts:106`, `:109` | PASS |
| C17 | Nova temporada lists and empty states | ✓ `mostra aposentados contratos evolução e meta`, ✓ `listas vazias` | carried from c60980d: `src/ui/NewSeason.test.tsx:46-58`, `:65-66` | PASS |
| C18 | reload at End shows the same summary; `nextSeason` equal | ✓ `recarregar no fim mostra o mesmo resumo` | carried from c60980d: `src/app.test.tsx:271-275`, `:278`, `:280` `nextSeason(reloaded)` toEqual `nextSeason(game)` | PASS |
| C19 | rollover draws from `createRng(mix32(rngState, 0x5E45+season))`; new rngState = one `next()`; differing rngState -> differing evolution (door 3) | ✓ `virada usa o próprio Rng` at 31cae35 | verified at 31cae35: `src/engine/rollover.test.ts:123` `expect(a.rngState).toBe(advanced.getState())` settles the rngState half. `:129` `expect(firstClub.id).toBe(stays.id)` and `:131` `expect(now).toBeDefined()` remove the round 1 guard (fixture at `:115-118`). `:132` `expect(now!.rating).toBe(p0.rating + delta)`, with `delta = randInt(createRng(mix32(before.rngState, 0x5e45 + before.season)), 1, 4)` at `:128`, is the only assertion on the stream. `:135` ratings differ. **The stream is not pinned**: the assertion compares one draw with 4 possible values, and door 3's rejected alternative gives the same value. Probe: the real stream draws 2; `createRng(rngState)` (last-round Rng) also draws 2; salt `0x5E45+season+1` also draws 2. Faults F8 and F9 below both survive the whole test | FAIL |
| C20 | «Próxima temporada» saves before showing; failure warning | ✓ `próxima temporada grava antes de mostrar` | carried from c60980d: `src/store.test.ts:167-173`, `:182-183` | PASS |
| C21 | 6 age bands, extremes, clamp 95/40 | ✓ `evolução por idade` | carried from c60980d, citations refreshed at 31cae35: `src/engine/rollover.test.ts:160-164` min/max per band (bands at `:142-148`); `:167-168` ≤ 95 and contains 95; `:170-171` ≥ 40 and contains 40 | PASS |
| C22 | every remaining player +1 year | ✓ `todos envelhecem um ano` | carried from c60980d, refreshed: `src/engine/rollover.test.ts:184` `expect(p.age, p.id).toBe(ages.get(p.id)! + 1)` | PASS |
| C23 | retirement shares by age; retired gone | ✓ `aposentadoria por idade` | carried from c60980d, refreshed: `src/engine/rollover.test.ts:205-211` shares; `:212` absent from `everyone`; `:213` absent from starters | PASS |
| C24 | AI refill to 22 with juniors; user's club stays 15 | ✓ `IA repõe com juniores até 22` | carried from c60980d, refreshed: `src/engine/rollover.test.ts:230-231` 22 / 15; `:235` `["FW","FW","FW"]`; `:237-241` age, rating, contract 3 | PASS |
| C25 | free agents back to ≥ 40 with bounds | ✓ `livres voltam a 40` | carried from c60980d, refreshed: `src/engine/rollover.test.ts:252` ≥ 40; `:255-260` bounds | PASS |
| C26 | market value by rating and age | ✓ `valor pela força e idade` | carried from c60980d: `src/engine/market.test.ts:57-61`, `:73` toBe `2_450_000` | PASS |
| C27 | strength stable over 5 seasons | ✓ `força estável em 5 temporadas` | carried from c60980d: `src/engine/balance.test.ts:150` | PASS |
| C28 | contracts 1-4, each value present | ✓ `contratos de 1 a 4` | carried from c60980d: `src/engine/generate.test.ts:173-175`, `:180` | PASS |
| C29 | arrival contracts 3/2/3, AI purchase 3 | ✓ `contrato ao chegar` | carried from c60980d: `src/engine/market.test.ts:363` `toEqual([3, 2, 3])`, `:370` | PASS |
| C30 | «Contr.» column and «Último ano» | ✓ `coluna contrato e último ano` | carried from c60980d: `src/ui/Squad.test.tsx:240-252` | PASS |
| C31 | «Renovar» flow and saving before showing | ✓ `renovar mostra salário novo`, ✓ `renovar grava antes de mostrar` | carried from c60980d: `src/ui/Squad.test.tsx:263-271`; `src/store.test.ts:196-201` | PASS |
| C32 | user contracts −1; last-year players go to the free agents | ✓ `contrato cai e último ano vai para os livres` | carried from c60980d, refreshed: `src/engine/rollover.test.ts:276-278` gone from the squad/lineup and in the free agents with 0; `:280` `toBe(p.contractSeasons - 1)` | PASS |
| C33 | AI renewal ≤ 32 with formula salary; 33+ leave | ✓ `IA renova até 32 anos` | carried from c60980d, refreshed: `src/engine/rollover.test.ts:298-300` `toBe(expectedSalary(x.rating))`; `:305-311` `gone > 0` | PASS |
| C34 | prize at round 38 for all 40 clubs, none at 37 | ✓ `prêmio por posição na rodada 38` | carried from c60980d: `src/engine/finance.test.ts:329`, `:331-336`, `:338` | PASS |
| C35 | «Prêmio» row in Finanças | ✓ `linha do prêmio` | carried from c60980d: `src/ui/Finance.test.tsx:144`, `:153-154` | PASS |
| C36 | goal by strength rank; fixed on pick and on rollover | ✓ `meta pela força`, ✓ `escolher clube fixa a meta` | carried from c60980d, refreshed: `src/engine/season.test.ts:23-30`, `:40-47`; `src/app.test.tsx:253-254`; rollover part `src/engine/rollover.test.ts:339` `expect(state.boardGoal).toBe(goal)` | PASS |
| C37 | the three goal texts | ✓ `meta da temporada` | carried from c60980d: `src/ui/Squad.test.tsx:277-287` | PASS |
| C38 | 10-row verdict table | ✓ `veredito da diretoria` | carried from c60980d: `src/engine/season.test.ts:52-64`; labels on screen at `src/ui/End.test.tsx:64`, `:77`, `src/app.test.tsx:275` | PASS |
| C39 | job offers and the disabled button | ✓ `propostas de emprego`, ✓ `demitido escolhe proposta` | carried from c60980d: `src/engine/season.test.ts:72-80`; `src/ui/End.test.tsx:82-87` | PASS |
| C40 | a fired manager takes the chosen club | ✓ `demitido assume o novo clube`, ✓ `demitido escolhe proposta` | carried from c60980d, refreshed: `src/engine/rollover.test.ts:328` `toBe(pick)`; `:331` 11 distinct starters; `:333` old lineup null; `:339` goal; `src/ui/End.test.tsx:90,92` | PASS |
| C41 | season games and goals per round, both divisions | ✓ `jogos e gols da temporada` | carried from c60980d: `src/engine/condition.test.ts:117-126` | PASS |
| C42 | career += season, season -> 0 | ✓ `estatísticas vão para a carreira` | carried from c60980d, refreshed: `src/engine/rollover.test.ts:352` `[0, 0]`; `:353` `[100 + b.seasonGames, 20 + b.seasonGoals]` | PASS |
| C43 | history record; a second rollover appends | ✓ `histórico da temporada` | carried from c60980d, refreshed: `src/engine/rollover.test.ts:368-381` full record toEqual; `:391-393` length 2, first unchanged, season 2 | PASS |
| C44 | «Artilharia» top 10 and «Voltar ao elenco» | ✓ `artilharia top 10` | carried from c60980d: `src/ui/History.test.tsx:30-40` | PASS |
| C45 | «Estatísticas» per player | ✓ `estatísticas do elenco` | carried from c60980d: `src/ui/History.test.tsx:50-55` | PASS |
| C46 | «Campeões» per season | ✓ `campeões por temporada` | carried from c60980d: `src/ui/History.test.tsx:77-89` | PASS |
| C47 | empty-state texts | ✓ `histórico vazio` | carried from c60980d: `src/ui/History.test.tsx:94`, `:96` | PASS |
| C48 | v3 with 5 rounds -> v4 | ✓ `migra v3 para v4` | carried from c60980d, refreshed (+3): `src/engine/migrate.test.ts:89` `expect(withoutV4(a)).toEqual(oldA)`; `:91` market; `:55-58` B schedule and scores; `:66,70` stats and contracts `[1,2,3,4]`; `:74-75` history `[]`, `boardGoal` toBe `expectedGoalA(state)` (`:45-48`) | PASS |
| C49 | v2 and v1 -> v4 | ✓ `migra v2 e v1 para v4` | carried from c60980d, refreshed: `src/engine/migrate.test.ts:102-103`, `:108-109` `expectV4Finances` + `expectV4Additions` (`:15-38`); `:112` v1 condition | PASS |
| C50 | version 5 incompatible | ✓ `save de versão 5 incompatível` | carried from c60980d: `src/ui/Home.test.tsx:71-72` | PASS |
| C51 | v4 passes unchanged; the saved document is v4 | ✓ `v4 passa direto`, ✓ `documento tem schemaVersion 4 com finanças e mercado` | carried from c60980d, refreshed: `src/engine/migrate.test.ts:125` `expect(migrateSave(copy)).toEqual({ kind: "ok", state: r.state })`; `src/persistence/save.test.ts:35-38` | PASS |
| C52 | new game: B = `generateLeague(createRng(mix32(seed,4)))`, A and rngState from `createRng(seed)`; migration: B from the same stream, played matches use `mix32(mix32(seed,0xB), n*16+i)`, migrating twice equal (door 5) | ✓ `série B tem stream próprio`, ✓ `série B migrada vem da seed`, ✓ `partidas migradas da série B usam a semente da porta 5` at 31cae35 | verified at 31cae35. New game: `src/engine/generate.test.ts:189-190` A and `rngState` from `createRng(seed)`; `:193` `expect(state.leagues[1]).toEqual(generateLeague(createRng(mix32(seed, 4)), "l2", "Série B", SERIE_B, taken))`. Migration: `src/engine/migrate.test.ts:134` two migrations equal; `:140` B clubs and fixtures == `newGame(6)`'s; **`:173` `expect(stored).toEqual(replay((i) => mix32(mix32(seed, 0xb), 1 * 16 + i)))`** pins the literal for round 1 (`i` = 0..9) with the seed written out; `:175` the Série A scheme gives other scores. Faults F1, F1b, F2, F3 and F10 are all killed. Precision gap: `n` is sampled only at 1 (the fixture plays 2 rounds, and only round 1 is replayed), so the contrived mutant F4 (`n` fixed at 1) survives. See Ranked gaps 2 | PASS |
| C53 | 5-season cash band | ✓ `caixa em 5 temporadas` | carried from c60980d: `src/engine/balance.test.ts:158-166` | PASS |
| C54 | free agents 0, club players ≥ 1 | ✓ `contrato de clube nunca abaixo de 1` | carried from c60980d, refreshed: `src/engine/rollover.test.ts:404-405` ≥ 1 per club player and `toBe(0)` per free agent; `:407-408` on `busySeason()` and after `nextSeason` | PASS |
| C55 | history only grows; the saved document has both records in order | ✓ `histórico da temporada` | carried from c60980d, refreshed: `src/engine/rollover.test.ts:392` `expect(two.history[0]).toEqual(one.history[0])`; `:397` `toEqual([1, 2])` | PASS |
| C56 | on migration, every Série A player's contract, in club and player order, is `randInt(1, 4)` from `createRng(mix32(seed, 5))` (door 5) | ✓ `contratos migrados da série A vêm de mix32(seed, 5)` at 31cae35 | verified at 31cae35: `src/engine/migrate.test.ts:182` `const rng = createRng(mix32(seed, 5))`, `:183` expected = one `randInt(rng, 1, 4)` per player in club/player order; **`:184` `expect(r.state.leagues[0]!.clubs.flatMap((c) => c.players.map((p) => p.contractSeasons))).toEqual(expected)`** over all 440 players; `:186` stream 6 differs. The stream is pinned: F5, F6 and F7 are all killed | PASS |

## Faults injected

Profile `light` does not require this step. The round 2 brief allowed it to confirm C52, C56 and C19, so I ran it in this worktree. Each fault was a `sed` on a copy restored from a backup, never on git state. The narrowest covering proof ran each time. After every fault the file was confirmed byte-identical to its backup (`cmp`), and `git status --porcelain` was empty at the end.

| Mutation | Location | Killed |
| --- | --- | --- |
| F1: migrated B matches on the Série A scheme `matchSeed(seed, n, i, 0)` (door 2 collision) | `src/engine/migrate.ts:75` | yes - `migrate.test.ts:173` |
| F1b: door 2's rejected alternative, indices 10-19 in the A scheme `matchSeed(seed, n, i + 10, 0)` | `src/engine/migrate.ts:75` | yes - `migrate.test.ts:173` |
| F2: round index off by one, `round.number - 1` | `src/engine/migrate.ts:75` | yes - `migrate.test.ts:173` |
| F3: catch-up seeded from `state.rngState` instead of `state.seed` | `src/engine/migrate.ts:99` | yes - `migrate.test.ts:173` |
| F4: `n` fixed at 1 for every migrated round, `matchSeed(seed, 1, i, 1)` (contrived; probes the sampling of `n`) | `src/engine/migrate.ts:75` | no - survived all 3 migration tests of C52 (round 1 is the only round replayed) |
| F10: door 5's rejected alternative, Série B drawn on the league `Rng` in `newGame` | `src/engine/generate.ts:187` | yes - `generate.test.ts:190` (`rngState` moved) |
| F5: contract stream `mix32(seed, 6)` | `src/engine/migrate.ts:89` | yes - `migrate.test.ts:184` |
| F6: contract stream `mix32(state.rngState, 5)` | `src/engine/migrate.ts:89` | yes - `migrate.test.ts:184` |
| F7: contract range `randInt(contracts, 1, 3)` | `src/engine/migrate.ts:92` | yes - `migrate.test.ts:184` |
| F8: rollover salt `0x5E45 + season + 1` | `src/engine/rollover.ts:148` | no - survived; `virada usa o próprio Rng` passed |
| F9: door 3's rejected alternative, the rollover draws from `createRng(input.rngState)` (the last round's `Rng`) | `src/engine/rollover.ts:148` | no - survived; `virada usa o próprio Rng` passed |

Why F8 and F9 survive: a temporary probe test (`src/engine/zz-probe.test.ts`, deleted after the run) rebuilt `ended()` (seed 30, 38 rounds; `rngState` 1402132834, season 1). The first `randInt(·, 1, 4)` is 2 on the real stream, on `createRng(rngState)` and on salt +1. The next salts give `[4,3,3,4,3,4,3,4,4,2]`. So the assertion at `rollover.test.ts:132` has a 1-in-4 chance of missing any given wrong stream, and it misses the one the door names.

## Superseded checks of earlier features

Carried from c60980d. The fix range changed no earlier test except by shifting lines in `src/engine/migrate.test.ts`: `migra v2 e v1 para v4` is now at `:98` and `v4 passa direto` at `:121` (previously `:95` and `:118`). Their assertions are unchanged, and both ran green at 31cae35. The round 1 table (9 rows, all declared) stands.

## Swept existing

Carried from c60980d. The fix range did not touch `src/ui/Banner.tsx` or `src/store.ts`.
- dependency failure (existing): «Não foi possível salvar» and «Salvamento indisponível neste navegador» at `src/ui/Banner.tsx:6-7`; C20 proves the rollover path.
- concurrency (n/a, policy): `nextSeason` in the store returns early while `saving` is set (`src/store.ts:365-370`).

## Not run under `light`

The coverage recompute and Test policy verdicts belong to `standard`/`ui` and were not run; checks.md carries no Test policy section. Fault injection ran only as the optional confirmation described above.

## Gate

`npx vitest run --reporter=verbose` - 219 passed, 0 failed (28 files) at 31cae35. `npx tsc -p tsconfig.json --noEmit` exit 0, `npx eslint src` exit 0, `npm run build` exit 0.

## Ranked gaps

1. **C19 - the door 3 stream is not pinned; the rejected alternative survives.** `src/engine/rollover.test.ts:132` `expect(now!.rating).toBe(p0.rating + delta)` checks one `randInt(·, 1, 4)` draw. For the `ended()` fixture, the real stream, door 3's rejected alternative (`createRng(rngState)`, fault F9) and salt +1 (F8) all draw 2, so a rollover on the rejected stream passes the whole test. The round 1 guard is gone, which fixed the vacuity, but the check's first sentence is still unproven. Fix, test only: make the first N players of the first club that stays up young, with long contracts (so the first N draws are all evolution draws), and assert their N deltas equal the first N `randInt` draws of `createRng(mix32(rngState, 0x5E45 + season))` written out in the test. Or assert a wider-range product of the stream, such as the new schedule's shuffle. Then confirm F9 fails.
2. **C52 - precision gap: `n` is sampled at one value.** `src/engine/migrate.test.ts:173` pins `mix32(mix32(seed, 0xB), n*16 + i)` for `n = 1` and `i` = 0..9. The fixture plays 2 rounds, but only round 1 is replayed. Plausible `n` bugs are killed: F2 (off by one), and `rounds`, `currentRound` or `roundIndex` would all differ at round 1. A contrived mutant that ignores `n` (F4) survives. That alone does not fail the check, because the literal and both door-rejected alternatives are killed. It is cheap to close in the same fix: continue the replay into round 2 on the same `players` record, as `catchUp` does.

Precision notes carried from round 1 (unchanged, still passing): C38 (codes vs labels; «Meta não cumprida» reached through a seed), C31 (one negative sample), C44 (only a Série A user sampled), C55 (the "saved document" goes through `migrateSave` on a JSON clone). The round 1 C19 guard note is resolved: the `if (now)` is gone (`:131-132`), and it is replaced by gap 1.
