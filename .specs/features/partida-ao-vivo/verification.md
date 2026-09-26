# Partida ao vivo verification

**Verdict**: FAIL
**Profile**: light
**Diff range**: b73af86..27ef097
**Round**: 1 - full
**Verifier**: independent sub-agent (author != verifier)

## Binding sources

Did not run: the profile is light (this step runs under `ui` only). Also, `plan.md` marks no source as binding.

## Checks

All proofs ran at HEAD `27ef097` in two batched invocations. Each named test appears individually as passed (`✓`) in verbose output:

- **Engine and persistence:** `npx vitest run src/engine/live.test.ts src/engine/condition.test.ts src/engine/lineup.test.ts src/engine/migrate.test.ts src/engine/balance.test.ts src/persistence/save.test.ts --reporter=verbose -t "<34 names; + escaped as \+>"`. Result: 6 files passed, **34 passed** | 6 skipped (the skipped tests are non-target tests in the same files).
- **UI and app:** `npx vitest run src/ui/Live.test.tsx src/app.test.tsx src/ui/Squad.test.tsx src/ui/Home.test.tsx --reporter=verbose -t "<21 names>"`. Result: 4 files passed, **21 passed** | 13 skipped (non-target).

Together the runs cover 55 named proofs, one per `Proof:` line in checks.md. None matched zero tests. Every proof test is new or edited in `b73af86..27ef097`, except the C44 pair, which is discussed in its row.

| Check | Claim | Proof run | Evidence | Result |
| --- | --- | --- | --- | --- |
| C1 | «Jogar rodada» abre «Ao vivo» em 0', 10 jogos 0 x 0 | UI batch, `abre ao vivo em 0 com 10 jogos 0 x 0` ✓ | `src/ui/Live.test.tsx:64` - `expect(useGame.getState().phase).toBe("live")`; `:65` - `expect(clockText()).toBe("0'")`; `:67` - `expect(games).toHaveLength(10)`; `:68` - `expect(g.querySelector("b")!.textContent).toBe("0 x 0")` | PASS |
| C2 | 1 minuto a cada 300 ms; 900 ms -> 3' | UI batch, `relógio avança 1 minuto a cada 300 ms` ✓ | `src/ui/Live.test.tsx:74` - `expect(clockText()).toBe("3'")` after `advance(900)`; `:76`/`:78` - still `3'` at +299 ms, `4'` at +300 ms (fake timers) | PASS |
| C3 | eventos do minuto no fim da narração, último visível | UI batch, `narração acrescenta eventos do minuto com o último visível` ✓ | `src/ui/Live.test.tsx:91` - `expect(lines).toHaveLength(events.length)`; `:95` - `expect(lines.at(-1)!.textContent).toBe(\`${last.minute}' ${narrate(last, ctx)}\`)`; `:96` - `expect(scrollIntoView.mock.contexts.at(-1)).toBe(lines.at(-1))`. Level note: "visible" is proven by a `scrollIntoView` call on the last line, because jsdom has no layout. That proxy is adequate for the declared runner. | PASS |
| C4 | gol muda placar no mesmo tick, destaque 2000 ms | UI batch, `gol muda placar no mesmo tick e pisca 2 s` ✓ | `src/ui/Live.test.tsx:111` - `expect(row.querySelector("b")!.textContent).toBe(\`${scored.homeGoals} x ${scored.awayGoals}\`)` in the same `advance(300)`; `:112` - `toHaveClass("flash")`; `:115` - still `flash` at +1999 ms; `:117` - `not.toHaveClass("flash")` at +2000 ms | PASS |
| C5 | «Pausar» congela, «Continuar» retoma do mesmo minuto | UI batch, `pausar para e continuar retoma` ✓ | `src/ui/Live.test.tsx:129` - `expect(clockText()).toBe("2'")` after 3000 ms paused; `:132` - `expect(clockText()).toBe("3'")` 300 ms after «Continuar» | PASS |
| C6 | 45' para sozinho e mostra «Intervalo» | UI batch, `intervalo pausa no 45` ✓ | `src/ui/Live.test.tsx:138` - `expect(clockText()).toBe("45'")`; `:139` - `getByText("Intervalo")`; `:141` - still `45'` after +3000 ms | PASS |
| C7 | 2x = 150 ms, 4x = 75 ms | UI batch, `velocidades 2x e 4x` ✓ | `src/ui/Live.test.tsx:149` - `toBe("2'")` after 300 ms at 2x; `:152` - `toBe("6'")` after another 300 ms at 4x | PASS |
| C8 | «Pular para o fim» leva a 90' sem avançar o tempo | UI batch, `pular para o fim vai ao 90` ✓ | `src/ui/Live.test.tsx:162` - `expect(Date.now() - started).toBeLessThan(5000)`; `:164` - `expect(last.userEvents.at(-1)).toMatchObject({ minute: 90, type: "fulltime" })`; `:165` - `toHaveLength(10)`. Precision gap: "sem avançar o tempo" is measured as wall-clock time under 5 s with real timers, not as zero timer advance. Even so, 5 s is below the 6.75 s that a 4x clock would need, so the assertion still rules out animation. | PASS |
| C9 | 90' grava save avançado e mostra 10 resultados e tabela | UI batch, `fim da rodada ao vivo grava e mostra resultados` ✓ | `src/app.test.tsx:151` - `findByRole("region", { name: "Sua partida" })`; `:152` - `getAllByRole("listitem")).toHaveLength(9)` (the other 9 results); `:153` - `getAllByRole("row")).toHaveLength(21)` (the table); `:157` - `expect(saved.state.leagues[0]!.currentRound).toBe(1)` read back through `loadGame()` from IndexedDB (the round starts at 0, `src/engine/generate.ts:110`); `:158` - every match of round 0 has a `result`. The clock reaches 90' on its own at 4x. | PASS |
| C10 | mesmas decisões -> mesmos 10 resultados | engine batch, `mesmas decisões mesmos resultados` ✓ | `src/engine/live.test.ts:56` - `expect(a).toHaveLength(10)`; `:57` - `expect(b).toEqual(a)` (both runs with the same substitution at 30') | PASS |
| C11 | substituição não muda os outros 9 | engine batch, `substituição não muda os outros 9 jogos` ✓ | `src/engine/live.test.ts:65` - `expect(withSub.filter((r) => !isUser(r))).toEqual(without.filter((r) => !isUser(r)))`; `:66` - `toHaveLength(9)` | PASS |
| C12 | recarregar no meio -> Elenco da mesma rodada, save igual | UI batch, `recarregar no meio da rodada volta ao elenco com save intacto` ✓ | `src/app.test.tsx:171` - `live!.minute).toBeGreaterThanOrEqual(2)` (the reload happens mid-round); `:178` - `findByText("Rodada 1 de 38")`; `:179` - table «Elenco»; `:180` - `expect(await loadGame()).toEqual({ kind: "ok", state: before })` (read back from IndexedDB) | PASS |
| C13 | `playRound` == `startRound` + `finish` sem decisões | engine batch, `playRound equivale a rodada ao vivo sem decisões` ✓ | `src/engine/live.test.ts:76` - `expect(viaLive).toEqual(direct)`; `:77` - `expect(viaSteps).toEqual(direct)` | PASS |
| C14 | pausado: 11 em campo e banco com condição e moral; rodando: controles desabilitados | UI batch, `pausado mostra em campo e banco com condição e moral` ✓ | `src/ui/Live.test.tsx:171`-`:172` - «Substituir» and «Sai» `toBeDisabled()` while running; `:178` - `expect(onPitch).toHaveLength(11)`; `:179` - `expect(bench).toHaveLength(mySide().bench.length)`; `:182` - `.fnum` matches `/^\d+$/`; `:183` - `.morale` matches `/^[↓↘→↗↑]$/`; `:185` - «Substituir» `toBeEnabled()` once paused. Precision gap: the check says "banco disponível", but the fixture has no unavailable player, so no proof shows an injured or suspended player is left off the live bench. | PASS |
| C15 | reserva no mesmo slot a partir do minuto seguinte, evento `substitution` | engine batch, `substituição entra no slot e narra` ✓; UI batch, `substituir pela tela` ✓ | `src/engine/live.test.ts:88` - `expect(after.slots[10]).toBe(inId)`; `:91`-`:97` - `events.at(-1)).toEqual({ minute: 20, type: "substitution", clubId, playerId: outId, playerInId: inId })`; `:101` - `next.fitness[inId]).toBeLessThan(100)`; `:102` - `next.slots).not.toContain(outId)`; `src/ui/Live.test.tsx:197` - `rows[10]).toHaveTextContent(inName)`; `:200` - narration `toContain(\`entra ${inName}.\`)` | PASS |
| C16 | sexta recusada, «Limite de 5 substituições» | engine batch, `sexta substituição recusada` ✓; UI batch, `mensagem limite de 5` ✓ | `src/engine/live.test.ts:109` - `expect(MAX_SUBS).toBe(5)`; `:112` - `expect(sixth).toEqual({ ok: false, reason: "limit" })`; `src/ui/Live.test.tsx:213` - `getByRole("alert")).toHaveTextContent("Limite de 5 substituições")`; `:214` - still `Substituições: 5/5` | PASS |
| C17 | quem saiu não volta | engine batch, `quem saiu não volta` ✓ | `src/engine/live.test.ts:120` - `expect(substitute(live, state.userClubId!, 9, outId)).toEqual({ ok: false, reason: "returning" })` | PASS |
| C18 | expulso não pode ser substituído, mensagem na tela | engine batch, `expulso não pode ser substituído` ✓; UI batch, `mensagem expulso` ✓ | `src/engine/live.test.ts:131` - `toEqual({ ok: false, reason: "sent_off" })`; `src/ui/Live.test.tsx:234` - `getByRole("alert")).toHaveTextContent("Jogador expulso não pode ser substituído")` | PASS |
| C19 | trocar formação mantém os mesmos 11 e marca fora de posição | engine batch, `mudar formação redistribui sem tirar ninguém` ✓; UI batch, `formação marca fora de posição` ✓ | `src/engine/live.test.ts:142` - `expect(after.slots.filter(Boolean).sort()).toEqual(onBefore)`; `:146`-`:147` - exactly one out of position, a `DF`; `src/ui/Live.test.tsx:243` - `getAllByText("fora de posição")).toHaveLength(1)`; `:244` - 11 rows | PASS |
| C20 | «Ofensiva» finaliza ≥ 15% mais e sofre mais (2000 partidas) | engine batch, `postura ofensiva cria e sofre mais finalizações` ✓ | `src/engine/balance.test.ts:65` - `expect(attacking.homeShots).toBeGreaterThanOrEqual(balanced.homeShots * 1.15)`; `:66` - `expect(attacking.awayShots).toBeGreaterThan(balanced.awayShots)` (`tally` uses n = 2000, seeds 1..2000) | PASS |
| C21 | «Defensiva» sofre ≥ 15% menos gols | engine batch, `postura defensiva sofre menos gols` ✓ | `src/engine/balance.test.ts:72` - `expect(defensive.homeConceded).toBeLessThanOrEqual(balanced.homeConceded * 0.85)` | PASS |
| C22 | IA troca lesionado na hora e cansado < 60 a partir do 60', até 5 | engine batch, `IA substitui lesionado e cansado` ✓ | `src/engine/live.test.ts:163`-`:165` - the injured player's slot is refilled by another `DF` on the next step; `:177`-`:178` - the tired `MF` (fitness 50, minute 60) is replaced by an `MF`; `:187`-`:188` - with `subsUsed = MAX_SUBS`, the tired player stays and `subsUsed` stays at 5 | PASS |
| C23 | slot aceita outra posição, força 75% | engine batch, `fora de posição aceito com 75% da força` ✓ | `src/engine/lineup.test.ts:47` - `expect(oop.starters[fwSlot]).toBe(benchDf.id)`; `:48` - `validateLineup(c, oop).ok).toBe(true)`; `:49` - `expect(effectiveRating(benchDf, "FW") / effectiveRating(benchDf, "DF")).toBeCloseTo(0.75, 10)` | PASS |
| C24 | amarelos [3,0; 5,5], vermelhos [0,08; 0,30] | engine batch, `taxa de cartões` ✓ | `src/engine/balance.test.ts:77`-`:80` - `t.yellows >= 3.0`, `<= 5.5`, `t.reds >= 0.08`, `<= 0.3` | PASS |
| C25 | 2º amarelo -> `red` e sai | engine batch, `segundo amarelo vira vermelho e sai` ✓ | `src/engine/live.test.ts:203` - `expect(mine.map((e) => e.type)).toEqual(["yellow", "red"])`; `:204` - `side.slots).not.toContain(id)`; `:206` - no later event for the player; `:211` - `expect(found).toBeGreaterThan(0)` (the case is reached) | PASS |
| C26 | expulso deixa slot vazio até o fim, setor mais fraco | engine batch, `expulsão deixa time com 10 e setor mais fraco` ✓ | `src/engine/live.test.ts:225` - `slots.filter(Boolean)).toHaveLength(10)`; `:226` - `expect(after.def).toBeLessThan(before.def)`; `:228` - `expect(later.slots[df]).toBeNull()` at 90' | PASS |
| C27 | 3º amarelo acumulado suspende 1 e zera | engine batch, `três amarelos suspendem e zeram` ✓ | `src/engine/condition.test.ts:24` - `expect(third.suspendedRounds).toBe(1)`; `:25` - `expect(third.yellowCards).toBe(0)`; `:30` - `served.suspendedRounds).toBe(0)` | PASS |
| C28 | vermelho suspende 1 rodada, acaba depois de cumprida | engine batch, `vermelho suspende uma rodada` ✓ | `src/engine/condition.test.ts:35` - `expect(sent.suspendedRounds).toBe(1)`; `:38` - `expect(served.suspendedRounds).toBe(0)` | PASS |
| C29 | suspenso fora da escalação, selo «SUS» | engine batch, `indisponível não entra na escalação` ✓; UI batch, `suspenso fica fora com selo SUS` ✓ | `src/engine/lineup.test.ts:92` - `expect(assignSlot(c, lineup, 0, suspended!.id)).toBeNull()`; `:93` - `validateLineup(c, lineup)).toEqual({ ok: false, missing: 2 })`; `:96` - `fresh.starters).not.toContain(suspended!.id)`; `src/ui/Squad.test.tsx:74` - `within(row).getByText("SUS")`; `:76` - the slot's options `not.toContain(benchDf.id)` | PASS |
| C30 | condição cai 0,3/min até 30 anos e 0,4 acima | engine batch, `condição cai por minuto e mais rápido acima de 30` ✓ | `src/engine/live.test.ts:242` - `expect(100 - end.fitness[young]!).toBeCloseTo(3.0, 5)`; `:243` - `expect(100 - end.fitness[old]!).toBeCloseTo(4.0, 5)` over 10 minutes (`young` is age ≤ 30, `old` is > 30) | PASS |
| C31 | recupera 30 sem jogar, 15 jogando, teto 100 | engine batch, `recuperação 30 e 15 até 100` ✓ | `src/engine/condition.test.ts:42` - `.fitness).toBe(75)` (played, 60 -> 75); `:43` - `toBe(90)` (did not play); `:44`-`:45` - capped at `100` both ways | PASS |
| C32 | lesões [0,10; 0,40] | engine batch, `taxa de lesões` ✓ | `src/engine/balance.test.ts:85`-`:86` - `t.injuries >= 0.1`, `<= 0.4` | PASS |
| C33 | lesionado sai no mesmo minuto, fora 1 a 4 rodadas | engine batch, `lesionado sai na hora` ✓ and `lesão de 1 a 4 rodadas` ✓ | `src/engine/live.test.ts:260` - `expect(side.slots).not.toContain(injury.playerId)` in the injury's own minute; `:261`-`:262` - `injured >= 1`, `<= 4`; `src/engine/condition.test.ts:68` - `expect([...durations].sort()).toEqual([1, 2, 3, 4])` over 120 simulated rounds; `:51`-`:54` - counts down 3 -> 2 -> 1 -> 0 | PASS |
| C34 | lesionado fora com «LES» e rodadas | UI batch, `lesionado fica fora com selo LES e rodadas` ✓ | `src/ui/Squad.test.tsx:87` - `within(row).getByText("LES 3")`; `:89` - no «Titular» select's options `toContain(benchMf.id)` | PASS |
| C35 | escalação com lesionado ou suspenso desabilita com «Faltam 1 titulares» | UI batch, `escalação com indisponível desabilita` ✓ | `src/ui/Squad.test.tsx:100` - `getByText("Faltam 1 titulares")`; `:101` - «Jogar rodada» `toBeDisabled()`. Sampling note: the screen is exercised with an injured starter only. The suspended half is proven one layer down: `src/engine/lineup.test.ts:93` counts a suspended starter as missing in `validateLineup`. | PASS |
| C36 | condição 50 = 85% da de condição 100 | engine batch, `condição 50 rende 85%` ✓ | `src/engine/live.test.ts:272` - `expect(effectiveRating({ ...p, fitness: 50 }, "MF") / effectiveRating(p, "MF")).toBeCloseTo(0.85, 10)` | PASS |
| C37 | vitória +1 a quem jogou, teto +2 | engine batch, `vitória sobe moral até +2` ✓ | `src/engine/condition.test.ts:72` - `morale 1 + win -> toBe(2)`; `:73` - `morale 2 + win -> toBe(2)` | PASS |
| C38 | derrota -1 a quem jogou, piso -2 | engine batch, `derrota baixa moral até -2` ✓ | `src/engine/condition.test.ts:78` - `-1 + loss -> toBe(-2)`; `:79` - `-2 + loss -> toBe(-2)` | PASS |
| C39 | 3 rodadas sem jogar: moral -1 e zera `idleRounds` | engine batch, `três rodadas sem jogar baixa moral` ✓ | `src/engine/condition.test.ts:86` - `toMatchObject({ idleRounds: 2, morale: 1 })`; `:88` - `toMatchObject({ idleRounds: 0, morale: 0 })`; `:91` - playing resets `idleRounds` to 0 | PASS |
| C40 | moral +2 = +6% | engine batch, `moral +2 rende 6% a mais` ✓ | `src/engine/live.test.ts:277` - `expect(effectiveRating({ ...p, morale: 2 }, "FW") / effectiveRating(p, "FW")).toBeCloseTo(1.06, 10)` | PASS |
| C41 | seta de 5 níveis com classe de cor | UI batch, `setas de moral em 5 níveis` ✓ | `src/ui/Squad.test.tsx:121` - `expect(el.textContent).toBe(arrow)`; `:122` - `expect(el).toHaveClass(cls)`, over `:108`-`:112` (↓ mn2, ↘ mn1, → mp0, ↗ mp1, ↑ mp2). In `src/styles.css:1559`-`:1574` the classes map to red `#ff3b3b`, orange `#ff8a00`, yellow `#ffd23f`, light green `#9dff7a` and green `#1fc257`. | PASS |
| C42 | v1 -> v2 com condição 100, moral 0, contadores 0, postura balanced | engine batch, `migra save v1 para v2` ✓; engine batch, `carrega save v1 migrado` ✓ | `src/engine/migrate.test.ts:10` - `schemaVersion).toBe(2)`; `:13` - every player `toMatchObject({ fitness: 100, morale: 0, injuryRounds: 0, suspendedRounds: 0, yellowCards: 0, idleRounds: 0 })`; `:17` - `user.lineup).toMatchObject({ formation: "4-3-3", posture: "balanced" })`; `src/persistence/save.test.ts:90` - `loaded.state.schemaVersion).toBe(2)` after reading a v1 document from IndexedDB; `:91` - `toMatchObject({ fitness: 100, morale: 0, idleRounds: 0 })`. Note: posture is asserted on the one lineup the v1 fixture carries. | PASS |
| C43 | `schemaVersion` 3 -> «Jogo salvo incompatível (versão 3)», só «Novo jogo» | UI batch, `save de versão futura incompatível` ✓ | `src/ui/Home.test.tsx:70` - `getByText("Jogo salvo incompatível (versão 3)")`; `:71` - buttons `toEqual(["Novo jogo"])` | PASS |
| C44 | com condição 100, moral 0, «Equilibrada», faixas do núcleo valem | engine batch, `times iguais` ✓ and `forte contra fraco` ✓ | `src/engine/balance.test.ts:51`-`:54` - `meanGoals` in [2.3, 3.1], `homeWinRate` in [0.4, 0.52]; `:59` - `homeWinRate >= 0.75`. These assertions are unchanged from `b73af86`. The claimed preconditions hold: `flatSheet` defaults the posture to `"balanced"`, and `effectiveRating` treats missing condition as `fitness 100`, `morale 0` (`src/engine/strength.ts:12`-`:13`). The tests pre-date the feature, but they now run on the new minute-step engine (`src/engine/match.ts:34`), so they do prove the new behaviour. | PASS |
| C45 | documento `schemaVersion: 2`, cada jogador com os 6 campos | engine batch, `documento tem schemaVersion 2 com condição` ✓ | `src/persistence/save.test.ts:34` - `expect(doc.schemaVersion).toBe(2)` on the raw IndexedDB document; `:38` - `Number.isInteger(p[k])).toBe(true)` for each of `fitness, morale, injuryRounds, suspendedRounds, yellowCards, idleRounds`, on every player of every club; `:42` - `lineup.posture).toBe("balanced")` | PASS |
| C46 | os 10 tipos ocorrem em ≤ 200 rodadas, narração distinta | engine batch, `todos os 10 tipos de evento ocorrem e têm narração` ✓ | `src/engine/live.test.ts:295` - `expect(MATCH_EVENT_TYPES).toHaveLength(10)`; `:296` - `[...seen.keys()].sort()).toEqual([...MATCH_EVENT_TYPES].sort())`; `:297` - `new Set(seen.values()).size).toBe(10)` | PASS |
| C47 | Elenco marca fora de posição, e o seletor do slot oferece jogadores de **todas** as posições | UI batch, `slot aceita outra posição e marca fora de posição` ✓ | `src/ui/Squad.test.tsx:135` - `expect([...fwSlot.options].map((o) => o.value)).toContain(benchDf.id)`; `:137` - `fwSlot.closest(".token")).toHaveClass("oop")`; `:138` - `getByText("fora de posição")`. **Sampling gap:** the claim names every position, but the only assertion is that one `DF` appears in the `ATA` slot. No test at any level shows a `GK` or `MF` offered in a foreign slot. A plausible wrong implementation would pass this proof, for example one that keeps goalkeepers out of outfield slots or offers only adjacent positions. The marking half is proven; the "todas as posições" half is proven on 1 of the 3 foreign positions. | FAIL |

## Coverage

Did not run: the profile is light (the Coverage recompute runs under `standard` and `ui`).

## Test policy rows

Did not run: the profile is light, and checks.md has no `Test policy` section.

## Faults injected

Did not run: the profile is light (fault injection runs under `standard` and `ui`).

## Swept existing

No rows resolve to `existing`. The `n/a` rows, authorization and observability, are approved policy.

## Superseded tests audit (nucleo-liga-partida)

The audit covers every pre-existing test file the diff touches (`git diff --numstat b73af86..27ef097`). The tree at `b73af86` already had these test files: app, balance, lineup, match, save, End, Home, Round, Squad and test-utils.

| Núcleo check | Declared change | What the diff shows | Verdict |
| --- | --- | --- | --- |
| C19 | slot accepts another position | `src/engine/lineup.test.ts:40` is renamed to `fora de posição aceito com 75% da força`. `toBeNull()` becomes acceptance plus the 75% ratio. The rest of the test (`:51`-`:57`) is unchanged. | as declared |
| C33 | 6 -> 10 event types | `src/engine/match.test.ts:64` is renamed. It now asserts every type except `substitution` in the one-shot simulator, with 9 distinct narrations. The 10th type is proven in C46. | as declared, not weakened |
| C15 | `schemaVersion` 1 -> 2 | `src/persistence/save.test.ts:23` asserts `toBe(2)`, adds the per-player condition fields and posture, and keeps the other assertions. | as declared, strengthened |
| C36 | v1 migrates, only > 2 incompatible | No edit. `Home.test.tsx` `save incompatível` and `save.test.ts` `sem save e save incompatível` still use version 7, which stays incompatible. | declared but not needed; no undeclared change |
| C21 | flow goes through «Ao vivo» | No edit. `src/ui/Round.test.tsx:28` renders `<Round/>` directly with no click-through. | declared but not needed; no undeclared change |
| C29, C35, C37, C39 | adds a «Pular para o fim» step | `src/app.test.tsx:66`, `:84`, `:114` and `:132` add only `await skipLive(user);`. The assertions are unchanged. | as declared |
| C30, C31 | adds a «Pular para o fim» step | `src/ui/Round.test.tsx:62` and `:75` add only `await skipLive(user);`. The assertions are unchanged. | as declared |
| C34 | adds a «Pular para o fim» step | `src/ui/End.test.tsx:19` adds only `await skipLive(user);`. The assertions are unchanged. | as declared |

Two other pre-existing test files changed. Both edits are declared in the commit messages and the Handoff:

- **`src/engine/balance.test.ts`.** The annotation changes from `Player[]` to `PlayerCore[]`. `flatSheet` also gains an optional `posture` parameter that defaults to `"balanced"`, and a new `tally` helper is added. That is slightly more than "type-only", but it is behaviour-neutral for the old tests. The assertions of `times iguais` and `forte contra fraco` (`:51`-`:59`) are byte-identical to `b73af86`. **Not weakened.**
- **`src/ui/test-utils.ts`.** After the simulated rounds, `seededGame` calls `autoLineup` again on the user's club, keeping its formation. With `roundsPlayed = 0` this is a deterministic no-op. With rounds played (`End.test.tsx:14`, `Round.test.tsx:71`, `app.test.tsx:80` and `:122`), it only swaps out injured or suspended starters, so «Jogar rodada» stays enabled. The C35 and C39 tests compare against the same post-fixture state on both sides. **No assertion is weakened.** The file also gains the `skipLive` helper.

Every other change to a pre-existing test file is an added test (Squad, Home, save, lineup, app, balance) or an import line. The audit found **no undeclared modification**.

## Gate

`npx vitest run` - 93 passed, 0 failed (18 test files) at `27ef097`. `git status --porcelain` was clean after the runs.

## Notes (non-failing)

- **Precision gap, C8.** "sem avançar o tempo" is proven by wall-clock time under 5 s with real timers, not by zero fake-timer advance. The 90' is read from `lastRound.userEvents` (`fulltime`, minute 90) rather than from the clock.
- **Precision gap, C14.** "banco disponível" is never exercised with an unavailable player, so leaving injured or suspended players off the live bench is unproven.
- **C35.** The screen is exercised with an injured starter only; the suspended case is proven at the `validateLineup` level.
- **Unchecked Observable row.** The empty-bench state «Sem reservas disponíveis» (plan Observable, AC 13) is rendered at `src/ui/Live.tsx:209`, but no check or test covers it. Finding this kind of gap is the job of the standard-profile Coverage sweep, so it is noted here, not failed.
- **Test output noise.** `app.test.tsx` `recarregar no meio da rodada...` logs React `act(...)` warnings from the real-timer clock. The test passes; the warnings are only noise.
