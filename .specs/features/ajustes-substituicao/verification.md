# Ajustes da substituição verification

**Verdict**: PASS
**Profile**: light
**Diff range**: 748d1ca..d39c6b0 (checks in d53b64a, code in 32d1bca and d39c6b0); proofs run at HEAD d39c6b0
**Round**: 1 - full
**Verifier**: independent sub-agent (author != verifier)

All 5 checks are proven with located evidence, and every named proof passed at d39c6b0. C1's claim that its test fails on 86e3475 is confirmed: I ran it there. The tests for C2, C3 and C4, and both superseded assertions, also fail on the pre-feature code 748d1ca. So every proof added here tells the fix apart from the code before it (L-029). The four points in the `## Intent` (round-2 Findings 1-3 of posicao-na-substituicao, plus round-1 Finding 4, which round 2 carried open) are closed. `check:layout` passed with `liveRed` measured. The full suite had one timeout in `Market.test.tsx`, which this diff does not touch (Finding 1). A rerun hit the known «oferta inválida» timeout.

## Binding sources

None. There is no `plan.md`. The `## Intent` in `checks.md` is the spec. Step 1 runs only under `ui`, and this feature is `light`.

## Proof run

Verified at `d39c6b0`. `git status --porcelain` of this worktree was empty before the run and after every step. The pre-fix runs happened in a separate scratch worktree, which was then removed.

1. **Named proofs, one invocation**: `npx vitest run src/ui/Live.test.tsx src/engine/live.test.ts -t "posição com sai lesionado|goleiro reserva só no gol|regra do goleiro grava o setor|preenchimento do gol grava o setor|IA repõe goleiro expulso|goleiro expulso: reserva entra no gol" --reporter=verbose` exited 0. It ran 2 files: **6 passed**, 71 skipped. Each test printed its own ✓ line:
   - `src/engine/live.test.ts > ajustes da substituição (ajustes-substituicao) > regra do goleiro grava o setor` ✓ (C3)
   - `... > preenchimento do gol grava o setor` ✓ (C4)
   - `src/engine/live.test.ts > partida coerente (correcoes-validacao) > IA repõe goleiro expulso` ✓ (superseded row 1)
   - `src/engine/live.test.ts > parada obrigatória (parada-obrigatoria) > goleiro expulso: reserva entra no gol` ✓ (superseded row 2)
   - `src/ui/Live.test.tsx > ajustes da substituição (ajustes-substituicao) > posição com sai lesionado` ✓ (C1)
   - `... > goleiro reserva só no gol` ✓ (C2)
2. **Existence** (`grep -n`): `src/ui/Live.test.tsx:815` («posição com sai lesionado»), `:830` («goleiro reserva só no gol»); `src/engine/live.test.ts:937` («regra do goleiro grava o setor»), `:955` («preenchimento do gol grava o setor»), `:505` («IA repõe goleiro expulso»), `:666` («goleiro expulso: reserva entra no gol»). The four new tests were added in `32d1bca`. The two superseded tests were edited there too (`:538`, `:679`).
3. **C1 on 86e3475 (the caller's request)**: I made a scratch worktree at `86e3475` and appended the `ajustes-substituicao` describe block from `d39c6b0:src/ui/Live.test.tsx` (lines 790 to the end). It ran with `-t "posição com sai lesionado|goleiro reserva só no gol"`. **C1 FAILS there**: `expected [ …(2) ] to deeply equal [ 'no lugar de Davi Brousfeão (MEI)' ]`, and the received list adds `"na vaga de Geovani Teialdo (ZAG, expulso)"`. That is exactly the red-slot option the claim says 86e3475 offered. C2 also fails there: the received list adds `"no lugar de Geovani Teialdo (ZAG)"`.
4. **The other proofs on the pre-feature code 748d1ca**: I moved the same scratch worktree to `748d1ca` and checked out both test files from `d39c6b0`. In the same 6-name batch, 5 failed and 1 passed:
   - C2 failed at `Live.test.tsx:841`, still offering «no lugar de».
   - C3 failed at `live.test.ts:943`: `{ why: 'red', playerId: 'c1-p2' }` has no `pos`.
   - C4 failed at `live.test.ts:966`, also with no `pos`.
   - Superseded rows 1 and 2 failed at `:538` and `:679`.
   - C1 passed there, which is expected: the round-2 fix `cdb6310` already gave an empty «Sai» no red targets. 86e3475 is the code C1 is meant to fail on.
   - To show that C3's formation table does its own work (L-028), I commented out `:943` in the scratch copy. C3 still failed on 748d1ca at `:946`: `4-4-2: expected null to be 'c1-p1'`, meaning the reserve keeper is no longer in goal after the formation change.

   Then I removed the scratch worktree with `git worktree remove --force`.
5. **Full suite**, `npx vitest run`: exit 1, 48 files, **614 passed, 1 failed** (615), 283 s. The failure was `src/ui/Market.test.tsx > tela Mercado > oferta abaixo do preço recusada`, `Error: Test timed out in 30000ms`. I reran that file once (`npx vitest run src/ui/Market.test.tsx`): 17 passed, 1 failed, 113 s. This time the failure was `oferta inválida` (34 s, the known flake), and «oferta abaixo do preço recusada» passed. Every other file passed, including every test in `src/engine/live.test.ts`, `src/ui/Live.test.tsx` and `src/store.test.ts`. See Finding 1.
6. **Layout**, `npm run check:layout`: exit 0 in headless Chrome at 400 × 700 with seed 1. Every measured screen reported `scrollHeight 700 scrollWidth 400`, including `ok    liveRed    scrollHeight 700 scrollWidth 400 · Música 267,14-320,35 · Efeitos 324,14-379,35 · Posição 23,519-377,545`. The last line was `layout: as 17 telas cabem em 400 × 700 px`.
7. `npm run check:layout:selftest`: **skipped on the caller's instruction**. The author ran it at d39c6b0, with exit 0.

## Checks

Verified at `d39c6b0`.

| Check | Claim | Proof run | Evidence | Result |
| --- | --- | --- | --- | --- |
| C1 | paused live screen, red card on slot 2 and an injury vacancy on slot 5; «Sai» = 5 gives «Posição» exactly one option, «no lugar de <injured> (<sector of slot 5>)», and no red slot; 86e3475 also offered the red slot | «posição com sai lesionado» ✓; fails on 86e3475 (Proof run item 3) | `src/ui/Live.test.tsx:827` - ``expect([...posicao.options].map((o) => o.textContent)).toEqual([`no lugar de ${injured} (MEI)`])``. Fixture: `:821-822` `[2, "red"], [5, "injury"]`, «Sai» = `"5"` at `:825`. Code: `src/ui/Live.tsx:170` `const targets = side.slots[outSlot] ? redSlots.filter(...) : []` | PASS |
| C2 | keeper sent off, no other red card; «Sai» = slot 2 and «Entra» = the reserve keeper give exactly one option, «na vaga de <keeper> (GOL, expulso)», already selected; no «no lugar de» | «goleiro reserva só no gol» ✓; fails on 86e3475 and 748d1ca | `src/ui/Live.test.tsx:841` - ``expect([...posicao.options].map((o) => o.textContent)).toEqual([`na vaga de ${keeper} (GOL, expulso)`])``; `:842` - ``expect(posicao.selectedOptions[0]!.textContent).toBe(`na vaga de ${keeper} (GOL, expulso)`)``. Code: `src/ui/Live.tsx:174-175` `options = keeperIn && goal !== undefined ? [goal, ...targets.filter(...)] : [outSlot, ...targets]`; `chosenTarget = ... : options[0]!` | PASS |
| C3 | `substitute(live, clubId, 2, <reserve>)` with no `target` and the keeper sent off records `vacancy[2]` = `{ why: "red", playerId: <keeper>, pos: "DF" }`; then 4-4-2, 4-5-1, 4-3-3 and 3-5-2 (table) each leave the reserve in GK, the red hole in a DF slot, and 10 on the pitch | «regra do goleiro grava o setor» ✓; fails on 748d1ca at `:943`, and at `:946` with `:943` disabled | `src/engine/live.test.ts:943` - `expect(userSide(subbed).vacancy[2]).toEqual({ why: "red", playerId: keeper, pos: "DF" })`; in the loop over all 4 formations (`:944`): `:946` `expect(side.slots[side.slotPos.indexOf("GK")], formation).toBe(reserve)`, `:948` `expect(holes, formation).toHaveLength(1)`, `:949` `expect(side.slotPos[holes[0]!], formation).toBe("DF")`, `:950` `toMatchObject({ why: "red", playerId: keeper })`, `:951` `slots.filter(Boolean) toHaveLength(10)`. Code: `src/engine/live.ts:688` | PASS |
| C4 | `runToEnd(live, { fillUserVacancies: true })` from minute 10 with the user's keeper sent off puts the reserve keeper in GK, and the outfield slot left gets `{ why: "red", playerId: <keeper>, pos: <that slot's sector> }` | «preenchimento do gol grava o setor» ✓; fails on 748d1ca at `:966` | `src/engine/live.test.ts:960` `expect(live.players[inGoal]!.position).toBe("GK")`; `:961` `expect(userSide(live).bench).toContain(inGoal)`; `:963` one vacancy for the keeper; `:965` `expect(side.slotPos[Number(slot)]).not.toBe("GK")`; `:966` `expect(v).toEqual({ why: "red", playerId: keeper, pos: side.slotPos[Number(slot)] })`. Code: `src/engine/live.ts:293` | PASS |
| C5 | `check:layout` (seed 1) exits 0 and measures 17 screens, including `liveRed` (stopped by the user's first red card, «Posição» visible inside 400 × 700, no scroll); last line «layout: as 17 telas cabem em 400 × 700 px» | `npm run check:layout` exit 0 | Run output: `ok    liveRed    scrollHeight 700 scrollWidth 400 ... · Posição 23,519-377,545` and `layout: as 17 telas cabem em 400 × 700 px`. Script: `scripts/layout-check.mjs:157-159` fails `liveRed` when there is no «Posição» or it falls outside the window (`within` at `:143` also requires a non-zero size, so a hidden field fails); `:344` stop detection `select[aria-label='Posição'] && !__lc.has('Pausar') ? 'red'`; `:347` `measure("liveRed")`; `:446` `"liveRed"` in the required list (17 names), so a season with no red card fails as missing | PASS |

## Superseded

Both rows are **stricter, not weaker**:

| Old | New (`d39c6b0`) | Judgment |
| --- | --- | --- |
| «IA repõe goleiro expulso»: `vacancy[1]` `toEqual({ why: "red", playerId: "a0" })` | `src/engine/live.test.ts:538` - `expect(side.vacancy[1]).toEqual({ why: "red", playerId: "a0", pos: "DF" })` | Same matcher and the same `why`/`playerId` values, plus a defined `pos`. Exact `toEqual` now also pins the sector. The rest of the test (`:530-541`, the two fallback cases at `:543-552`) is unchanged. Fails on 748d1ca. |
| parada-obrigatoria C3 «goleiro expulso: reserva entra no gol»: `vacancy[outSlot]` `toEqual({ why: "red", playerId: expelled })` | `src/engine/live.test.ts:679` - `expect(s.vacancy[outSlot]).toEqual({ why: "red", playerId: expelled, pos: "DF" })` | Same matcher and values, plus `pos`. The plain-substitution half stays `toEqual({ why: "red", playerId: expelled })`, which is correct because that path does not move the hole. Fails on 748d1ca. |

L-018 holds in both: the expelled player is a GK (`a0` built as `fresh("a0", "GK", ...)`, and the real keeper), while the recorded `pos` is DF.

## Coverage

Under `light`, the join is not a gate step. I re-read each row against the code: `substitute` (`src/engine/live.ts:661-698`), `aiSubstitutions` keeper rule (`:283-297`) and `src/ui/Live.tsx:167-175` / `:359-370`.

| Set (size) | Recomputed from | Member -> proof | Unproven |
| --- | --- | --- | --- |
| round-2 Verifier findings + carried R1 Finding 4 (4) | `posicao-na-substituicao/verification.md` Findings 1-3, R1 Finding 4 | C9 precision gap -> C1 · keeper and «no lugar de» -> C2 · moves without a sector -> C3, C4 · layout without the field -> C5 | - |
| moves of a red hole (3) | `live.ts:675` target path, `:688` keeper rule, `:293` automatic fill | target path: posicao-na-substituicao C1/C8, not in this diff · keeper rule C3 · automatic fill C4 | - |
| formations after the keeper rule (4) | the «Formação» select's `FORMATION_NAMES` | C3, a table over all 4 | - |
| «Posição» option lists (3) | `Live.tsx:170-174` | empty «Sai» (outSlot only) C1 · keeper in with a red goal (goal first, no outSlot) C2 · the default `[outSlot, ...targets]`: posicao-na-substituicao C5, still green in the full suite | - |

## Swept existing

Verified at `d39c6b0`.

- **validation** (posicao-na-substituicao C3 refusals): present. `src/engine/live.ts:668` `sent_off`, `:674` `not_vacant`. The test «posição na substituição: recusas» passed in the full suite.
- **concurrency** («decisões só com o relógio parado»): present. `src/store.ts:443` - `if (!live || !game?.userClubId || clock === "running" || finishing) return;`.

## Prior findings: status

- **R2 Finding 1, precision gap in C9: closed.** C1's fixture is the exact case named (an injury vacancy with a red card on another slot). It fails on 86e3475 (Proof run item 3).
- **R2 Finding 2, «no lugar de» offered with a keeper coming on: closed.** `Live.tsx:174` drops `outSlot` from the options in that case. C2 proves it.
- **R2 Finding 3, keeper-rule moves without `pos`: closed.** `live.ts:688` and `:293` now write `pos: side.slotPos[...]`, matching the target path at `:675`. C3 proves it through formation changes, and C4 proves it through `runToEnd`.
- **R1 Finding 4, layout without the field: closed.** C5 measures `liveRed` with «Posição» at `23,519-377,545`.

## Findings

1. **Minor, gate noise outside the diff: the full suite was not green at d39c6b0 on this run.** `src/ui/Market.test.tsx` «oferta abaixo do preço recusada» timed out at 30 s (614/615). The single rerun of the file had «oferta inválida» time out at 34 s, which is the known flake, and the first test passed. The file and `src/ui/Market.tsx` have no change in `748d1ca..d39c6b0`. The rerun took 113 s for 18 tests, which points to machine load. This does not touch any check, but a second `Market.test.tsx` test now times out under load, so the flake is wider than the one name the caller gave.
2. **Cosmetic, precision of C5's «mede 17 telas».** The run printed 18 measured lines (`roundOffer` too). The 17 is the length of the required list at `scripts/layout-check.mjs:446`, which is what the final line counts. This is a pre-existing convention, and the claim's quoted last line matches it exactly.

## Gate

- Named-proof batch: 6 passed, 0 failed, 2 files; the four new proofs belong to this feature's diff.
- `npx vitest run`: 614 passed, 1 failed (Market timeout, Finding 1); rerun of `Market.test.tsx`: 17 passed, 1 failed («oferta inválida» timeout).
- `npm run check:layout`: exit 0, `layout: as 17 telas cabem em 400 × 700 px`.
- `npm run check:layout:selftest`: skipped on the caller's instruction (the author ran it at d39c6b0: exit 0).
