# Ajustes-4a verification

**Verdict**: PASS
**Profile**: light
**Diff range**: 7f09c28..8050291
**Round**: 1 - full
**Verifier**: independent sub-agent (author != verifier)

Profile `light` (as approved in `checks.md`): no binding-source step, no Coverage recompute, no Test policy rows (none in `checks.md`), no fault injection. Proofs at HEAD, per-test presence, one located assertion per check, the level judgment and the `Swept existing` re-read all ran.

## Checks

Proof run (one invocation, all proof files, combined `-t` alternation, `--reporter=verbose`):
`npx vitest run src/engine/calendar.test.ts src/ui/Squad.test.tsx src/ui/Round.test.tsx src/store.test.ts src/engine/market.test.ts src/engine/balance.test.ts src/engine/finance.test.ts -t "<23 names>"` - exit 0, 7 files, 24 passed, 94 skipped. Every named test below appears individually as `✓` in the output (the C3 name matches two tests, one per screen file; the three adjusted old tests were added to the same run).

| Check | Claim | Proof run | Evidence | Result |
| --- | --- | --- | --- | --- |
| C1 | lineup validation: cup date without user -> fails only on B; with user -> only on A; league -> only on B | `✓ calendar.test.ts > competição do próximo jogo (ajustes-4a) > competição do próximo jogo do usuário` | `src/engine/calendar.test.ts:128` - `expect(missing(s, out), "copa sem o usuário").toEqual([0, 1, 1])`; `:130` - `expect(missing(s, alive), "copa com o usuário").toEqual([1, 0, 1])`; `:134` - `expect(missing(league, alive), "liga").toEqual([0, 1, 1])` (rows are [only A, only B, both]; A = cup suspension, B = league suspension) | PASS |
| C2 | eliminated in an earlier phase and exempt from the Preliminar both read the league | `✓ calendar.test.ts > ... > eliminado e isento da preliminar` | `src/engine/calendar.test.ts:144-145` - losers of phases 0,1,2 at the Quartas: `toEqual([0, 1, 1])` and `nextCompetition(s)).toEqual({ kind: "league" })`; `:152-153` - top seed at the Preliminar: `toEqual([0, 1, 1])`, `{ kind: "league" }`; control `:155-156` club in the Preliminar `[1, 0, 1]`, `{ kind: "cup", cupId: "cup-nat" }` | PASS |
| C3 | cup date without user: Elenco button on, no «Faltam», no «Suspenso (copa)» badge; Resultados button on; with the user: blocked and marked | `✓ Squad.test.tsx > elenco em data de copa sem o usuário (ajustes-4a) > data de copa sem o usuário libera o suspenso de copa`; `✓ Round.test.tsx > rodada antes de data de copa sem o usuário (ajustes-4a) > data de copa sem o usuário libera o suspenso de copa` | `src/ui/Squad.test.tsx:370` - `getByRole("button", { name: "Jogar rodada" })).toBeEnabled()`; `:371` - `queryByText(/Faltam/)).not.toBeInTheDocument()`; `:372` - `within(rowOf(off.suspended.name)).queryByText("Suspenso (copa)")).not.toBeInTheDocument()`; `:379-381` - with user: `toBeDisabled()`, `getByText("Faltam 1 titulares")`, `getByText("Suspenso (copa)")`; `src/ui/Round.test.tsx:193` - `toBeEnabled()`, `:198` - `toBeDisabled()` (see note 1 on «Condição») | PASS |
| C4 | via the store/App: eliminated user with cup-suspended starter clicks «Jogar rodada», date closes without «Ao vivo», results shown | `✓ store.test.ts > data de copa sem o usuário pelo store (ajustes-4a) > eliminado com suspenso de copa joga a data` | `src/store.test.ts:266` - `expect(play).toBeEnabled()`; `:268` - `findByRole("heading", { level: 1, name: "Copa Nacional · Quartas" })`; `:272` - `expect(phases).not.toContain("live")`; `:274` - `expect(s.lastRound!.cup).toEqual({ cupIndex: 0, phase: 3 })`; `:275` - `currentPhase).toBe(4)`. Entry point is `render(createElement(App))` + `user.click` (L-003) | PASS |
| C5 | strongest candidate injured (1) -> buys the second; strongest at 0 -> buys the strongest | `✓ market.test.ts > ajustes-4a: filtros da compra da IA (engine) > IA não compra lesionado` | `src/engine/market.test.ts:1081` - `expect(buy(1)).toEqual({ strong: false, next: true })`; `:1082` - `expect(buy(0)).toEqual({ strong: true, next: false })` | PASS |
| C6 | table: buy to AI -> out; accepted-offer buy -> out; free -> in; release -> in; no line -> in | `✓ market.test.ts > ... > IA não revende quem comprou na temporada` | `src/engine/market.test.ts:1104` - `expect(rows).toHaveLength(5)`; `:1113` - `expect(has(q.s, q.buyer.id, p.id), what).toBe(bought)` over rows `:1098-1102` with literal `false, false, true, true, true`; offer row is `line("buy", p, q.s.userClubId, holder.id)` | PASS |
| C7 | red-sale: injured most valuable is sold; most valuable bought by AI this season -> second sold | `✓ market.test.ts > ... > venda do vermelho com lesionado e com comprado` | `src/engine/market.test.ts:1135` - `toMatchObject({ kind: "buy", fromId: from.id, toId: buyer.id, amount: 3_770_000 })` (injured star sold); `:1143` - `expect(has(s, from.id, star.id)).toBe(true)`; `:1144` - `expect(has(s, buyer.id, second.id)).toBe(true)` | PASS |
| C8 | seeds 1,2,3 x 5 seasons: no player has more than one `buy` line per season | `✓ balance.test.ts > equilíbrio em várias temporadas > uma compra por jogador por temporada` | `src/engine/balance.test.ts:271` - `expect(max, ...).toBeLessThanOrEqual(1)`; non-vacuity `:268` - `expect(buys.size, ...).toBeGreaterThan(0)`; `:264` - `toHaveLength(SEASONS)`; `SEASONS = 5` `:141`, `MULTI_SEEDS = [1, 2, 3]` `:142` | PASS |
| C9 | gastos-da-ia bands C19, C20, C21, C34 still hold, no limit changed | `✓ balance.test.ts > ... > caixa em 5 temporadas`; `✓ ... > compras da IA em 5 temporadas`; `✓ ... > força estável em 5 temporadas`; `✓ balance.test.ts > equilíbrio financeiro > caixa equilibrado em uma temporada` | `src/engine/balance.test.ts:232-233` - `toBeGreaterThanOrEqual(-2)`, `toBeLessThanOrEqual(15)`, `:235-236` median 2..4 (C19); `:255-256` - total `>= 50`, `<= 600` (C20); `:217` - drift `toBeLessThanOrEqual(5)` (C21); `:122-123` - ratio 0.5..2.5, `:127-128` median 0.9..1.6 (C34). Diff of `balance.test.ts` in range is +17/-0 (only the C8 test added): no limit changed | PASS |
| C10 | gastos-da-ia C1-C24 proofs still green, no expected value changed | 7 names, each `✓`: `sobra da IA`, `compra no limite da sobra`, `chance de compra pelo fluxo da door 3`, `candidatos da compra da IA`, `escolha do reforço da IA`, `vermelho vende o mais valioso`, `boletim registra cada movimento da IA` | `src/engine/market.test.ts:484` - `expect(aiBudget(club, 50_000)).toBe(4_500_000)`; `:505` - `expect(run(10_480_000)).toEqual({ bought: true, unchanged: false })`; `:514` - `expect(order).toHaveLength(39)`; `:671` - `expect(has(q.s, q.buyer.id, player.id), what).toBe(eligible)`; `:696` - `toEqual({ first: false, second: true, spent: 1_410_000 })`; `:866` - `toMatchObject({ kind: "buy", fromId: from.id, toId: b.id, amount: 3_770_000 })`; `:1018` - literal expected boletim row. In-range diff of `market.test.ts` touches old tests only in the `everyoneBuys` fixture (`:473`) and one fixture line of «compras da IA não mudam os outros sorteios» (`:548`); no `expect` line of an old test changed | PASS |
| C11 | force 70, salary R$ 20.000 < 1,2 x salaryFor(70); price > surplus at 1,2x and <= surplus at current salary -> bought | `✓ market.test.ts > ajustes-4a: filtros da compra da IA (engine) > sobra da compra usa o salário atual` | `src/engine/market.test.ts:1153` - `expect(expectedSalary(70)).toBe(26_500)` (literal table, L-004); `:1164` - `expect(q.buyer.finance.cash - 10 * (wages(q.buyer) + 31_800)).toBeLessThan(price)`; `:1169` - `expect(run(0)).toBe(true)` (cash set so the current-salary surplus equals the price, `:1163`) | PASS |
| C12 | same candidate R$ 10.000 above the current-salary surplus -> not bought | same test | `src/engine/market.test.ts:1171` - `expect(run(-10_000)).toBe(false)` | PASS |

Level judgment: C1, C2 at the engine function the screens read (`nextCompetition`, `src/engine/calendar.ts:36`); C3 at the two screens that call it (`src/ui/Squad.tsx:67`, `src/ui/Round.tsx:35`); C4 through `App` and the store (L-003). C5-C7, C11-C12 through `closeRoundMarket` (the market's entry point), not through the private `tryAiPurchase`/`sellFromTheRed`. C8-C9 over full multi-season simulations. No level gap.

## Coverage

Not recomputed - profile `light`. The author's table has 8 rows, all with `-` in Unproven; every member it names has a located assertion above.

## Swept existing

| Swept row | Cited constraint | Found in code |
| --- | --- | --- |
| data lifecycle: boletim esvaziado na virada | test «virada esvazia o boletim» | yes - `src/engine/rollover.ts:252` `state.market.transfers = [];`; test `src/engine/rollover.test.ts:510-523`, `expect(state.market.transfers).toHaveLength(0)`. Also `src/engine/migrate.ts:132` resets it on migration. «Nesta temporada» = the whole list holds. |

## Old tests with adjusted fixtures

The in-range diff was read hunk by hunk for each; no `expect(...)` line and no expected literal of an old test changed.

| Old test | Fixture change | Expected values changed | Finding |
| --- | --- | --- | --- |
| `src/ui/Squad.test.tsx` «suspensões pela próxima data» (copa-nacional C35) | `seededGame(102, 0, 4)` -> `seededGameIn(1, 102, 0, 4)` (Série B club 0, in the Preliminar) + one added guard `:331` asserting the user has a tie in phase 0 | none - `:335-338` and `:345-348` identical | Fixture only; the added guard strengthens it. Needed because the old fixture's club skips the Preliminar, which AC 1 now reads as the league. Outside the literal «teste antigo de mercado» grant in `checks.md`, but the stop rule («mudar um valor esperado») was not triggered and plan Impact records it |
| `src/engine/market.test.ts` `everyoneBuys` (used by «chance de compra pelo fluxo da door 3» and «compras só em rodada de janela») and «compras da IA não mudam os outros sorteios» | GK 90 `injuryRounds: 5` -> `suspendedRounds: 5` (`:473`, `:548`) | none | Within the market-fixture rule (candidate was injured). Still out of his own eleven for the league; now a valid candidate under AC 5 |
| `src/engine/finance.test.ts` «prêmio por posição na rodada 38» | `zeroAiSurplus(state)` before round 38 (`:333`) | none - `:340-342` identical | Fixture only. `zeroAiSurplus` is the gastos-da-ia rule for older tests (ruling (3), `.specs/features/gastos-da-ia/checks.md:194`; also used in `rollover.test.ts:31`, `End.test.tsx:51`). Outside the literal market-only grant; disclosed in plan Impact |

## Notes (non-failing)

1. **«Condição» is not a screen.** `src/ui/Condition.tsx` is a component module (`MoraleArrow`, `FitnessBar`, `StatusBadge`); `StatusBadge` - the only producer of «Suspenso (copa)» (`src/ui/Condition.tsx:46`) - is rendered only at `src/ui/Squad.tsx:225`, fed by `nextCompetition(game)` (`:67`). `Live.tsx` imports only `FitnessBar`/`MoraleArrow`. So C3's «tela Condição» clause is the badge in the Elenco table, and `src/ui/Squad.test.tsx:372` / `:381` prove it both ways. The plan's Impact/Observable wording («tela Condição») is imprecise, not a behaviour gap.
2. **Plan edited during the build.** `plan.md` Impact rows 31-32 were extended in commits 2e5d9a9 and 1c01b54 (after the checks were approved at 7f09c28) to record the three fixture adjustments. `checks.md` in range only gained the `✓` marks; no claim text changed.
3. `boughtByAi` (`src/engine/market.ts:327`) treats any `buy` with a non-null `toId` other than the user's club as an AI buy, which matches AC 6 (accepted offers included) and is exercised by C6's offer row.

## Gate

`npx vitest run` - 33 files, 336 passed, 0 failed (exit 0).
