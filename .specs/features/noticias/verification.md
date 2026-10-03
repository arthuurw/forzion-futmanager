# Caixa de notícias verification

**Verdict**: PASS
**Profile**: light
**Diff range**: 98a1911..6992c12 (plan, checks and AD-028 in 40d223a; engine in 21fa8ca; screens in 34efd58; `check:layout` in 6992c12); proofs run at HEAD 6992c12
**Round**: 1 - full
**Verifier**: independent sub-agent (author != verifier)

All 16 checks are proven with located evidence. The 16 named Vitest proofs passed at 6992c12 in one invocation, each with its own ✓ line. I also ran the superseded History tab test. `npm run check:layout` exited 0 with «layout: as 23 telas cabem em 400 × 700 px», and its `roundNews` and `historyNews` lines both read `ok`. `tsc` and `lint` are clean. The full suite has 1 failure: the proof-check guard, whose 8 orphans all come from the concurrent `dificuldade` checks file. None comes from this feature.

I ran the HEAD tests against the pre-feature code at 98a1911:

- 14 of the 16 checks' proofs fail there.
- C11, C14 and C15 fail on a real assertion or a missing tab.
- C1-C10 and C13 fail because `./news` and `./newsText` do not exist yet. I accept this as pre-feature evidence, because the function each of those checks names does not exist there.
- **C12's two proofs pass on 98a1911.** The save and file round trip already carried any field unchanged. `checks.md` says in «Lições aplicadas» that no proof here pins old behaviour (L-030), and that is wrong for C12 (Finding 1). C12's claim still holds at HEAD, and its assertion targets the claim, so the row passes. Its proofs guard against a regression. They do not show new behaviour.

## Binding sources

None. The plan's `## Sources` lists the author's request and some STATE ADs (AD-004, AD-010, AD-019, AD-024) as context, and marks nothing as binding. Step 1 runs only under `ui`, and this feature is `light`.

## Proof run

Verified at `6992c12`.

**Tree state.** Before the run, I recorded `git status --porcelain -- . ':!.specs/features/dificuldade'`, and it was empty. After the last step it was still empty, apart from this report. The only file I wrote in the real tree is this report.

**Scratch worktree.** The pre-feature comparison ran in a separate scratch worktree at `98a1911`. It had its own `npm ci`: 151 entries, a real directory, no junction. I removed it afterwards with `git worktree remove --force` and `git worktree prune`. `git worktree list` then showed only the main tree. The real `node_modules` was intact, with 151 entries and `node_modules/.bin/vitest` present. After `check:layout`, nothing was listening on port 4179; only `TIME_WAIT` sockets were left.

1. **Named proofs, one invocation.** I ran this command:

   ```
   npx vitest run src/engine/news.test.ts src/store.test.ts src/engine/saveFile.test.ts src/persistence/save.test.ts src/ui/newsText.test.ts src/ui/Round.test.tsx src/ui/History.test.tsx -t "notícia de lesão|notícia de suspensão|notícia de força|notícia de proposta|notícia da diretoria e de emprego|notícia de transferência|notícia de copa|ordem das notícias|guarda as 60 mais novas|fechamento guarda as notícias|notícias ao vivo e na reabertura|notícias atravessam o arquivo|notícias atravessam o save|texto das notícias|notícias da data|aba notícias|artilharia top 10" --reporter=verbose
   ```

   It exited 0 over 7 files: **17 passed**, 88 skipped. That is the 16 proof names plus the superseded `artilharia top 10`. Each name matched exactly one test. «texto das notícias» is also the name of its describe block, but that block holds one test. Each test printed its own ✓ line:
   - `src/engine/news.test.ts > notícias de uma data (noticias) > notícia de lesão` ✓ (C1)
   - `... > notícia de suspensão` ✓ (C2)
   - `... > notícia de força` ✓ (C3)
   - `... > notícia de proposta` ✓ (C4)
   - `... > notícia da diretoria e de emprego` ✓ (C5)
   - `... > notícia de transferência` ✓ (C6)
   - `... > notícia de copa` ✓ (C7)
   - `... > ordem das notícias` ✓ (C8)
   - `... > guarda as 60 mais novas` ✓ (C9)
   - `... > fechamento guarda as notícias` ✓ (C10)
   - `src/store.test.ts > notícias pela store (noticias) > notícias ao vivo e na reabertura` ✓ (C11)
   - `src/engine/saveFile.test.ts > notícias no arquivo (noticias) > notícias atravessam o arquivo` ✓ (C12)
   - `src/persistence/save.test.ts > notícias no save (noticias) > notícias atravessam o save` ✓ (C12)
   - `src/ui/newsText.test.ts > texto das notícias (noticias) > texto das notícias` ✓ (C13)
   - `src/ui/Round.test.tsx > notícias na Rodada (noticias) > notícias da data` ✓ (C14)
   - `src/ui/History.test.tsx > notícias no Histórico (noticias) > aba notícias` ✓ (C15)
   - `src/ui/History.test.tsx > tela Histórico > artilharia top 10` ✓ (superseded check)
2. **Existence and diff membership.** I located each test:
   - `src/engine/news.test.ts:26`, `:35`, `:56`, `:65`, `:81`, `:109`, `:128`, `:166`, `:191` and `:210`
   - `src/store.test.ts:1083`
   - `src/engine/saveFile.test.ts:189`
   - `src/persistence/save.test.ts:317`
   - `src/ui/newsText.test.ts:9`
   - `src/ui/Round.test.tsx:347`
   - `src/ui/History.test.tsx:286`

   `news.test.ts` and `newsText.test.ts` are new in the range. Each of the other five files gained a new describe block tagged `(noticias)`. Every proof is added in this range, and no proof resolves to a test the feature did not touch.
3. **Superseded check.** `src/ui/History.test.tsx:31` changed from `["Artilharia", "Estatísticas", "Campeões", "Carreira"]` to `["Artilharia", "Estatísticas", "Campeões", "Carreira", "Notícias"]`. The list only gained `"Notícias"` at the end. No earlier item was removed or reordered, and that line is the only one the diff changes in the test besides its comment.
4. **`npm run check:layout` (C16).** I ran it alone. Exit 0 at 400 × 700 with `seed 1`. The run printed 24 `ok` lines: the 23 required screens plus `roundOffer`. Two of them were `ok    roundNews  scrollHeight 700 scrollWidth 400` and `ok    historyNews scrollHeight 700 scrollWidth 400`. The last line was `layout: as 23 telas cabem em 400 × 700 px`.
5. **Full suite**, `npx vitest run`: exit 1, 54 files, **689 passed, 1 failed** (690), 193 s.
   - `src/launch.test.ts > guardas e metadados (correcoes-validacao) > provas dos checks existem` failed with 8 orphans. I ran `node scripts/proof-check.mjs --json`: 750 selectors and 8 orphans, all with `feature: "dificuldade"` (for example `src/ui/ChooseClub.test.tsx` «campo dificuldade»). They come from the untracked `.specs/features/dificuldade/checks.md`, which another agent is writing at the same time. None of them is from noticias, so every noticias selector resolves.
   - The known flaky `app.test.tsx` «fim da rodada ao vivo grava e mostra resultados» passed this time, with no timeout.
6. **Types, lint, purity.**
   - `npx tsc -b --noEmit`: exit 0.
   - `npm run lint`: exit 0.
   - `src/engine/news.ts` imports only `./types`. It has no `Math.random`, React, zustand or idb (AD-002).
   - The save stays v8, as the pre-existing `src/engine/generate.test.ts:204` `expect(SCHEMA_VERSION).toBe(8)` shows. It is green in the full suite. The diff does not touch `saveFile.ts`, `persistence/save.ts` or the migrations.
7. **Pre-feature comparison at 98a1911 (L-029/L-030).** I created a scratch worktree at `98a1911` and copied in the seven HEAD test files. After `npm ci`, I ran the same named batch: exit 1, **5 files failed, 4 tests failed, 2 passed**.
   - **Missing modules.** `news.test.ts` (`Cannot find module './news'`) and `newsText.test.ts` (`Cannot find module './newsText'`) fail at import. That covers C1-C10 and C13. I accept this as pre-feature evidence: the module each check names does not exist there.
   - **C11 fails on a real assertion**: `expected 0 to be greater than 0` at `src/store.test.ts:1089`. The engine makes no news there.
   - **C14 fails** with `Unable to find an accessible element with the role "tab" and name "Notícias (2)"`.
   - **C15 fails** with `... role "tab" and name "Notícias"`.
   - **The superseded `artilharia top 10` fails** with `expected [ 'Artilharia', 'Estatísticas', …(2) ] to deeply equal [ … …(3) ]`.
   - **C12 does not fail.** `notícias atravessam o arquivo` ✓ and `notícias atravessam o save` ✓ both pass on the pre-feature code (Finding 1).

## Checks

Verified at `6992c12`.

| Check | Claim | Proof run | Evidence | Result |
| --- | --- | --- | --- | --- |
| C1 | `dateNews` with A `injuryRounds` 0 → 3 and B 2 → 1 returns only `{ kind: "injury", playerName: A, rounds: 3 }` with the date's `season` and `date` | «notícia de lesão» ✓; fails on 98a1911 (missing module) | `src/engine/news.test.ts:29-31` set A to 3, and B from 2 to 1 (precondition, L-018); `:32` `expect(dateNews(before, after, ROUND7)).toEqual([item(after, ROUND7, { kind: "injury", playerName: me.players[3]!.name, rounds: 3 })])`, where `item` at `:23` builds `{ season: after.season, date, ...rest }`. The single-element `toEqual` excludes B. Code: `src/engine/news.ts:33` | PASS |
| C2 | table: league `suspendedRounds` 0 → 2 gives `suspension` with rounds 2 and no `cupId`; `cupDiscipline["cup-nat"]` 0 → 1 gives rounds 1 with `cupId: "cup-nat"`; 1 → 0 gives no news | «notícia de suspensão» ✓; fails on 98a1911 | `src/engine/news.test.ts:40` «liga» `toEqual([item(after, ROUND7, { kind: "suspension", playerName: ..., rounds: 2 })])`, where `toEqual` refuses an extra `cupId` key; `:46` «copa» `toEqual([item(after, cupDate, { kind: "suspension", ..., rounds: 1, cupId: "cup-nat" })])`; `:50-52` «cumprida», with `was` 1 and `me` 0, gives `toEqual([])` | PASS |
| C3 | round 7, A's `ratingLog` gains `{ round: 7, delta: 1 }` with rating 71, and B already had `{ round: 6, delta: -1 }`, gives only `{ kind: "rating", playerName: A, rating: 71, delta: 1 }` | «notícia de força» ✓; fails on 98a1911 | `src/engine/news.test.ts:59` A `{ rating: 71, ratingLog: [{ round: 7, delta: 1 }] }`; `:60-61` B `{ round: 6, delta: -1 }` before and after; `:62` `toEqual([item(after, ROUND7, { kind: "rating", playerName: me.players[2]!.name, rating: 71, delta: 1 })])` | PASS |
| C4 | two AI offers (X 1,200,000 for A; Y 800,000 for B) give two `offer` items with `clubId`, `amount` and `playerName`; a cup date with the same offers still listed gives no `offer` | «notícia de proposta» ✓; fails on 98a1911 | `src/engine/news.test.ts:69-72` the two offers; `:73-76` `toEqual([item(... { kind: "offer", playerName: me.players[1]!.name, clubId: x.id, amount: 1_200_000 }), item(... { kind: "offer", playerName: me.players[8]!.name, clubId: y.id, amount: 800_000 })])`; `:78` «data de copa» `toEqual([])`, with the offers still in `after.market.offers` (`cupBefore = clone(after)`, `:77`). Code: `src/engine/news.ts:54` `if (date.kind === "league")` | PASS |
| C5 | table: `boardWarnings` 1 → 2 gives `{ kind: "board", warnings: 2 }`; 2 → 2 gives none; a new `pendingJob` offer `[X, Y]` gives `{ kind: "job", clubIds: [X, Y] }`; the same job already there gives none | «notícia da diretoria e de emprego» ✓; fails on 98a1911 | `src/engine/news.test.ts:87` «aviso novo» `toEqual([item(after, ROUND7, { kind: "board", warnings: 2 })])`; `:93` «aviso igual» `toEqual([])`; `:99` «proposta nova» `toEqual([item(after, ROUND7, { kind: "job", clubIds: ids(after) })])`, where `ids` is 2 clubs (`:95`); `:103-105` «proposta antiga», with the job present before and after, gives `toEqual([])` | PASS |
| C6 | round 12 with 5 `market.transfers` rows: `transfer` only for the 2 round-12 buys with a side in the division; none for a buy between two other-division clubs, a round-11 buy, or a round-12 `free` | «notícia de transferência» ✓; fails on 98a1911 | `src/engine/news.test.ts:116-120` the 5 rows: another division (league 1 to league 1), buyer in the division, round 11, `free`, and seller in the division; `:122-125` `toEqual([item(... { kind: "transfer", playerName: "Dois", ... amount: 200_000 }), item(... { kind: "transfer", playerName: "Cinco", ... amount: 500_000 })])`. The included rows are not first in the list (L-018) | PASS |
| C7 | cup date table: win in phase 2 of 6 gives `advanced` with `phase: 2` and `opponentId`; win in the last phase gives `champion`; loss gives `out` with the opponent; a date without the user's tie gives no `cup` | «notícia de copa» ✓; fails on 98a1911 | `src/engine/news.test.ts:147` `expect(last).toBe(5)` (6 phases); `:150` «classificado» `toEqual([item(... { kind: "cup", cupId: "cup-nat", phase: 2, result: "advanced", opponentId: r.x })])`; `:154` «campeão» `result: "champion"`, with the user away (`tie(x, me, me)`); `:158` «eliminado» `result: "out", opponentId: r.x`; `:162` «sem confronto do usuário» `toEqual([])`. Another tie sits first in the phase in every row (`:142`) | PASS |
| C8 | a league round with injury, suspension, rating, offer, warning, job and transfer gives them in that order; a cup date with result, injury and suspension gives cup, injury, suspension | «ordem das notícias» ✓; fails on 98a1911 | `src/engine/news.test.ts:172-178` the fixture, written in reverse kind order; `:179` `.map((n) => n.kind)).toEqual(["injury", "suspension", "rating", "offer", "board", "job", "transfer"])`; `:187` `.toEqual(["cup", "injury", "suspension"])` | PASS |
| C9 | `appendNews` with 58 kept and 5 new leaves 60: the 3 oldest go and the 5 new end the list; `dateNews` with no user club gives `[]` even with offers and injuries | «guarda as 60 mais novas» ✓; fails on 98a1911 | `src/engine/news.test.ts:198` `toHaveLength(60)`; `:199` rounds `toEqual(Array.from({ length: 60 }, (_, i) => i + 4))`, so rounds 1-3 are gone and 59-63 are last; `:204` `toHaveLength(2)` with the user club (precondition, L-031); `:207` with `userClubId = null`, `toEqual([])`. Code: `src/engine/news.ts:79` `.slice(-NEWS_LIMIT)`, `:4` `NEWS_LIMIT = 60` | PASS |
| C10 | engine `playRound`, on the first round with news, keeps at the end of `news` exactly what `dateNews` returns for the date; a cup date with the user played through `playDate` keeps its `cup` item | «fechamento guarda as notícias» ✓; fails on 98a1911 | `src/engine/news.test.ts:221` `expect(kept.slice(kept.length - expected.length)).toEqual(expected)`; `:222` `expect(kept.length - (s.news ?? []).length).toBe(expected.length)`; `:226` `expect(found).toBe(true)`; `:234` `expect(out.cup).toBeDefined()`; `:236` `cupNews` `toHaveLength(1)`; `:237` `toMatchObject({ kind: "cup", cupId: "cup-nat", phase: 0 })`. The oracle is `dateNews` itself, so this proves the wiring (`src/engine/season.ts:105`, `src/engine/cup.ts:329`), not the content | PASS |
| C11 | through the store, the same date gives the same news live to the end (`playRound` + `skipToEnd`) and reopened with the date pending (AD-019), equal to engine `playDate` | «notícias ao vivo e na reabertura» ✓; fails on 98a1911 at `:1089` (real assertion) | `src/store.test.ts:1086` `engine = playDate(game).state.news`; `:1089` `expect(engine.length).toBeGreaterThan(before)` (precondition); `:1100` after live and `skipToEnd`, `expect(useGame.getState().game!.news).toEqual(engine)`; `:1103` `saveGame({ ...game, pendingLive: true })` then `init()`; `:1106` `expect(useGame.getState().game!.news).toEqual(engine)`. The date is a league round only (Finding 2) | PASS |
| C12 | `encodeSaveFile`/`decodeSaveFile` and `saveGame`/`loadGame` return the game with `news` unchanged | «notícias atravessam o arquivo» ✓, «notícias atravessam o save» ✓; **both also pass on 98a1911** | `src/engine/saveFile.test.ts:192-195` `g.news` with a league `offer` and a cup `cup` item; `:198` `expect(r).toEqual({ kind: "ok", state: g })`; `src/persistence/save.test.ts:321` `state.news` with `injury` and `job`; `:323` `expect(await loadGame()).toEqual({ kind: "ok", state })`. The claim holds at HEAD. The proofs pin behaviour that already existed (Finding 1) | PASS |
| C13 | `newsText` table with the 14 exact AC 12 sentences | «texto das notícias» ✓; fails on 98a1911 (missing module) | `src/ui/newsText.test.ts:16-30`, the 14 literal rows, among them: `"Fulano se lesionou e fica fora por 1 rodada."`; `"Beltrano está suspenso por 1 rodada na Copa Nacional."`; `"Aviso da diretoria (2/3): a campanha está abaixo do aceitável."`; `` `${x.name} e ${y.name} querem contratar você.` ``; `` `${y.name} contratou Beltrano (${z.name}) por ${brl(800_000)}.` `` (`brl` written out, `:6`, L-004); `"Copa Nacional: classificado para Quartas."`; `"Copa Nacional: campeão!"`; `:32` `toHaveLength(14)`; `:33` `expect(newsText(item, game), name).toBe(text)` | PASS |
| C14 | the Round screen of a league round whose game keeps 2 items of that round and 3 of other dates (2 earlier rounds, the same round last season) shows «Notícias (2)» and only those 2 sentences in kept order; with none, «Notícias (0)» and «Nada de novo nesta data.» | «notícias da data» ✓; fails on 98a1911 (no tab «Notícias (2)») | `src/ui/Round.test.tsx:355-361` 5 items: last season's same round, round − 1, this round, round − 2, this round. `:364` `user.click(screen.getByRole("tab", { name: "Notícias (2)" }))`; `:366-369` `getAllByRole("listitem").map(...).toEqual(["Fulano se lesionou e fica fora por 3 rodadas.", `${x.name} oferece R$ 1.200.000 por Beltrano.`])`; `:374` tab «Notícias (0)»; `:375` `toHaveTextContent("Nada de novo nesta data.")`. A league date only (Finding 2) | PASS |
| C15 | the History «Notícias» tab lists newest first, each with «Temporada <n> · Rodada <r>» or «Temporada <n> · <copa> · <fase>» and the sentence; with none, «Nenhuma notícia ainda.» | «aba notícias» ✓; fails on 98a1911 (no tab «Notícias») | `src/ui/History.test.tsx:298-302` `toEqual([["Temporada 1 · Rodada 8", "Ciclano caiu para 70."], ["Temporada 1 · Copa Nacional · Preliminar", "Copa Nacional: classificado para 16 avos."], ["Temporada 1 · Rodada 3", "Fulano se lesionou e fica fora por 2 rodadas."]])`, the reverse of the kept order at `:290-294`; `:307` `toHaveTextContent("Nenhuma notícia ainda.")`. Tab order: `:31` | PASS |
| C16 | `check:layout` seed 1 exits 0 and measures 23 screens (the 21 plus `roundNews` with the «Notícias» tab open and at least one sentence, and `historyNews` with at least one row), each 400 × 700 with no scroll; last line «layout: as 23 telas cabem em 400 × 700 px» | `npm run check:layout` exit 0 (Proof run item 4) | `scripts/layout-check.mjs:201-205` `NEWS_TAB` finds a «Notícias (n)» tab with n > 0; `:430` waits for `[role=tabpanel][aria-label="Notícias"] li`, then `:431` `measure("roundNews")`; `:437` waits for `section[aria-label="Notícias"] li`, then `:438` `measure("historyNews")`; `:162` `scrollHeight > HEIGHT` is a problem; `:563` both in the required `screens` list, so a missing one is a failure; `:582` the final line. Run: `ok    roundNews  scrollHeight 700 scrollWidth 400`, `ok    historyNews scrollHeight 700 scrollWidth 400`. Phone width only (Finding 3) | PASS |

## Swept existing

Verified at `6992c12`.

One `Swept` row resolves to existing code: `concurrency`, «existing - a fila de gravação da store (`src/store.ts` `persist`) grava o jogo com `news` como grava o resto». The constraint is there:

- `src/store.ts:303` `async function persist(game, set, get)` chains every write on `get().writeQueue.then(() => saveGame(game, slot))` at `:312`.
- `src/persistence/save.ts:35` `db.put(STORE, { ...state, savedAt: Date.now() }, slotKey(slot))` writes the whole state, so `news` goes with the rest. The diff does not touch it.

The other rows cite new checks (C1-C7, C9, C11) or say `n/a`. One of them, `validation: n/a - nada vem do usuário`, overlooks the imported file (Finding 4).

## Coverage

Not a gate step under `light`. I did not recompute the coverage rows. I read each member against the assertions cited above, and every set in `checks.md`'s Coverage table has an assertion for each member. The table is honest about one thing: its «caminhos que fecham uma data (5)» row lists `playDate` of a cup only at the engine level (C10).

## Faults injected

Not run under `light`. The only discrimination evidence is the pre-feature run (Proof run item 7). 14 of the 16 checks' proofs fail on 98a1911. C12's two proofs do not.

## Findings

All non-blocking. Each check has a located assertion that targets its check-defined value.

**Level and sampling judgment.**

- **AC 1-9 (engine).** Proven at the `dateNews` level, table-driven, with L-018 distractors in every fixture (C1-C9). The wiring of both closings is proven at the engine level (C10).
- **AC 10 (same news on every path).** Proven through the store on a league date: live, then reopened (C11).
- **AC 11-13 (screens).** Proven at the component level against literal text (C13-C15).
- **AC 14 (fits).** Proven in Chrome at 400 × 700 (C16).

The gaps:

1. **Minor, C12 pins behaviour that already existed, and `checks.md` says no proof does.** `checks.md` «Lições aplicadas» claims «L-030 (nenhuma prova aqui prende comportamento antigo: todas leem `news`, que não existe antes)». On 98a1911 both C12 proofs pass. `decodeSaveFile` and `saveGame`/`loadGame` already round-trip any field unchanged (`src/engine/saveFile.ts:79-96`, `src/persistence/save.ts:35`), and the diff does not touch either file.
   - C12 is a valid regression guard for door 1, and its claim is true at HEAD.
   - But under L-030 it should have been declared as pinning existing behaviour. As written, the declaration is a precision gap in the checks, not a defect in the code.
2. **Minor, sampling gap: no news on a cup date through the store or on the Round screen.** C11 (`src/store.test.ts:1085`, `seededGame(12, 4, 2)` then `playRound`) is a league round, so the live and reopen paths through `finishCupDate` (`src/engine/cup.ts:329`) are proven only by the engine `playDate` in C10 (`src/engine/news.test.ts:233-237`). The Round screen's cup branch of the date filter (`src/ui/Round.tsx:49-51`, `n.date.kind === "cup" && n.date.cupId === cup.id && n.date.phase === cupDate.phase`) has no test. C14 renders only a league round.
   - A wrong `cupId` or phase match there would pass every proof.
   - `check:layout` measures the first round with news, which is a league round.
3. **Minor, the desktop 4-column Round layout has no proof.** The plan's Impact says «no desktop são 4 colunas em vez de 3». The only code is `src/styles.css:201` `grid-template-columns: ... minmax(0, 0.95fr)`. No check names it. `check:layout` runs only at 400 × 700, and no test looks at the wide layout. AC 14 asks only for 400 × 700, so this is a gap against the plan's prose, not against an AC. Whether 4 columns fit a common desktop width without crushing the result columns is unmeasured.
4. **Minor, an imported file's `news` is not shape-checked.** The plan's Surface says the exported file (AD-018) carries `news`, so `news` can come from the user through import. `checks.md` Swept says `validation: n/a - nada vem do usuário`. `hasGameShape` (`src/engine/saveFile.ts:53-67`) checks «the lists the screens walk», but not `news`. A hand-edited file with a non-array `news`, or an item without `date`, would decode `ok` and then throw. It would throw in `src/ui/Round.tsx:48` (`(game.news ?? []).filter`) or in `src/ui/History.tsx:113`, `newsDateLabel` reading `item.date.kind`. `career` has the same exposure today, so this follows precedent, but the Swept row's reason is inaccurate.
5. **Cosmetic, C10 proves wiring, not content, and its cup half is thin.** The league half's oracle is `dateNews(s, out.state, ...)` (`src/engine/news.test.ts:219`), computed with the true `before`. A closing that passed the wrong pair would mismatch on any round with a rating or injury item, so that half does discriminate. The content itself rests on C1-C9. The cup half asserts only `{ kind: "cup", cupId: "cup-nat", phase: 0 }` (`:237`), not `result` or `opponentId`. So a cup closing that computed the result wrongly is caught only by C7's unit table, never through `playDate`.
6. **Cosmetic, `roundNews` and `historyNews` have no screen-specific geometry rule.** `problems()` (`scripts/layout-check.mjs:160-195`) checks only page scroll and the sound toggles for these two screens. The lists are `ul.news.fill`, with `overflow: auto` (`src/styles.css:212-215`), so they scroll internally, as the repo's other lists do. Nothing asserts that the first sentence is inside the window, only that it exists in the DOM (`:430`, `:437`).
7. **Note, gate noise from concurrent work.** `provas dos checks existem` (`src/launch.test.ts`) fails with 8 orphans, all `feature: "dificuldade"`, from the untracked `.specs/features/dificuldade/checks.md`. This is not a defect of this feature. The `app.test.tsx` «fim da rodada ao vivo» timeout did not recur in this run.

## Gate

- Named-proof batch: 17 passed, 0 failed, 7 files: 16 proof names plus the superseded `artilharia top 10`. Every proof belongs to this feature's diff.
- Pre-feature batch at 98a1911 (scratch worktree, HEAD tests): 5 files failed, 4 tests failed, 2 passed.
  - C11, C14, C15 and the superseded tab test failed on real assertions or missing tabs.
  - C1-C10 and C13 failed because their modules are missing.
  - Both C12 proofs passed (Finding 1).
- `npm run check:layout`: exit 0, `layout: as 23 telas cabem em 400 × 700 px`.
- `npx vitest run`: 689 passed, 1 failed. The failure is `provas dos checks existem`, with 8 orphans, all from the concurrent `dificuldade` checks (Finding 7).
- `npx tsc -b --noEmit`: exit 0. `npm run lint`: exit 0.
