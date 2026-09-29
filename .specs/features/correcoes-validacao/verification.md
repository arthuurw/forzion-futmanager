# Correções da validação ampla verification

**Verdict**: PASS
**Profile**: light
**Diff range**: 257e66a..5b5518c
**Round**: 1 - full
**Verifier**: independent sub-agent (author != verifier)

## Binding sources

Profile light: step 1 does not run. The plan marks no source binding either (`findings.json` and `.specs/STATE.md` are evidence, not design).

## Proof runs (at HEAD 5b5518c)

- **Vitest batch (B)**: one invocation over the 29 proof files, with a single `-t` alternation of the 81 names that `checks.md` gives in its Proof lines. Two more names were added to the alternation, both explained in Notes: `times iguais` for C34 and `todos os 10 tipos de evento ocorrem e têm narração` for C61. Command: `npx vitest run --reporter=verbose src/ui/Home.test.tsx src/store.test.ts src/engine/saveFile.test.ts src/ui/Banner.test.tsx src/engine/rollover.test.ts src/engine/lineup.test.ts src/ui/Squad.test.tsx src/engine/live.test.ts src/engine/balance.test.ts src/ui/Round.test.tsx src/engine/market.test.ts src/ui/Market.test.tsx src/engine/board.test.ts src/engine/season.test.ts src/ui/Cup.test.tsx src/ui/Finance.test.tsx src/ui/Live.test.tsx src/ui/ErrorBoundary.test.tsx src/ui/ScreenTabs.test.tsx src/ui/Condition.test.tsx src/launch.test.ts src/audio/sfx.test.ts src/audio/music.test.ts src/deps.test.ts src/engine/narration.test.ts src/engine/match.test.ts src/engine/migrate.test.ts src/engine/continental.test.ts src/ui/download.test.ts -t "<83-name alternation>"`
  - Result: exit 0, 29 files passed, 87 tests passed, 0 failed, 316 skipped.
  - Every name appears on its own `✓` line in the verbose output.
  - Names that match in several files appear once per file:
    - «foco na confirmação» ✓ in Home, Squad and Finance;
    - «ícones rotulados» ✓ in Live and Condition;
    - «comprador desistiu» and «trava de revenda na temporada de chegada» ✓ in `market.test.ts` and in `Market.test.tsx`;
    - «oferta inválida» ✓ in `Market.test.tsx`; the regex also matched the engine test «oferta inválida não é jogador não encontrado»;
    - «caixa em 5 temporadas» ✓ as its own test and ✓ as «... dos países novos».
  - Every name also has a single `test("<name>"` hit from `rg -n` in the file its Proof names. Hit lines: see the Evidence column.
- **Layout selftest (S)**: `npm run check:layout:selftest` exit 0 (log sections, in order):
  - `--inject=squad --seed=3` printed `seed 3` and `layout: FALHA em squad`;
  - `--no-build` printed `seed 1` and `as 14 telas cabem`, then `(execução normal saiu com 0)`;
  - the nested `--fail-normal` run exited 1 (`(selftest com --fail-normal saiu com 1, como deve)`);
  - the final line was `selftest: ok (... espera de 20000 ms; porta 4179 livre e nenhum perfil deixado ...)`.
- **Gate (G)**: `npm test`, `npm run lint`, `npm run build` and `npm run check:dist`; results under Gate.

## Checks

| Check | Claim | Proof run | Evidence | Result |
| --- | --- | --- | --- | --- |
| C1 | read failure shows retry, then «Continuar», seed kept | B ✓ falha de leitura oferece tentar de novo | `src/ui/Home.test.tsx:245` - `queryByRole("button", { name: "Continuar" })).not.toBeInTheDocument()`; `:247` findByRole «Continuar»; `:250` - `expect(slot.kind === "ok" && slot.state.seed).toBe(7)` | PASS |
| C2 | new game / import confirm after a read failure | B ✓ falha de leitura exige confirmação | `src/store.test.ts:480` - `getByRole("alertdialog", { name: "Confirmar novo jogo" })`; `:486` - `pendingImport?.seed).toBe(8)`; `:490` - `saveGame).not.toHaveBeenCalled()`; `:491` - `slotSeed()).toBe(7)` | PASS |
| C3 | 6 removed fields -> malformed, intact -> ok | B ✓ validação profunda do save importado | `src/engine/saveFile.test.ts:149` - `decodeSaveFile(encodeSaveFile(s, ISO))...toEqual({ kind: "malformed" })` over the 6 literal rows (`:132-140`, `toHaveLength(6)` `:142`); `:151` - `toEqual({ kind: "ok", state: game })` | PASS |
| C4 | corrupt import message, slot seed 7 | B ✓ import corrompido não toca o slot | `src/store.test.ts:506` - `getByText("Arquivo corrompido: não foi possível ler o jogo")`; `:507` - `slotSeed()).toBe(7)` | PASS |
| C5 | opening the import throws -> not written, message | B ✓ abrir o importado falha antes de gravar | `src/store.test.ts:526` - `saveGame).not.toHaveBeenCalled()`; `:527` - `getByText("Arquivo corrompido: ...")` | PASS |
| C6 | «Continuar» on an unopenable save shows the message, no throw | B ✓ continuar com save que não abre | `src/ui/Home.test.tsx:263` - `getByText("Não foi possível abrir o jogo salvo")`; `:266` - `expect(errors).toEqual([])` | PASS |
| C7 | 2nd tab shows notice + button and does not save | B ✓ segunda aba não grava | `src/store.test.ts:540` - `findByText("O jogo está aberto em outra aba")`; `:541` «Usar nesta aba»; `:549` - `saveGame).not.toHaveBeenCalled()` | PASS |
| C8 | «Usar nesta aba» steals, opens the reread game; the loser stops saving | B ✓ usar nesta aba toma o lock | `src/store.test.ts:564` - `toEqual({ name: "forzion-futmanager-save", options: { steal: true } })`; `:565` - `fake.other.lost).toBe(true)`; `:575` notice; `:580` - `not.toHaveBeenCalled()` | PASS |
| C9 | no `navigator.locks` -> opens and saves | B ✓ sem web locks abre sem guarda | `src/store.test.ts:589` - `toMatchObject({ phase: "home", hasSave: true, otherTab: false })`; `:594` - `toHaveBeenCalledTimes(1)`; `:596` - `ticketPrice).toBe(45)` | PASS |
| C10 | failed/unavailable show «Exportar jogo», ok no banner; export seed + envelope | B ✓ faixa oferece exportar quando não salva | `src/ui/Banner.test.tsx:25` - `getByRole("button", { name: "Exportar jogo" })` for both rows; `:27` - `toBeEmptyDOMElement()`; `:42` - `format).toBe("forzion-futmanager-save")`; `:43` - `save.seed).toBe(4321)` | PASS |
| C11 | formation/posture/starter restored after reset+init | B ✓ escalação é gravada | `src/store.test.ts:602-607` - three literal rows: `formation).toBe("3-5-2")`, `posture).toBe("attacking")`, `starters[10]).toBe(benchOf(before).id)`, run at `:621` - `check(reloaded, before)` after `resetStore()`+`init()` | PASS |
| C12 | price 45 and 4-3-3 both survive | B ✓ escalação durante gravação de mercado | `src/store.test.ts:640` - `ticketPrice).toBe(45)`; `:641` - `formation).toBe("4-3-3")`, both in memory and in the slot (`:639` loop) | PASS |
| C13 | pendingLive true + round 0 + lineup, then cleared | B ✓ marcador de ao vivo gravado e limpo | `src/store.test.ts:653` - `marked.pendingLive).toBe(true)`; `:654` - `currentRound).toBe(0)`; `:655` - `lineup).toEqual(userClub(before)!.lineup)`; `:658` - `"pendingLive" in closed).toBe(false)` | PASS |
| C14 | reload closes the date with the runToEnd score, same with decisions | B ✓ reload no ao vivo fecha a rodada | `src/store.test.ts:710` - `phase).toBe("round")`; `:712` - `"pendingLive" in saved).toBe(false)`; `:713` - `currentRound + 1`; `:715` - `[mine.result.homeGoals, mine.result.awayGoals]).toEqual(expected)`, for both decision rows | PASS |
| C15 | v8 save without mark opens normally, nothing played | B ✓ save sem marcador abre normal | `src/store.test.ts:730` - `toMatchObject({ phase: "home", hasSave: true, lastRound: null })`; `:732` - `saveGame).not.toHaveBeenCalled()` | PASS |
| C16 | 9 -> 18, `-y<season>-`, rating in [mean-12, mean-4]; 20 -> none | B ✓ base repõe o elenco do usuário até 18 | `src/engine/rollover.test.ts:638` - `toHaveLength(18)`; `:645` - `toContain(`-y${state.season}-`)`; `:647-648` - `>= mean - 12`, `<= mean - 4` (mean computed in the test `:641`); `:656` - `toHaveLength(20)` | PASS |
| C17 | min(11, available) over 12/11/10/7 | B ✓ mínimo é o menor entre 11 e os aptos | `src/engine/lineup.test.ts:133` - `toHaveLength(Math.min(11, available))`; `:134` - `toEqual({ ok: true, missing: 0 })`; `:142` - `toEqual({ ok: false, missing: 1 })` for 12/11/10 | PASS |
| C18 | play enabled with 10 fit; engine plays with a null slot | B ✓ joga com vaga quando faltam aptos; ✓ time do usuário com vaga joga | `src/ui/Squad.test.tsx:436` - `expect(play).toBeEnabled()`; `:443` Round's «Jogar rodada» `toBeEnabled()`; `src/engine/live.test.ts:471` - `side.slots.filter((id) => id === null)).toHaveLength(1)`; `:474-475` - `Number.isInteger(...Goals)).toBe(true)` | PASS |
| C19 | seed 11 club 10 past s3 r24 to the end of s4 | B ✓ carreira sem renovação não trava (log: smallest squads 22, 18, 22, 18) | `src/engine/balance.test.ts:417` - `expect(stuck).toEqual([])`; `:421` - `passed).toBe(true)`; `:422` - `s.season).toBe(4)`; `:423` - `nextDate(s).kind).toBe("over")` | PASS |
| C20 | «Falta 1 titular» / «Faltam 3 titulares» as status, button off | B ✓ rodada explica o botão desligado | `src/ui/Round.test.tsx:239` - `getByRole("status")...toHaveTextContent(text)` over the literal rows `:229-230`; `:241` - `toBeDisabled()` | PASS |
| C21 | cup: league-only suspended accepted, cup-suspended refused | B ✓ titular de copa pela disciplina da copa | `src/store.test.ts:391` - `after.starters[10]).toBe(id)` (accepted row); `:392` - `expect(after, name).toEqual(before)` (refused row) | PASS |
| C22 | 4-3-3 valid without the cup-suspended; posture kept | B ✓ formação de copa sem suspenso de copa | `src/store.test.ts:404` - `starters).not.toContain(suspended.id)`; `:405` - `validateLineup(...cup...)).toEqual({ ok: true, missing: 0 })`; `:406` - `posture).toBe("attacking")` | PASS |
| C23 | fee 250.000 / 40.000; release 40.000; AI pays the same | B ✓ luvas pelo valor de mercado | `src/engine/market.test.ts:1266-1267` literal rows; `:1279` - `cash).toBe(me.finance.cash - fee)`; `:1281` - `... - 40_000`; `:1295` - `club.finance.cash).toBe(cash - fee)` | PASS |
| C24 | 3 paths record arrivedSeason; the initial squad has none | B ✓ chegada registra a temporada | `src/engine/market.test.ts:1321` - `arrivedSeason, name).toBe(3)` over the 3 rows; `:1323` - `"arrivedSeason" in p).toBe(false)` | PASS |
| C25 | same-season sale refused + screen text; previous season / absent accepted | B ✓ trava de revenda... (engine and UI) | `src/engine/market.test.ts:1334` - `toEqual({ ok: false, reason: "arrived" })`; `:1335-1336` - `forSale).toEqual([before!.id])` / `[never!.id]`; `src/ui/Market.test.tsx:314` - `getByText("Chegou nesta temporada: só pode ser vendido na próxima")` | PASS |
| C26 | 40 seeds, no offer for the newcomer | B ✓ sem proposta por quem chegou | `src/engine/market.test.ts:1350` - `offers.filter(o => o.playerId === newcomer.id)).toEqual([])` for seeds 1-40; `:1354` - `others).toBeGreaterThan(100)` | PASS |
| C27 | 40 seeds: sum <= cash, squad + offers <= 30 | B ✓ propostas cabem no comprador | `src/engine/market.test.ts:1379` - `sum...toBeLessThanOrEqual(buyer.finance.cash)`; `:1380` - `players.length + n...toBeLessThanOrEqual(30)` | PASS |
| C28 | buyer without cash / with 30 -> refused, removed, message | B ✓ comprador desistiu (engine and UI) | `src/engine/market.test.ts:1407` - `reason).toBe("buyer_gone")`; `:1408` - `toEqual(["o1-2"])`, both rows; `src/ui/Market.test.tsx:334` - `findByText("O comprador desistiu da proposta")` | PASS |
| C29 | DF 74 costs 1,5x in 3 states; outside the 11 costs 1x | B ✓ titular pela força no preço | `src/engine/market.test.ts:1433` - `askingPrice(copy, probe)).toBe(starterPrice)` (`Math.round(valueOf(74, 25) * 1.5)`, test-side `valueOf` `:393`); `:1435` - `toBe(valueOf(60, 25))` | PASS |
| C30 | 300 -> 80, weakest kept >= strongest pruned | B ✓ poda dos livres | `src/engine/rollover.test.ts:619` - `freeAgents).toHaveLength(80)`; `:625` - `Math.min(kept) >= Math.max(pruned) + 2` | PASS |
| C31 | 20 seasons, drift <= 5 | B ✓ força estável em 20 temporadas (log: max drift 3.22) | `src/engine/balance.test.ts:510` - `expect(d, `temporada ${k + 1}`).toBeLessThanOrEqual(5)` over 20 seasons (`:507` `toHaveLength(20)`) | PASS |
| C32 | <= 10 of 80 in the red each season | B ✓ caixa em 20 temporadas (log: max 1) | `src/engine/balance.test.ts:518` - `expect(n, ...).toBeLessThanOrEqual(10)` | PASS |
| C33 | the exploit cycle ends <= just playing, seeds 5 and 21 | B ✓ revenda de livres não dá lucro (log: 3.527.500 vs 5.928.500; 2.568.500 vs 6.455.500) | `src/engine/balance.test.ts:472` - `me(s).finance.cash).toBeLessThanOrEqual(me(played).finance.cash)` | PASS |
| C34 | gastos-da-ia/paises bands with the renegotiated medians; the rest unchanged | B ✓ caixa em 5 temporadas; ✓ ...dos países novos; ✓ compras da IA em 5 temporadas; ✓ força estável em 5 temporadas; ✓ caixa equilibrado em uma temporada; ✓ times iguais | `src/engine/balance.test.ts:253` - `r <= 15`; `:255-256` - median `>= 2`, `<= 6.5`; `:325` - AR/PT median `<= 6.5` (`:324` `>= 1.2`); `:235` - drift `<= 5`; `:277-278` - buys `50..600`; `:125` `<= 2.5`, `:130` median `<= 1.6`; `:59-60` - `homeWinRate` `0.4..0.52` (unchanged since 257e66a, diff checked) | PASS |
| C73 | median cash <= 20x the initial median, every season | B ✓ caixa da IA limitado em 20 temporadas (log: max 16.05x) | `src/engine/balance.test.ts:526` - `expect(m, ...).toBeLessThanOrEqual(20 * initialMedian)` over 20 (`:524`) | PASS |
| C35 | goals 13-16 x positions 17/20 -> fired | B ✓ rebaixado é sempre demitido | `src/engine/board.test.ts:196` - `verdictFor(serieA, goal, position)...toBe("fired")` over 8 rows (`:195` `toHaveLength(8)`) | PASS |
| C36 | ranks 1-20 without relegation: goal <= 17, rank 14 -> 17 | B ✓ meta máxima sem rebaixamento | `src/engine/board.test.ts:213` - `toBeLessThanOrEqual(17)`; `:214` - `goals[13]).toBe(17)` for Série B and Argentina | PASS |
| C37 | 20th without relegation, goals 4/12/17 -> fired | B ✓ último lugar é demitido | `src/engine/board.test.ts:223` - `verdictFor(divisionAt(leagues, k), goal, 20)...toBe("fired")` | PASS |
| C38 | top scorers by league: B 3, A 2 with his old club | B ✓ artilharia por liga | `src/engine/season.test.ts:148` - `topScorers(s, b)).toEqual([{ ..., clubId: to.id, ..., goals: 3 }])`; `:149` - `... clubId: from.id ..., goals: 2` | PASS |
| C39 | 10 phase texts | B ✓ concordância da eliminação | `src/ui/Cup.test.tsx:202` - `getByText(text)` over the 10 literal rows `:184-193`, with `toHaveLength(phases 6 + 4)` `:195` | PASS |
| C40 | «Falta 1 / Faltam 3 titulares», «Obras: 1 rodada / 3 rodadas» | B ✓ concordância de titulares; ✓ concordância das obras | `src/ui/Squad.test.tsx:416` - `getByRole("status")...toHaveTextContent(text)`; `src/ui/Finance.test.tsx:195` - `getByText(text)` over the literal rows | PASS |
| C41 | AR/PT juniors named from their country's lists | B ✓ base estrangeira com nome do país | `src/engine/rollover.test.ts:675` - `FIRST_NAMES_BY_COUNTRY[country]).toContain(first)`; `:677` - surname `toMatch(surname)` built from `SURNAME_PARTS_BY_COUNTRY[country]` | PASS |
| C42 | keeper strength 60 = 80 x 0,75 | B ✓ goleiro efetivo sem goleiro | `src/engine/live.test.ts:486` - `toBe(80 * 0.75)`; `:487` - `toBe(60)` | PASS |
| C43 | conversion < 0,8 in 2000 matches | B ✓ conversão sem goleiro (log 0.505) | `src/engine/balance.test.ts:369` - `goals / onTarget).toBeLessThan(0.8)` | PASS |
| C44 | AI replaces a sent-off keeper; no sub / no keeper -> unchanged | B ✓ IA repõe goleiro expulso | `src/engine/live.test.ts:521` - `slots[0]).toBe("benchGk")`; `:523` `subbedOff).toEqual(["a1"])`; `:537` - `slots).toEqual(before)` for both negative rows | PASS |
| C45 | 4-3-3 att >= 1,2 x 4-5-1; 5-3-2 def > 3-5-2 | B ✓ setor cresce com a contagem | `src/engine/live.test.ts:552` - `s433.att).toBeGreaterThanOrEqual(1.2 * s451.att)`; `:553` - `of(shape(5, 3, 2)).def).toBeGreaterThan(of(shape(3, 5, 2)).def)` | PASS |
| C46 | home goals 4-3-3 >= 1,05 x 4-5-1 | B ✓ formação muda o placar (log 1.907 vs 1.360) | `src/engine/balance.test.ts:382` - `attacking).toBeGreaterThanOrEqual(1.05 * holding)` | PASS |
| C47 | the vacancy stays in the lost sector | B ✓ vaga fica no setor perdido | `src/engine/live.test.ts:581` - `after.slotPos[empty[0]!]).toBe(lost)` over the DF and FW rows | PASS |
| C48 | cup date without the user -> «Resultados» + panel m-active; with -> «Partida» | B ✓ aba inicial sem partida do usuário | `src/ui/Round.test.tsx:257` - `tab "Resultados"...toHaveAttribute("aria-selected", "true")`; `:261` - `tabpanel "Confrontos"...toHaveClass("m-active")` (the results panel, `Round.tsx:96`); `:267` - `tab "Partida"...aria-selected true` | PASS |
| C49 | empty/0/-5/12,5: disabled or «Valor inválido», never «Jogador não encontrado» | B ✓ oferta inválida (Market.test.tsx) | `src/ui/Market.test.tsx:366` - `findByText("Valor inválido")` when enabled; `:368` - `queryByText("Jogador não encontrado")).not.toBeInTheDocument()` over the 4 rows (`:353` `toHaveLength(4)`) | PASS |
| C50 | narration names a player who changed club, no raw id (Round, Live) | B ✓ narração com jogador que mudou de clube; ✓ narração sem id cru | `src/ui/Round.test.tsx:287` - `toHaveTextContent(player.name)`; `:289` - `not.toContain(player.id)`; `src/ui/Live.test.tsx:564` - `toHaveTextContent(player.name)`; `:566` - `not.toContain(player.id)` | PASS |
| C51 | tick throw, finishLive rejection, unhandledrejection -> error screen + export | B ✓ erro fora do render | `src/ui/ErrorBoundary.test.tsx:136` - `getByText("Algo deu errado"), origin)`; `:137` - `getByRole("button", { name: "Exportar jogo" })` over the 3 rows (`:130` `toHaveLength(3)`) | PASS |
| C52 | aria-controls -> tabpanel; arrows; desktop Elenco starts on a visible tab | B ✓ abas acessíveis; ✓ aba selecionada visível no desktop | `src/ui/ScreenTabs.test.tsx:62` - `getElementById(id)).toHaveAttribute("role", "tabpanel")`; `:72`/`:76` - `aria-selected "true"` after ArrowRight/ArrowLeft, 8 screens; `src/ui/Squad.test.tsx:460` - `selected[0]).toHaveTextContent("Elenco")`; `:461` - `not.toHaveClass("mobile-only")` | PASS |
| C53 | yellow card and morale arrow are role img with labels | B ✓ ícones rotulados (Live, Condition) | `src/ui/Live.test.tsx:584` - `getAllByRole("img", { name: "amarelo" })`; `src/ui/Condition.test.tsx:17` - `getByRole("img", { name: label })` over «moral -2»..«moral +2» | PASS |
| C54 | focus on the main button of the 4 confirmations | B ✓ foco na confirmação (Home, Squad, Finance) | `src/ui/Home.test.tsx:305` - `activeElement).toBe(...«Sim, apagar»)`; `src/ui/Squad.test.tsx:489` - `activeElement...toBe(...«Confirmar»)` for Dispensar and Renovar; `src/ui/Finance.test.tsx:210` - the same for Ampliar | PASS |
| C55 | no font size < 0,65rem, whole-file scan | B ✓ fonte mínima | `src/launch.test.ts:69` - `expect(size, declaration).toBeGreaterThanOrEqual(0.65)` over every rem/em/px value (`:68` `> 60` values) | PASS |
| C56 | hidden tab: 6 events not played, the next one plays | B ✓ aba escondida não acumula efeitos | `src/audio/sfx.test.ts:224` - `effects(...)).toEqual([])` after the 6; `:229` - `toEqual([])` after unhide; `:231` - `toEqual(["crowd-ooh"])` | PASS |
| C57 | unmounting Live with the crowd playing calls crowd("over") | B ✓ desmontar para a torcida | `src/ui/Live.test.tsx:608` - `toContainEqual({ kind: "ambience-ramp", gain: 0, seconds: 2 })`; `:609` - `ambience-stop` `toHaveLength(1)`; that is the backend signature of `crowd("over")` (`src/audio/sfx.ts:83-87`), called from `src/ui/Live.tsx:80` | PASS |
| C58 | failed download retried, the track starts | B ✓ falha de download tenta de novo | `src/audio/music.test.ts:308` - `downloads(...)).toEqual(["audio/music/abertura.mp3", "audio/music/abertura.mp3"])`; `:309` - `trackStarts(...)).toEqual(["audio/music/abertura.mp3"])` | PASS |
| C59 | Math.random scan over src (with globalThis); engine UI imports; self-test | B ✓ Math.random fora do Rng; ✓ motor sem dependência de UI | `src/deps.test.ts:49` - the forms incl. `"globalThis.Math.random()"` `toMatch(RANDOM)`; `:57` - `not.toMatch(RANDOM)` over files excluding `engine/rng.ts` and tests; `:65-66` - the 4 packages, static and `import()`, `toMatch(UI_IMPORT)`; `:72` - engine `not.toMatch(UI_IMPORT)` | PASS |
| C60 | ESLint errors on globalThis.Math.random and import("react") | B ✓ eslint barra as formas indiretas | `src/deps.test.ts:81` - `random...toMatch(/Rng/)`; `:83` - `dynamic...toMatch(/react/)` | PASS |
| C61 | a literal line per event type; match/live walks never show raw ids | B ✓ linha de cada tipo de evento; ✓ todos os tipos de evento ocorrem e têm narração; ✓ todos os 10 tipos de evento ocorrem e têm narração | `src/engine/narration.test.ts:38` - `rows types).toEqual([...MATCH_EVENT_TYPES, ...PENALTY_EVENT_TYPES].sort())`; `:42` - `expect(text, type).toBe(line)`; `src/engine/match.test.ts:76-77` - `not.toContain(e.clubId)` / `not.toContain(e.playerId)`; `src/engine/live.test.ts:323-324` - the same in the live walk | PASS |
| C62 | 0 orphan selectors; old orphans marked Superseded | B ✓ provas dos checks existem | `src/launch.test.ts:128` - `all.result.orphans).toEqual([])`; `:129` - `status).toBe(0)`; `:157` - `head).toContain(`Superseded por ${by}`)` over 21 literal rows | PASS |
| C63 | v7->v8 draw = replay with mix32(seed, 8), matches mix32(seed, 9); a changed salt fails | B ✓ sementes da migração v8 | `src/engine/migrate.test.ts:589` - `stored(0)).toEqual(oitavas(mix32(seed, 8)))`; `:590` - `not.toEqual(oitavas(mix32(seed, 9)))`; `:615` - `results).toEqual(replay(mix32(seed, 9)))`; `:616` - `not.toEqual(replay(mix32(seed, 8)))` | PASS |
| C64 | `--seed=3` -> seed 3, default -> seed 1 | S exit 0 (log: `seed 3`, `seed 1`) | `scripts/layout-check-selftest.mjs:43` - `/^seed 3$/m.test(broken.stdout)`; `:51` - `/^seed 1$/m.test(normal.stdout)` | PASS |
| C65 | the continental yellow counts by the event's playerId | B ✓ amarelo ligado ao evento | `src/engine/continental.test.ts:316` - `expect(now, ...).toBe(expected)`, where `expected` comes from that player's own yellow/red events (`:315`); `:324` - `spared).toBeGreaterThan(0)` | PASS |
| C66 | revoke 0 before the timer, 1 with the URL after | B ✓ revoga a url depois do clique | `src/ui/download.test.ts:19` - `revokeObjectURL).toHaveBeenCalledTimes(0)`; `:21` - `toHaveBeenCalledTimes(1)`; `:22` - `toHaveBeenCalledWith(url)` | PASS |
| C67 | `test.maxWorkers: 4` | B ✓ vitest limita workers | `src/launch.test.ts:76` - `toMatch(/\bmaxWorkers: 4,/)`; read directly: `vite.config.ts:14` - `maxWorkers: 4,` | PASS |
| C68 | 20000 ms animation timeout; no `layout-check-*` left in %TEMP% | S exit 0 | `scripts/layout-check-selftest.mjs:37` - `ANIMATION_TIMEOUT_MS !== 20000` -> problem; `:45` and `:53` - `leftBehind(before)` -> problem after each run; `scripts/layout-check.mjs:26` - `ANIMATION_TIMEOUT_MS = 20000` | PASS |
| C69 | the selftest exits != 0 when the normal run exits 1 (injection flag) | S exit 0 (nested `--fail-normal` exited 1) | `scripts/layout-check-selftest.mjs:50` - `normal.status !== 0` -> problem; `:58` - `forced.status === 0` -> problem | PASS |
| C70 | deploy runs check:dist after build; script `node scripts/dist-check.mjs` | B ✓ deploy roda o dist-check | `src/launch.test.ts:84` - index order `toEqual(at)`; `:86` - `scripts["check:dist"]).toBe("node scripts/dist-check.mjs")`; read directly: `.github/workflows/deploy.yml:31-32` | PASS |
| C71 | og:image absolute, og:url, relative icon/manifest, PNG 1200x630 / 180x180 | B ✓ metadados de compartilhamento | `src/launch.test.ts:93` - `meta("og:image")).toBe("https://arthuurw.github.io/forzion.tech-futmanager/og-image.png")`; `:94` og:url; `:96-97` - `./apple-touch-icon.png`, `./manifest.webmanifest`; `:115-116` - IHDR `[1200, 630]`, `[180, 180]` | PASS |
| C72 | suite, lint, build and dist-check green at HEAD | G: `npm test` 555/555, lint 0, build 0, check:dist 0 | `package.json:10` - `"test": "vitest run"`; `package.json:11` - `"lint": "eslint src"`; `package.json:15` - `"check:dist": "node scripts/dist-check.mjs"`; all four exited 0 at HEAD (Gate) | PASS |

## Swept existing

`checks.md` has no `## Swept` row that resolves to «existing»: every row cites checks or is `n/a`. The plan's `Observable` rows marked «existing» were read against the code anyway:

- `phase: "loading"` - `src/store.ts:428`;
- the AD-018 envelope - `src/engine/saveFile.ts:5` - `SAVE_FILE_FORMAT = "forzion-futmanager-save"`;
- dist-check exits 1 on failure - `scripts/dist-check.mjs:16`, `:37`.

## Level and sampling notes (none changes a verdict)

1. **C34 has no Proof line for home advantage.** The check names «a vantagem do mandante sem mudar limite», but none of its Proof lines covers it. I ran `times iguais` (`balance.test.ts:59-60`, 0.4-0.52) and confirmed it is unchanged since 257e66a. The C20/C21/C34 limits of gastos-da-ia are also unchanged in the diff; only the two median ceilings moved to 6,5. Precision gap in the checks: add the proof line.
2. **C61's live walk is not a named proof.** The check claims the live walk too, but the only proof named is the match test. The live test «todos os 10 tipos de evento ocorrem e têm narração» (`live.test.ts:323-324`) carries the claim; I ran it and it passed.
3. **C31 measures one number per season.** Drift is taken on the mean over clubs of each Série A club's best-18 mean. That is the same reading as gastos-da-ia C21, which the plan's Assumptions extend. «de cada clube» could be read per club; the test does not assert per-club drift.
4. **C33 never exercises the sale.** The exploit test reaches its verdict with 0 sales (log: 8 signed, 0 sold for both seeds): the door-3 resale lock blocks the cycle before a sale happens. The claim (cash <= just playing) holds. The 50%-of-value fee is proven by C23, not by this cycle.
5. **C50's Live half runs a sibling scenario.** The Live proof releases the player to the free agents; it does not sell him to another division. Both screens use the same `gameNarrationContext` (`src/engine/narration.ts:22-26`, used at `Round.tsx:35` and `Live.tsx:128`), and the Round proof covers the other-division path.
6. **C14 builds its expected score from production code.** The expected score comes from `makeMatch`/`runToEnd`, which is the oracle the check itself defines (AC 14 is an equivalence with `runToEnd`). This is not an L-004 breach. The «com decisões» row checks the actual result against the same no-decision expectation.
7. **C57 asserts the effect, not the call.** It checks the backend effect of `crowd("over")` (ramp to 0 over 2 s, then stop), not the call itself. That effect is unique to the `over` branch in `sfx.ts:83-87`.

## Gate

- `npm run check:layout:selftest` - exit 0 (see Proof runs)
- vitest batch - 87 passed, 0 failed (29 files)
- `npm test` - exit 0; 45 files, 555 passed, 0 failed
- `npm run lint` - exit 0 (eslint src, no output)
- `npm run build` - exit 0 (both tsc passes, then `vite build` «built in 487ms»)
- `npm run check:dist` - exit 0 («dist-check: 3 files, no root-relative reference»)
