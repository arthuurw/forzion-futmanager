# Elenco, mercado e finanças verification

**Verdict**: FAIL
**Profile**: light
**Diff range**: 570f4c2..7f883b2
**Round**: 1 - full
**Verifier**: independent sub-agent (author != verifier)

## Summary

- **Checks:** 50 of 57 are proven with located evidence. 7 fail, and they share one root cause. Each of C23, C24, C25, C32, C45, C47 and C50 quotes an on-screen refusal message, such as «Caixa insuficiente». Their proofs assert only the engine reason code (`"cash"`, `"squad_full"` and so on). The text comes from `refusalText` (`src/store.ts:44`-`:72`), and no test at any level asserts those six strings.
- **Coverage (extra under light):** the plan now names 6 one-way doors, but 2 of them have no proof. Doors 5 and 6 were added to `Landing` during the build, and no check was added with them. In particular, the ledger's «Compras» and «Vendas» are never non-zero in any test. So the copy from `pendingIn`/`pendingOut` to `lastRound.transfersIn`/`transfersOut` (`src/engine/finance.ts:121`-`:126`) is unproven.
- **Proofs:** all 60 `Proof:` tests ran green at `7f883b2`, in a single invocation. The full suite has 155 passed and 0 failed. Both `tsc` projects are clean.
- **Superseded tests:** only the 3 declared partida-ao-vivo checks (C42, C43 and C45) changed. Nothing was weakened, deleted or skipped.

## Binding sources

Did not run: the profile is light, and this step runs under `ui` only. `plan.md` `## Sources` marks no source as binding. The sources are the roadmap, the author's answers and `.specs/STATE.md`.

## Checks

All 60 `Proof:` names from `checks.md` (57 checks, 3 with two proofs) ran at HEAD `7f883b2` in **one** invocation. The command was `npx vitest run` resolved to the main checkout's `node_modules`, because the worktree has none:

`node ../../../node_modules/vitest/vitest.mjs run src/app.test.tsx src/engine/balance.test.ts src/engine/finance.test.ts src/engine/market.test.ts src/engine/migrate.test.ts src/persistence/save.test.ts src/store.test.ts src/ui/Finance.test.tsx src/ui/Home.test.tsx src/ui/Market.test.tsx src/ui/Round.test.tsx src/ui/Squad.test.tsx src/ui/money.test.ts -t "(<60 names, regex-escaped>)$" --reporter=json`

- **Result:** exit 0, 13 files, **60 passed**, 0 failed and 37 skipped. The skipped tests are the non-target tests in the same files.
- **Name matching:** a script matched each of the 60 names against the JSON `assertionResults`. Each matched exactly one `passed` test, and no name matched zero tests.
- **Sibling tests:** the batch anchors each name with `$`, so it does not select four sibling tests that carry part of a claim: «mercado fechado depois da rodada 22» (C17), «aba propostas vazia» (C30), «marcar à venda só com mercado aberto» (C27) and «filtro sem jogadores» (C18). The proof commands in `checks.md` are unanchored, so they do select the first three. All four passed in the full-suite gate below.

| Check | Claim | Proof run | Evidence | Result |
| --- | --- | --- | --- | --- |
| C1 | todo dinheiro do save é inteiro após temporada movimentada | batch, `todo dinheiro do save é inteiro` ✓ | `src/engine/finance.test.ts:42`-`:48` - collects `cash, sponsorship, ticketPrice, loan, loanLimit, pendingIn, pendingOut`, every `lastRound` entry, every salary and every offer amount; `:51` - `expect(Number.isInteger(v), where).toBe(true)`; `:50` - `finance.loan).toBeGreaterThan(0)`. A probe confirmed that `busySeason` sells 3 players, expands the stadium and moves the ticket price to 45. Precision gap: `market.offers` is empty after round 38, so the «propostas» member is vacuous here. Offer amounts are shown to be integers by C28/C29 (`amount % 10_000 === 0`). | PASS |
| C2 | salário 40/60/75/95 e fórmula em todo jogador do jogo novo | batch ✓ | `src/engine/finance.test.ts:55`-`:58` - `salaryFor(40)).toBe(2000)`, `11200`, `40800`, `228800`; `:61` - `everyone.length).toBe(20 * 22 + 40 + 3)`; `:62` - `p.salary).toBe(expectedSalary(p.rating))`, with the formula written in the test at `:22` | PASS |
| C3 | caixa inicial = 10 folhas arredondado R$ 100.000, 20 clubes | batch ✓ | `src/engine/finance.test.ts:67` - `toHaveLength(20)`; `:70` - `c.finance.cash).toBe(Math.round((wages * 10) / 100_000) * 100_000)` | PASS |
| C4 | torcida 58/69/80, limites, capacidade 80% | batch ✓ | `src/engine/finance.test.ts:75`-`:79` - `fansFor(58)).toBe(15_000)`, `69 -> 38_000`, `80 -> 60_000`, `50 -> 15_000`, `90 -> 60_000`; `:80`-`:82` - capacities; `:86`-`:87` - every club of `newGame(7)` against the formula written in the test | PASS |
| C5 | caixa de cada clube muda em patrocínio − salários + bilheteria − juros | batch ✓ | `src/engine/finance.test.ts:97` - 20 clubs; `:101` - `l.salaries).toBe(sum(c.players.map((p) => p.salary)))`; `:102` - sponsorship; `:103` - `l.interest).toBe(... ? 15_000 : 0)`; `:104` - `a.finance.cash - c.finance.cash).toBe(l.sponsorship - l.salaries + l.tickets - l.interest)` | PASS |
| C6 | 10 partidas: mandante público × preço, visitante 0 | batch ✓ | `src/engine/finance.test.ts:112` - `toHaveLength(10)`; `:117` - `tickets).toBe(attendance * ticketPrice)`; `:118`-`:119` - away `attendance` and `tickets` `toBe(0)` | PASS |
| C7 | público 39.000/30.000/10.606, capacidade 24.000, líder 36.000, 20º 24.000 | batch ✓ | `src/engine/finance.test.ts:126`-`:131` - `attendanceFor(...)).toBe(39_000)`, `30_000`, `10_606`, `24_000`, `36_000`, `24_000`; `:134`, `:136` - `positionsBeforeRound` is all `null` before round 1 and 1..20 after it. Level note: the proofs call the helpers only. That `closeRoundFinances` feeds a real round's attendance with the phase from the table before the round (`src/engine/season.ts:45`, `src/engine/finance.ts:114`) is asserted by no test (L-003). | PASS |
| C8 | Finanças mostra caixa, folha, patrocínio, torcida, capacidade, preço | batch ✓ | `src/ui/Finance.test.tsx:31`-`:35` - each `valueOf(label)).toHaveTextContent(...)`, with the money format written in the test; `:36` - select `value).toBe("40")` | PASS |
| C9 | 8 linhas da última rodada com os valores do registro | batch ✓ | `src/ui/Finance.test.tsx:44`-`:54` - `rows.map(th, td)).toEqual(expected)` over the 8 labels in order, with Saldo computed in the test at `:52`. Precision gap: after one plain round, `interest`, `transfersIn` and `transfersOut` are all 0. So «Juros», «Compras» and «Vendas» all read `R$ 0`, and a row wired to the wrong ledger field would pass. | PASS |
| C10 | sem rodada: «Nenhuma rodada jogada», sem linhas | batch ✓ | `src/ui/Finance.test.tsx:60` - `getByText("Nenhuma rodada jogada")`; `:61` - the table is `not.toBeInTheDocument()` | PASS |
| C11 | coluna «Salário» em cada uma das 22 linhas | batch ✓ | `src/ui/Squad.test.tsx:160` - `col).toBeGreaterThan(-1)`; `:162` - `rows).toHaveLength(22)`; `:166` - `cells[col]!.textContent).toBe(brl(player.salary))` | PASS |
| C12 | Rodada: público e bilheteria em casa; fora, não | batch ✓ | `src/ui/Round.test.tsx:96`-`:97` - `toHaveTextContent(\`Público ${num(l.attendance)}\`)` and `Bilheteria R$ ...`; `:99`-`:100` - away `queryByText(/Público/)` and `/Bilheteria/` `not.toBeInTheDocument()`; `:104` - `seen).toEqual({ home: true, away: true })` | PASS |
| C13 | 5 seeds × 38 rodadas: 50%-250% e mediana 90%-160% | batch ✓ | `src/engine/balance.test.ts:101` - `ratios).toHaveLength(100)`; `:103`-`:104` - `>= 0.5`, `<= 2.5`; `:108`-`:109` - median `>= 0.9`, `<= 1.6`. A probe reproduced the plan's figures: min 0.981, median 1.550, max 2.186. The median sits 0.05 under the upper bound. | PASS |
| C14 | «R$ 0», «R$ 40.800», «R$ 1.234.567», «-R$ 500.000» | batch ✓ | `src/ui/money.test.ts:5`-`:8` - `formatMoney(0)).toBe("R$ 0")`, `"R$ 40.800"`, `"R$ 1.234.567"`, `"-R$ 500.000"` | PASS |
| C15 | 11 ações gravam; estado só muda depois da gravação | batch ✓ | `src/store.test.ts:58` - `ACTIONS).toHaveLength(11)`, with the 11 listed at `:42`-`:54`; per action: `:68` - `saveGame` called once; `:69` - `useGame.getState().game).toBe(game)` while the save is blocked; `:71` - the saved state differs; `:75` - `game).toBe(saved)` after release. The proof is table-driven over all 11. | PASS |
| C16 | próxima rodada 1..39: aberto exatamente em 1-5 e 18-22 | batch ✓ | `src/engine/market.test.ts:51` - `for (let next = 1; next <= 39; next++) expect(isWindowOpen(next)).toBe(open.has(next))`, table-driven over all 39 | PASS |
| C17 | fechado: textos para 6 e 23; sem botões de ação | batch ✓ + sibling ✓ | `src/ui/Market.test.tsx:27` - `getByText("Mercado fechado - reabre antes da rodada 18")`; `:28` - `queryByRole("button", { name: /Fazer proposta\|Aceitar\|Recusar\|Contratar\|Promover/ })).not.toBeInTheDocument()`; `:36`-`:37` - the round-23 text and no buttons | PASS |
| C18 | 7 colunas, 458 linhas, força decrescente, filtro ATA, «Nenhum jogador» | batch ✓ + sibling ✓ | `src/ui/Market.test.tsx:45` - headers `toEqual(["Nome", "Pos", "Idade", "Força", "Clube", "Valor", "Salário"])`; `:47` - `toHaveLength(19 * 22 + 40)`; `:50` - ratings sorted descending; `:51` - 40 «Livre»; `:60`-`:61` - `19 * 5 + 10` rows, all «ATA». «Nenhum jogador» is at `:71`, in the sibling test «filtro sem jogadores», which C18's proof command does not select; it passed in the full suite. | PASS |
| C19 | valor força 75 aos 20/25/29/32/35 e bordas | batch ✓ | `src/engine/market.test.ts:56`-`:60` - `3_060_000`, `2_450_000`, `2_040_000`, `1_220_000`, `610_000`; `:62`-`:69` - the edges 21/22, 27/28, 30/31, 33/34 | PASS |
| C20 | titular 1,5 × valor; reserva 1,0 × valor | batch ✓ | `src/engine/market.test.ts:76` - `askingPrice(seller, starter)).toBe(expectedValue(starter) * 1.5)`; `:77` - `askingPrice(seller, reserve)).toBe(expectedValue(reserve))`, with the value formula written in the test at `:21`-`:22` | PASS |
| C21 | oferta no preço move jogador e caixas, motor e tela | batch ✓ (2 proofs) | `src/engine/market.test.ts:86`-`:89` - player in the user's squad, gone from the seller, `cash).toBe(... - price)`, seller `cash).toBe(... + price)`; `src/ui/Market.test.tsx:86`-`:89` - the same three facts through «Fazer proposta» | PASS |
| C22 | oferta 10.000 abaixo: «Recusado: pedem R$ X», nada muda | batch ✓ | `src/ui/Market.test.tsx:102` - `findByRole("status")).toHaveTextContent(\`Recusado: pedem ${brl(value(target))}\`)`; `:103` - `useGame.getState().game).toBe(game)` | PASS |
| C23 | 5 gastos acima do caixa recusados com «Caixa insuficiente», nada muda | batch ✓ | `src/engine/market.test.ts:106` - `spends).toHaveLength(5)`; `:110` - `spend()).toMatchObject({ ok: false, reason: "cash" })`; `:111` - state snapshot unchanged. Table-driven over all 5, at cost − 1. **Level gap:** the claim names «Caixa insuficiente», but no test asserts that text. `rg "Caixa insuficiente" src` finds only `src/store.ts:49`. | FAIL |
| C24 | 30 jogadores: compra, livre, júnior recusados com «Elenco cheio (30)» | batch ✓ | `src/engine/market.test.ts:121`-`:123` - `toMatchObject({ ok: false, reason: "squad_full" })` for all 3. **Level gap:** «Elenco cheio (30)» is asserted nowhere; it exists only at `src/store.ts:51`. | FAIL |
| C25 | vendedor com 18 recusa com «O clube não vende: elenco no mínimo» | batch ✓ | `src/engine/market.test.ts:132` - `toHaveLength(18)`; `:133` - `reason: "seller_min"`. **Level gap:** the message is asserted nowhere; it exists only at `src/store.ts:53`. | FAIL |
| C26 | transferência mantém id, salário, condição, moral, cartões, lesão, suspensão; fora da escalação | batch ✓ | `src/engine/market.test.ts:144` - `arrived).toEqual(before)` (whole player, with injury 2, suspension 1, morale −1, 2 yellows and fitness 70 set at `:140`); `:145` - `lineup!.starters).not.toContain(target.id)` | PASS |
| C27 | Elenco marca/desmarca «À venda»; fechado, sem controle | batch ✓ + sibling ✓ | `src/ui/Squad.test.tsx:177` - `forSale).toEqual([player.id])`; `:178` - `toBeChecked()`; `:180` - `forSale).toEqual([])`; `:186`-`:187` - closed market: 0 «À venda» checkboxes and 0 «Dispensar» buttons | PASS |
| C28 | à venda: taxa 45%-55% em 2000; 80%-110%, múltipla de 10.000, comprador IA com caixa ≥ valor e < 30 | batch ✓ | `src/engine/market.test.ts:162` - `amount % 10_000).toBe(0)`; `:163`-`:164` - bounds; `:165` - buyer is not the user; `:166` - `buyer.finance.cash).toBeGreaterThanOrEqual(o.amount)`; `:167` - `players.length).toBeLessThan(30)`; `:170`-`:171` - `got / trials` in [0.45, 0.55]. Precision gap (L-007): every AI club has 22 players and millions in cash against the cheapest player's value, so no club is ever ineligible. Dropping the filter at `src/engine/market.ts:214` would pass. | PASS |
| C29 | espontâneas: taxa 20%-30%, top 5, 110%-150%, múltipla de 10.000 | batch ✓ | `src/engine/market.test.ts:185` - `top5.has(o.playerId)).toBe(true)`; `:187`-`:189` - multiple of 10.000 and bounds; `:192`-`:193` - rate in [0.2, 0.3] | PASS |
| C30 | aba «Propostas»: clube, jogador, valor, Aceitar, Recusar; vazia «Nenhuma proposta» | batch ✓ + sibling ✓ | `src/ui/Market.test.tsx:118` - 2 items; `:122`-`:126` - buyer name, player name, `brl(o.amount)`, «Aceitar» and «Recusar» per item; `:136` - `getByText("Nenhuma proposta")` | PASS |
| C31 | aceitar com confirmação move jogador, caixas, vaga e propostas; cancelar não muda | batch ✓ | `src/ui/Market.test.tsx:155` - `alertdialog).toHaveTextContent(\`Vender ${sold.name} por R$ 2.000.000?\`)`; `:157` - cancel `game).toBe(game)`; `:165`-`:168` - player moves, user +2.000.000, buyer −2.000.000; `:169` - `starters[5]).toBeNull()`; `:170` - `offers.map(id)).toEqual(["o1-3"])` | PASS |
| C32 | 18 jogadores: aceitar e dispensar recusados com «Elenco no mínimo (18)» | batch ✓ | `src/engine/market.test.ts:201`-`:202` - `reason: "user_min"` for both. **Level gap:** «Elenco no mínimo (18)» is asserted nowhere; it exists only at `src/store.ts:55`. | FAIL |
| C33 | proposta não respondida some na rodada seguinte | batch ✓ | `src/engine/market.test.ts:211` - `pending.length).toBeGreaterThan(0)`; `:214` - each pending id `not.toContain(id)` after round 2 | PASS |
| C34 | dispensar com confirmação: −4 × salário, jogador nos livres | batch ✓ | `src/ui/Squad.test.tsx:198` - `alertdialog).toHaveTextContent(\`Dispensar ${player.name} custa ${brl(4 * player.salary)}. Confirmar?\`)`; `:200` - cancel unchanged; `:205` - `cash).toBe(club.finance.cash - 4 * player.salary)`; `:206`-`:207` - out of the squad, into `freeAgents` | PASS |
| C35 | 40 livres, 10 por posição, força 45-70 | batch ✓ | `src/engine/market.test.ts:219` - `toHaveLength(40)`; `:220` - 10 for each of the 4 `POSITIONS`; `:222`-`:223` - `>= 45`, `<= 70` | PASS |
| C36 | contratar livre: −4 × salário, no elenco, fora dos livres | batch ✓ | `src/engine/market.test.ts:231` - `cash).toBe(... - 4 * agent.salary)`; `:232` - `toContain(agent.id)`; `:233` - `freeAgents ... not.toContain(agent.id)` | PASS |
| C37 | 3 juniores de 17, força 45-62, no jogo novo e depois da 17; nenhum entre 6 e 17 | batch ✓ | `src/engine/market.test.ts:238`-`:242` - `toHaveLength(3)`, `age).toBe(17)`, rating in [45, 62]; `:246` - new game; `:250` - `toHaveLength(0)` after rounds 5-16; `:252` - 3 after round 17 | PASS |
| C38 | promover: caixa igual, salário da fórmula, fora da base | batch ✓ | `src/engine/market.test.ts:259` - `cash).toBe(user(state).finance.cash)`; `:261` - `salary).toBe(expectedSalary(junior.rating))`; `:262` - `juniors ... not.toContain(junior.id)` | PASS |
| C39 | juniores somem ao fim da 5 e da 22; «Nenhum júnior na base» | batch ✓ (2 proofs) | `src/engine/market.test.ts:270` - 3 after rounds 4 and 21; `:271` - `toHaveLength(0)` after rounds 5 and 22; `src/ui/Market.test.tsx:179` - `getByText("Nenhum júnior na base")` | PASS |
| C40 | IA com 16 contrata 2 livres, o mais forte da posição mais rala, pagando luvas | batch ✓ | `src/engine/market.test.ts:285` - 16 before, with 0 `FW`; `:290` - `toHaveLength(18)`; `:291` - `arrayContaining(bestFw ids)`; `:292` - `finance.pendingOut).toBe(fees)`; `:293` - both leave `freeAgents`. The proof runs through `playRound`, the real entry point, and C53 (`src/app.test.tsx:152`, `:165`) shows the same refill through the UI's `finishLive` path. Precision gap: «pagando as luvas» is asserted on `pendingOut`, not on `cash`. The deduction at `src/engine/market.ts:256` is unasserted. | PASS |
| C41 | 39 opções R$ 10..200 passo 5, começa R$ 40, IA R$ 40 | batch ✓ | `src/ui/Finance.test.tsx:68` - `options).toHaveLength(39)`; `:69` - values `10 + 5 * i`; `:70`-`:71` - labels «R$ 10», «R$ 200»; `:72` - `value).toBe("40")`; `:73` - every club `ticketPrice).toBe(40)` | PASS |
| C42 | R$ 40 -> R$ 80 muda o público estimado pela fórmula com a fase atual | batch ✓ | `src/ui/Finance.test.tsx:82` - before: `num(Math.min(f.capacity, f.fans))`; `:84`-`:85` - after: `Math.min(f.capacity, Math.floor(f.fans * Math.min(1.3, (40 / 80) ** 1.5)))`; `:86` - `ticketPrice).toBe(80)`. Precision gap: the only phase exercised is 1,0 (before round 1), so an estimate that ignored the phase would pass. | PASS |
| C43 | ampliar com confirmação −4.000.000; capacidade igual por 5 rodadas, +5.000 na 6ª | batch ✓ (2 proofs) | `src/engine/finance.test.ts:145` - `cash).toBe(6_000_000)`; `:149` - capacity unchanged in rounds 1-5; `:152` - `capacity + 5_000` after round 6; `src/ui/Finance.test.tsx:95` - `alertdialog).toHaveTextContent("Ampliar custa R$ 4.000.000. Confirmar?")`; `:97` - cancel keeps cash; `:101` - `cash).toBe(6_000_000)` | PASS |
| C44 | obra: «Obras: N rodadas»; outra ampliação «Já há uma obra em andamento» | batch ✓ | `src/ui/Finance.test.tsx:109` - `getByText("Obras: 3 rodadas")`; `:112` - `findByRole("status")).toHaveTextContent("Já há uma obra em andamento")`; `:113` - cash unchanged | PASS |
| C45 | 76.000 recusado com «Capacidade máxima: 80.000»; 75.000 aceito | batch ✓ | `src/engine/finance.test.ts:158` - `toEqual({ ok: false, reason: "max_capacity" })`; `:160` - `ok.ok).toBe(true)`. **Level gap:** «Capacidade máxima: 80.000» is asserted nowhere; it exists only at `src/store.ts:63`. | FAIL |
| C46 | 500.000 e 1.000.000 ok, 700.000 recusado, até 2 × caixa inicial | batch ✓ | `src/engine/finance.test.ts:165` - every club `loanLimit).toBe(2 * c.finance.cash)` in a new game; `:169`-`:171` - 500.000 and 1.000.000 accepted; `:172` - `takeLoan(f, 700_000)).toEqual({ ok: false, reason: "invalid" })`; `:177`-`:178` - largest fitting multiple accepted, next refused `loan_limit` | PASS |
| C47 | acima do limite: «Limite de empréstimo: R$ X», X = o que cabe | batch ✓ | `src/engine/finance.test.ts:183` - `toEqual({ ok: false, reason: "loan_limit", amount: 1_000_000 })`. X is proven as an amount. **Level gap:** the formatted text «Limite de empréstimo: R$ 1.000.000» is asserted nowhere (`src/store.ts:65`). | FAIL |
| C48 | juros 1.000.000 -> 15.000; 1.234.567 -> 18.500 | batch ✓ | `src/engine/finance.test.ts:188`-`:189` - `interestFor(1_000_000)).toBe(15_000)`, `interestFor(1_234_567)).toBe(18_500)`. Wiring through the round: `:103` - `l.interest).toBe(15_000)` | PASS |
| C49 | pagar 500.000 e o saldo inteiro; mais que o saldo recusado | batch ✓ | `src/engine/finance.test.ts:196`-`:197` - loan 1.000.000, cash 4.500.000; `:199` - `loan).toBe(0)`; `:200` - `toEqual({ ok: false, reason: "over_debt" })`; `:203` - odd balance paid whole | PASS |
| C50 | caixa negativo: compra, luvas, rescisão, ampliação com «Caixa insuficiente»; salários pagos | batch ✓ | `src/engine/finance.test.ts:212`-`:215` - `toMatchObject({ ok: false, reason: "cash" })` for all 4; `:218` - `l.salaries).toBe(sum(...))`; `:219` - `cash).toBe(-100_000 + l.sponsorship + l.tickets - l.salaries)`. **Level gap:** «Caixa insuficiente» is asserted nowhere (`src/store.ts:49`), same as C23. | FAIL |
| C51 | v2 e v1 -> v3 com fórmulas, R$ 40, sem empréstimo/obra, 40 livres, sem propostas/juniores, elencos e tabela intactos | batch ✓ | `src/engine/migrate.test.ts:43`, `:48` - `expectV3` for v2 and v1; `:12` - `schemaVersion).toBe(3)`; `:14` - `rounds).toEqual(...)`; `:17` - `[id, rating]` per player; `:18` - salary formula written in the test; `:21`-`:29` - `cash`, `fans`, `capacity`, `ticketPrice: 40`, `loan: 0`, `expansionRoundsLeft: 0`, `lastRound: null`; `:32`-`:34` - 40 free agents, `offers` and `juniors` `toEqual([])`. Note: «elencos intactos» is asserted as id and rating; v2 condition fields and lineup are not compared. | PASS |
| C52 | `schemaVersion: 4` -> «Jogo salvo incompatível (versão 4)», só «Novo jogo» | batch ✓ | `src/ui/Home.test.tsx:71` - `getByText("Jogo salvo incompatível (versão 4)")`; `:72` - buttons `toEqual(["Novo jogo"])` | PASS |
| C53 | reload antes da rodada: mesmos resultados, propostas e contratações da IA | batch ✓ | `src/app.test.tsx:151` - `offers.length).toBeGreaterThan(0)`; `:152` - AI club refilled to 18; `:163` - `rounds).toEqual(...)`; `:164` - `market).toEqual(...)`; `:165` - AI club equal; `:166` - `viaReload).toEqual(direct.state)` | PASS |
| C54 | documento: `schemaVersion: 3`, `finance` em todo clube, `salary` em todo jogador, `market` | batch ✓ | `src/persistence/save.test.ts:34` - `schemaVersion).toBe(3)`; `:36`-`:37` - 10 `finance` fields integer per club; `:39` - `lastRound).toBeNull()`; `:42` - `Number.isInteger(p.salary)`; `:55`-`:57` - `freeAgents` 40, `juniors` 3, `offers` `[]` | PASS |
| C55 | força muda, salário não: após rodada e após gravar/ler | batch ✓ | `src/engine/finance.test.ts:229` - `rating).toBe(95)`; `:230` - `salary).toBe(salary)` after a round; `:233` - same after a JSON round-trip through `migrateSave` | PASS |
| C56 | compra antes da rodada não muda os outros 8 jogos | batch ✓ | `src/engine/market.test.ts:304` - `untouched).toHaveLength(8)`; `:305` - each `result).toEqual(m.result)` | PASS |
| C57 | ids únicos após temporada; `fa-` e `jr-` | batch ✓ | `src/engine/market.test.ts:312` - `new Set(all).size).toBe(all.length)`; `:314`-`:316` - `fa-` and `jr-` ids in squads, a `c...` id among free agents; `:317`-`:318` - `toMatch(/^fa-\d+$/)`, `toMatch(/^jr-1-1-\d+$/)` | PASS |

## Coverage

This section is not required under light. It was run because the dispatch brief asked for a hard look at the enumerated sets and rates. Members were taken from the code or the plan, not from the `checks.md` Coverage table.

| Set (size) | Recomputed from | Member -> proof | Unproven |
| --- | --- | --- | --- |
| ações que gravam (11) | `src/store.ts` actions, `src/store.test.ts:42`-`:54` | C15, table-driven over all 11 (`:58`) | - |
| gastos bloqueados por caixa (5) | AC 23; `src/engine/market.ts:109`, `:168`, `:185`, `src/engine/finance.ts:157`, `:172` | C23, table-driven over all 5 at cost − 1 (reason code) | «Caixa insuficiente» text, for all 5 |
| mensagens de recusa citadas em checks (8) | `refusalText`, `src/store.ts:44`-`:72` | price C22 `Market.test.tsx:102` · works C44 `Finance.test.tsx:112` | cash (C23, C50) · squad_full (C24) · seller_min (C25) · user_min (C32) · max_capacity (C45) · loan_limit (C47) |
| próxima rodada vs janela (39) | `WINDOWS`, `src/engine/market.ts:21` | C16 over 1-39 | - |
| linhas da última rodada (8) | AC 9; `src/ui/Finance.tsx` ledger table | C9, all 8 labels in order with registry values | - (values of Juros, Compras and Vendas are 0 in the fixture: precision gap) |
| fator de idade (5 faixas, 4 bordas) | `ageFactor`, `src/engine/market.ts:47` | C19, all 5 bands and all 4 edges | - |
| fase do público (3) | AC 7, `formFactor`, `src/engine/finance.ts:77` | líder, 20º, antes da 1ª: C7 (helper level) | - |
| estados vazios (4) | plan `Observable` | C17 `Market.test.tsx:27` · C30 `:136` · C39 `:179` · filtro `:71` | - |
| confirmações (3) | plan `Observable` | vender `Market.test.tsx:155` · dispensar `Squad.test.tsx:198` · ampliar `Finance.test.tsx:95` | - |
| versões de save (4) | `src/engine/migrate.ts` | v1, v2 `migrate.test.ts:43`, `:48` · v3 `save.test.ts:34`, `migrate.test.ts:59` · v4 `Home.test.tsx:71`, `migrate.test.ts:60` | - |
| portas de mão única (6, after the build) | plan `Landing`, rows 1-6 | door 1 C54 · door 2 C55 · door 3 C56 · door 4 C57 · door 5: `loanLimit` only (`finance.test.ts:165`) | door 5: the copy of `pendingIn`/`pendingOut` into `lastRound.transfersIn`/`transfersOut` and the zeroing (`src/engine/finance.ts:121`-`:126`) are never asserted, and no test ever sees a non-zero «Compras» or «Vendas» · door 6: nothing shows that the new game's market stream (`createRng(mix32(seed, 2))`) leaves `rngState` and the league draw unchanged |

## Test policy rows

Did not run: the profile is light, and `checks.md` has no `Test policy` section.

## Faults injected

Did not run: the profile is light. No mutation was applied. The C28 buyer-filter and C40 cash-deduction findings above come from reading the code, not from surviving mutants.

## Swept existing

- **dependency failure - existing.** The constraint is there. Market and finance actions go through `commit` (`src/store.ts:166`-`:178`), which calls `persist` (`src/store.ts:131`-`:141`). `persist` sets `saveStatus: "unavailable"` or `"failed"`. `Banner` renders «Salvamento indisponível neste navegador» (`src/ui/Banner.tsx:6`), and it is mounted outside the phase switch (`src/App.tsx:33`), so it also shows on Mercado and Finanças.
- The `n/a` rows (authorization, concurrency and observability) are approved policy.

## Superseded tests audit (partida-ao-vivo)

`git diff --numstat 570f4c2..HEAD -- '*.test.*'` lists 17 test files. `git diff 570f4c2..HEAD -- <the modified pre-existing ones> | grep '^-[^-]'` shows the only removed or changed lines. `rg "\.skip|\.only|\.todo|xit\(|xtest\(" src` finds nothing.

| partida-ao-vivo check | Declared change | What the diff shows | Verdict |
| --- | --- | --- | --- |
| C42 (v1 -> v2) | v1 -> v3; same condition assertions | `src/engine/migrate.test.ts` was rewritten as «migra v2 e v1 para v3». The old assertions all survive: the v1 condition defaults at `:51`, the lineup posture at `:55`, rounds equality at `:14` (via `expectV3`), and pass-through of a current save at `:59`. The incompatible probe moved from 3 to 4 at `:60`. Many assertions were added. The second C42 proof, `src/persistence/save.test.ts:99`, changed `toBe(2)` to `toBe(3)`. | as declared, strengthened |
| C43 (> 2 incompatible) | test uses version 4 | `src/ui/Home.test.tsx:65`-`:71`: the title, the stored version and the expected text changed 3 -> 4. The button assertion at `:72` is unchanged. | as declared |
| C45 (doc `schemaVersion: 2`) | becomes 3 | `src/persistence/save.test.ts:34`: `2` -> `3`. All older assertions are kept, and assertions for finance, salary and market were added (`:36`-`:57`). | as declared, strengthened |

Other pre-existing test files:
- **Type-only:** `src/engine/condition.test.ts:7` and `src/engine/live.test.ts:295`, `:300` add only `salary: 0` to a `Player` literal. `src/engine/table.test.ts:1`, `:14` add an import and `finance: initialFinance([]), forSale: []` to the club fixture, and `computeTable` does not read either field.
- **Additive only (0 removed lines):** `src/engine/balance.test.ts` (new `describe`), `src/app.test.tsx`, `src/ui/Round.test.tsx` and `src/ui/Squad.test.tsx`.
- **Fixture:** `src/engine/test-fixtures.ts` now builds `v1Document` from a new `v2Document`, which also deletes `market`, `finance`, `forSale` and `salary`, so v1 keeps its old shape plus those removals. It also adds `busySeason`.

Nothing else was weakened, deleted or skipped.

## Plan changes during the build

The frozen plan is `570f4c2`. `plan.md` changed in both build commits, and `checks.md` only in its Handoff section.

- **Landing rows 5 and 6** were appended in `c528f9a`, labelled «achado no build».
  - The change is visible and additive. It is not silent.
  - They are **new one-way doors**, though. Row 5 adds 3 persisted fields to the door-1 save shape (`loanLimit`, `pendingIn`, `pendingOut`). Row 6 fixes the new game's market stream.
  - Handoff says «Nothing new was asked», so the user never approved them. They should go to the user for approval.
  - Neither row changes a frozen check. C54's proof covers the new fields incidentally (`save.test.ts:36`), and C46 depends on `loanLimit`, which is proven at `finance.test.ts:165`.
  - Neither door got a check of its own; see Coverage.
- **Sponsorship Assumption.** Against the frozen text, this is a visible renegotiation: the old «50% da folha» is struck through, with the new formula and the reason next to it.
  - The frozen row did pre-approve calibration («calibrado até o AC 13 passar»). The new row replaces the formula's form, not just its constant, and its `y` is the builder's own («dentro do que o autor aprovou»).
  - A probe shows that **66 of the 100 clubs** in the 5 C13 seeds sit on the new 3% floor. For most clubs, then, sponsorship is 3% of payroll, not 50%.
  - The row was also rewritten in place in `7f883b2` («mínimo 0, mediana 1,41×» -> «piso de 3%, mediana 1,55×»), together with an engine change in the UI commit (`SPONSORSHIP_FLOOR`, `src/engine/finance.ts:17`, `:52`). That intermediate text was never frozen, so it is not a violation.
  - The stated figures reproduce (min 0.981, median 1.550, max 2.186).
  - No check asserts a sponsorship value, so no frozen check is affected. C13's median has a 0.05 margin.
- **Handoff lines** appended to `checks.md` (boundary, settled mid-build): Handoff content only; no claim or proof changed.

## Gate

- **Tests:** `npx vitest run`, resolved to `node ../../../node_modules/vitest/vitest.mjs run`, at `7f883b2` gave 24 files and **155 passed, 0 failed**, 0 skipped. That is 94 at partida-ao-vivo + 61 new.
- **Types:** `tsc -p tsconfig.json --noEmit` and `tsc -p tsconfig.engine.json --noEmit` both exit 0.
- **Tree:** `git status --porcelain` was clean before and after. The probes ran from the session scratchpad and imported the worktree read-only.

## Ranked gaps

1. **Refusal messages unproven (7 checks fail).** C23, C24, C25, C32, C45, C47 and C50 name on-screen text, but every proof sits at the engine reason code.
   - Six strings in `refusalText` (`src/store.ts:49`, `:51`, `:53`, `:55`, `:63`, `:65`) are asserted by no test.
   - Fix: add a table-driven test over those reasons, through the store or the screens, that asserts the exact text, including `Limite de empréstimo: R$ 1.000.000`.
2. **Doors 5 and 6 have no proof.** Both were added in the build without user approval.
   - The ledger's transfer lines are never non-zero anywhere (`src/engine/finance.ts:121`-`:126`), so AC 9's «compras e vendas» is unproven end to end.
   - The door-6 claim that the new game's market stream leaves the league draw unchanged is unproven.
3. **Precision gaps (non-failing):**
   - C28: no ineligible buyer exists in the fixture (`src/engine/market.test.ts:148`-`:171`, filter at `src/engine/market.ts:214`).
   - C9: Juros, Compras and Vendas are all 0 (`src/ui/Finance.test.tsx:40`).
   - C40: the luvas are asserted on `pendingOut`, not on `cash` (`src/engine/market.test.ts:292`).
   - C42: only phase 1,0 is exercised (`src/ui/Finance.test.tsx:84`).
   - C7: helper only, with the round wiring unasserted (`src/engine/finance.ts:114`).
   - C1: offers are empty at season end (`src/engine/finance.test.ts:48`).
   - AC 28 and 29's «mercado segue aberto» (no offers generated after rounds 5 and 22) is in no claim and asserted nowhere (`src/engine/market.ts:279`).

## Notes (non-failing)

- **User decisions:** doors 5 and 6, and the sponsorship formula (effectively a 3% floor for two thirds of clubs), should be put to the user.
- **C13 margin:** the median is 1.55 against a 1.6 bound, which is tight. A small change to salaries, attendance or sponsorship could turn C13 red.
- **Siblings outside the proof commands:** C18's «Nenhum jogador» sits in a sibling test that its proof command does not select (`src/ui/Market.test.tsx:64`). It passed in the full suite.
- **Lessons:** the candidates are listed in the chat report and were not written with `lessons.py`. The dispatch brief limits this run to `verification.md`, so the orchestrator records them.
