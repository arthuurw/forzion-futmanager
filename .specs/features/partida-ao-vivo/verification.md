# Partida ao vivo verification

**Verdict**: PASS
**Profile**: light
**Diff range**: b73af86..42b255d (round 2 scope: fix range 1650910..42b255d)
**Round**: 2 - scoped
**Verifier**: independent sub-agent (author != verifier)

## Scope of this round

Round 1 (`b73af86..27ef097`, report committed at `1650910`) failed on one check, C47. The fix commit `42b255d` touches six files:

- `src/ui/Squad.test.tsx`: widens the C47 proof.
- `src/engine/live.ts` and `src/engine/lineup.ts`: the drain constants, `AI_REST_BELOW`, and a new `restBelow` parameter on the shared `autoLineup`.
- `src/engine/live.test.ts`: the C30 values and the new C48 test.
- `plan.md` and `checks.md`: the renegotiation.

What this round re-judges:

- **C47**, the round 1 failure.
- **C30 and C48**, which were renegotiated.
- **Checks whose proofs run through `live.ts` or `lineup.ts`.** `startRound` builds every AI lineup through `autoLineup`, so C22, C23 and C29 get a fresh look at the assertion. The balance checks and the round-level engine checks (C10, C11, C13, C20, C21, C24, C32, C44, C46) are covered by the full re-run.
- **Citations in the two touched test files.**

Every other row is marked `carried from 27ef097`: its judgment is inherited, but its proof re-ran at `42b255d`.

**The renegotiation is a visible diff.** Both `plan.md` (AC 30 edited inline, AC 45 added, `## Renegotiated` table at `plan.md:188`) and `checks.md` (C30 claim reworded with "renegociado", C48 added, `## Renegotiated` table at `checks.md:198`, a new Handoff boundary line) change in the fix commit itself. The commit message declares it ("Renegotiated with the user ... (C30, C48)"). The approval quote («sim, menos desgaste», 26/09/2026) is recorded in both artifacts. I have no way to see the user's approval directly; it is taken from the artifacts.

**No other assertion was weakened in the range.** `git diff --name-only 1650910..42b255d -- '*.test.*'` lists only `src/engine/live.test.ts` and `src/ui/Squad.test.tsx`. In `live.test.ts`, the only changed assertions are the two C30 values (3.0 -> 1.5 and 4.0 -> 2.0, as renegotiated), and the rest of the change is the new C48 test. In `Squad.test.tsx`, one assertion was removed: `fwSlot` options `toContain(benchDf.id)`. The new loop subsumes it, because its `spare` for `DF` is found with the same expression as `benchDf` (`club.players.find((p) => p.position === "DF" && !club.lineup!.starters.includes(p.id))`), and it is asserted in every slot. The later `user.selectOptions(fwSlot, benchDf.id)` would also throw if the option were missing.

**Blast radius of `autoLineup(..., restBelow = 0)`.** With the default `0`, `rested(p)` is `p.fitness >= 0`. That holds for every player, because fitness is clamped to `[0, 100]` (`src/engine/live.ts:294` `Math.max(0, ...)`, `src/engine/condition.ts:32` and `:37` `clamp(..., 0, 100)`). For players without a fitness value, the comparison is false for all of them alike. Either way, all players land in the same tier and the comparator reduces to the old `byRatingDesc`, so the user's default lineup (`src/store.ts:160` and `:169`), the test fixtures and `lineup.test.ts` see an identical order. Only the AI call at `src/engine/live.ts:384` passes `AI_REST_BELOW` (60). In the round-level tests, AI players are fresh (fitness 100), so their lineups do not change either. The balance tests use `flatSheet` and never call `autoLineup` or `startRound`, but they do feel the lower drain through in-match ratings; all of them re-ran green.

## Binding sources

Did not run: the profile is light (this step runs under `ui` only), and `plan.md` marks no source as binding. Carried from 27ef097.

## Checks

All 56 proofs (the 55 from round 1 plus C48) ran at HEAD `42b255d` in **one** invocation:

`node ../../../node_modules/vitest/vitest.mjs run src/app.test.tsx src/engine/balance.test.ts src/engine/condition.test.ts src/engine/lineup.test.ts src/engine/live.test.ts src/engine/migrate.test.ts src/persistence/save.test.ts src/ui/Home.test.tsx src/ui/Live.test.tsx src/ui/Squad.test.tsx --reporter=verbose -t "<alternation of the 56 Proof: names, regex-escaped, anchored>"`

That is `npx vitest run` resolved to the main checkout's `node_modules`, since the worktree has none. The result was exit 0, 10 files passed, **56 passed** | 19 skipped (the skipped tests are non-target tests in the same files). A script matched each of the 56 `Proof:` names from `checks.md` against the verbose `✓` lines, and each matched exactly once. No name matched zero tests.

| Check | Claim | Proof run | Evidence | Result |
| --- | --- | --- | --- | --- |
| C1 | «Jogar rodada» abre «Ao vivo» em 0', 10 jogos 0 x 0 | batch, `abre ao vivo em 0 com 10 jogos 0 x 0` ✓ | carried from 27ef097: `src/ui/Live.test.tsx:64` - `phase).toBe("live")`; `:65` - `clockText()).toBe("0'")`; `:67` - `games).toHaveLength(10)`; `:68` - `toBe("0 x 0")` | PASS |
| C2 | 1 minuto a cada 300 ms | batch, `relógio avança 1 minuto a cada 300 ms` ✓ | carried from 27ef097: `src/ui/Live.test.tsx:74` - `toBe("3'")` after 900 ms; `:76`/`:78` - `3'` at +299, `4'` at +300 | PASS |
| C3 | eventos no fim da narração, último visível | batch, `narração acrescenta eventos do minuto com o último visível` ✓ | carried from 27ef097: `src/ui/Live.test.tsx:91` - `lines).toHaveLength(events.length)`; `:95` - last line text; `:96` - `scrollIntoView.mock.contexts.at(-1)).toBe(lines.at(-1))` | PASS |
| C4 | gol muda placar no mesmo tick, destaque 2000 ms | batch, `gol muda placar no mesmo tick e pisca 2 s` ✓ | carried from 27ef097: `src/ui/Live.test.tsx:111` - score in the same `advance(300)`; `:112` - `toHaveClass("flash")`; `:115`/`:117` - flash at +1999, gone at +2000 | PASS |
| C5 | «Pausar» congela, «Continuar» retoma | batch, `pausar para e continuar retoma` ✓ | carried from 27ef097: `src/ui/Live.test.tsx:129` - `toBe("2'")` after 3000 ms paused; `:132` - `toBe("3'")` | PASS |
| C6 | 45' para sozinho com «Intervalo» | batch, `intervalo pausa no 45` ✓ | carried from 27ef097: `src/ui/Live.test.tsx:138` - `toBe("45'")`; `:139` - `getByText("Intervalo")`; `:141` - still `45'` | PASS |
| C7 | 2x = 150 ms, 4x = 75 ms | batch, `velocidades 2x e 4x` ✓ | carried from 27ef097: `src/ui/Live.test.tsx:149` - `toBe("2'")`; `:152` - `toBe("6'")` | PASS |
| C8 | «Pular para o fim» leva a 90' | batch, `pular para o fim vai ao 90` ✓ | carried from 27ef097: `src/ui/Live.test.tsx:162` - `Date.now() - started).toBeLessThan(5000)`; `:164` - `toMatchObject({ minute: 90, type: "fulltime" })`. Precision gap carried (wall clock, not zero timer advance). | PASS |
| C9 | 90' grava save avançado, 10 resultados e tabela | batch, `fim da rodada ao vivo grava e mostra resultados` ✓ | carried from 27ef097: `src/app.test.tsx:151`-`:153` - «Sua partida», 9 listitems, 21 rows; `:157` - `currentRound).toBe(1)` from IndexedDB | PASS |
| C10 | mesmas decisões -> mesmos resultados | batch, `mesmas decisões mesmos resultados` ✓ | carried from 27ef097 (runs through the changed `startRound`; re-ran green): `src/engine/live.test.ts:56` - `toHaveLength(10)`; `:57` - `expect(b).toEqual(a)` | PASS |
| C11 | substituição não muda os outros 9 | batch, `substituição não muda os outros 9 jogos` ✓ | carried from 27ef097: `src/engine/live.test.ts:65` - `withSub...).toEqual(without...)`; `:66` - `toHaveLength(9)` | PASS |
| C12 | recarregar no meio -> Elenco, save igual | batch, `recarregar no meio da rodada volta ao elenco com save intacto` ✓ | carried from 27ef097: `src/app.test.tsx:171` - `minute).toBeGreaterThanOrEqual(2)`; `:180` - `loadGame()).toEqual({ kind: "ok", state: before })` | PASS |
| C13 | `playRound` == `startRound` + `finish` | batch, `playRound equivale a rodada ao vivo sem decisões` ✓ | carried from 27ef097 (`playRound` calls `startRound`, `src/engine/season.ts:63`, so the AI rest rule applies to both sides of the equality): `src/engine/live.test.ts:76` - `toEqual(direct)`; `:77` - `toEqual(direct)` | PASS |
| C14 | pausado: 11 em campo e banco; rodando: desabilitado | batch, `pausado mostra em campo e banco com condição e moral` ✓ | carried from 27ef097: `src/ui/Live.test.tsx:171`-`:172` - `toBeDisabled()`; `:178` - `onPitch).toHaveLength(11)`; `:185` - `toBeEnabled()`. Precision gap carried (no unavailable bench player in the fixture). | PASS |
| C15 | reserva no mesmo slot, evento `substitution` | batch, `substituição entra no slot e narra` ✓, `substituir pela tela` ✓ | carried from 27ef097: `src/engine/live.test.ts:88` - `after.slots[10]).toBe(inId)`; `:91` - `events.at(-1)).toEqual({ ... type: "substitution" ... })`; `src/ui/Live.test.tsx:197` - `rows[10]).toHaveTextContent(inName)` | PASS |
| C16 | sexta recusada, «Limite de 5 substituições» | batch, `sexta substituição recusada` ✓, `mensagem limite de 5` ✓ | carried from 27ef097: `src/engine/live.test.ts:109` - `MAX_SUBS).toBe(5)`; `:112` - `toEqual({ ok: false, reason: "limit" })`; `src/ui/Live.test.tsx:213` - `toHaveTextContent("Limite de 5 substituições")` | PASS |
| C17 | quem saiu não volta | batch, `quem saiu não volta` ✓ | carried from 27ef097: `src/engine/live.test.ts:120` - `toEqual({ ok: false, reason: "returning" })` | PASS |
| C18 | expulso não pode ser substituído | batch, `expulso não pode ser substituído` ✓, `mensagem expulso` ✓ | carried from 27ef097: `src/engine/live.test.ts:131` - `toEqual({ ok: false, reason: "sent_off" })`; `src/ui/Live.test.tsx:234` - `toHaveTextContent("Jogador expulso não pode ser substituído")` | PASS |
| C19 | trocar formação mantém os 11, marca fora de posição | batch, `mudar formação redistribui sem tirar ninguém` ✓, `formação marca fora de posição` ✓ | carried from 27ef097: `src/engine/live.test.ts:142` - `toEqual(onBefore)`; `:146`-`:147` - one `DF` out of position; `src/ui/Live.test.tsx:243` - `getAllByText("fora de posição")).toHaveLength(1)` | PASS |
| C20 | «Ofensiva» finaliza ≥ 15% mais e sofre mais | batch, `postura ofensiva cria e sofre mais finalizações` ✓ | carried from 27ef097 (re-ran green under the lower drain): `src/engine/balance.test.ts:65` - `toBeGreaterThanOrEqual(balanced.homeShots * 1.15)`; `:66` - `toBeGreaterThan(balanced.awayShots)` | PASS |
| C21 | «Defensiva» sofre ≥ 15% menos gols | batch, `postura defensiva sofre menos gols` ✓ | carried from 27ef097 (re-ran green under the lower drain): `src/engine/balance.test.ts:72` - `toBeLessThanOrEqual(balanced.homeConceded * 0.85)` | PASS |
| C22 | IA troca lesionado na hora e cansado < 60 a partir do 60', até 5 | batch, `IA substitui lesionado e cansado` ✓ | verified at 42b255d. The fix touched `live.ts`, but this test sets fitness **during** the match (`side.fitness[tired] = 50`, `src/engine/live.test.ts:174`) after a kickoff at full fitness (`game(5)`), so the new kickoff-time rest rule cannot make it vacuous. `:163`-`:165` - the injured player's slot is refilled by a `DF`; `:177` - `afterTired.slots[tiredSlot]).not.toBe(tired)`; `:178` - the replacement's `position).toBe("MF")`; `:187`-`:188` - capped at `MAX_SUBS` | PASS |
| C23 | slot aceita outra posição, força 75% | batch, `fora de posição aceito com 75% da força` ✓ | verified at 42b255d (the test calls `autoLineup` with the default `restBelow = 0`, which keeps the old order): `src/engine/lineup.test.ts:47` - `oop.starters[fwSlot]).toBe(benchDf.id)`; `:48` - `validateLineup(c, oop).ok).toBe(true)`; `:49` - `toBeCloseTo(0.75, 10)` | PASS |
| C24 | amarelos [3,0; 5,5], vermelhos [0,08; 0,30] | batch, `taxa de cartões` ✓ | carried from 27ef097 (re-ran green under the lower drain): `src/engine/balance.test.ts:77`-`:80` - `yellows >= 3.0`, `<= 5.5`, `reds >= 0.08`, `<= 0.3` | PASS |
| C25 | 2º amarelo -> `red` e sai | batch, `segundo amarelo vira vermelho e sai` ✓ | carried from 27ef097: `src/engine/live.test.ts:203` - `toEqual(["yellow", "red"])`; `:204` - `not.toContain(id)`; `:211` - `found).toBeGreaterThan(0)` | PASS |
| C26 | expulso deixa slot vazio, setor mais fraco | batch, `expulsão deixa time com 10 e setor mais fraco` ✓ | carried from 27ef097: `src/engine/live.test.ts:225` - `toHaveLength(10)`; `:226` - `after.def).toBeLessThan(before.def)`; `:228` - `later.slots[df]).toBeNull()` | PASS |
| C27 | 3º amarelo suspende 1 e zera | batch, `três amarelos suspendem e zeram` ✓ | carried from 27ef097: `src/engine/condition.test.ts:24` - `suspendedRounds).toBe(1)`; `:25` - `yellowCards).toBe(0)` | PASS |
| C28 | vermelho suspende 1 rodada | batch, `vermelho suspende uma rodada` ✓ | carried from 27ef097: `src/engine/condition.test.ts:35` - `toBe(1)`; `:38` - `toBe(0)` | PASS |
| C29 | suspenso fora da escalação, selo «SUS» | batch, `indisponível não entra na escalação` ✓, `suspenso fica fora com selo SUS` ✓ | verified at 42b255d (`autoLineup` changed; `Squad.test.tsx` changed below these lines, and they did not move): `src/engine/lineup.test.ts:92` - `assignSlot(...)).toBeNull()`; `:93` - `toEqual({ ok: false, missing: 2 })`; `:96` - `fresh.starters).not.toContain(suspended!.id)`; `src/ui/Squad.test.tsx:74` - `getByText("SUS")`; `:76` - `not.toContain(benchDf.id)` | PASS |
| C30 | condição cai **0,15**/min até 30 anos e **0,2** acima (renegociado) | batch, `condição cai por minuto e mais rápido acima de 30` ✓ | verified at 42b255d: `src/engine/live.test.ts:242` - `expect(100 - end.fitness[young]!).toBeCloseTo(1.5, 5)`; `:243` - `expect(100 - end.fitness[old]!).toBeCloseTo(2.0, 5)` over 10 minutes (`young` is `age <= 30` at `:237`, `old` is `age > 30` at `:238`; the split is `age > VETERAN_AGE` at `src/engine/live.ts:293`). 1.5 = 10 x 0.15 and 2.0 = 10 x 0.2, matching `DRAIN_PER_MINUTE = 0.15` and `DRAIN_PER_MINUTE_VETERAN = 0.2` (`src/engine/live.ts:39`-`:40`). Both values sit inside the renegotiated AC 30 band [0,1; 0,25]. The old values (3.0 and 4.0) would fail at 5-decimal precision. | PASS |
| C31 | recupera 30 / 15, teto 100 | batch, `recuperação 30 e 15 até 100` ✓ | carried from 27ef097: `src/engine/condition.test.ts:42` - `toBe(75)`; `:43` - `toBe(90)`; `:44`-`:45` - `100` | PASS |
| C32 | lesões [0,10; 0,40] | batch, `taxa de lesões` ✓ | carried from 27ef097 (re-ran green under the lower drain): `src/engine/balance.test.ts:85`-`:86` - `injuries >= 0.1`, `<= 0.4` | PASS |
| C33 | lesionado sai no mesmo minuto, fora 1 a 4 rodadas | batch, `lesionado sai na hora` ✓, `lesão de 1 a 4 rodadas` ✓ | carried from 27ef097, citations refreshed (moved +24 lines): `src/engine/live.test.ts:284` - `side.slots).not.toContain(injury.playerId)`; `:285`-`:286` - `injured >= 1`, `<= 4`; `src/engine/condition.test.ts:68` - `toEqual([1, 2, 3, 4])` | PASS |
| C34 | lesionado fora com «LES» e rodadas | batch, `lesionado fica fora com selo LES e rodadas` ✓ | carried from 27ef097 (lines unchanged): `src/ui/Squad.test.tsx:87` - `getByText("LES 3")`; `:89` - `not.toContain(benchMf.id)` | PASS |
| C35 | indisponível desabilita com «Faltam 1 titulares» | batch, `escalação com indisponível desabilita` ✓ | carried from 27ef097 (lines unchanged): `src/ui/Squad.test.tsx:100` - `getByText("Faltam 1 titulares")`; `:101` - `toBeDisabled()`; suspended case at `src/engine/lineup.test.ts:93` | PASS |
| C36 | condição 50 = 85% | batch, `condição 50 rende 85%` ✓ | carried from 27ef097, citation refreshed: `src/engine/live.test.ts:296` - `toBeCloseTo(0.85, 10)` | PASS |
| C37 | vitória +1, teto +2 | batch, `vitória sobe moral até +2` ✓ | carried from 27ef097: `src/engine/condition.test.ts:72` - `toBe(2)`; `:73` - `toBe(2)` | PASS |
| C38 | derrota -1, piso -2 | batch, `derrota baixa moral até -2` ✓ | carried from 27ef097: `src/engine/condition.test.ts:78` - `toBe(-2)`; `:79` - `toBe(-2)` | PASS |
| C39 | 3 rodadas sem jogar: moral -1, zera `idleRounds` | batch, `três rodadas sem jogar baixa moral` ✓ | carried from 27ef097: `src/engine/condition.test.ts:86` - `{ idleRounds: 2, morale: 1 }`; `:88` - `{ idleRounds: 0, morale: 0 }` | PASS |
| C40 | moral +2 = +6% | batch, `moral +2 rende 6% a mais` ✓ | carried from 27ef097, citation refreshed: `src/engine/live.test.ts:301` - `toBeCloseTo(1.06, 10)` | PASS |
| C41 | seta de 5 níveis com cor | batch, `setas de moral em 5 níveis` ✓ | carried from 27ef097 (lines unchanged): `src/ui/Squad.test.tsx:121` - `el.textContent).toBe(arrow)`; `:122` - `toHaveClass(cls)` | PASS |
| C42 | v1 -> v2 migrado | batch, `migra save v1 para v2` ✓, `carrega save v1 migrado` ✓ | carried from 27ef097: `src/engine/migrate.test.ts:10` - `schemaVersion).toBe(2)`; `:13` - condition fields; `src/persistence/save.test.ts:90` - `toBe(2)` | PASS |
| C43 | versão 3 -> «Jogo salvo incompatível (versão 3)» | batch, `save de versão futura incompatível` ✓ | carried from 27ef097: `src/ui/Home.test.tsx:70` - `getByText(...)`; `:71` - `toEqual(["Novo jogo"])` | PASS |
| C44 | faixas do núcleo com condição 100, moral 0, «Equilibrada» | batch, `times iguais` ✓, `forte contra fraco` ✓ | carried from 27ef097 (re-ran green under the lower drain): `src/engine/balance.test.ts:51`-`:54` - `meanGoals` in [2.3, 3.1], `homeWinRate` in [0.4, 0.52]; `:59` - `>= 0.75` | PASS |
| C45 | documento v2, 6 campos por jogador | batch, `documento tem schemaVersion 2 com condição` ✓ | carried from 27ef097: `src/persistence/save.test.ts:34` - `schemaVersion).toBe(2)`; `:38` - `Number.isInteger(p[k])).toBe(true)` | PASS |
| C46 | 10 tipos em ≤ 200 rodadas, narração distinta | batch, `todos os 10 tipos de evento ocorrem e têm narração` ✓ | carried from 27ef097, citations refreshed: `src/engine/live.test.ts:319` - `MATCH_EVENT_TYPES).toHaveLength(10)`; `:320` - `[...seen.keys()].sort()).toEqual([...MATCH_EVENT_TYPES].sort())`; `:321` - `new Set(seen.values()).size).toBe(10)` | PASS |
| C47 | Elenco marca fora de posição, e o seletor do slot oferece jogadores de **todas** as posições | batch, `slot aceita outra posição e marca fora de posição` ✓ | verified at 42b255d: `src/ui/Squad.test.tsx:135`-`:141` - `for (const pos of POSITIONS)` (`GK, DF, MF, FW`, `src/engine/types.ts:2`) picks a bench player of that position, `:137` - `expect(spare).toBeTruthy()`, and `:138`-`:139` - `for (const select of screen.getAllByLabelText(/^Titular /))` `expect([...select.options].map((o) => o.value)).toContain(spare.id)`. `/^Titular /` reaches the one `<select>` per slot (`src/ui/Squad.tsx:139`, `aria-label={\`Titular ${i + 1} (...)\`}`), so each of the 4 positions is proven offered in all 11 slots: its own position and the 3 foreign ones. This kills the round 1 wrong implementations (goalkeepers kept out of outfield slots: the bench `GK` must appear in every slot; adjacent positions only: the `GK` must appear in the `ATA` slots). Marking: `:144` - `fwSlot.closest(".token")).toHaveClass("oop")`; `:145` - `getByText("fora de posição")`. The round 1 sampling gap is closed. | PASS |
| C48 | IA deixa fora quem está < 60 de condição quando há reserva da mesma posição com ≥ 60; exatamente 60 continua titular | batch, `IA poupa quem está abaixo de 60 de condição` ✓ | verified at 42b255d: `src/engine/live.test.ts:261` - `rested.length).toBeGreaterThanOrEqual(2)` (the precondition: at least 2 rested `FW`, enough for the 2 `FW` slots of `AI_FORMATION = "4-4-2"`, `src/engine/lineup.ts:10`); `:266` - `expect(side.slots).not.toContain(tiredFw.id)` (fitness 59); `:267` - `expect(side.bench).toContain(tiredFw.id)`; `:268` - `expect(side.slots).toContain(edgeMf.id)` (fitness exactly 60); `:270` - every `FW` slot holds a `position` `"FW"`. The test goes through the real `startRound` (`src/engine/live.ts:384`). Targeted mutants were run in an isolated copy (see Faults injected): `>=` -> `>`, the threshold at 59 and at 61, the AI not passing `restBelow`, and the tired slot filled by an out-of-position rested player were all killed. See the C48 note below for two claim-permitted variants that pass. | PASS |

## Coverage

Did not run: the profile is light (the Coverage recompute runs under `standard` and `ui`). Carried from 27ef097.

## Test policy rows

Did not run: the profile is light, and checks.md has no `Test policy` section. Carried from 27ef097.

## Faults injected

Fault injection is not required under light. It was run here because the dispatch brief asked whether C48's test fails under plausible wrong implementations. The mutants were applied to a copy of `src/` in the session scratchpad (with a junction to the main `node_modules`), never to the real tree. Each ran `vitest run src/engine/live.test.ts -t "IA poupa"`. The real tree's `git status --porcelain` was empty before and after.

| Mutation | Location | Killed |
| --- | --- | --- |
| `p.fitness >= restBelow` -> `>` (edge player at exactly 60 treated as tired) | `src/engine/lineup.ts:44` | yes - `:268` "expected [...] to include 'c2-p12'" |
| AI stops passing `AI_REST_BELOW` to `autoLineup` | `src/engine/live.ts:384` | yes - `:266` "to not include 'c2-p19'" |
| `AI_REST_BELOW` 60 -> 59 | `src/engine/live.ts:45` | yes - `:266` |
| `AI_REST_BELOW` 60 -> 61 | `src/engine/live.ts:45` | yes - `:268` |
| a tired same-position starter is replaced by a rested player of a **different** position | `src/engine/lineup.ts:48` | yes - `:270` "expected 'DF' to be 'FW'" |

## Swept existing

No rows resolve to `existing`. The `n/a` rows (authorization and observability) are approved policy. Carried from 27ef097; the fix adds no Swept rows.

## Superseded tests audit (nucleo-liga-partida)

Carried from 27ef097: 8 núcleo checks were audited against the round 1 diff and nothing undeclared was found. The fix range `1650910..42b255d` touches no núcleo test file. It changes only `src/engine/live.test.ts` and `src/ui/Squad.test.tsx`, both feature-owned, and both are audited in "Scope of this round" above.

## Gate

`npx vitest run` (resolved to `node ../../../node_modules/vitest/vitest.mjs run`) at `42b255d` gave 18 test files and **94 passed, 0 failed** (round 1 had 93; the new test is C48). `tsc -p tsconfig.json --noEmit` and `tsc -p tsconfig.engine.json --noEmit` both exit 0. `git status --porcelain` was clean before and after the runs.

## Notes (non-failing)

- **Precision gap, C48 (new).** The claim says only that the tired player "fica fora". It does not say who takes the slot. Two variants satisfy the claim as written, and both pass the proof:
  - **"Best rested of any position".** A tired starter is replaced by the best rested unused player of *any* position. It passes because in seed 3 the best rested bench player for the `FW` slots happens to be a `FW`, so `:270`'s same-position assertion does not discriminate. In another squad, this variant would put a rested `MF` or `DF` up front while a rested `FW` sits on the bench.
  - **"Tired never start".** Tired players are dropped from the pool entirely, even when no rested same-position player exists. The `autoLineup` comment at `src/engine/lineup.ts:43` says the opposite ("a tired one starts only when no rested one fits the slot"), but no check claims it.

  Neither variant contradicts C48 or AC 45 as written, so they are recorded as a gap in the checks rather than as surviving mutants. If same-position replacement, or the tired player starting as the fallback, is intended, the claim should say so, and the proof needs a fixture where the natural answer differs from the wrong one.
- **Cosmetic, C48 test.** The comment at `src/engine/live.test.ts:255` says "one starter of each outfield position", but only a `FW` and an `MF` are tired. There is no `DF` case. The rule is a single position-agnostic sort, so this is a comment inaccuracy, not a sampling gap.
- **C47.** The loop has no explicit count of selectors: 11 is implied by the rendering, not asserted. The first-row sampling gap is closed regardless.
- **Carried from 27ef097, still open:** the precision gaps on C8 (wall clock rather than a timer advance) and C14 (no unavailable bench player in the fixture); C35's suspended case proven only at the `validateLineup` level; the unchecked Observable «Sem reservas disponíveis» (`src/ui/Live.tsx:209`); and the `act(...)` warning noise in `app.test.tsx`.
- **Scratch residue.** The mutation copy is left in the session scratchpad (`scratchpad/mut`), outside the repo. The tool sandbox refused to remove its `node_modules` junction, and the directory was left rather than risk a recursive delete through the junction.
