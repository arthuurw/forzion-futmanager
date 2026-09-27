# Múltiplas temporadas - verification report

**Verdict**: PASS
**Profile**: light
**Diff range**: 66c86da..8e0e5f3 (feature range; the plan landed in b2f4973). Fix range under review: 31cae35..8e0e5f3
**Round**: 3 - scoped (C19, C52, C31, C38, C44 and C55 re-verified at 8e0e5f3; the other 50 checks carried from 31cae35, with proofs re-run in full at 8e0e5f3)
**Verifier**: independent fresh sub-agent (author != verifier), dispatched for round 3 with no inherited build context; it wrote only this report

All 56 checks are proven with located evidence at 8e0e5f3. The round 2 FAIL on C19 is closed. The rollover test now compares 8 evolution draws with the door 3 stream written out in the test. Door 3's rejected alternative (`createRng(rngState)`) and salt + 1 are now both caught, and they were the faults that survived round 2 (F9 and F8). The C52 precision gap on `n` is closed as well: the replay covers rounds 1 and 2, and the round 2 mutant F4 (`n` fixed at 1) is now caught. The four precision notes from round 1 (C31, C38, C44, C55) each gained a proof, and a fault injected against each new proof was caught.

## Scope of this round

- The fix range `31cae35..8e0e5f3` has three commits: `98b3da0` (C31, C38, C44 and C55 tests), `187a7ea` (the round 2 report) and `8e0e5f3` (C19 and C52 tests). It touches `checks.md`, the round 2 report and six test files: `src/engine/migrate.test.ts`, `src/engine/rollover.test.ts`, `src/persistence/save.test.ts`, `src/ui/End.test.tsx`, `src/ui/History.test.tsx` and `src/ui/Squad.test.tsx`.
- **No production file changed.** `git diff --stat 31cae35..HEAD -- src/` lists only those six `*.test.ts(x)` files. Filtering `git diff --name-only 31cae35..HEAD` to drop test files and `.specs/` leaves nothing.
- Re-verified: C19 (round 2 FAIL), C52 (round 2 precision gap), and C31, C38, C44 and C55 (round 1 precision notes, which gained proofs or a stronger fixture).
- Carried from 31cae35: the other 50 checks. Their production code is byte-identical, and their test bodies are unchanged apart from shifted lines. Citations are refreshed as follows:
  - `rollover.test.ts` +1 after line 136;
  - `migrate.test.ts` +3 after line 178;
  - `History.test.tsx` +16 after line 42;
  - `Squad.test.tsx` +8 after line 262;
  - `save.test.ts` +1 after line 6 (new import).

## Binding sources

None. The plan's `Surface` is `None - nothing consumed outside`, and there are no mockups. Step 1 (`ui`) does not apply. Carried from c60980d; the fix range touched no interface.

## Proof run (verified at 8e0e5f3)

- The worktree had no `node_modules`, so I ran `npm ci` first (exit 0, 0 vulnerabilities).
- `npx vitest run --reporter=verbose` at 8e0e5f3: **28 files, 222 tests passed, 0 failed** (65.9 s). I extracted all 68 distinct `file | name` pairs from the `Proof:` lines in checks.md and matched each one against a `✓` line naming that file. All 68 matched, none is missing, and the log has no `×` line. The six proofs this round turns on:
  - `✓ src/engine/rollover.test.ts > virada de temporada > virada usa o próprio Rng`
  - `✓ src/engine/migrate.test.ts > migração do save > partidas migradas da série B usam a semente da porta 5`
  - `✓ src/ui/Squad.test.tsx > elenco com divisões, contratos e meta > renovar mostra salário novo`
  - `✓ src/ui/End.test.tsx > veredito na tela > textos do veredito` (new)
  - `✓ src/ui/History.test.tsx > tela Histórico > artilharia da série B` (new)
  - `✓ src/persistence/save.test.ts > histórico no save > histórico gravado com duas temporadas` (new)
- The only stderr output is React `act(...)` warnings: 9 blocks, for example in `renovar mostra salário novo` and `marcar à venda`. They are not failures.
- `npx tsc -p tsconfig.json --noEmit`: exit 0.
- `npx eslint src`: exit 0, no findings.
- `npm run build`: exit 0. The bundle is 311.48 kB JS and 34.03 kB CSS, the same as rounds 1 and 2, as expected with no production change.
- `git status --porcelain` was empty before the run, after every fault, and at the end.

## Checks

C19, C31, C38, C44, C52 and C55 are verified at 8e0e5f3. Every other row is carried from 31cae35, which carried it from c60980d. Their citations are refreshed where the fix shifted lines, and their proofs re-ran green at 8e0e5f3.

| Check | Claim | Proof run | Evidence | Result |
| --- | --- | --- | --- | --- |
| C1 | 2 leagues l1/l2, the AD-009 and AD-011 names, B ids c21-c40, no player name repeats | ✓ `duas divisões com identidades fixas` | carried from 31cae35: `src/engine/generate.test.ts:128` `toEqual(["l1","l2"])`; `:130-131` names; `:132` ids; `:136` `new Set(names).size` == `names.length` | PASS |
| C2 | per-club and division strength bands over 5 seeds | ✓ `série B mais fraca` | carried from 31cae35: `src/engine/generate.test.ts:147-152`, `:158-163` | PASS |
| C3 | Série A/B tabs, 20 alphabetical cards with «força», B pick saved and opened | ✓ `abas Série A e Série B` | carried from 31cae35: `src/ui/ChooseClub.test.tsx:34`, `:38-41`, `:51`, `:54` `saved.state.userClubId` toBe `chosen.id` | PASS |
| C4 | a B user's round plays both divisions; 38 rounds -> 380 played each | ✓ `rodada joga as duas divisões`, ✓ `temporada inteira nas duas divisões` | carried from 31cae35: `src/app.test.tsx:224-231`; `src/engine/live.test.ts:357`, `:361` `toHaveLength(380)` | PASS |
| C5 | 20 live matches with the door-2 seeds | ✓ `sementes das partidas das duas divisões` | carried from 31cae35: `src/engine/live.test.ts:331`, `:336-337` `mix32(state.rngState, n*16+i)`, `:341-342` `mix32(mix32(state.rngState, 0xb), n*16+i)` | PASS |
| C6 | «Jogos da rodada» has 10 items from the user's division (B and A) | ✓ `jogos da rodada só da divisão do usuário` | carried from 31cae35: `src/ui/Live.test.tsx:250`, `:262` `toHaveLength(10)`, `:266-267` | PASS |
| C7 | Squad table plus the «Divisão» selector | ✓ `classificação com seletor de divisão` (Squad) | carried from 31cae35: `src/ui/Squad.test.tsx:224-229` (before the fix hunk, unshifted) | PASS |
| C8 | Round screen table plus selector | ✓ `classificação com seletor de divisão` (Round) | carried from 31cae35: `src/ui/Round.test.tsx:121-124` | PASS |
| C9 | market lists 39 clubs + free agents; buying across divisions | ✓ `mercado com as duas divisões`, ✓ `compra de clube da outra divisão` | carried from 31cae35: `src/ui/Market.test.tsx:191` `39 * 22 + 40`, `:197-203`; `src/engine/market.test.ts:348-349` | PASS |
| C10 | B sponsorship 60%, A 100%; Finanças shows 60% | ✓ `série B recebe 60% do patrocínio`, ✓ `patrocínio da série B` | carried from 31cae35: `src/engine/finance.test.ts:317-321`; `src/ui/Finance.test.tsx:138` | PASS |
| C11 | core goal and home-win bands unchanged | ✓ `times iguais` | carried from 31cae35: `src/engine/balance.test.ts:54-57` (untouched test; `match.ts` not in the diff) | PASS |
| C12 | End screen summary | ✓ `resumo da temporada` | carried from 31cae35: `src/ui/End.test.tsx:56-64` (`"Sua posição: 7º na Série A"`, `Prêmio: ${brl(14 * 250_000)}`); the new End test was appended after `:96`, so nothing shifted | PASS |
| C13 | 4 up / 4 down, promoted appended in B-table order | ✓ `4 sobem e 4 descem` | carried from 31cae35: `src/engine/rollover.test.ts:54-59` (above the fix hunk, unshifted) | PASS |
| C14 | new schedule, market open, juniors jr-2-1-1..3 | ✓ `calendário novo e mercado aberto` | carried from 31cae35: `src/engine/rollover.test.ts:77`, `:79`, `:80` | PASS |
| C15 | fitness/cards/suspension reset; injury and morale kept | ✓ `condição renovada mantém lesão e moral` | carried from 31cae35: `src/engine/rollover.test.ts:91`, `:97` | PASS |
| C16 | offers cleared; finance unchanged | ✓ `caixa estádio e empréstimo continuam` | carried from 31cae35: `src/engine/rollover.test.ts:106`, `:109` | PASS |
| C17 | Nova temporada lists and empty states | ✓ `mostra aposentados contratos evolução e meta`, ✓ `listas vazias` | carried from 31cae35: `src/ui/NewSeason.test.tsx:46-58`, `:65-66` | PASS |
| C18 | reload at End shows the same summary; `nextSeason` equal | ✓ `recarregar no fim mostra o mesmo resumo` | carried from 31cae35: `src/app.test.tsx:271-275`, `:278`, `:280` `nextSeason(reloaded)` toEqual `nextSeason(game)` | PASS |
| C19 | rollover draws from `createRng(mix32(rngState, 0x5E45+season))`; new rngState = one `next()`; differing rngState -> differing evolution (door 3) | ✓ `virada usa o próprio Rng` at 8e0e5f3 | verified at 8e0e5f3: fixture `src/engine/rollover.test.ts:119-120` makes the first 8 players of the first Série A club that stays up 22 with contract 3 and rating 60. `:126` `expect(a.leagues[0]!.clubs[0]!.id).toBe(stays.id)`. **`:130` `expect(deltas).toEqual(draws(createRng(mix32(before.rngState, 0x5e45 + before.season))))`**: 8 draws of `randInt(1, 4)` with the literal written out (`:129`), which pins the stream. `:132` `expect(deltas).not.toEqual(draws(createRng(before.rngState)))` rules out the door's rejected alternative. `:133` rules out salt + 1. `:125` `expect(a.rngState).toBe(advanced.getState())`: rngState is one `next()` of `createRng(rngState)`. `:136` `expect(ratings(other)).not.toEqual(ratings(a))`: a differing rngState gives a differing evolution. Faults F9 (the rejected `createRng(input.rngState)`) and F8 (salt + 1), which survived round 2, are now both killed at `:130` | PASS |
| C20 | «Próxima temporada» saves before showing; failure warning | ✓ `próxima temporada grava antes de mostrar` | carried from 31cae35: `src/store.test.ts:167-173`, `:182-183` | PASS |
| C21 | 6 age bands, extremes, clamp 95/40 | ✓ `evolução por idade` | carried from 31cae35, refreshed (+1): `src/engine/rollover.test.ts:161-165` min/max per band (bands at `:143-149`); `:168-169` ≤ 95 and `toContain(95)`; `:171-172` ≥ 40 and `toContain(40)` | PASS |
| C22 | every remaining player +1 year | ✓ `todos envelhecem um ano` | carried from 31cae35, refreshed: `src/engine/rollover.test.ts:185` `expect(p.age, p.id).toBe(ages.get(p.id)! + 1)` | PASS |
| C23 | retirement shares by age; retired gone | ✓ `aposentadoria por idade` | carried from 31cae35, refreshed: `src/engine/rollover.test.ts:206-212` shares; `:213` absent from `everyone`; `:214` absent from starters | PASS |
| C24 | AI refill to 22 with juniors; user's club stays 15 | ✓ `IA repõe com juniores até 22` | carried from 31cae35, refreshed: `src/engine/rollover.test.ts:231` `expect(now.players).toHaveLength(22)`, `:232` `toHaveLength(15)`; `:236` `["FW","FW","FW"]`; `:238-242` age, rating, contract 3 | PASS |
| C25 | free agents back to ≥ 40 with bounds | ✓ `livres voltam a 40` | carried from 31cae35, refreshed: `src/engine/rollover.test.ts:253` ≥ 40; `:256-261` bounds | PASS |
| C26 | market value by rating and age | ✓ `valor pela força e idade` | carried from 31cae35: `src/engine/market.test.ts:57-61`, `:73` toBe `2_450_000` | PASS |
| C27 | strength stable over 5 seasons | ✓ `força estável em 5 temporadas` | carried from 31cae35: `src/engine/balance.test.ts:150` | PASS |
| C28 | contracts 1-4, each value present | ✓ `contratos de 1 a 4` | carried from 31cae35: `src/engine/generate.test.ts:173-175`, `:180` | PASS |
| C29 | arrival contracts 3/2/3, AI purchase 3 | ✓ `contrato ao chegar` | carried from 31cae35: `src/engine/market.test.ts:363` `toEqual([3, 2, 3])`, `:370` | PASS |
| C30 | «Contr.» column and «Último ano» | ✓ `coluna contrato e último ano` | carried from 31cae35: `src/ui/Squad.test.tsx:239` `headers.indexOf("Contr.")`, `:249` `expect(within(cell).queryByText("Último ano") !== null, p.name).toBe(p.contractSeasons === 1)` | PASS |
| C31 | «Renovar» only on 1-season rows (fixture has 1 and 2); dialog text with Y computed in the test; Confirm -> 3 and Y, Cancel -> unchanged; saves before showing | ✓ `renovar mostra salário novo`, ✓ `renovar grava antes de mostrar` at 8e0e5f3 | verified at 8e0e5f3: fixture `src/ui/Squad.test.tsx:259-260` has contracts 1 and 2, and `:262` spreads the rest over 1 to 4. **Every row:** `:269` `expect(has, \`${p.name} contrato ${p.contractSeasons}\`).toBe(p.contractSeasons === 1)`, inside a loop over every player of the club (`:267`), and `:271` `getAllByRole("button", { name: /^Renovar / })` `toHaveLength(` the count of contract-1 players `)`. `:265` is the 2-contract negative. `:274` `toHaveTextContent(\`Renovar ${last!.name} por 3 temporadas com salário ${brl(y)} por rodada. Confirmar?\`)` with `y = expectedSalary(77)` (`:272`). `:276` Cancelar -> `{ contractSeasons: 1, salary: 5_000 }`. `:279` Confirmar -> `{ contractSeasons: 3, salary: y }`. Saving: `src/store.test.ts:196-201` (carried). Fault F12 (the button also on contract 4) is killed at `:269` | PASS |
| C32 | user contracts −1; last-year players go to the free agents | ✓ `contrato cai e último ano vai para os livres` | carried from 31cae35, refreshed: `src/engine/rollover.test.ts:277-279` gone from the squad and lineup, and in the free agents with 0; `:281` `toBe(p.contractSeasons - 1)` | PASS |
| C33 | AI renewal ≤ 32 with formula salary; 33+ leave | ✓ `IA renova até 32 anos` | carried from 31cae35, refreshed: `src/engine/rollover.test.ts:301` `expect(x.salary).toBe(expectedSalary(x.rating))`; `:306-312` `expect(gone).toBeGreaterThan(0)` | PASS |
| C34 | prize at round 38 for all 40 clubs, none at 37 | ✓ `prêmio por posição na rodada 38` | carried from 31cae35: `src/engine/finance.test.ts:329`, `:331-336`, `:338` | PASS |
| C35 | «Prêmio» row in Finanças | ✓ `linha do prêmio` | carried from 31cae35: `src/ui/Finance.test.tsx:144`, `:153-154` | PASS |
| C36 | goal by strength rank; fixed on pick and on rollover | ✓ `meta pela força`, ✓ `escolher clube fixa a meta` | carried from 31cae35, refreshed: `src/engine/season.test.ts:23-30`, `:40-47`; `src/app.test.tsx:253-254`; rollover part `src/engine/rollover.test.ts:340` `expect(state.boardGoal).toBe(goal)` | PASS |
| C37 | the three goal texts | ✓ `meta da temporada` | carried from 31cae35, refreshed (+8): `src/ui/Squad.test.tsx:285-295` (cases `[0, 8, "Meta: até o 8º"]`, `[0, 16, "Meta: não cair"]`, `[1, 4, "Meta: subir"]` at `:285-287`) | PASS |
| C38 | 10-row verdict table (codes), and its on-screen texts | ✓ `veredito da diretoria`, ✓ `textos do veredito` at 8e0e5f3 | verified at 8e0e5f3: the 10 rows as codes at `src/engine/season.test.ts:52-64` (carried). On-screen text (new proof): `src/ui/End.test.tsx:115` `expect(screen.getByText("Sua posição: 10º na Série A"))`, then **`:117` `expect(shown, \`meta ${goal}\`).toEqual([text])`**, over the cases at `:104-106`: goal 10 -> «Meta cumprida», 8 -> «Meta não cumprida», 5 -> «Demitido». Here `shown` is the subset of the three texts found on screen, so exactly one verdict text is shown. Fault F13 («Demitido» rendered as «Meta não cumprida») is killed at `:117` | PASS |
| C39 | job offers and the disabled button | ✓ `propostas de emprego`, ✓ `demitido escolhe proposta` | carried from 31cae35: `src/engine/season.test.ts:72-80`; `src/ui/End.test.tsx:82-87` | PASS |
| C40 | a fired manager takes the chosen club | ✓ `demitido assume o novo clube`, ✓ `demitido escolhe proposta` | carried from 31cae35, refreshed: `src/engine/rollover.test.ts:329` `expect(state.userClubId).toBe(pick)`; `:332` 11 distinct starters; `:334` old lineup null; `:340` goal; `src/ui/End.test.tsx:90,92` | PASS |
| C41 | season games and goals per round, both divisions | ✓ `jogos e gols da temporada` | carried from 31cae35: `src/engine/condition.test.ts:117-126` | PASS |
| C42 | career += season, season -> 0 | ✓ `estatísticas vão para a carreira` | carried from 31cae35, refreshed: `src/engine/rollover.test.ts:353` `toEqual([0, 0])`; `:354` `toEqual([100 + b.seasonGames, 20 + b.seasonGoals])` | PASS |
| C43 | history record; a second rollover appends | ✓ `histórico da temporada` | carried from 31cae35, refreshed: `src/engine/rollover.test.ts:369-382` full record toEqual; `:392` `toHaveLength(2)`, `:393` first unchanged, `:394` `season` toBe 2 | PASS |
| C44 | «Histórico» opens; «Artilharia» = top 10 of the user's division by goals desc then name, with name, club, goals; «Voltar ao elenco» | ✓ `artilharia top 10`, ✓ `artilharia da série B` at 8e0e5f3 | verified at 8e0e5f3: Série A user `src/ui/History.test.tsx:38` `expect(cellsOf(screen.getByRole("table", { name: "Artilharia" }))).toEqual(expected.map(...))`, and `:40` back to the «Elenco» table (carried). Série B user (new, `seededGameIn(1, 42, 3, 8)` at `:44`): expected rows built from `game.leagues[1]` in the test (`:47-51`), `:52` `expect(expected).toHaveLength(10)`, **`:54` `expect(rows).toEqual(expected.map((s, i) => [String(i + 1), s.name, s.club, String(s.goals)]))`**, and `:56` no row's club is a Série A club. Fault F11 (the scorer list read from `game.leagues[0]`) is killed at `:54` | PASS |
| C45 | «Estatísticas» per player | ✓ `estatísticas do elenco` | carried from 31cae35, refreshed (+16): `src/ui/History.test.tsx:66` headers, `:68` `toHaveLength(22)`, `:71` per-player values | PASS |
| C46 | «Campeões» per season | ✓ `campeões por temporada` | carried from 31cae35, refreshed (+16): `src/ui/History.test.tsx:93-105` | PASS |
| C47 | empty-state texts | ✓ `histórico vazio` | carried from 31cae35, refreshed (+16): `src/ui/History.test.tsx:110` «Nenhum gol ainda», `:112` «Nenhuma temporada encerrada» | PASS |
| C48 | v3 with 5 rounds -> v4 | ✓ `migra v3 para v4` | carried from 31cae35: `src/engine/migrate.test.ts:89` `expect(withoutV4(a)).toEqual(oldA)`; `:91` market; `:55-58` B schedule and scores; `:66,70` stats and contracts `[1,2,3,4]`; `:74-75` history `[]`, `boardGoal` toBe `expectedGoalA(state)` (`:45-48`) | PASS |
| C49 | v2 and v1 -> v4 | ✓ `migra v2 e v1 para v4` | carried from 31cae35: `src/engine/migrate.test.ts:102-103`, `:108-109` `expectV4Finances` + `expectV4Additions` (`:15-38`); `:112` v1 condition | PASS |
| C50 | version 5 incompatible | ✓ `save de versão 5 incompatível` | carried from 31cae35: `src/ui/Home.test.tsx:71-72` | PASS |
| C51 | v4 passes unchanged; the saved document is v4 | ✓ `v4 passa direto`, ✓ `documento tem schemaVersion 4 com finanças e mercado` | carried from 31cae35, refreshed: `src/engine/migrate.test.ts:125` `expect(migrateSave(copy)).toEqual({ kind: "ok", state: r.state })`; `src/persistence/save.test.ts:36-39` (+1, new import; `:36` `expect(doc.schemaVersion).toBe(4)`) | PASS |
| C52 | new game: B = `generateLeague(createRng(mix32(seed,4)))`, A and rngState from `createRng(seed)`; migration: B from the same stream, played matches use `mix32(mix32(seed,0xB), n*16+i)`, migrating twice equal (door 5) | ✓ `série B tem stream próprio`, ✓ `série B migrada vem da seed`, ✓ `partidas migradas da série B usam a semente da porta 5` at 8e0e5f3 | verified at 8e0e5f3. New game (unchanged): `src/engine/generate.test.ts:189-190` A and `rngState` from `createRng(seed)`; `:193` `expect(state.leagues[1]).toEqual(generateLeague(createRng(mix32(seed, 4)), "l2", "Série B", SERIE_B, taken))`. Migration: `src/engine/migrate.test.ts:134` two migrations equal; `:140` B clubs and fixtures == `newGame(6)`'s. **`:173` `for (const n of [1, 2])` with `:175` `expect(stored, \`rodada ${n}\`).toEqual(replay(n, (i) => mix32(mix32(seed, 0xb), n * 16 + i)))`**: both played rounds are replayed with the literal written out, so `n` is pinned together with `i` = 0..9. `:177` the Série A scheme gives other scores in each round. The round 2 precision gap is closed: F4 (`n` fixed at 1), which survived round 2, is killed at `:175` on «rodada 2» | PASS |
| C53 | 5-season cash band | ✓ `caixa em 5 temporadas` | carried from 31cae35: `src/engine/balance.test.ts:158-166` | PASS |
| C54 | free agents 0, club players ≥ 1 | ✓ `contrato de clube nunca abaixo de 1` | carried from 31cae35, refreshed: `src/engine/rollover.test.ts:405` `toBeGreaterThanOrEqual(1)` per club player and `:406` `toBe(0)` per free agent; `:408-409` on `busySeason()` and after `nextSeason` | PASS |
| C55 | history only grows; the save written after two rollovers has both records in season order (Relations) | ✓ `histórico da temporada`, ✓ `histórico gravado com duas temporadas` at 8e0e5f3 | verified at 8e0e5f3: engine `src/engine/rollover.test.ts:393` `expect(two.history[0]).toEqual(one.history[0])` (refreshed +1). Saved document (new proof): two real seasons of 38 `playRound` plus `nextSeason` (`src/persistence/save.test.ts:113-124`). The test then runs production `saveGame` (`:125`) and `loadGame` (`:126`) over `fake-indexeddb` (`:19` `globalThis.indexedDB = new IDBFactory()`). **`:128` `expect(loaded.state.history.map((h) => h.season)).toEqual([1, 2])`**, `:129` `expect(loaded.state.history[0]).toEqual(first)` (a JSON snapshot taken after the first rollover, at `:123`), `:130` loaded == in-memory history. Fault F14 (`saveGame` writes the history reversed) is killed at `:128` | PASS |
| C56 | on migration, every Série A player's contract, in club and player order, is `randInt(1, 4)` from `createRng(mix32(seed, 5))` (door 5) | ✓ `contratos migrados da série A vêm de mix32(seed, 5)` | carried from 31cae35, refreshed (+3): `src/engine/migrate.test.ts:185` `const rng = createRng(mix32(seed, 5))`; **`:187` `expect(r.state.leagues[0]!.clubs.flatMap((c) => c.players.map((p) => p.contractSeasons))).toEqual(expected)`**; `:189` stream 6 differs. Faults F5, F6 and F7 were killed in round 2; the test body is unchanged | PASS |

## Faults injected

Profile `light` does not require this step. The round 3 brief allowed it to confirm the re-verified checks, so I ran it in this worktree, one fault per new or strengthened proof. F8 and F9 hit the same proof; I ran both because both survived round 2.

Method: `cp` the production file to a scratchpad backup, `sed` one line, run the narrowest proof (`npx vitest run <file> -t "<name>"`), then `cp` the backup back and confirm with `cmp` that the file is byte-identical. I never used `git stash` or git state. `git status --porcelain` was empty after every fault and at the end. All faults are reverted.

| Mutation | Location | Killed |
| --- | --- | --- |
| F9: door 3's rejected alternative, the rollover draws from `createRng(input.rngState)` (survived round 2) | `src/engine/rollover.ts:148` | yes - `rollover.test.ts:130`, deltas `[2,2,4,2,1,4,2,4]` vs `[2,3,2,1,2,3,2,4]` |
| F8: rollover salt `ROLLOVER_SALT + input.season + 1` (survived round 2) | `src/engine/rollover.ts:148` | yes - `rollover.test.ts:130`, deltas `[2,3,3,4,4,4,4,4]` |
| F4: catch-up ignores `n`, `matchSeed(seed, 1, i, 1)` (survived round 2) | `src/engine/migrate.ts:75` | yes - `migrate.test.ts:175` on «rodada 2» |
| F11: the scorer list reads `game.leagues[0]` instead of `userLeague(game)` | `src/ui/History.tsx:24` | yes - `History.test.tsx:54` |
| F12: «Renovar» also on contract 4, `(p.contractSeasons === 1 \|\| p.contractSeasons === 4)` | `src/ui/Squad.tsx:202` | yes - `Squad.test.tsx:269` («contrato 4: expected true to be false») |
| F13: the `fired` text becomes «Meta não cumprida» instead of «Demitido» | `src/engine/board.ts:59` | yes - `End.test.tsx:117` («meta 5») |
| F14: `saveGame` writes the history reversed, `{ ...state, history: [...state.history].reverse() }` | `src/persistence/save.ts:28` | yes - `save.test.ts:128` (`[2, 1]` vs `[1, 2]`) |

Round 2's killed faults (F1, F1b, F2, F3, F5, F6, F7, F10) are carried from 31cae35. Their production lines and covering assertions are unchanged, and the assertions shifted only in line number.

## Superseded checks of earlier features

Carried from 31cae35, which carried it from c60980d. The fix range changed no earlier test except by shifting lines. The round 1 table (9 rows, all declared) stands, and every superseding proof ran green at 8e0e5f3.

## Swept existing

Carried from c60980d. The fix range did not touch `src/ui/Banner.tsx` or `src/store.ts`.
- dependency failure (existing): «Não foi possível salvar» and «Salvamento indisponível neste navegador» at `src/ui/Banner.tsx:6-7`; C20 proves the rollover path.
- concurrency (n/a, policy): `nextSeason` in the store returns early while `saving` is set (`src/store.ts:365-370`).

## Not run under `light`

The coverage recompute and the Test policy verdicts belong to `standard` and `ui`, so I did not run them; checks.md carries no Test policy section. Fault injection ran only as the optional confirmation described above.

## Gate

`npx vitest run --reporter=verbose` - 222 passed, 0 failed (28 files) at 8e0e5f3. `npx tsc -p tsconfig.json --noEmit` exit 0, `npx eslint src` exit 0, `npm run build` exit 0.

## Remaining notes (not findings)

- **C38:** the on-screen proof samples one Série A position (10th) under three goals. The goal values 10, 8 and 5 are not rows of the check's table, but they apply the same rule: met when the position is at or above the goal, fired at goal + 5 or worse. Série B texts are not rendered in that test. The text is one `VERDICT_TEXT` map for both divisions (`src/engine/board.ts:56-60`), and all 10 rows are proven as codes in `season.test.ts`. So this is sampling, not a gap.
- **C55:** "a real IndexedDB save and load" runs through the production `saveGame` and `loadGame` over `fake-indexeddb`, as in every other test in `save.test.ts`. It is not a browser IndexedDB.
- The round 1 and round 2 precision notes on C19, C31, C44, C52 and C55 are resolved by the proofs cited above.
