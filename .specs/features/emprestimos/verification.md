# Empréstimo de jogadores verification

**Verdict**: PASS
**Profile**: light
**Diff range**: a3a30b5..bd82792 (plan, checks and AD-026 in 1e2fcd4; engine in 20e638a; UI in 7f9118c; layout script in bd82792); proofs run at HEAD bd82792
**Round**: 1 - full
**Verifier**: independent sub-agent (author != verifier)

All 23 checks are proven with located evidence. Every named proof passed at bd82792 in a single batch of 25 tests across 6 files. `npm run check:layout` passed with «layout: as 21 telas cabem em 400 × 700 px». `tsc` and `lint` are clean.

I also ran the HEAD tests against the pre-feature code a3a30b5. 21 of the 25 tests fail there, mostly because `loanOut`, `loanIn`, `loanFee` and `loanDestination` are not exported yet (accepted here as pre-feature evidence). The others fail on real assertions: for example, 800 AI purchases of the loaned goalkeepers happen at C11, and the loan button is missing at C17-C22.

Four tests pass on a3a30b5:

- C9, which `checks.md` declares as pinning existing behaviour (L-030).
- Both C16 proofs. These are not declared (Finding 2).
- The closed-market half of C17 (Finding 3).

The full suite had the known «oferta inválida» timeout. Because that test keeps running after its timeout and calls `cleanup()`, it also emptied the DOM under the next test, which is C20's proof. That is Finding 1. A rerun of `Market.test.tsx` passed 22/22.

## Binding sources

None. The plan's `## Sources` holds the author's request and STATE ADs as context, and marks nothing binding. Step 1 runs only under `ui`, and this feature is `light`.

## Proof run

Verified at `bd82792`. `git status --porcelain` of the real tree was empty before the run and after every step. The only file I wrote is this report. The pre-feature comparison ran in a separate scratch worktree with its own `npm ci` and no junction. I removed the worktree afterwards with `git worktree remove --force`, and the real `node_modules` was intact (151 entries, `node_modules/.bin/vitest` present). No Vite or Chrome port was left listening after `check:layout`.

1. **Named proofs, one invocation**: `npx vitest run src/engine/market.test.ts src/engine/rollover.test.ts src/engine/saveFile.test.ts src/persistence/save.test.ts src/ui/Squad.test.tsx src/ui/Market.test.tsx -t "emprestar cede o jogador|destino do empréstimo|recusas ao emprestar|salário de quem está emprestado|taxa do empréstimo|pegar emprestado traz o jogador|recusas ao pegar emprestado|limite de 30 conta os emprestados|limite de 30 sem emprestados|emprestado não se negocia|IA respeita o empréstimo|sem proposta por emprestado|virada devolve os emprestados|quem volta entra no relatório|troca de clube mantém o empréstimo|empréstimo atravessa o arquivo|empréstimo atravessa o save|botão emprestar no elenco|emprestar com confirmação|recusas do emprestar na tela|pegar emprestado na negociação|negociação de titular e de emprestado|aba emprestados" --reporter=verbose` exited 0. It ran 6 files: **25 passed**, 155 skipped. There are 23 names, and two of them also match a second test by prefix. Both extra tests are proofs of their check (C17's closed market and C20's short cash). Each test printed its own ✓ line:
   - `src/engine/market.test.ts > empréstimo: emprestar (emprestimos) > emprestar cede o jogador` ✓ (C1)
   - `... > destino do empréstimo` ✓ (C2)
   - `... > recusas ao emprestar` ✓ (C3)
   - `... > salário de quem está emprestado` ✓ (C4)
   - `src/engine/market.test.ts > empréstimo: pegar emprestado (emprestimos) > taxa do empréstimo` ✓ (C5)
   - `... > pegar emprestado traz o jogador` ✓ (C6)
   - `... > recusas ao pegar emprestado` ✓ (C7)
   - `... > limite de 30 conta os emprestados` ✓ (C8)
   - `... > limite de 30 sem emprestados` ✓ (C9)
   - `... > emprestado não se negocia` ✓ (C10)
   - `src/engine/market.test.ts > empréstimo: a IA respeita (emprestimos) > IA respeita o empréstimo` ✓ (C11)
   - `... > sem proposta por emprestado` ✓ (C12)
   - `src/engine/rollover.test.ts > empréstimos na virada (emprestimos) > virada devolve os emprestados` ✓ (C13)
   - `... > quem volta entra no relatório` ✓ (C14)
   - `... > troca de clube mantém o empréstimo` ✓ (C15)
   - `src/engine/saveFile.test.ts > empréstimo no arquivo (emprestimos) > empréstimo atravessa o arquivo` ✓ (C16)
   - `src/persistence/save.test.ts > empréstimo no save (emprestimos) > empréstimo atravessa o save` ✓ (C16)
   - `src/ui/Squad.test.tsx > empréstimo no Elenco (emprestimos) > botão emprestar no elenco` ✓ (C17)
   - `... > botão emprestar no elenco com o mercado fechado` ✓ (C17)
   - `... > emprestar com confirmação` ✓ (C18)
   - `... > recusas do emprestar na tela` ✓ (C19)
   - `src/ui/Market.test.tsx > empréstimo no Mercado (emprestimos) > pegar emprestado na negociação` ✓ (C20)
   - `... > pegar emprestado na negociação sem caixa` ✓ (C20)
   - `... > negociação de titular e de emprestado` ✓ (C21)
   - `... > aba emprestados` ✓ (C22)
2. **Existence and diff membership.** I located each test with `grep -n`:
   - `src/engine/market.test.ts:1476`, `:1500`, `:1546`, `:1565`, `:1596`, `:1610`, `:1631`, `:1685`, `:1691`, `:1697`, `:1716` and `:1759`
   - `src/engine/rollover.test.ts:690` (describe), with tests at `:713`, `:731` and `:740`
   - `src/engine/saveFile.test.ts:172` and `src/persistence/save.test.ts:303`
   - `src/ui/Squad.test.tsx:606` (describe), with tests at `:622`, `:641`, `:649` and `:679`
   - `src/ui/Market.test.tsx:378` (describe), with tests at `:382`, `:406`, `:419` and `:439`

   Every proof sits in a describe block tagged `(emprestimos)`, and every one is added in `a3a30b5..bd82792`: the engine tests in 20e638a and the UI tests in 7f9118c (`git diff --stat`: market.test.ts +327, rollover.test.ts +86, saveFile.test.ts +17, save.test.ts +14, Squad.test.tsx +125, Market.test.tsx +91). No proof resolves to a test that the feature did not touch.
3. **Pre-feature comparison at a3a30b5 (L-029/L-030).** I created a scratch worktree at `a3a30b5`, checked out the six test files from `bd82792`, ran `npm ci`, and ran the same batch: **21 failed, 4 passed**.
   - **Missing exports.** C1, C2, C3, C4, C5, C6, C7 and C10 fail with `TypeError: loanDestination / loanOut / loanFee / loanIn is not a function`. For example, `market.test.ts:1485` and `:1606`. I accept this as pre-feature evidence: the function the check names does not exist there.
   - **Real assertions.** These fail on a value the check names:
     - C8: `buy: expected { ok: true ... } to deeply equal { ok: false, reason: 'squad_full' }` at `market.test.ts:1688`
     - C11: `compra: expected 800 to be +0` at `:1731`
     - C12: `semente 3: expected [ Array(1) ] to deeply equal []` at `:1769`
     - C13: `expected undefined to be defined` at `rollover.test.ts:718`
     - C14: `expected undefined to be 94` at `:736`
     - C15: `expected [...] to include 'c3-p4'` at `:770`
     - C17: «Emprestar Samuel Brualdo» not found at `Squad.test.tsx:631`
     - C18 at `:659` and C19 at `:719`
     - C20: «Pegar emprestado (R$ 60.000)» not found at `Market.test.tsx:391` and `:414`
     - C21: «Titular: o clube não empresta» missing at `:429`
     - C22: tab «Emprestados (2)» not found at `:451`
   - **Pass there.** `limite de 30 sem emprestados` (C9) passes, as `checks.md`'s «Lições aplicadas» declares. `empréstimo atravessa o arquivo` and `empréstimo atravessa o save` (C16) also pass (Finding 2). So does `botão emprestar no elenco com o mercado fechado`, the closed-market half of C17 (Finding 3).
4. **Full suite**, `npx vitest run`: exit 1, 49 files, **664 passed, 2 failed** (666), 294 s.
   - The first failure is `src/ui/Market.test.tsx > oferta digitada (correcoes-validacao) > oferta inválida`, `Test timed out in 30000ms` (the known flake).
   - The second is `... > empréstimo no Mercado (emprestimos) > pegar emprestado na negociação` (C20), with «Pegar emprestado (R$ 60.000)» not found and the DOM dump showing `<body />`. The timed-out test's loop calls `cleanup()` at `src/ui/Market.test.tsx:372`. Its body keeps running after the timeout and unmounts the next test's render (Finding 1).
   - I reran the file once (`npx vitest run src/ui/Market.test.tsx`): **22 passed**, 0 failed, 49 s.
5. **Types and lint**: `npx tsc -b --noEmit` exit 0, and `npm run lint` (`eslint src`) exit 0.
6. **Layout**, `npm run check:layout`: exit 0 at 400 × 700 with seed 1. The output included `ok    squadLoan  scrollHeight 700 scrollWidth 400 · ...` and `ok    marketLoans scrollHeight 700 scrollWidth 400 · ...`, and the last line was `layout: as 21 telas cabem em 400 × 700 px`. It printed 22 `ok` lines: the 21 required screens plus `roundOffer`, the extra screen already accepted in ajustes-saves.

## Checks

Verified at `bd82792`.

| Check | Claim | Proof run | Evidence | Result |
| --- | --- | --- | --- | --- |
| C1 | `loanOut` of a user's player (at sale, with an AI offer): `{ ok: true }`; out of `players`, `lineup.starters`, `forSale`; at the destination with `loanFrom` = user id and in `aiLineup(dest).starters`; offer gone; cash/pendingIn/pendingOut of both unchanged | «emprestar cede o jogador» ✓; fails on a3a30b5 (`loanDestination is not a function`) | `src/engine/market.test.ts:1489` `expect(meAfter.players.map((x) => x.id)).not.toContain(p.id)`; `:1490` lineup `not.toContain(p.id)`; `:1491` `expect(meAfter.forSale).not.toContain(p.id)`; `:1493` `expect(there.players.find(...)).toEqual({ ...p, loanFrom: me.id })`; `:1494` `expect(aiLineup(there).starters).toContain(p.id)`; `:1495` offers `not.toContain(p.id)`; `:1496` `expect(money(meAfter)).toEqual(mine)`; `:1497` `expect(money(there)).toEqual(theirs)` (`money` = `{cash, pendingIn, pendingOut}`, `:1483`). Code: `src/engine/market.ts:360` | PASS |
| C2 | door 2 table: strongest where he does not start skipped, next picked; 30-player club skipped; other country skipped; tie -> smaller id; none -> `null` | «destino do empréstimo» ✓; fails on a3a30b5 | `src/engine/market.test.ts:1509` `toBe(next.id)` («titular», strong rated 80 with `:1508` asserting he does not start there); `:1518` «30 jogadores» `toBe(next.id)`; `:1527` «outro país» `toBe(next.id)`; `:1536` «empate» `toBe(later.id)` (smaller id, later in array order, `:1532-1533`); `:1542` «nenhum» `toBeNull()`. Code: `src/engine/market.ts:330-341` | PASS |
| C3 | `loanOut` refusals, game unchanged: `closed`, `not_found`, `user_min`, `last_year`, `no_club`, `on_loan` | «recusas ao emprestar» ✓; fails on a3a30b5 | `src/engine/market.test.ts:1549-1554` the six rows with reasons `"closed"`, `"not_found"`, `"user_min"`, `"last_year"`, `"no_club"`, `"on_loan"`; `:1560` `expect(loanOut(w.s, id), name).toEqual({ ok: false, reason })`; `:1561` `expect(JSON.stringify(w.s), name).toBe(before)` | PASS |
| C4 | after a round with P1 lent to X and P2 borrowed from Y: user's `lastRound.salaries` = its `players` sum (with P2, without P1); X's includes P1 | «salário de quem está emprestado» ✓; fails on a3a30b5 | `src/engine/market.test.ts:1575` `expect(x.id).not.toBe(me.id)`; `:1576` user players `toContain(q.id)`; `:1580` `expect(user(after).finance.lastRound!.salaries).toBe(wagesMe)`; `:1581` `expect(anyClub(after, x.id).finance.lastRound!.salaries).toBe(wagesX)`. `wagesMe`/`wagesX` = test-side `payroll` sum (`:1472`) over the clubs holding the players | PASS |
| C5 | `loanFee`: 65/20 (1.290.000) -> 260.000; 61/25 (730.000) -> 150.000; 62/20 (1.000.000) -> 200.000; 40/35 (30.000) -> 10.000 | «taxa do empréstimo» ✓; fails on a3a30b5 | `src/engine/market.test.ts:1599-1602` rows `[65, 20, 1_290_000, 260_000]`, `[61, 25, 730_000, 150_000]`, `[62, 20, 1_000_000, 200_000]`, `[40, 35, 30_000, 10_000]`; `:1605` `expect(valueOf(rating, age)).toBe(value)` (`valueOf` written out, `:398`); `:1606` `expect(loanFee({ rating, age })).toBe(fee)`. The «Settled mid-build» values are in checks.md since 1e2fcd4, before the test commit 20e638a | PASS |
| C6 | `loanIn` of a reserve in the owner's saved lineup: user cash − fee, pendingOut + fee; owner cash + fee, pendingIn + fee; out of owner's `players` and `lineup.starters`; in user's `players` with `loanFrom` = owner, not in user lineup | «pegar emprestado traz o jogador» ✓; fails on a3a30b5 | `src/engine/market.test.ts:1614` `owner.lineup.starters[5] = q.id`; `:1621` `toBe(cash - fee)`; `:1622` `toBe(out + fee)`; `:1623` `toBe(ownerCash + fee)`; `:1624` `toBe(ownerIn + fee)`; `:1625` owner players `not.toContain(q.id)`; `:1626` `expect(from.lineup!.starters).not.toContain(q.id)`; `:1627` `toEqual({ ...q, loanFrom: owner.id })`; `:1628` user lineup `not.toContain(q.id)` | PASS |
| C7 | `loanIn` refusals, game unchanged: `closed`, `not_found`, `starter`, `on_loan`, `squad_full` (29 + 1 lent), `seller_min` (owner 18), `cash` (fee − 1) | «recusas ao pegar emprestado» ✓; fails on a3a30b5 | `src/engine/market.test.ts:1634-1652` seven rows: `"closed"`, `"not_found"`, `"starter"`, `"on_loan"`, `"squad_full"` (`:1645` `toHaveLength(28)` then pad to 29 with one at `clubs[9]` carrying `loanFrom: me.id`), `"seller_min"` (`slice(0, 18)`), `"cash"` (`loanFee(q) - 1`); `:1658` `expect(loanIn(w.s, id), name).toEqual({ ok: false, reason })`; `:1659` JSON unchanged | PASS |
| C8 | 29 + 1 lent: `buyPlayer`, `signFreeAgent`, `promoteJunior` -> `"squad_full"` | «limite de 30 conta os emprestados» ✓; fails on a3a30b5 at `:1688` (`buy` ok) | `src/engine/market.test.ts:1688` `for (const [name, act] of Object.entries(actions)) expect(act(), name).toEqual({ ok: false, reason: "squad_full" })` over `buy`/`sign`/`promote` (`:1679-1681`). Code: `src/engine/market.ts:161` | PASS |
| C9 | 29 and none lent: the three still accept (declared L-030 pinning) | «limite de 30 sem emprestados» ✓; passes on a3a30b5 (declared) | `src/engine/market.test.ts:1694` `expect(act().ok, name).toBe(true)` over the same three actions with `full(0)` | PASS |
| C10 | a `loanFrom` player: `toggleForSale`, `releasePlayer`, `renewContract` (contract 1) -> `"on_loan"`; `buyPlayer` above asking at an AI club -> `"on_loan"` | «emprestado não se negocia» ✓; fails on a3a30b5 | `src/engine/market.test.ts:1704` «à venda» `toEqual({ ok: false, reason: "on_loan" })`; `:1705` «dispensa»; `:1706` «renovação» (contract set to 1 at `:1703`); `:1710` `expect(buyPlayer(s, away.id, 100_000_000), "compra").toEqual({ ok: false, reason: "on_loan" })` | PASS |
| C11 | `closeRoundMarket` never moves a `loanFrom` player: purchase (only candidates on loan, 40 seeds) none; sale from the red sells another; release after purchase releases another | «IA respeita o empréstimo» ✓; fails on a3a30b5 (`compra: expected 800 to be +0`) | `src/engine/market.test.ts:1731` `expect(bought, "compra").toBe(0)` over seeds 1-40; `:1739` star still at the seller; `:1742` `expect(sold.map((t) => t.playerId), "venda").not.toContain(star.id)` after `:1741` `sold.length > 0`; `:1754` `toContain(bench[0]!.id)` (the loaned weakest stays); `:1755` `not.toContain(bench[1]!.id)` (the next one goes) | PASS |
| C12 | top 5 by value on loan to the user, 40 seeds: no AI offer for them; at least one for another | «sem proposta por emprestado» ✓; fails on a3a30b5 (`semente 3`) | `src/engine/market.test.ts:1769` `` expect(s.market.offers.filter((o) => ids.has(o.playerId)), `semente ${seed}`).toEqual([]) ``; `:1772` `expect(others).toBeGreaterThan(0)` | PASS |
| C13 | at the turn: P1 back to the user without `loanFrom`, age 21, contract 2, out of X's players and lineup; P2 back to Y without `loanFrom`, out of the user's players and lineup; nobody on loan | «virada devolve os emprestados» ✓; fails on a3a30b5 at `:718` | `src/engine/rollover.test.ts:705` P1 in X's lineup before; `:719` `expect(back).not.toHaveProperty("loanFrom")`; `:720` `toMatchObject({ age: 21, contractSeasons: 2 })`; `:721-722` not in X's players / lineup; `:724-725` P2 at Y without `loanFrom`; `:726-727` not in the user's players / lineup; `:728` `filter((p) => p.loanFrom !== undefined)).toEqual([])`. Code: `src/engine/rollover.ts:189` `endLoans(state)` before ageing | PASS |
| C14 | report has P1's row with «Antes» = start-of-season rating; no row for P2 | «quem volta entra no relatório» ✓; fails on a3a30b5 (`expected undefined to be 94`) | `src/engine/rollover.test.ts:736` `expect(report.changes.find((c) => c.playerId === p1.id)?.before).toBe(start)` (`start` re-derived from `ratingLog` at `:734`); `:737` `not.toContain(p2.id)` | PASS |
| C15 | user moves A -> B mid-season (`takeJob`); P1 stays at X with `loanFrom` = A; at the turn P1 in A, not B | «troca de clube mantém o empréstimo» ✓; fails on a3a30b5 at `:770` | `src/engine/rollover.test.ts:761` `expect(s.userClubId).toBe(b.id)`; `:762` `?.loanFrom).toBe(a.id)`; `:770` `expect(clubOf(state, a.id).players.map((p) => p.id)).toContain(p1.id)`; `:771` B `not.toContain(p1.id)` | PASS |
| C16 | two `loanFrom` players survive `saveGame`/`loadGame` and `encodeSaveFile`/`decodeSaveFile` | both proofs ✓; **both pass on a3a30b5** (Finding 2) | `src/engine/saveFile.test.ts:181` `expect(r).toEqual({ kind: "ok", state: g })`; `:184` `expect(loaned.map((p) => [p.id, p.loanFrom]).sort()).toEqual([[out.id, me.id], [inn.id, x.id]].sort())`; `src/persistence/save.test.ts:312` `expect(await loadGame()).toEqual({ kind: "ok", state })` with the two loans set at `:306-309` | PASS |
| C17 | Squad from IndexedDB, market open: every own row has «Emprestar <nome>»; a borrowed row shows «Emprestado» and lacks «À venda», «Dispensar», «Emprestar», «Renovar» (contract 1); market closed: no «Emprestar» | both tests ✓; the open-market test fails on a3a30b5 at `:631`, the closed-market one passes there (Finding 3) | `src/ui/Squad.test.tsx:631` `` within(rowOf(p.name)).getByRole("button", { name: `Emprestar ${p.name}` }) `` for every own row (opened through `saveGame` + «Continuar», `:609-613`); `:634` `toHaveTextContent("Emprestado")`; `:635` `` queryByLabelText(`À venda: ${borrowed.name}`) `` absent; `:637` Dispensar/Emprestar/Renovar absent (contract 1 at `:627`); `:646` `expect(screen.queryAllByRole("button", { name: /^Emprestar / })).toHaveLength(0)`. Code: `src/ui/Squad.tsx:279-291` | PASS |
| C18 | «Emprestar» opens «Confirmar empréstimo» with the exact text naming the door-2 club, focus on «Confirmar», player still there; «Cancelar» changes nothing; «Confirmar» removes the row and IndexedDB holds the player at the destination with `loanFrom` = user | «emprestar com confirmação» ✓; fails on a3a30b5 | `src/ui/Squad.test.tsx:661` `` toHaveTextContent(`Emprestar ${player.name} para ${dest.name} até o fim da temporada? O salário fica com o clube que o recebe.`) `` (dest = `leagues[1].clubs[11]`, neither first nor smallest id); `:662` `document.activeElement` is «Confirmar»; `:663` row present; `:667` `expect(useGame.getState().game).toBe(before)` after «Cancelar»; `:670` row gone; `:675` `loadGame()` -> `?.loanFrom).toBe(club.id)` | PASS |
| C19 | refusals in the bar, no confirmation: no destination -> «Nenhum clube quer esse jogador agora»; last year -> «Renove o contrato antes de emprestar»; squad 18 -> «Elenco no mínimo (18)» | «recusas do emprestar na tela» ✓; fails on a3a30b5 | `src/ui/Squad.test.tsx:689`, `:699`, `:709` the three exact texts; `:720` `expect(screen.getByRole("status"), name).toHaveTextContent(text)`; `:721` no «Confirmar empréstimo»; `:722` `expect(useGame.getState().game, name).toBe(game)`. Mapping: `src/store.ts:141-144` and `:114-115` | PASS |
| C20 | «Pegar emprestado (<taxa>)» on a reserve; tapping adds him to the squad with «Emprestado», lowers «Caixa» by the fee and saves; cash < fee -> «Caixa insuficiente», nothing changes | both tests ✓ in the batch and in the file rerun; fails on a3a30b5; failed once in the full suite as a cascade of the «oferta inválida» timeout (Finding 1) | `src/ui/Market.test.tsx:391` `` getByRole("button", { name: `Pegar emprestado (${brl(fee(target))})` }) `` (fee written out at `:380`, value at `:17`); `:394` `?.loanFrom).toBe(owner.id)`; `:395` `toBe(cash - fee(target))`; `:396` `` getByText(`Caixa ${brl(cash - fee(target))}`) ``; `:398` `loadGame()` holds the loan; `:403` the Squad row `toHaveTextContent("Emprestado")`; `:415` `toHaveTextContent("Caixa insuficiente")`; `:416` `expect(useGame.getState().game).toBe(game)` | PASS |
| C21 | Negociação: a starter shows «Titular: o clube não empresta», no «Pegar emprestado»; a `loanFrom` player shows «Emprestado: não pode ser negociado», no «Oferta», «Fazer proposta» or «Pegar emprestado» | «negociação de titular e de emprestado» ✓; fails on a3a30b5 at `:429` | `src/ui/Market.test.tsx:429` `toHaveTextContent("Titular: o clube não empresta")`; `:430` no `/^Pegar emprestado/`; `:433` `toHaveTextContent("Emprestado: não pode ser negociado")`; `:434` `queryByLabelText("Oferta")` absent; `:435` «Fazer proposta» absent; `:436` «Pegar emprestado» absent | PASS |
| C22 | «Emprestados (2)» with «Emprestados por você» row (name, pos, rating, club where he plays) and «Emprestados a você» row (name, pos, rating, owner); none -> «Emprestados (0)» and «Nenhum» twice | «aba emprestados» ✓; fails on a3a30b5 at `:451` | `src/ui/Market.test.tsx:451` tab «Emprestados (2)»; `:455` `expect(cells("Emprestados por você")).toEqual([[p1.name, pos[p1.position], String(p1.rating), x.name]])`; `:456` `... ("Emprestados a você")).toEqual([[p2.name, ..., y.name]])`; `:461` tab «Emprestados (0)»; `:462` `expect(screen.getAllByText("Nenhum")).toHaveLength(2)` | PASS |
| C23 | `check:layout` seed 1 exits 0, 21 screens incl. `squadLoan` (confirmation open, «Emprestar» in rows) and `marketLoans` (one row per list); last line «layout: as 21 telas cabem em 400 × 700 px» | `npm run check:layout` exit 0 (Proof run item 6) | `scripts/layout-check.mjs:177-180` `squadLoan` fails `"sem a confirmação de empréstimo"` with no `alertdialog` or when it is not `within` 400 × 700; `:181` `marketLoans` fails unless `m.loanLists.length === 2` (both tables present); `:193-200` `LEND` clicks `button[aria-label^='Emprestar ']` until «Confirmar empréstimo» opens (so the row buttons exist); `:498` / `:507` the two measures; `:528` both in the required list; `:547` `"layout: as 21 telas cabem em 400 × 700 px"`. Run: `ok    squadLoan ...`, `ok    marketLoans ...`, last line as claimed | PASS |

## Swept existing

Verified at `bd82792`.

- **concurrency** (store write queue): present. `src/store.ts:312-313` reads `const write = get().writeQueue.then(() => saveGame(game, slot)); set({ writeQueue: write.catch(() => undefined) })`. `loanOut` and `loanIn` go through it via `commit` at `src/store.ts:731-732` (`commit((g) => market.loanOut(g, playerId))`). `commit` calls `persist` at `:391`, the same path `buyPlayer` uses.
- **dependency failure** (failed write): present. `src/store.ts:318-319` is `catch { set({ saveStatus: "failed" }); return; }` inside `persist`, so a failed loan write shows the existing notice.

## Coverage

Not a gate step under `light`. I did not recompute the coverage rows. I read each member against the assertions cited above, and every set in `checks.md`'s Coverage table has a proof row that asserts its member. One member, the AI escalation in AC 9, is proven only one level below the match (Finding 4).

## Faults injected

Not run under `light`. The pre-feature run (Proof run item 3) is the only discrimination evidence: 21 of 25 proofs fail on a3a30b5.

## Findings

All non-blocking. Each check has a located assertion that targets its check-defined value.

1. **Minor, gate noise that now reaches a feature proof.** In the full suite, the known «oferta inválida» timeout (`src/ui/Market.test.tsx:346`) also failed C20's `pegar emprestado na negociação`, which showed «Pegar emprestado (R$ 60.000)» not found over an empty `<body />`. The timed-out test loops over its cases and calls `cleanup()` at `src/ui/Market.test.tsx:372`. Vitest does not cancel the body on timeout, so it keeps running and unmounts the next test's render. Before this feature, the next test was outside the file's loan block. The new describe at `:378` now sits right after it. C20 passed in the named batch and in the file rerun (22/22), so this is not a product defect. But every future full run that hits the flake will now report a red feature proof. Fixing the flake or giving it a longer timeout is the cure, and neither `Market.tsx` nor that test changed for the flake in this diff.
2. **Minor, precision of the L-029/L-030 declaration (C16).** `checks.md` declares only C9 as pinning existing behaviour. Both C16 proofs, `src/engine/saveFile.test.ts:172` and `src/persistence/save.test.ts:303`, also pass on a3a30b5. This is correct behaviour, not a weak proof. Door 1 is an optional field in a JSON document, and neither the IndexedDB round trip nor `decodeSaveFile` strips unknown player fields, so no pre-feature failure exists to reproduce. The proofs pin the door from now on. The declaration should have listed C16 too.
3. **Minor, the closed-market half of C17 has no positive control.** `src/ui/Squad.test.tsx:646` asserts zero «Emprestar» buttons after `seededGame(4, 2, 5)`. It does not assert that the market is closed or that any roster row rendered, and it passes on a3a30b5, where no such button existed. The open-market test, which uses the same component and default tab, shows that rows render, so in practice the assertion is not vacuous. C17 as a whole still fails on the pre-feature code at `:631`.
4. **Minor, level gap on AC 9 (the receiving club fields him).** C1 asserts `aiLineup(there).starters` contains P (`src/engine/market.test.ts:1494`), and C4 covers the salary half. No check plays a match and sees P on X's side. The code path is direct: every non-user club takes its eleven from `aiLineup` at match time (`src/engine/live.ts:545`, `const lineup = isUser && club.lineup ? club.lineup : aiLineup(club, competition);`). The receiving club's stored `lineup` is never consulted, so the gap is small.
5. **Cosmetic, AC 22 column headers unasserted (L-002).** Both lists render the header «Clube» (`src/ui/Market.tsx:76`). AC 22 describes the fourth column as «Clube onde joga» or «Clube dono», which reads as describing content rather than prescribing a header. C22 checks body cells only (`.slice(1)` at `src/ui/Market.test.tsx:453`), so no proof decides the header text either way. AC 1's glyph «⇄» (`src/ui/Squad.tsx:291`) is likewise unasserted. Its `aria-label` is asserted.
6. **Cosmetic, C1 wording.** The claim calls P «um reserva do usuário», but the fixture asserts P is in the user's `lineup.starters` (`src/engine/market.test.ts:1479`). The check needs that to prove «fora de `lineup.starters`», so the test is stronger than the wording.

**Plan ACs that no check decides, read in the code.**

- **AC 9:** see Finding 4.
- **AC 21:** C15 proves that a lent player keeps `loanFrom` across `takeJob` and returns to A. A player the user had borrowed while at A stays at A (now an AI club) with `loanFrom` = the owner. This matches «manter os empréstimos como estão», and `endLoans` (`src/engine/market.ts:399-407`) returns him at the turn.
- **AC 14 and AC 15:** the texts «Elenco cheio (30)» and «O clube não vende: elenco no mínimo» reuse existing mappings (`src/store.ts:110-113`). Their engine reasons are proven in C7 and C8, and no UI proof renders them for a loan. They were not new texts, so this is not a finding.
- **`endLoans` fallback:** if an owner id is missing, `endLoans` keeps the player where he is (`(owner ?? club)`, `src/engine/market.ts:404`). Clubs never disappear in this game, so the branch is unreachable today.

## Gate

- Named-proof batch: 25 passed, 0 failed, 6 files (23 names); all proofs belong to this feature's diff.
- Pre-feature batch at a3a30b5 (scratch, HEAD tests): 21 failed, 4 passed (C9 declared; C16 ×2 and C17's closed-market half, Findings 2-3).
- `npx vitest run`: 664 passed, 2 failed («oferta inválida» timeout and its cascade into C20, Finding 1). The rerun of `src/ui/Market.test.tsx` gave 22 passed, 0 failed.
- `npx tsc -b --noEmit`: exit 0. `npm run lint`: exit 0.
- `npm run check:layout`: exit 0, `layout: as 21 telas cabem em 400 × 700 px`.
