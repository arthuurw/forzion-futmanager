# Copa nacional - verification report

**Verdict**: PASS
**Profile**: light
**Diff range**: 1417b07..f53091f (feature commits `ac0b16d` engine, `69eaa2a` ui, `f53091f` handoff docs; `ba274c2` is the approved renegotiation of C18 and the one-season cash measure; `6bfea94` (gastos-da-ia specs) and `e788da0` (product rename) are outside the feature and were not reviewed)
**Round**: 1 - full (all 63 checks, C1-C63)
**Verifier**: independent fresh sub-agent (author != verifier). It did not build the feature, fixed nothing, and wrote only this report

All 63 checks are proven at `f53091f`. The checks carry 75 distinct `Proof:` selectors. Every one resolves to a test that exists in the tree, ran individually at HEAD, and passed. Every check has at least one located assertion that targets the value the check names. The full suite, the build and the lint are green. There are five precision notes, and one note on the UX observation the builder raised. It does not contradict any check, but it does sit in tension with AC 44 in one edge case (see the last section). None of them fails a check.

## Binding sources

None. The plan's `Surface` is `None - nothing consumed outside` (static SPA, AD-001), and `Sources` lists only the approved roadmap/brainstorm and `.specs/STATE.md`, with no mockup or contract. Step 1 runs only under `ui`, and this feature was approved under `light`.

## Proof run (verified at f53091f)

- `git status --porcelain` was empty before the runs and is empty apart from this report.
- **Batched proof run**: one invocation over the 21 files named by the `Proof:` lines, with one `-t` alternation of all 75 names:
  `npx vitest run <21 files> -t "<75 names joined by |>" --reporter=verbose --maxWorkers=2`, exit 0. Result: **21 files, 75 passed, 134 skipped, 0 failed**.
- **Each named test exists and ran.** I extracted every `file | name` pair from `checks.md` with a script (75 unique pairs, not counting the `<arquivo> -t "<nome>"` template in `## Intent`). I matched each pair against a `✓` line in the verbose log that names both that file and that test. All 75 matched and none are missing. The log has no `×` line. I also located each name in the source with `grep -nF`, and each one hits a `test("…")` declaration. Examples: `src/engine/cup.test.ts:71 test("seis fases com âncoras fixas"`, `src/engine/lineup.test.ts:102 test("disponibilidade por competição"`, `src/app.test.tsx:286 test("data de copa sem o usuário fecha direto"`.
- **The proofs are new behaviour.** Every one of the 75 tests is added in the diff range (`git diff 1417b07..HEAD` shows a `+ test(` line for each). Three older tests were renamed in the range, and each rename is listed in the Superseded table: `v4 passa direto` became `v5 passa direto`, `documento tem schemaVersion 4…` became `…5 com copa`, and `save de versão 5 incompatível` became `…6…`. No `.skip` or `.only` was added, and I found no deleted test.
- AGENTS.md conventions: `grep Math.random` over non-test `src` finds nothing. No `src/engine/**` file imports React, zustand or idb (the only grep hits are the word "document" in comments). `tsconfig.engine.json` type-checks as part of the build.

## Checks

| Check | Claim | Proof run | Evidence | Result |
| --- | --- | --- | --- | --- |
| C1 | 44-date sequence `L×4,C0,L×6,…,C5,L×4` | ✓ `sequência das 44 datas` | `src/engine/calendar.test.ts:28` literal `expected` (`:29` length 44); `:36` `expect(seen).toEqual(expected)`; `:37-38` leagues `[38,38]`, `currentPhase` 6 | PASS |
| C2 | 6 phase names + anchors 4,10,16,22,28,34; id `"cup-nat"` | ✓ `seis fases com âncoras fixas` | `src/engine/cup.test.ts:73` `toBe("cup-nat")`; `:75-82` `toEqual([["Preliminar",4],…,["Final",34]])` | PASS |
| C3 | a cup date keeps both `currentRound` at 4 and `rounds` equal; only phase 0 gets results | ✓ `data de copa não mexe na liga` | `src/engine/calendar.test.ts:47` `toEqual([4, 4])`; `:48` `rounds` `toEqual(rounds)` (deep); `:50-51` 8 ties with results; `:53` later phases `result` `toBeNull()` | PASS |
| C4 | closing a cup date moves `currentPhase` k→k+1 and `rngState` by one `next()` | ✓ `fechar data avança fase e rng uma vez` | `src/engine/cup.test.ts:164-165`; `:166-168` `expect(after.rngState).toBe(rng.getState())` after one `rng.next()`, for all 6 dates | PASS |
| C5 | `playRound` plays the pending preliminary then round 5; 38 calls → phase 6, leagues 38 | ✓ `playRound joga copa pendente e uma rodada` | `src/engine/calendar.test.ts:61` `currentPhase` 1; `:62` winners set; `:63` `toEqual([5, 5])`; `:67` `toBe(6)`; `:68` `[38, 38]` | PASS |
| C6 | Squad next-date line reads «Copa Nacional · Preliminar», then «Rodada 5 de 38» | ✓ `próxima data de copa no elenco` | `src/ui/Squad.test.tsx:308` `getByText("Copa Nacional · Preliminar")`; `:309` no «Rodada N de 38»; `:313` `getByText("Rodada 5 de 38")` | PASS |
| C7 | via the store, round 38 → End screen with the Final's `winnerId` set | ✓ `fim da temporada com a copa decidida` | `src/store.test.ts:218` `expect(s.phase).toBe("end")`; `:220` `phases[5].ties[0].winnerId` `not.toBeNull()` | PASS |
| C8 | new-game seeding: 40 distinct ids, A then B, each by best-11 strength computed in the test | ✓ `chaveamento sem temporada anterior` | `src/engine/cup.test.ts:89-90` length 40, `Set` size 40; `:91` `toEqual([...byStrength(A), ...byStrength(B)])` (best-11 at `:63-64`, written in the test) | PASS |
| C9 | rollover seeding: A stayed, promoted, relegated, B stayed, in table order | ✓ `chaveamento da copa na virada` | `src/engine/rollover.test.ts:437` `toEqual([...tA.slice(0,16), ...tB.slice(0,4), ...tA.slice(16), ...tB.slice(4)])` (precision note 1) | PASS |
| C10 | preliminary = the last 16 seeds; «16 avos» = top 24 + 8 winners | ✓ `quem joga a preliminar e quem entra direto` | `src/engine/cup.test.ts:108` `Set` equals `seeding.slice(24)`; `:110-113` 16 ties, 32 clubs, `Set` = top 24 + winners | PASS |
| C11 | draws of 16,8,4,2,1 using exactly the qualified clubs, once each | ✓ `cada sorteio usa todos os classificados` | `src/engine/cup.test.ts:118` `toEqual([8,16,8,4,2,1])`; `:121` no repeats; `:123` `Set` equals previous winners (plus the top 24 at k=1) | PASS |
| C12 | home = higher seeding index, in every tie of a whole cup | ✓ `mando do pior chaveamento` | `src/engine/cup.test.ts:133` `indexOf(homeId)` `toBeGreaterThan(indexOf(awayId))`; `:137` `n` is 39 (every tie), over 2 seeds | PASS |
| C13 | preliminary has 8 ties before date 1 (new game, rollover, v4 migration at round 0) | ✓ `preliminar sorteada no começo`, ✓ `copa nova na virada`, ✓ `v4 na rodada 0 ganha preliminar` | `src/engine/cup.test.ts:98` `toHaveLength(8)`; `src/engine/rollover.test.ts:456` `toHaveLength(8)`; `src/engine/migrate.test.ts:212` `toHaveLength(8)` | PASS |
| C14 | door 3 draw: Fisher-Yates over `createRng(mix32(mix32(rngState,0xD0),k))`, k=0 and k=1 | ✓ `sorteio segue a semente da door 3` | `src/engine/cup.test.ts:145-146` k=0 `toEqual(expected0)` (reference draw written at `:47-60`); `:154-155` k=1 with the `rngState` from before the advance; `:148`, `:157` the rejected alternative and the post-advance state draw differently | PASS |
| C15 | level at 90' → `penalties` set, unequal, winner = more pens; otherwise `null` and winner = more goals | ✓ `empate vai aos pênaltis` | `src/engine/cup.test.ts:212-214`; `:217-218`; `:223-224` both branches exercised | PASS |
| C16 | shoot-out table: 3x0/6, 5x4/10, 6x5/12, 5x6/14 | ✓ `regras da disputa de pênaltis` | `src/engine/cup.test.ts:380-383` the four literal cases; `:391` `expect(r).toEqual(c.expected)`; `:393` alternating, home first | PASS |
| C17 | chance table 0.75/0.70/0.85/0.92/0.55 | ✓ `chance do pênalti` | `src/engine/cup.test.ts:399-403` literal rows; `:405` `toBeCloseTo(chance, 10)` | PASS |
| C18 | takers FW80, FW75, MF, DF, GK; red-carded and subbed-off excluded; 11th kick FW80 | ✓ `ordem dos batedores` | `src/engine/cup.test.ts:437-438` `penaltyTakers(...)` `toEqual(expected)`; `:452` first 10 kicks in a real shoot-out; `:453` `takers[10]` `toBe("H-fw80")`; `:454-455` neither fw90 nor fw85 | PASS |
| C19 | each kick → `penalty_scored`/`penalty_missed` with the taker; narration strings | ✓ `eventos de pênalti`, ✓ `narração de pênalti` | `src/engine/cup.test.ts:469` every post-fulltime event is a penalty event; `:473-474` scored counts equal `penalties.home/away`; `:475-476` `playerId` on the pitch; `src/engine/narration.test.ts:9` `` toBe(`Pênalti convertido por ${player.name}.`) ``, `:10` `` toBe(`${player.name} perde o pênalti.`) `` (precision note 2) | PASS |
| C20 | «1 x 1 (pên. 4 x 3)» on Ao vivo, results and cup screen | ✓ `placar com pênaltis ao vivo`, ✓ `placar com pênaltis nos resultados`, ✓ `placar com pênaltis na copa` | `src/ui/Live.test.tsx:302-303` clock «90'», heading `"1 x 1 (pên. 4 x 3)"`; `:305`; `src/ui/Round.test.tsx:177-182`; `src/ui/Cup.test.tsx:95` `toHaveTextContent("1 x 1 (pên. 4 x 3)")` | PASS |
| C21 | no loser appears in any later phase | ✓ `perdedor sai da copa` | `src/engine/cup.test.ts:233` later ties `not.toContain(loser)`, 2 seeds | PASS |
| C22 | a cup date with goals leaves `computeTable` and `seasonGames`/`seasonGoals` equal | ✓ `copa não conta na liga nem nas estatísticas` | `src/engine/cup.test.ts:244` scorers > 0; `:245` tables `toEqual`; `:247` stats `toEqual` | PASS |
| C23 | tie seed `mix32(mix32(rngState,0xC0),k*32+i)`; the shoot-out continues the match stream | ✓ `sementes das partidas de copa` | `src/engine/cup.test.ts:177` `toBe(mix32(mix32(before.rngState, 0xc0), phase * 32 + i))`; `:179` not the rejected `matchSeed`; `:196-197` the replay from minute 89 gives equal `penalties` and `events`; `:201` checked > 0 | PASS |
| C24 | cup yellow 0→1→2; from 2 → suspended 1, yellows 0 | ✓ `amarelos de copa` | `src/engine/condition.test.ts:150`, `:152`, `:154` `toEqual({ yellowCards: 0, suspendedRounds: 1 })`; `:162` through `finishCupDate` | PASS |
| C25 | red in the cup → cup suspended 1; that match's yellows do not add | ✓ `vermelho de copa` | `src/engine/condition.test.ts:169` `{0,1}` from 2 yellows + red; `:171` `{1,1}` from 1 prior + yellow + red | PASS |
| C26 | cup cards leave league yellows 2 / suspension 0 | ✓ `copa não mexe na disciplina da liga` | `src/engine/condition.test.ts:176` `toEqual([2, 0])`; `:177` cup suspension 1 | PASS |
| C27 | league cards leave `cupDiscipline` equal | ✓ `liga não mexe na disciplina da copa` | `src/engine/condition.test.ts:183` `toEqual({ "cup-nat": { yellowCards: 2, suspendedRounds: 1 } })`; `:189` for every player through `finishRound` | PASS |
| C28 | `isAvailableFor` 8-row table | ✓ `disponibilidade por competição` | `src/engine/lineup.test.ts:113-116` literal table; `:119-120` `toBe(inLeague)` / `toBe(inCup)` | PASS |
| C29 | `startCupDate`: AI picks the 2nd FW, not the cup-suspended 1st; user bench and slot exclude cup-suspended; `validateLineup` rejects for the cup | ✓ `suspenso na copa fica fora da data de copa` | `src/engine/cup.test.ts:274` `validateLineup(me, me.lineup, CUP).ok` `toBe(false)`; `:283-285` AI slots/bench; `:287-288` bench excludes the cup-suspended player and keeps the league-only one; `:289` `slots[5]` `toBeNull()` | PASS |
| C30 | league round: a cup-only suspended player is in the AI eleven and on the bench | ✓ `suspenso na copa joga a liga` | `src/engine/live.test.ts:385` AI slots `toContain(cupOnly.id)`; `:387` bench `toContain(benchCup.id)`; `:386`, `:388` the league-suspended player is excluded | PASS |
| C31 | cup suspension served only by clubs that played the date | ✓ `cumpre suspensão de copa` | `src/engine/condition.test.ts:200` `toBe(0)`; `:201` `toBe(1)` | PASS |
| C32 | injury −1 for played and idle clubs; played fitness = end + 15, cap 100 | ✓ `lesão e cansaço na data de copa` | `src/engine/condition.test.ts:212-213` both `toBe(1)`; `:219` `toBe(Math.min(100, Math.round(sd.fitness[id]!) + 15))`; `:224` more than 160 players checked | PASS |
| C33 | cup morale +1/−1 clamped, including a tie decided on penalties | ✓ `moral na copa` | `src/engine/condition.test.ts:228-231` 1, 2, −1, −2; `:243-244` shoot-out winner `[1, 2]`, loser `[-1, -2]` | PASS |
| C34 | idle club: 60/2/1 → 90/2/1; 85 → 100 | ✓ `clube fora da data descansa` | `src/engine/condition.test.ts:249` `toEqual([90, 2, 1])`; `:250` `toBe(100)`; `:258-259` through `finishCupDate` | PASS |
| C35 | Squad marks «Suspenso (copa)» before a cup date and not the league-only suspension; inverse before a league date | ✓ `suspensões pela próxima data` | `src/ui/Squad.test.tsx:333-336` «Suspenso (copa)», class `out`, league-only unmarked; `:343-346` «SUS» on league-only, cup-only unmarked | PASS |
| C36 | cup gate 24,000 × 40 = 960,000 for home, 0 for away | ✓ `bilheteria do mandante na copa` | `src/engine/cup.test.ts:309` `toMatchObject({ attendance: 24_000, tickets: 960_000 })`; `:310` away `{ attendance: 0, tickets: 0 }` | PASS |
| C37 | prize table 150k…2.5M for the winner, 0 for the loser, all 6 phases | ✓ `prêmio por fase` | `src/engine/cup.test.ts:17` literal `PRIZES`; `:315` dates `[0..5]`; `:319` winner `toBe(PRIZES[phase])`; `:320` loser `toBe(0)` | PASS |
| C38 | cash changes by exactly gate + prize; `loan` and `expansionRoundsLeft` unchanged | ✓ `data de copa não cobra folha nem juros` | `src/engine/cup.test.ts:332` payroll > 0; `:336` `toBe(960_000 + 150_000)`; `:337` `toEqual([1_000_000, 3, 24_000])` | PASS |
| C39 | `market` equal before/after, with an open offer | ✓ `data de copa não fecha o mercado` | `src/engine/cup.test.ts:295` offer; `:297` free agents/juniors non-empty; `:299` `toEqual(market)` | PASS |
| C40 | cup ledger with salaries/sponsorship/interest 0, gate, transfers, `cupPrize`; Finanças «Prêmio da copa» row when > 0 only | ✓ `registro da data de copa`, ✓ `linha prêmio da copa` | `src/engine/cup.test.ts:352-361` full ledger `toEqual({...})`; `:362-371` away; `src/ui/Finance.test.tsx:174` `toEqual(["Prêmio da copa", "R$ 150.000"])`; `:180` `toBeUndefined()` for the loser | PASS |
| C41 | `cupGoal` rule over the 40 clubs (prelim → 1; rank 1-4 → 4; 5-8 → 3; else 2) | ✓ `meta de copa pelos 40 clubes` | `src/engine/board.test.ts:43` expected written in the test; `:45` `toBe(expected)` per club; `:48` 40 clubs; `:49` all four bands hit; `:50` −1 without a club | PASS |
| C42 | `cupGoal` set on choose-club, rollover (incl. fired → new club), v4 migration | ✓ `meta de copa ao escolher clube`, ✓ `meta de copa na virada`, ✓ `meta de copa na migração` | `src/store.test.ts:230` `toBe(1)`, `:231`, `:236`; `src/engine/rollover.test.ts:473`, `:481` (fired manager's new club); `src/engine/migrate.test.ts:270`, `:273` `toBe(1)`, `:275` `toBe(-1)` | PASS |
| C43 | reached-phase table 0/2/5/6; met when reached ≥ goal | ✓ `fase alcançada e meta cumprida` | `src/engine/board.test.ts:63-69` literal table `toBe(reached)`; `:70-73` `cupGoalMet` | PASS |
| C44 | combined verdict, 9-row table | ✓ `veredito combinado` | `src/engine/board.test.ts:80-90` literal 9 rows; `:91` `toBe(expected)` | PASS |
| C45 | league-fired + cup met → «Meta não cumprida», no job offers, rollover without `jobClubId`, record `"missed"` | ✓ `copa salva o emprego`, ✓ `veredito combinado no histórico` | `src/ui/End.test.tsx:149-151`; `:158` `history[0].verdict` `toBe("missed")`; `src/engine/rollover.test.ts:491` `leagueVerdict` `toBe("fired")`; `:492-493`; `:496` `toBe("missed")` | PASS |
| C46 | «Meta na copa: chegar às oitavas» on Nova temporada and cup screen; labels for 1/3/4 | ✓ `meta na copa`, ✓ `rótulos da meta de copa` | `src/ui/NewSeason.test.tsx:73-76` literal labels; `:87` new-season screen; `:91` cup screen; `:98` wired through the rollover; `src/engine/board.test.ts:95` the four labels | PASS |
| C47 | Squad «Copa» button opens «Copa Nacional» | ✓ `botão copa` | `src/ui/Squad.test.tsx:353` click on «Copa»; `:354` `heading` level 1 `"Copa Nacional"` | PASS |
| C48 | 6 phases in order, preliminary with 8 ties by club name, others «a sortear»; scores after a phase | ✓ `fases e confrontos` | `src/ui/Cup.test.tsx:41` document order; `:44` 8 items; `:46-47` names; `:49` «a sortear»; `:60` `` `${home} ${score} ${away}` `` | PASS |
| C49 | «Na disputa», «Eliminado na Oitavas», «Campeão» | ✓ `situação do usuário` | `src/ui/Cup.test.tsx:70`, `:78` `/Eliminado na Oitavas/`, `:82` `/^Campeão/` | PASS |
| C50 | user not in the date: no Ao vivo, results «Copa Nacional · Preliminar», 8 ties closed, saved `currentPhase` 1 | ✓ `data de copa sem o usuário fecha direto` | `src/app.test.tsx:294` heading; `:295-296` no clock, `live` null; `:298-299`; `:302` loaded save `currentPhase` `toBe(1)` | PASS |
| C51 | Ao vivo heading «Ao vivo · Copa Nacional · Oitavas», 8 items, all the phase's ties | ✓ `ao vivo da copa` | `src/ui/Live.test.tsx:286`; `:288` `toHaveLength(8)`; `:290-291` names per tie | PASS |
| C52 | results heading «Copa Nacional · <fase>», all ties, «Próxima fase» with the draw; «Campeão: X» after the Final | ✓ `resultados da data de copa` | `src/ui/Round.test.tsx:145`, `:147-151`, `:153-154` 16 drawn pairs; `:164-165` «Campeão: …»; `:166` no «Próxima fase» | PASS |
| C53 | End «Copa Nacional» section: Campeão, Vice, Sua campanha; «Sua campanha: Campeão» | ✓ `copa no fim da temporada` | `src/ui/End.test.tsx:170-172`; `:178` `"Sua campanha: Campeão"` | PASS |
| C54 | `SeasonRecord.cups` entry; History «Copa Nacional» column with the champion, «-» for a migrated season | ✓ `copa no histórico`, ✓ `campeão da copa no histórico` | `src/engine/rollover.test.ts:504` `toEqual([record])` (record built in the test at `:42-52`); `src/ui/History.test.tsx:143-144` header; `:146-149` `[["2", champion.name], ["1", "-"]]` | PASS |
| C55 | after rollover every player (clubs, free, juniors) has `cupDiscipline {}`; new cup at phase 0 | ✓ `copa nova na virada` | `src/engine/rollover.test.ts:451-452` includes the formerly suspended player, `toEqual({})`; `:455-458` phase 0, 8 empty ties, 5 empty phases | PASS |
| C56 | saved doc `schemaVersion` 5, `cups`, numeric `cupGoal`, `cupDiscipline` on every player | ✓ `documento tem schemaVersion 5 com copa` | `src/persistence/save.test.ts:36` `toBe(5)`; `:37-41`; `:42` `typeof` `"number"`; `:48-49` over 900 players `toEqual({})` | PASS |
| C57 | v4 at round 12: phases 0-1 closed with winners, Oitavas drawn and unplayed, `nextDate` = league round 12; cash and condition unchanged | ✓ `v4 no meio da temporada ganha copa` | `src/engine/migrate.test.ts:223-226`, `:229-230`, `:233` `toEqual({ kind: "league", roundIndex: 12 })`; `:238` cash; `:240` 6 condition fields (precision note 3) | PASS |
| C58 | v4 at round 38: 6 phases closed, a champion | ✓ `v4 no fim da temporada ganha copa decidida` | `src/engine/migrate.test.ts:248-250` | PASS |
| C59 | v4 migration: `cupDiscipline {}` everywhere, `cups []` on records, `cupGoal` per C41 | ✓ `campos novos da v5` | `src/engine/migrate.test.ts:260`, `:262`, `:263` `toBe(expectedCupGoal(s))` (helper written in `src/engine/test-fixtures.ts:140-147`, not production) | PASS |
| C60 | v1, v2, v3 reach v5 with the cup | ✓ `v1 v2 e v3 viram v5` | `src/engine/migrate.test.ts:281` `toBe(5)`; `:284-285`; `:290` v3 at round 6 has the preliminary played | PASS |
| C61 | versions 6 and `"x"` incompatible; Home «Jogo salvo incompatível (versão 6)» | ✓ `versão acima de 5 incompatível`, ✓ `save de versão 6 incompatível` | `src/engine/migrate.test.ts:294-295`; `src/ui/Home.test.tsx:71` | PASS |
| C62 | same seed and decisions → equal `cups`; reload after the Preliminar changes nothing | ✓ `mesma seed mesma copa`, ✓ `reload no meio da copa não muda nada` | `src/engine/calendar.test.ts:83` `expect(run()).toEqual(a)`; `src/persistence/save.test.ts:152` phase 1 at save; `:164-165` `cups` and whole state equal | PASS |
| C63 | migration draws with door 3 over `mix32(seed,6)` and plays with door 2 over `mix32(seed,7)` | ✓ `sementes da migração da copa` | `src/engine/migrate.test.ts:303-313` the preliminary draw written out, `toEqual(expectedPairs)`; `:336` scores equal the replay seeded `mix32(mix32(mix32(seed, 7), 0xc0), i)`; `:337` not the seed-6 alternative | PASS |

## Level and sampling

- **Level.** No check names a route, status or response shape (`Surface` is `None`). The checks that cross persistence (C50, C56, C57-C62) are proven through IndexedDB (`fake-indexeddb`) or through `migrateSave` on a stored document shape, never below that boundary. C50 reads the saved document back through `loadGame` (`src/app.test.tsx:300-302`). The screen checks (C6, C20, C35, C40, C45-C54, C61) render the real component, or `App` through the store. C7 and C42 go through the store's actions. The engine rules that the checks say are wired into the date close (C24, C27, C31, C32, C34) are also asserted through `finishCupDate`/`finishRound` (L-003).
- **Sampling.** Every «todo/cada» claim is proven over the whole set. C1 covers all 44 dates, C2 all 6 phases, C12 all 39 ties (2 seeds), C37 all 6 phases, C41 all 40 clubs, C44 all 9 rows, C28 all 8 rows, C17 all 5 rows, and C16 all 4 cases. C27 and C55-C56 cover every player. C4 covers all 6 dates.

## Superseded checks of earlier features

| Earlier check | Test changed in range | Held |
| --- | --- | --- |
| multiplas-temporadas C50 | `src/engine/migrate.test.ts` `v5 passa direto` now asserts version 6 incompatible; `src/ui/Home.test.tsx` `save de versão 6 incompatível` | yes - renamed and moved one version up, no assertion dropped |
| multiplas-temporadas C51 | `src/persistence/save.test.ts` `documento tem schemaVersion 5 com copa`; `expectV4Finances` `toBe(5)` | yes |
| multiplas-temporadas C48, C49 | `expectV4Finances` keeps all its v4 assertions over the v5 result; `cupDiscipline` added to the ignored-keys list of the v3 comparison | yes |
| elenco-mercado-financas C13 | `src/engine/balance.test.ts` subtracts each cup date's gate and prize (renegotiated in `ba274c2`); the bands are unchanged | yes - the full suite passes |
| `playRound` literal numbers after round 4 | e.g. `src/ui/Round.test.tsx` «mostra Rodada N de 38» now starts at round 5; the same assertions shifted by one round | yes |

The handoff's noted risk, the 5-season cash band (multiplas-temporadas C34), holds: its test is green in the full suite.

## Swept existing

- **failure modes (existing)**: the constraint is there. The out-of-cup date path calls `await persist(state, set)` at `src/store.ts:316`. The live cup date closes through `finishCupDate` at `src/store.ts:215`, then `persist` at `:217`. `persist` (`src/store.ts:160-171`) sets `saveStatus` `"unavailable"`/`"failed"` on failure, the same path the league uses.
- **dependency failure (existing)**: the same `persist` catches the IndexedDB errors (`src/store.ts:161-170`). The feature adds no new outside dependency.
- **concurrency (n/a)**: user-approved policy. For the record, the guard it cites exists: `if (!game || finishing) return` at `src/store.ts:303`, and `finishing: true` at `:313`.
- authorization and observability are `n/a`, which is user-approved policy with nothing in the code to be wrong about.

## Not run under `light`

The `Coverage` recompute, the `Test policy` verdicts (checks.md has no `Test policy` section) and fault injection belong to `standard`/`ui`, and this feature was approved under `light`. So the report makes no claim that a set member without a proof is absent, nor that every test would fail under a wrong implementation. I read the author's `Coverage` table but did not recompute it.

## Gate

- `npm test -- --maxWorkers=2` at f53091f - **33 files, 295 passed, 0 failed** (60.1 s), exit 0
- `npm run build` - exit 0 (both `tsc` projects and `vite build`; 323.56 kB JS, 34.37 kB CSS)
- `npm run lint` (`eslint src`) - exit 0, no findings

## Precision notes (not failures)

1. **C9, «tabelas finais montadas no teste».** The test does not build the final tables by hand. It reads them from a season played to the end, through the production `computeTable` (`src/engine/rollover.test.ts:434-435`). `computeTable` is an older helper with its own proofs, and it is not the unit under test (`nextSeason`), so L-004 still holds. The check's wording promises a hand-built fixture that the test does not have.
2. **C19, «o número de eventos é igual ao total de cobranças».** No test counts the kicks independently. `:472` (`homeKicks.length + awayKicks.length` equals `kicks.length`) is true by construction. The scored events are tied to the score (`:473-474`), but the missed events are only constrained by the claim that every post-fulltime event is a penalty event (`:469`). «with `playerId` do batedor» is asserted as «on the pitch» (`:475-476`). The taker order is pinned only by C18's shoot-out (`:452-453`).
3. **C57, «a condição de todos os jogadores».** The assertion (`src/engine/migrate.test.ts:239-240`) covers club players only. Free agents and juniors are not compared with the v4 document.
4. **C45 (End screen).** The End-screen proof does not assert its precondition («seria Demitido»). That follows from 10th place with `boardGoal` 5 and `FIRED_MARGIN` 5 (`src/engine/board.ts:10`, `:52`). The paired rollover proof does assert it (`src/engine/rollover.test.ts:491`), so the check is covered.
5. **C17.** The check pins `penaltyChance` over plain numbers. The AC's «força efetiva» is carried by the caller: `src/engine/live.ts:430` passes `ownEffective(...)` and the keeper's `effectiveRating` (`:419`). No check asserts that wiring. It is within the check's literal claim.

## Builder's UX observation (AC 23 vs AC 44)

The observation: on a cup date, lineup validation checks cup suspensions even when the user's club is not playing. It is confirmed. `src/ui/Squad.tsx:67-69` validates against `nextCompetition(game)`, and «Jogar rodada» is `disabled={!validation.ok}` (`:312`). `src/ui/Round.tsx:35` does the same.

- **It contradicts no check.** C29 covers only a cup date the user plays. AC 23 says «WHILE a próxima data é uma fase de copa … na validação da escalação do usuário», with no exception for a user who is out, so the behaviour follows AC 23 literally.
- **It is in tension with AC 44 in one edge case, and no check covers that case.** A cup suspension is served only by a club that plays the date. AC 25 and C31 require this, and it happens at `src/engine/condition.ts:44-48`, where an idle club returns before `suspendedRounds--`. Take a user club that is knocked out with a player red-carded (or on his third cup yellow) in that match. The player keeps `cupDiscipline["cup-nat"].suspendedRounds` 1 until the rollover. If he stays in the starting eleven, every later cup date shows «Faltam 1 titulares» and «Jogar rodada» is disabled. AC 44 says «Jogar rodada» SHALL close a cup date the user does not play. The user can get past it by benching the player for that date, and the Squad screen marks him «Suspenso (copa)» (C35). So this is friction, not a dead end. The plan's `Observable` row («lineup inválido para a data de copa … desabilita «Jogar rodada», como hoje») did not separate the case where the user plays from the case where the user is out. This is a plan-level gap for the author to decide on, not a verification failure.

## Lessons recorded

With `lessons.py add`: C57 recurs L-005, which is now confirmed across two features. C19 became L-015, C9 became L-016, and the AC 23 x AC 44 interaction became L-017 (`ac_gap`). Notes 4 (C45) and 5 (C17) record nothing: the paired proof covers C45, and C17's wiring lies outside the check's literal claim.
