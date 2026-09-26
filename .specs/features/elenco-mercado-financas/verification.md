# Elenco, mercado e finanças verification

**Verdict**: PASS
**Profile**: light
**Diff range**: 570f4c2..c507c6f (fix range 31e71c1..c507c6f)
**Round**: 2 - scoped
**Verifier**: independent sub-agent (author != verifier)

## Summary

- **Checks:** 59 of 59 are proven with located evidence at `c507c6f`. The 7 round-1 failures (C23, C24, C25, C32, C45, C47, C50) now each have a second proof, `mensagens de recusa exatas` (`src/store.test.ts:82`). That proof asserts the exact on-screen string for all 17 refusal cases. The two new checks C58 (door 5) and C59 (door 6) pass.
- **Fix scope:** `git diff --name-only 31e71c1..c507c6f` lists only 4 test files (`src/engine/finance.test.ts`, `src/engine/market.test.ts`, `src/store.test.ts`, `src/ui/Finance.test.tsx`), `checks.md`, `.specs/LESSONS.md` and `.specs/lessons.json`. **No production code changed**, and `plan.md` is unchanged since `7f883b2`.
- **Nothing weakened:** in the fix range, the diff removes only three lines under `src`:
  - two import lines, each replaced by a superset (`generateLeague, newGame` and `acceptOffer, buyPlayer, …`);
  - the C9 fixture line `const game = seededGame(4, 0, 1);`, replaced by a stronger fixture.

  No assertion was removed or loosened, and no claim text changed.
- **After-freeze additions:** they are a visible and additive strengthening. Every old `Proof:` line is kept. The added lines, C58/C59, the new Coverage rows, and the `Intent` line (57 -> 59 checks, 4 -> 6 doors) are all listed in a dated `### Round 1 fixes` section of `checks.md`.
- **Proofs:** all 69 `Proof:` lines (63 distinct names) ran green at `c507c6f` in one invocation. The full suite has **159 passed and 0 failed**, which is 155 plus the 4 new tests. Both `tsc` projects are clean.
- **Targeted mutants (requested in the brief):** 8 were injected in a scratch copy, and all 8 were killed. They are 6 refusal texts, the door-6 market stream and the door-5 ledger copy; see Faults injected.

## Binding sources

carried from 7f883b2. Did not run: the profile is light, and `plan.md` `## Sources` marks no source as binding. The fix did not touch the interface.

## Checks

**Proof run (verified at c507c6f).** The batch was one invocation over the 13 proof files, and its `-t` was an unanchored alternation of all 63 distinct proof names:

`node ../../../node_modules/vitest/vitest.mjs run <13 files> -t "(<63 names, regex-escaped>)" --reporter=json`

- **Result:** exit 0, 13 files, **66 passed**, 0 failed and 35 skipped.
- **The 66:** the 63 names plus 3 siblings that the unanchored filter also selects: «mercado fechado depois da rodada 22», «marcar à venda só com mercado aberto» and «aba propostas vazia».
- **Name matching:** a script matched each of the 69 `Proof:` lines to a `passed` assertion result in its own file. No line matched zero tests.

**Scope of this round:**
- **Re-judged in full:** every check whose round-1 result was not PASS (C23, C24, C25, C32, C45, C47, C50), the new C58 and C59, and every check whose evidence sits in a file the fix touched. Those files are `finance.test.ts`, `market.test.ts`, `Finance.test.tsx` and `store.test.ts`, and their citations are refreshed.
- **Carried from 7f883b2:** checks whose evidence lies only in files that did not change in the fix range (`git diff --stat 31e71c1..c507c6f`). Their line numbers are still valid.

| Check | Claim | Proof run | Evidence | Result |
| --- | --- | --- | --- | --- |
| C1 | todo dinheiro do save é inteiro após temporada movimentada | batch ✓ c507c6f | `src/engine/finance.test.ts:53` - `expect(Number.isInteger(v), where).toBe(true)` over cash, sponsorship, ticket price, loan, loan limit, pending, every `lastRound` entry, salaries and offers; `:52` - `finance.loan).toBeGreaterThan(0)`. Precision gap (carried): offers are empty at the end of the season. | PASS |
| C2 | salário 40/60/75/95 e fórmula em todo jogador do jogo novo | batch ✓ c507c6f | `src/engine/finance.test.ts:57`-`:60` - `salaryFor(40)).toBe(2000)` … `228800`; `:63` - `everyone.length).toBe(20 * 22 + 40 + 3)`; `:64` - `p.salary).toBe(expectedSalary(p.rating))` | PASS |
| C3 | caixa inicial = 10 folhas arredondado R$ 100.000, 20 clubes | batch ✓ c507c6f | `src/engine/finance.test.ts:69` - `toHaveLength(20)`; `:72` - `c.finance.cash).toBe(Math.round((wages * 10) / 100_000) * 100_000)` | PASS |
| C4 | torcida 58/69/80, limites, capacidade 80% | batch ✓ c507c6f | `src/engine/finance.test.ts:77`-`:81` - `fansFor(58)).toBe(15_000)` … `fansFor(90)).toBe(60_000)`; `:82`-`:84` - capacities; `:88`-`:89` - every club against the formula written in the test | PASS |
| C5 | caixa de cada clube muda em patrocínio − salários + bilheteria − juros | batch ✓ c507c6f | `src/engine/finance.test.ts:99` - 20 clubs; `:103`-`:105` - salaries, sponsorship, interest; `:106` - `a.finance.cash - c.finance.cash).toBe(l.sponsorship - l.salaries + l.tickets - l.interest)` | PASS |
| C6 | 10 partidas: mandante público × preço, visitante 0 | batch ✓ c507c6f | `src/engine/finance.test.ts:114` - `toHaveLength(10)`; `:119` - `tickets).toBe(attendance * ticketPrice)`; `:120`-`:121` - away `toBe(0)` | PASS |
| C7 | público 39.000/30.000/10.606, capacidade 24.000, líder 36.000, 20º 24.000 | batch ✓ c507c6f | `src/engine/finance.test.ts:128`-`:133` - `attendanceFor(...)).toBe(39_000)`, `30_000`, `10_606`, `24_000`, `36_000`, `24_000`; `:136`, `:138` - positions before round. The new wiring test «público da rodada usa a fase antes da rodada» exists at `:252` (`lastRound!.attendance, m.id).toBe(expected)`, with the phase from the table after round 1). It passed in the full suite, **but C7's `Proof:` line does not select it**; see Ranked gaps. | PASS |
| C8 | Finanças mostra caixa, folha, patrocínio, torcida, capacidade, preço | batch ✓ c507c6f | `src/ui/Finance.test.tsx:33`-`:37` - `valueOf(label)).toHaveTextContent(...)`; `:38` - select `value).toBe("40")` | PASS |
| C9 | 8 linhas da última rodada com os valores do registro | batch ✓ c507c6f | `src/ui/Finance.test.tsx:56` - `for (const [k, v] of Object.entries(l)) expect(v, k).not.toBe(0)`; `:59`-`:67` - the 8 labels with `brl(-l.interest)`, `brl(-l.transfersOut)`, `brl(l.transfersIn)` and Saldo computed in the test; `:69` - `rows.map(th, td)).toEqual(expected)`. The round-1 precision gap is closed: Juros is 15.000, Compras 2.340.000 and Vendas 560.000, all distinct and non-zero. | PASS |
| C10 | sem rodada: «Nenhuma rodada jogada», sem linhas | batch ✓ c507c6f | `src/ui/Finance.test.tsx:75` - `getByText("Nenhuma rodada jogada")`; `:76` - table `not.toBeInTheDocument()` | PASS |
| C11 | coluna «Salário» em cada uma das 22 linhas | batch ✓ c507c6f | carried from 7f883b2: `src/ui/Squad.test.tsx:160`, `:162` - `rows).toHaveLength(22)`; `:166` - `cells[col]!.textContent).toBe(brl(player.salary))` | PASS |
| C12 | Rodada: público e bilheteria em casa; fora, não | batch ✓ c507c6f | carried from 7f883b2: `src/ui/Round.test.tsx:96`-`:97` - `Público ${num(l.attendance)}`, `Bilheteria R$ ...`; `:99`-`:100` - away `not.toBeInTheDocument()`; `:104` - `seen).toEqual({ home: true, away: true })` | PASS |
| C13 | 5 seeds × 38 rodadas: 50%-250% e mediana 90%-160% | batch ✓ c507c6f | carried from 7f883b2: `src/engine/balance.test.ts:101` - `ratios).toHaveLength(100)`; `:103`-`:104` - `>= 0.5`, `<= 2.5`; `:108`-`:109` - median in [0.9, 1.6] | PASS |
| C14 | «R$ 0», «R$ 40.800», «R$ 1.234.567», «-R$ 500.000» | batch ✓ c507c6f | carried from 7f883b2: `src/ui/money.test.ts:5`-`:8` - `formatMoney(0)).toBe("R$ 0")` … `"-R$ 500.000"` | PASS |
| C15 | 11 ações gravam; estado só muda depois da gravação | batch ✓ c507c6f | `src/store.test.ts:58` - `ACTIONS).toHaveLength(11)`; `:68` - `saveGame` called once; `:69` - `game).toBe(game)` while the save is blocked; `:75` - `game).toBe(saved)`. The fix only appended to this file, so the lines are unchanged. | PASS |
| C16 | próxima rodada 1..39: aberto exatamente em 1-5 e 18-22 | batch ✓ c507c6f | `src/engine/market.test.ts:51` - `for (let next = 1; next <= 39; next++) expect(isWindowOpen(next)).toBe(open.has(next))` | PASS |
| C17 | fechado: textos para 6 e 23; sem botões de ação | batch ✓ + sibling ✓ c507c6f | carried from 7f883b2: `src/ui/Market.test.tsx:27` - `getByText("Mercado fechado - reabre antes da rodada 18")`; `:28` - no action buttons; `:36`-`:37` - round 23 | PASS |
| C18 | 7 colunas, 458 linhas, força decrescente, filtro ATA, «Nenhum jogador» | batch ✓ c507c6f | carried from 7f883b2: `src/ui/Market.test.tsx:45` - 7 headers `toEqual([...])`; `:47` - `toHaveLength(19 * 22 + 40)`; `:50` - sorted; `:60`-`:61` - ATA filter; `:71` - «Nenhum jogador», in the sibling «filtro sem jogadores», which passed in the full suite | PASS |
| C19 | valor força 75 aos 20/25/29/32/35 e bordas | batch ✓ c507c6f | `src/engine/market.test.ts:56`-`:60` - `3_060_000` … `610_000`; `:62`-`:69` - the edges | PASS |
| C20 | titular 1,5 × valor; reserva 1,0 × valor | batch ✓ c507c6f | `src/engine/market.test.ts:76` - `askingPrice(seller, starter)).toBe(expectedValue(starter) * 1.5)`; `:77` - reserve `toBe(expectedValue(reserve))` | PASS |
| C21 | oferta no preço move jogador e caixas, motor e tela | batch ✓ c507c6f (2 proofs) | `src/engine/market.test.ts:86`-`:89` - player moved, `cash).toBe(... - price)`, seller `+ price`; carried from 7f883b2: `src/ui/Market.test.tsx:86`-`:89` | PASS |
| C22 | oferta 10.000 abaixo: «Recusado: pedem R$ X», nada muda | batch ✓ c507c6f | carried from 7f883b2: `src/ui/Market.test.tsx:102` - `findByRole("status")).toHaveTextContent(\`Recusado: pedem ${brl(value(target))}\`)`; `:103` - `game).toBe(game)` | PASS |
| C23 | 5 gastos acima do caixa recusados com «Caixa insuficiente», nada muda | batch ✓ c507c6f (2 proofs) | `src/engine/market.test.ts:106` - `spends).toHaveLength(5)`; `:110` - `reason: "cash"`; `:111` - snapshot unchanged. `src/store.test.ts:91`-`:95` - the 5 cases (compra, luvas, rescisão, ampliação, pagamento) with the literal `"Caixa insuficiente"`; `:139` - `useGame.getState().marketMessage, name).toBe(text)`; `:140` - `game).toBe(game)`. Mutant killed. | PASS |
| C24 | 30 jogadores: compra, livre, júnior recusados com «Elenco cheio (30)» | batch ✓ c507c6f (2 proofs) | `src/engine/market.test.ts:121`-`:123` - `reason: "squad_full"` ×3; `src/store.test.ts:102`-`:104` - 3 cases with `"Elenco cheio (30)"`; `:139` - `marketMessage).toBe(text)`. Mutant killed. | PASS |
| C25 | vendedor com 18 recusa com «O clube não vende: elenco no mínimo» | batch ✓ c507c6f (2 proofs) | `src/engine/market.test.ts:132`-`:133` - `toHaveLength(18)`, `reason: "seller_min"`; `src/store.test.ts:106`-`:114` - case «vendedor com 18» expecting `"O clube não vende: elenco no mínimo"`; `:139`. Mutant killed. | PASS |
| C26 | transferência mantém id, salário, condição, moral, cartões, lesão, suspensão; fora da escalação | batch ✓ c507c6f | `src/engine/market.test.ts:144` - `arrived).toEqual(before)`; `:145` - `starters).not.toContain(target.id)` | PASS |
| C27 | Elenco marca/desmarca «À venda»; fechado, sem controle | batch ✓ + sibling ✓ c507c6f | carried from 7f883b2: `src/ui/Squad.test.tsx:177`, `:178`, `:180`, `:186`-`:187` | PASS |
| C28 | à venda: taxa 45%-55%; 80%-110%, múltipla de 10.000, comprador IA com caixa ≥ valor e < 30 | batch ✓ c507c6f | `src/engine/market.test.ts:155`-`:159` - 9 AI clubs set to `cash = value / 2` and one other padded to 30; `:172` - `poor.has(buyer.id)).toBe(false)`; `:173` - `buyer.id).not.toBe(full.id)`; `:168`-`:171`, `:174`-`:175` - multiple, bounds, not the user, cash, squad; `:178`-`:179` - rate in [0.45, 0.55]. The round-1 L-007 precision gap is closed: ineligible clubs now exist and are never chosen. | PASS |
| C29 | espontâneas: taxa 20%-30%, top 5, 110%-150%, múltipla de 10.000 | batch ✓ c507c6f | `src/engine/market.test.ts:193` - `top5.has(o.playerId)).toBe(true)`; `:195`-`:197` - multiple and bounds; `:200`-`:201` - rate in [0.2, 0.3] | PASS |
| C30 | aba «Propostas»: clube, jogador, valor, Aceitar, Recusar; vazia «Nenhuma proposta» | batch ✓ + sibling ✓ c507c6f | carried from 7f883b2: `src/ui/Market.test.tsx:118`, `:122`-`:126`, `:136` | PASS |
| C31 | aceitar com confirmação move jogador, caixas, vaga e propostas; cancelar não muda | batch ✓ c507c6f | carried from 7f883b2: `src/ui/Market.test.tsx:155` - `Vender ${sold.name} por R$ 2.000.000?`; `:157`, `:165`-`:170` | PASS |
| C32 | 18 jogadores: aceitar e dispensar recusados com «Elenco no mínimo (18)» | batch ✓ c507c6f (2 proofs) | `src/engine/market.test.ts:209`-`:210` - `reason: "user_min"` ×2; `src/store.test.ts:117`-`:125` - «aceitar com 18», `:127` - «dispensar com 18», both `"Elenco no mínimo (18)"`; `:139`. Mutant killed. | PASS |
| C33 | proposta não respondida some na rodada seguinte | batch ✓ c507c6f | `src/engine/market.test.ts:219` - `pending.length).toBeGreaterThan(0)`; `:222` - `not.toContain(id)` | PASS |
| C34 | dispensar com confirmação: −4 × salário, jogador nos livres | batch ✓ c507c6f | carried from 7f883b2: `src/ui/Squad.test.tsx:198`, `:200`, `:205` - `cash).toBe(club.finance.cash - 4 * player.salary)`; `:206`-`:207` | PASS |
| C35 | 40 livres, 10 por posição, força 45-70 | batch ✓ c507c6f | `src/engine/market.test.ts:227` - `toHaveLength(40)`; `:228` - 10 per position; `:230`-`:231` - [45, 70] | PASS |
| C36 | contratar livre: −4 × salário, no elenco, fora dos livres | batch ✓ c507c6f | `src/engine/market.test.ts:239` - `cash).toBe(... - 4 * agent.salary)`; `:240`-`:241` | PASS |
| C37 | 3 juniores de 17, força 45-62, no jogo novo e depois da 17; nenhum entre 6 e 17 | batch ✓ c507c6f | `src/engine/market.test.ts:246`-`:250` - `toHaveLength(3)`, `age).toBe(17)`, [45, 62]; `:254` - new game; `:258` - `toHaveLength(0)` for rounds 5-16; `:260` - after round 17 | PASS |
| C38 | promover: caixa igual, salário da fórmula, fora da base | batch ✓ c507c6f | `src/engine/market.test.ts:267` - `cash).toBe(user(state).finance.cash)`; `:269` - `salary).toBe(expectedSalary(junior.rating))`; `:270` | PASS |
| C39 | juniores somem ao fim da 5 e da 22; «Nenhum júnior na base» | batch ✓ c507c6f (2 proofs) | `src/engine/market.test.ts:278`-`:279` - 3 after rounds 4/21, 0 after 5/22; carried from 7f883b2: `src/ui/Market.test.tsx:179` | PASS |
| C40 | IA com 16 contrata 2 livres, o mais forte da posição mais rala, pagando luvas | batch ✓ c507c6f | `src/engine/market.test.ts:293` - 16 before; `:298` - `toHaveLength(18)`; `:299` - `arrayContaining(bestFw ids)`; `:300` - `pendingOut).toBe(fees)`; `:303` - `cash).toBe(ai.finance.cash + l.sponsorship + l.tickets - l.salaries - l.interest - fees)`. The round-1 precision gap is closed: the fees now leave the cash. | PASS |
| C41 | 39 opções R$ 10..200 passo 5, começa R$ 40, IA R$ 40 | batch ✓ c507c6f | `src/ui/Finance.test.tsx:83` - `toHaveLength(39)`; `:84` - `10 + 5 * i`; `:85`-`:86` - «R$ 10», «R$ 200»; `:87` - `"40"`; `:88` - every club `ticketPrice).toBe(40)` | PASS |
| C42 | R$ 40 -> R$ 80 muda o público estimado pela fórmula com a fase atual | batch ✓ c507c6f | `src/ui/Finance.test.tsx:97` - before; `:99`-`:100` - `Math.min(f.capacity, Math.floor(f.fans * Math.min(1.3, (40 / 80) ** 1.5)))`; `:101` - `ticketPrice).toBe(80)`. Precision gap (carried, not addressed by the fix): only phase 1,0 is exercised. | PASS |
| C43 | ampliar com confirmação −4.000.000; capacidade igual por 5 rodadas, +5.000 na 6ª | batch ✓ c507c6f (2 proofs) | `src/engine/finance.test.ts:147` - `cash).toBe(6_000_000)`; `:151` - unchanged in rounds 1-5; `:154` - `capacity + 5_000`; `src/ui/Finance.test.tsx:110` - `"Ampliar custa R$ 4.000.000. Confirmar?"`; `:112` - cancel; `:116` - `6_000_000` | PASS |
| C44 | obra: «Obras: N rodadas»; outra ampliação «Já há uma obra em andamento» | batch ✓ c507c6f | `src/ui/Finance.test.tsx:124` - `getByText("Obras: 3 rodadas")`; `:127` - `findByRole("status")).toHaveTextContent("Já há uma obra em andamento")`; `:128` - cash unchanged | PASS |
| C45 | 76.000 recusado com «Capacidade máxima: 80.000»; 75.000 aceito | batch ✓ c507c6f (2 proofs) | `src/engine/finance.test.ts:160` - `toEqual({ ok: false, reason: "max_capacity" })`; `:162` - 75.000 `ok).toBe(true)`; `src/store.test.ts:129` - capacity 76.000 expecting `"Capacidade máxima: 80.000"`; `:139`. Mutant killed. | PASS |
| C46 | 500.000 e 1.000.000 ok, 700.000 recusado, até 2 × caixa inicial | batch ✓ c507c6f | `src/engine/finance.test.ts:167` - `loanLimit).toBe(2 * c.finance.cash)`; `:171`-`:173`; `:174` - `toEqual({ ok: false, reason: "invalid" })`; `:179`-`:180` | PASS |
| C47 | acima do limite: «Limite de empréstimo: R$ X», X = o que cabe | batch ✓ c507c6f (2 proofs) | `src/engine/finance.test.ts:185` - `toEqual({ ok: false, reason: "loan_limit", amount: 1_000_000 })`; `src/store.test.ts:131` - limit 3.000.000, loan 2.000.000, ask 1.500.000, expecting `"Limite de empréstimo: R$ 1.000.000"`; `:139`. A mutant on the amount formatting (`amount + 500_000`) was killed. | PASS |
| C48 | juros 1.000.000 -> 15.000; 1.234.567 -> 18.500 | batch ✓ c507c6f | `src/engine/finance.test.ts:190`-`:191` - `interestFor(1_000_000)).toBe(15_000)`, `interestFor(1_234_567)).toBe(18_500)`; `:105` - wired through the round | PASS |
| C49 | pagar 500.000 e o saldo inteiro; mais que o saldo recusado | batch ✓ c507c6f | `src/engine/finance.test.ts:198`-`:199` - loan 1.000.000, cash 4.500.000; `:201` - `loan).toBe(0)`; `:202` - `reason: "over_debt"`; `:205` | PASS |
| C50 | caixa negativo: compra, luvas, rescisão, ampliação com «Caixa insuficiente»; salários pagos | batch ✓ c507c6f (2 proofs) | `src/engine/finance.test.ts:214`-`:217` - `reason: "cash"` ×4; `:220`-`:221` - salaries paid; `src/store.test.ts:97`-`:100` - the 4 cases at cash −100.000 with `"Caixa insuficiente"`; `:139`-`:140` | PASS |
| C51 | v2 e v1 -> v3 com fórmulas, R$ 40, sem empréstimo/obra, 40 livres, sem propostas/juniores, elencos e tabela intactos | batch ✓ c507c6f | carried from 7f883b2: `src/engine/migrate.test.ts:43`, `:48` - `expectV3`; `:12` - `schemaVersion).toBe(3)`; `:14`, `:17`-`:18`, `:21`-`:29`, `:32`-`:34` | PASS |
| C52 | `schemaVersion: 4` -> «Jogo salvo incompatível (versão 4)», só «Novo jogo» | batch ✓ c507c6f | carried from 7f883b2: `src/ui/Home.test.tsx:71` - `getByText("Jogo salvo incompatível (versão 4)")`; `:72` - `toEqual(["Novo jogo"])` | PASS |
| C53 | reload antes da rodada: mesmos resultados, propostas e contratações da IA | batch ✓ c507c6f | carried from 7f883b2: `src/app.test.tsx:151`, `:152`, `:163`-`:166` - `viaReload).toEqual(direct.state)` | PASS |
| C54 | documento: `schemaVersion: 3`, `finance`, `salary`, `market` | batch ✓ c507c6f | carried from 7f883b2: `src/persistence/save.test.ts:34` - `schemaVersion).toBe(3)`; `:36`-`:37`, `:39`, `:42`, `:55`-`:57` | PASS |
| C55 | força muda, salário não: após rodada e após gravar/ler | batch ✓ c507c6f | `src/engine/finance.test.ts:231` - `rating).toBe(95)`; `:232` - `salary).toBe(salary)`; `:235` - after the JSON round-trip through `migrateSave` | PASS |
| C56 | compra antes da rodada não muda os outros 8 jogos | batch ✓ c507c6f | `src/engine/market.test.ts:315` - `untouched).toHaveLength(8)`; `:316` - `result).toEqual(m.result)` | PASS |
| C57 | ids únicos após temporada; `fa-` e `jr-` | batch ✓ c507c6f | `src/engine/market.test.ts:323` - `new Set(all).size).toBe(all.length)`; `:325`-`:327`; `:328` - `toMatch(/^fa-\d+$/)`; `:329` - `toMatch(/^jr-1-1-\d+$/)` | PASS |
| C58 (new) | compras e vendas entram em «Compras»/«Vendas» da rodada seguinte, usuário e outra ponta; depois 0 | batch ✓ c507c6f | `src/engine/finance.test.ts:269`-`:270` - `pendingOut).toBe(price)`, `pendingIn).toBe(700_000)`; `:275`-`:276` - `l.transfersOut).toBe(price)`, `l.transfersIn).toBe(700_000)`; `:277` - seller `transfersIn).toBe(price)`; `:278` - buyer `transfersOut).toBe(700_000)`; `:279`-`:280` - pending back to 0; `:284`-`:285` - the next round's user ledger shows 0. Screen labels: C9 (`src/ui/Finance.test.tsx:65`-`:66`) maps «Compras»/«Vendas» to `transfersOut`/`transfersIn` with distinct non-zero values. Mutant killed. | PASS |
| C59 (new) | seeds 1, 7, 123456: liga e `rngState` iguais a só gerar a liga | batch ✓ c507c6f | `src/engine/finance.test.ts:293` - `state.leagues[0], \`seed ${seed}\`).toEqual(league)`; `:294` - `state.rngState).toBe(rng.getState())`, looped over `[1, 7, 123456]` at `:289`. Mutant `marketRng = rng` was killed at `:294` (seed 1: `3233698618` vs `3215215221`). | PASS |

## Coverage

This section is not required under light. It is kept from round 1, and the rows the fix touched are recomputed here (verified at c507c6f). Every other row is carried from 7f883b2.

| Set (size) | Recomputed from | Member -> proof | Unproven |
| --- | --- | --- | --- |
| mensagens de recusa citadas em checks (8 reasons) | `refusalText`, `src/store.ts:44`-`:72` | price C22 `Market.test.tsx:102` · works C44 `Finance.test.tsx:127` · cash C23/C50 `store.test.ts:91`-`:100` · squad_full C24 `:102`-`:104` · seller_min C25 `:106`-`:114` · user_min C32 `:117`-`:127` · max_capacity C45 `:129` · loan_limit C47 `:131`; asserted at `:139` | - |
| gastos bloqueados por caixa (5) | AC 23; engine spend paths | C23 engine `market.test.ts:106`-`:111` and text `store.test.ts:91`-`:95`, all 5 | - |
| linhas da última rodada (8) | AC 9; `src/ui/Finance.tsx` ledger table | C9, all 8 labels in order, every ledger value non-zero (`Finance.test.tsx:56`, `:69`) | - |
| portas de mão única (6) | plan `Landing`, rows 1-6 | door 1 C54 · door 2 C55 · door 3 C56 · door 4 C57 · door 5 C58 `finance.test.ts:275`-`:285` · door 6 C59 `finance.test.ts:293`-`:294` | - |
| fase do público (3) | AC 7, `formFactor`, `src/engine/finance.ts:77` | líder, 20º, antes da 1ª: C7 helper `finance.test.ts:128`-`:133`; wiring at `:252` (test not selected by C7's proof line) | - |
| ações que gravam (11) | carried from 7f883b2 | C15 table-driven (`store.test.ts:58`) | - |
| próxima rodada vs janela (39) | carried from 7f883b2 | C16 over 1-39 | - |
| fator de idade (5 faixas, 4 bordas) | carried from 7f883b2 | C19 | - |
| estados vazios (4) | carried from 7f883b2 | C17 · C30 · C39 · filtro `Market.test.tsx:71` | - |
| confirmações (3) | carried from 7f883b2 | vender · dispensar · ampliar | - |
| versões de save (4) | carried from 7f883b2 | v1, v2, v3, v4 | - |

## Test policy rows

carried from 7f883b2. Did not run: the profile is light, and `checks.md` has no `Test policy` section.

## Faults injected

This step is not required under light. The brief asked for these mutants explicitly. Each was applied to a scratch copy (`<scratchpad>/mut`, with `node_modules` as a junction), outside any git tree, and restored after its run. The real worktree's `git status --porcelain` was empty before and after.

| Mutation | Location | Killed |
| --- | --- | --- |
| `"Caixa insuficiente"` -> `"Caixa insuficiente."` | `src/store.ts:49` | yes - `store.test.ts` «compra acima do caixa» |
| `Elenco cheio (${SQUAD_MAX})` -> `Elenco cheio` | `src/store.ts:51` | yes - «compra com 30» |
| `"O clube não vende: elenco no mínimo"` -> `"O clube não vende"` | `src/store.ts:53` | yes - «vendedor com 18» |
| `Elenco no mínimo (${SQUAD_MIN})` -> `Elenco no mínimo` | `src/store.ts:55` | yes - «aceitar com 18» |
| `"Capacidade máxima: 80.000"` -> `"Capacidade máxima"` | `src/store.ts:63` | yes - «capacidade acima de 80.000» |
| `formatMoney(amount)` -> `formatMoney(amount + 500_000)` in loan_limit | `src/store.ts:65` | yes - «empréstimo acima do limite» |
| new-game `marketRng = createRng(mix32(seed, 2))` -> `marketRng = rng` (market draws from the league Rng) | `src/engine/generate.ts:156` | yes - C59, `rngState` differs for seed 1 |
| ledger `transfersIn: f.pendingIn` -> `transfersIn: 0` | `src/engine/finance.ts:121` | yes - C58, `expected +0 to be 700000` |

## Swept existing

carried from 7f883b2. The fix changed no production code, so the dependency-failure constraint is unchanged: `commit` -> `persist` -> `saveStatus`, shown by `Banner`, which is mounted outside the phase switch. The `n/a` rows are approved policy.

## Superseded tests audit (partida-ao-vivo)

carried from 7f883b2. The fix range touches no partida-ao-vivo test file. `rg "\.skip|\.only|\.todo|xit\(|xtest\(" src` finds nothing at `c507c6f`.

## Plan changes during the build

- **plan.md:** carried from 7f883b2. It is unchanged in the fix range (`git diff 7f883b2..c507c6f -- plan.md` is empty).
- **checks.md after the freeze** (verified at c507c6f). The changes are additive only, and each is named in `### Round 1 fixes`:
  - 7 extra `Proof:` lines;
  - C58 and C59;
  - the door row widened from 4 to 6;
  - a new refusal-text Coverage row;
  - the `Intent` counts.

  No claim text changed and no old proof was removed. This is a strengthening, not a weakening.

## Gate

- **Tests:** `node ../../../node_modules/vitest/vitest.mjs run` at `c507c6f` - 24 files, **159 passed, 0 failed**.
- **Types:** `tsc -p tsconfig.json --noEmit` and `tsc -p tsconfig.engine.json --noEmit` both exit 0.
- **Tree:** `git status --porcelain` was empty before and after the run.

## Ranked gaps

None fail the feature. These are non-failing findings:

1. **C7's wiring test is orphaned from its proof line.**
   - The fix adds «público da rodada usa a fase antes da rodada» (`src/engine/finance.test.ts:238`-`:252`) as the C7 strengthening (L-003).
   - C7's only `Proof:` is `-t "público por preço fase e capacidade"` (`checks.md:35`), which does not select it.
   - The test passes in the full suite, but a proof run of C7 alone never executes it.
   - Fix: add it as a second `Proof:` line on C7.
2. **The refusal text on the Elenco screen is proven only up to the store.**
   - `marketMessage` is rendered as `role="status"` on all three screens (`src/ui/Squad.tsx:260`-`:262`, `src/ui/Market.tsx:48`-`:50`, `src/ui/Finance.tsx:199`-`:201`).
   - C22 and C44 prove that rendering for Mercado and Finanças.
   - No test reads the status on Elenco, where «dispensar» and «rescisão» are refused (C23, C32, C50). The store-level assertion at `src/store.test.ts:139` is the evidence.
3. **C42: only phase 1,0 is exercised** (`src/ui/Finance.test.tsx:99`). Carried, not addressed by the fix.
4. **C1: offers are empty at the end of the season** (`src/engine/finance.test.ts:53`). Carried; the offer amounts' integrality is covered by C28/C29.
5. **AC 28/29 «mercado segue aberto»** (no offers generated after rounds 5 and 22) is in no claim (`src/engine/market.ts:279`). Carried.
6. **C58 zeroing covers only the user.** The next-round zero is asserted for the user only (`src/engine/finance.test.ts:284`-`:285`), not for the other side of each transfer. The claim reads naturally as the user's ledger.

## Notes (non-failing)

- **User decisions still open (from round 1):**
  - Doors 5 and 6 were added to `Landing` during the build. They now have proofs, but nothing in `checks.md` or `plan.md` records the user approving them as one-way doors.
  - The sponsorship formula (a 3% floor, which binds for about two thirds of the clubs) is also still unapproved.
- **C13 margin:** the median of 1.55 against the 1.6 bound is carried and unchanged, because no production code changed.
- **Lessons:** the fix commit added `.specs/LESSONS.md`/`lessons.json` entries (L-003 and L-007 confirmed). Candidates from this round are in the chat report and were not written with `lessons.py`.
