# Posição na substituição verification

**Verdict**: PASS
**Profile**: light
**Diff range**: 4c230a5..5544409 (checks in d2cb6d7 and f68e749, code in 86e3475, round-2 fix in cdb6310, round-1 report in 5544409); proofs run at HEAD 5544409
**Round**: 2 - full (every check C1-C10 re-verified; nothing carried forward except where a section says so)
**Verifier**: independent sub-agent (author != verifier)

All 10 checks are proven with located evidence, and every proof passed at HEAD. The round-1 FAIL (Finding 1: a formation change undid the chosen position) is fixed. C8 proves it over all 4 formations, and a scratch probe confirms it, including chained formation changes and a second substitution into the moved hole. Round-1 Findings 2 and 3 are fixed in the code. Three minor findings remain, none of which fails a check. The most useful one is a precision gap: C9's proof would also pass on the round-1 code (Finding 1 below).

## Binding sources

None. There is no `plan.md`. The `## Intent` section of `checks.md` is the spec. Step 1 runs only under `ui`, and this feature is `light`.

## Proof run

Verified at `5544409`. Before the run, `git status --porcelain` showed only `?? .specs/print.png`. It showed the same after every step.

1. **Named proofs, one invocation**: `npx vitest run src/engine/live.test.ts src/store.test.ts src/ui/Live.test.tsx -t "entra na vaga do expulso|posição padrão é a de quem sai|posição na substituição: recusas|formação depois da troca mantém a posição|substituição com posição|substituição na vaga do expulso|sem expulso não há posição|posição sem quem sai|goleiro reserva vai para o gol" --reporter=verbose` exited 0. It ran 3 files: **9 passed**, 96 skipped, 0 failed. Each test printed its own ✓ line:
   - `src/engine/live.test.ts > posição na substituição (posicao-na-substituicao) > entra na vaga do expulso` ✓ (C1)
   - `... > posição padrão é a de quem sai` ✓ (C2)
   - `... > posição na substituição: recusas` ✓ (C3)
   - `... > formação depois da troca mantém a posição` ✓ (C8)
   - `src/store.test.ts > posição na substituição (posicao-na-substituicao) > substituição com posição` ✓ (C4)
   - `src/ui/Live.test.tsx > posição na substituição (posicao-na-substituicao) > substituição na vaga do expulso` ✓ (C5)
   - `... > sem expulso não há posição` ✓ (C6)
   - `... > posição sem quem sai` ✓ (C9)
   - `... > goleiro reserva vai para o gol` ✓ (C10)
2. **Existence** (`grep -n`): `src/engine/live.test.ts:829`, `:849`, `:861`, `:891`; `src/store.test.ts:907`; `src/ui/Live.test.tsx:724`, `:743`, `:751`, `:761`. C1-C6 were added in `86e3475`, and C8-C10 in `cdb6310`. Every proof belongs to this feature's diff.
3. **Full suite**, `npx vitest run`: exit 0, 48 files, **611 passed, 0 failed**, 126 s. The `Market.test.tsx` «oferta inválida» timeout did not occur, so the file was not rerun.
4. **Layout**, `npm run check:layout`: exit 0 in headless Chrome at 400 × 700 with seed 1. It measured 17 screens, each `scrollHeight 700 scrollWidth 400`, including `ok    live       scrollHeight 700 scrollWidth 400`. The last line was `layout: as 16 telas cabem em 400 × 700 px`. `check:layout:selftest` was **not run**, on the caller's instruction, because it has run out of memory on this machine before.
5. **Scratch probe (evidence, not a proof)**: `scratchpad/probe/probe.test.ts` ran through `npx vitest run --dir <scratchpad>/probe` and wrote nothing to the repo. It replays the round-1 scenario: seed 2, minute 10, a red card on slot 2 of a 4-4-2, then `substitute(live, me, 9, <defender>, 2)`. `*` marks the defender who came on.
   - after the sub: `2:DF=DF* ... 9:FW=(red/FW) 10:FW=FW`
   - then 4-4-2: `2:DF=DF* ... 9:FW=FW 10:FW=(red/FW)`. All 4 DF slots hold defenders.
   - then 4-5-1: `... 9:MF=FW 10:FW=(red/FW)`
   - then 4-3-3: `... 9:FW=MF 10:FW=(red/FW)`
   - then 3-5-2: `... 8:MF=DF ... 10:FW=(red/FW)`
   - chained 4-5-1 → 4-4-2 and 3-5-2 → 4-4-2: both end with `10:FW=(red/FW)` and 4 defenders at the back.
   - a second sub that moves the hole again (from slot 6 into the FW hole, with a FW coming on): `6:MF=(red/MF)`, and after 4-3-3 `7:MF=(red/MF)`. The newer sector replaces the old one.
   - keeper sent off, with the reserve keeper brought on through the old parada-obrigatoria rule (`target === slot`), then 4-4-2: `0:GK=(red) ... 4:DF=GK*`. See Finding 3. With `target` = the goal, which is the path the UI now takes: `0:GK=GK* ... 4:DF=(red/DF)`.
   - I also tried a jsdom probe of «Sai» on an injury vacancy (for Finding 1). Vitest could not load a jsdom test from outside the repo root (`ERR_MODULE_NOT_FOUND /@fs/...`), so that case is supported only by reading the code.

## Checks

Verified at `5544409`.

| Check | Claim | Proof run | Evidence | Result |
| --- | --- | --- | --- | --- |
| C1 | with a red card on slot 2, a striker leaving slot 9 and a defender coming on with `target` 2: the defender is in slot 2; slot 9 is empty with `{ why: "red", playerId: <expelled>, pos: "FW" }` (amended); slot 2 has no vacancy; the sub is counted, the striker is subbed off, the bench loses the defender; the event is recorded; 10 on the pitch | «entra na vaga do expulso» ✓ | `src/engine/live.test.ts:833` `expect(after.slots[2]).toBe(defender)`; `:834` `expect(after.slots[9]).toBeNull()`; `:836` `expect(after.vacancy[9]).toEqual({ why: "red", playerId: expelled, pos: "FW" })`; `:837` `vacancy[2] toBeUndefined()`; `:838` `subsUsed toBe(userSide(live).subsUsed + 1)`; `:839` `subbedOff toContain(striker)`; `:840` `bench not.toContain(defender)`; `:841-845` last event `toMatchObject({ type: "substitution", playerId: striker, playerInId: defender })`; `:846` `slots.filter(Boolean) toHaveLength(10)` (11 before the red card at `:817`) | PASS |
| C2 | with no `target`, or with `target === slot`, the state is the same: slot 9 = the player coming on, slot 2 still empty with the red mark | «posição padrão é a de quem sai» ✓ | `src/engine/live.test.ts:854` `expect(same).toEqual(plain)`; `:856` `side.slots[9] toBe(defender)`; `:857` `side.slots[2] toBeNull()`; `:858` `side.vacancy[2] toEqual({ why: "red", playerId: expelled })`. This exact `toEqual` also shows the default path adds no `pos`. | PASS |
| C3 | refusals leave `live` unchanged: an occupied slot, an injury slot, −1 and 11 → `not_vacant`; the red slot leaving → `sent_off`; 5 subs → `limit`; a player who already left → `returning` | «posição na substituição: recusas» ✓ | table `src/engine/live.test.ts:875-883`, 7 rows covering all 6 members (the out-of-team member has both −1 and 11); `:886` `expect(substitute(round, me, slot, inId, target), name).toEqual({ ok: false, reason })`; `:887` `expect(round, name).toEqual(before)` | PASS |
| C4 | the store passes `target`: 2 puts the defender in slot 2; a `not_vacant` refusal shows «Escolha a vaga de quem sai ou a de um expulso» | «substituição com posição» ✓ | `src/store.test.ts:920` `liveMessage toBe("Escolha a vaga de quem sai ou a de um expulso")`; `:921` `live toBe(live)`; `:924` `after.slots[2] toBe(defender)`; `:925` `after.slots[9] toBeNull()`; `:926` `liveMessage toBeNull()`; clock `"paused"` at `:918`. The file was not touched by `cdb6310`. | PASS |
| C5 | on the live screen after a defender's red card, «Posição» has 2 options in order; choosing the red slot puts the defender in the ZAG row with no «fora de posição»; the ATA row reads «<expelled> (expulso)»; «Substituições: 1/5» | «substituição na vaga do expulso» ✓ | `src/ui/Live.test.tsx:731` - ``expect([...posicao.options].map((o) => o.textContent)).toEqual([`no lugar de ${striker} (ATA)`, `na vaga de ${expelled} (ZAG, expulso)`])``; `:736-738` row 2 `toContain("ZAG")`, `toContain(defenderName)`, `not.toContain("fora de posição")`; `:739` ``rows[9]!.textContent toBe(`ATA${expelled} (expulso)`)``; `:740` `getByText("Substituições: 1/5")` | PASS |
| C6 | with no red card, the paused live screen has no «Posição» | «sem expulso não há posição» ✓ | `src/ui/Live.test.tsx:748` `expect(within(team).queryByLabelText("Posição")).not.toBeInTheDocument()`; `:747` «Sai» is present, so the panel rendered | PASS |
| C7 | `check:layout` exits 0 with the 16 screens; `live` is measured without the field | `npm run check:layout` exit 0, `layout: as 16 telas cabem em 400 × 700 px` | `scripts/layout-check.mjs:330` `if (!measured.has("live")) await measure("live")`; `:420` the required list includes `"live"` (16 names); run output `ok    live       scrollHeight 700 scrollWidth 400`. `scripts/` has no change in `4c230a5..HEAD`. | PASS |
| C8 | after `substitute(live, clubId, 9, <defender>, 2)`, changing to 4-4-2, 4-5-1, 4-3-3 and 3-5-2 (table) leaves the hole in the last FW slot with the expelled player's mark; 4 defenders in DF slots (3 in 3-5-2); 10 on the pitch; in 4-5-1 the remaining striker plays in midfield | «formação depois da troca mantém a posição» ✓ | table `src/engine/live.test.ts:896-901`, all 4 formations, with the expected number of defenders per row; `:905` `expect(side.slots[lastFw], formation).toBeNull()`; `:906` `expect(side.vacancy[lastFw], formation).toMatchObject({ why: "red", playerId: expelled })`; `:908` `expect(inDefence, formation).toHaveLength(backs)`; `:909` `slots.filter(Boolean) toHaveLength(10)`; `:913` `expect(fiveOne.slotPos[fiveOne.slots.indexOf(striker)]).toBe("MF")`. The fixture follows L-018: the moved `pos` (FW) differs from the expelled player's position (DF), so the test fails under the round-1 rule. The round-1 probe showed the hole at slot 4 (DF) with slot 10 occupied. | PASS |
| C9 | with «Sai» on an empty slot (the expelled player's), «Posição» offers only «no lugar de <expelled> (ZAG)» | «posição sem quem sai» ✓ | `src/ui/Live.test.tsx:758` ``expect([...posicao.options].map((o) => o.textContent)).toEqual([`no lugar de ${expelled} (ZAG)`])``. The claim as written is proven, but this proof also passes on the round-1 code (precision gap, Finding 1). | PASS |
| C10 | with the keeper sent off and a keeper chosen in «Entra» for an outfield player, «Posição» defaults to «na vaga de <expelled keeper> (GOL, expulso)»; «Substituir» puts the reserve keeper in goal | «goleiro reserva vai para o gol» ✓ | `src/ui/Live.test.tsx:782` ``expect(posicao.selectedOptions[0]!.textContent).toBe(`na vaga de ${live.players[keeper]!.name} (GOL, expulso)`)``; `:785` `after.slots[goalSlot] toBe(reserve)`; `:786` `after.slots[2] toBeNull()`; `:787` `subbedOff toContain(leaving)`. The `:782` label assertion fails on the round-1 code, whose default was «no lugar de ... (ZAG)». | PASS |

## Coverage

Under `light` the join is not a gate step. I re-read each row against the proof it names, and took the members from `substitute` (`src/engine/live.ts:661-698`), `changeFormation` (`src/engine/live.ts:703-742`) and `Live.tsx:167-174` / `:358-370`.

| Set (size) | Recomputed from | Member -> proof | Unproven |
| --- | --- | --- | --- |
| destination of the player coming on (2) | `live.ts:671` branch | out slot C2 · red slot C1 | - |
| refusals (6) | `live.ts:665-673` | occupied, injury, −1/11, red slot leaving, limit, returning: all C3 | - |
| «Posição» options (2) | `Live.tsx:361-368` | out slot C5 · red slot C5 | - |
| field presence (2) | `Live.tsx:358` `redSlots.length > 0` | with a red card C5 · without C6 | - |
| formation after a moved hole (4) | `FORMATION_NAMES` in the «Formação» select (`Live.tsx:374`) | C8, table-driven over all 4 | - |
| «Sai» on an empty slot (3): the red slot itself, an injury vacancy, a plain «Vaga» | `Live.tsx:170` `side.slots[outSlot] ? ... : []` | red slot C9; injury and plain «Vaga» have no proof, but the code reads correctly (Finding 1) | - |
| keeper coming on with a red goal (1) | `Live.tsx:171-173` | C10 | - |

## Swept existing

Verified at `5544409`.

- **concurrency** («decisões só com o relógio parado», `decide` in the store): present. `src/store.ts:443` - `if (!live || !game?.userClubId || clock === "running" || finishing) return;`. The store `substitute` goes through `decide` (`src/store.ts:610-614`), and so does `changeLiveFormation` (`:618`). Both C8's formation change and the new `target` inherit the guard.

## The continental test change in cdb6310

`src/ui/Live.test.tsx:536` (copa-continental C11, «continental fecha sem tela para quem não joga») changed from `expect(useGame.getState().phase).not.toBe("live")` straight after the click to `await waitFor(() => expect(useGame.getState().phase).toBe("round"))`. **This does not weaken the test. It makes it stricter.**

- In `playRound` (`src/store.ts:551-573`), the branch for a user who does not play never sets `phase: "live"`. It sets `game` synchronously, then `await persist(...)`, then `set({ phase: "round", ... })` (`:572`). The branch for a user who plays sets `phase: "live"` and leaves it there (`:560`).
- The old assertion ran before the save, when `phase` was still `"squad"`, so `not.toBe("live")` was true almost trivially. The new one requires the specific post-save phase, and the live branch cannot produce `"round"` in waitFor's window, because the match runs at speed 1.
- The other assertions (no «Ao vivo» heading, `cup.currentPhase`, 8 ties with winners) still run, and now run after the save.
- Waiting for the save also keeps it from landing in a later test (L-026). Whether this cures the C5 intermittency under load cannot be shown from a single green run. In this round C5 passed in the batch and in the full suite.

## Round-1 findings: status

- **R1 Finding 1, major (a formation change undid the chosen position): fixed.** `src/engine/live.ts:674` - `side.vacancy[slot] = { ...side.vacancy[target]!, pos: side.slotPos[slot] as Position };` and `:715` - `const lost = v.pos ?? live.players[v.playerId]?.position;`. C8 proves it, and probe item 5 confirms it.
- **R1 Finding 2, minor (red slot offered when «Sai» is empty): fixed in the code** at `src/ui/Live.tsx:170` - `const targets = side.slots[outSlot] ? redSlots.filter((slot) => slot !== outSlot) : [];`. The proof only covers the case the old code already handled (Finding 1 below).
- **R1 Finding 3, minor (keeper label): fixed for the default.** `src/ui/Live.tsx:171-174` defaults to the goal, and C10 proves it. A residue remains (Finding 2 below).
- **R1 Finding 4, minor (layout not measured with the field shown): still open, by declaration.** C7 and the Coverage note in `checks.md` keep this out of reach. Carried from 86e3475. The fix added no rows to the panel, only changed option lists.

## Findings

1. **Minor, precision gap in C9: the proof cannot tell the fix from the round-1 code.** C9's fixture puts «Sai» on slot 2, the only red slot. The round-1 code already removed `outSlot` from the red options (`redSlots.filter((slot) => slot !== outSlot)`, the line `cdb6310` replaced), so `src/ui/Live.test.tsx:758` also passes on `86e3475`. The case round-1 Finding 2 described has no proof: «Sai» on an **injury** vacancy or a plain «Vaga» while a red slot exists elsewhere, where the old code offered the red slot and the engine refused it. Reading `src/ui/Live.tsx:170` shows the fix handles it, because an empty `outSlot` yields no targets. A jsdom probe outside the repo would not load, so I could not exercise it. Suggested fix, for the author: in C9, put «Sai» on an injury vacancy with the red card on another slot.
2. **Minor, UX: with a keeper in «Entra» and the goal empty after a red card, the «no lugar de <X> (ZAG)» option cannot be chosen.** Selecting it sets `target = outSlot`. `outSlot` is never in `targets`, so `chosenTarget` falls back to `defaultTarget` = the goal (`src/ui/Live.tsx:173-174`), and the select snaps back. This matches the engine's parada-obrigatoria rule, which would send the keeper into goal anyway (`src/engine/live.ts:683-690`), so the result is right. Still, the screen shows an option that does nothing.
3. **Minor, latent and pre-existing: the two keeper-rule paths move a red hole without `pos`.** These are `src/engine/live.ts:686` (`substitute` with `target === slot`) and `:292` (the automatic AI and skip-to-end keeper rule). After either one, `changeFormation` uses the expelled keeper's position (GK), so the hole goes back to the goal and the reserve keeper sits at DF. Probe item 5: `0:GK=(red) ... 4:DF=GK*`. Neither path is reachable from the screen before a formation change. Live.tsx always sends a keeper coming on into a red goal through `target` (Finding 2), which sets `pos` (C10, and probe `0:GK=GK* ... 4:DF=(red/DF)`). `:292` runs for the user only inside `runToEnd` at «pular», after which no decision is possible. `changeFormation` is called only by the store, for the user (`src/store.ts:618`). The same behaviour existed before this feature. If a later feature exposes either path, give these two moves the same `pos` as `:674`.

## Gate

- Named-proof batch: 9 passed, 0 failed, 3 files, all 9 this feature's.
- `npx vitest run`: 611 passed, 0 failed, 48 files.
- `npm run check:layout`: exit 0, `layout: as 16 telas cabem em 400 × 700 px`.
- `npm run check:layout:selftest`: skipped on the caller's instruction (out of memory on this machine before).
