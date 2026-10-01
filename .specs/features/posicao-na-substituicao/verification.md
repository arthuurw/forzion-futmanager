# Posição na substituição verification

**Verdict**: FAIL
**Profile**: light
**Diff range**: 4c230a5..86e3475 (checks in d2cb6d7, code in 86e3475); proofs run at HEAD a2ce79b
**Round**: 1 - full
**Verifier**: independent sub-agent (author != verifier)

All 7 checks are proven with located evidence and every proof passed at HEAD. The verdict is FAIL for one reason, which the checks do not cover: the position the user chooses does not survive a later formation change. Any formation change after the substitution puts the red-card hole back in defence and moves a defender to the attack «fora de posição», which is the user's original complaint (Findings 1). This is not a regression, because the pre-feature code behaved the same way after a formation change. It is a gap in the fix.

## Binding sources

None. There is no `plan.md`; the Intent section of `checks.md` is the spec, and it names the author's print of 30/09/2026 and the rule «sai um jogador, entra outro, como no futebol real, podendo escolher a posição de quem entra». Step 1 runs only under `ui`.

## Proof run

Verified at `a2ce79b`. Before the run, `git status --porcelain` showed only `?? .specs/print.png`, and it showed the same afterwards.

1. **Batched named proofs, one invocation** for both features: `npx vitest run src/engine/live.test.ts src/store.test.ts src/ui/Live.test.tsx src/ui/Squad.test.tsx -t "entra na vaga do expulso|posição padrão é a de quem sai|posição na substituição: recusas|substituição com posição|substituição na vaga do expulso|sem expulso não há posição|menu principal pelo elenco" --reporter=verbose` exited 0: 4 files, **7 passed**, 125 skipped, 0 failed, 0 `act(...)` warnings. This feature's six tests each printed their own ✓ line:
   - `src/engine/live.test.ts > posição na substituição (posicao-na-substituicao) > entra na vaga do expulso` ✓
   - `... > posição padrão é a de quem sai` ✓
   - `... > posição na substituição: recusas` ✓
   - `src/store.test.ts > posição na substituição (posicao-na-substituicao) > substituição com posição` ✓
   - `src/ui/Live.test.tsx > posição na substituição (posicao-na-substituicao) > substituição na vaga do expulso` ✓
   - `src/ui/Live.test.tsx > ... > sem expulso não há posição` ✓
2. **Existence** (`rg -n`): `src/engine/live.test.ts:829`, `:848`, `:860`; `src/store.test.ts:907`; `src/ui/Live.test.tsx:723`, `:742`. All six were added in `86e3475`.
3. **Full suite**, `npx vitest run`: exit 0, 48 files, **608 passed, 0 failed**. The `Market.test.tsx` «oferta inválida» timeout did not occur in this run.
4. **Layout**, `npm run check:layout`: exit 0 in headless Chrome at 400 × 700 with seed 1. It measured 17 screens, each `scrollHeight 700 scrollWidth 400`: `home`, `chooseClub`, `squad`, `market`, `finance`, `history`, `cup`, `cupCont`, `live`, `round`, `job`, `roundOffer`, `end`, `newSeason`, `homeSave`, `about`, `squadOffer`. The last lines were `ok    squadOffer scrollHeight 700 scrollWidth 400 · Música 267,14-320,35 · Efeitos 324,14-379,35` and `layout: as 16 telas cabem em 400 × 700 px`. `check:layout:selftest` was not run, on the caller's instruction.
5. **Scratch probe (not a proof, evidence for Finding 1)**: `scratchpad/probe/probe.test.ts` ran through `npx vitest run --dir <scratchpad>/probe` and wrote nothing to the repo. It played seed 2 to minute 10 with a red card on slot 2 of a 4-4-2, then called `substitute(live, me, 9, <defender>, 2)`, then `changeFormation` to each formation. Output (`*` marks the defender who came on):
   - after the sub: `2:DF=DF* ... 9:FW=(red) 10:FW=FW`, which is correct.
   - then 4-4-2, the same formation: `4:DF=(red) ... 9:FW=FW 10:FW=DF`
   - then 4-5-1: `4:DF=(red) ... 9:MF=DF`
   - then 4-3-3: `4:DF=(red) ... 9:FW=DF 10:FW=MF`
   - then 3-5-2: `3:DF=(red) ... 8:MF=DF ... 10:FW=DF`

## Checks

Verified at `a2ce79b`.

| Check | Claim | Proof run | Evidence | Result |
| --- | --- | --- | --- | --- |
| C1 | `target` 2 with a red on slot 2, the striker of slot 9 leaving: the defender is in slot 2, slot 9 is empty with the red mark, the sub is counted, the event is recorded, 10 on the pitch | «entra na vaga do expulso» ✓ | `src/engine/live.test.ts:833` `expect(after.slots[2]).toBe(defender)`; `:834` `expect(after.slots[9]).toBeNull()`; `:835` `expect(after.vacancy[9]).toEqual({ why: "red", playerId: expelled })`; `:836` `expect(after.vacancy[2]).toBeUndefined()`; `:837` `subsUsed toBe(userSide(live).subsUsed + 1)`; `:838` `subbedOff toContain(striker)`; `:839` `bench not.toContain(defender)`; `:840-844` last event `toMatchObject({ type: "substitution", playerId: striker, playerInId: defender })`; `:845` `slots.filter(Boolean) toHaveLength(10)`. Ten before is implied: the helper asserts 11 (`:817`) and then empties slot 2. | PASS |
| C2 | with no `target`, or `target === slot`, the result is the same state: slot 9 = the player coming on, slot 2 still red | «posição padrão é a de quem sai» ✓ | `src/engine/live.test.ts:853` `expect(same).toEqual(plain)`; `:855` `side.slots[9] toBe(defender)`; `:856` `side.slots[2] toBeNull()`; `:857` `side.vacancy[2] toEqual({ why: "red", playerId: expelled })` | PASS |
| C3 | refusals leave `live` unchanged: occupied, injury slot, −1 and 11 → `not_vacant`; the red slot leaving → `sent_off`; 5 subs → `limit`; a player who already left → `returning` | «posição na substituição: recusas» ✓ | table `src/engine/live.test.ts:875-881` (7 rows, one per member; the out-of-team member has both −1 and 11); `:885` `expect(substitute(round, me, slot, inId, target), name).toEqual({ ok: false, reason })`; `:886` `expect(round, name).toEqual(before)` | PASS |
| C4 | the store passes `target`: 2 puts the defender in slot 2; a `not_vacant` refusal shows «Escolha a vaga de quem sai ou a de um expulso» | «substituição com posição» ✓ | `src/store.test.ts:920` `liveMessage toBe("Escolha a vaga de quem sai ou a de um expulso")`; `:921` `live toBe(live)`; `:924` `after.slots[2] toBe(defender)`; `:925` `after.slots[9] toBeNull()`; `:926` `liveMessage toBeNull()`; clock `"paused"` at `:918` | PASS |
| C5 | live screen after a red on a defender: «Posição» has 2 options in order; choosing the red slot puts the defender in the ZAG row with no «fora de posição»; the ATA row reads «<expulso> (expulso)»; «Substituições: 1/5» | «substituição na vaga do expulso» ✓ | `src/ui/Live.test.tsx:730` - ``expect([...posicao.options].map((o) => o.textContent)).toEqual([`no lugar de ${striker} (ATA)`, `na vaga de ${expelled} (ZAG, expulso)`])``; `:735-737` row 2 `toContain("ZAG")`, `toContain(defenderName)`, `not.toContain("fora de posição")`; `:738` ``rows[9]!.textContent toBe(`ATA${expelled} (expulso)`)``; `:739` `getByText("Substituições: 1/5")` | PASS |
| C6 | with no red card, the paused live screen has no «Posição» | «sem expulso não há posição» ✓ | `src/ui/Live.test.tsx:747` `expect(within(team).queryByLabelText("Posição")).not.toBeInTheDocument()`; `:746` «Sai» present, so the panel was rendered | PASS |
| C7 | `check:layout` exits 0 with 16 screens; `live` is measured without the field | `npm run check:layout` exit 0, `layout: as 16 telas cabem em 400 × 700 px` | `scripts/layout-check.mjs:330` `if (!measured.has("live")) await measure("live")`; `:420` the required list includes `"live"` (16 names); run output `ok    live       scrollHeight 700 scrollWidth 400` | PASS |

## Coverage

Under `light` the join is not a gate step. Each row was re-read against the proof it names, and the members were taken from `substitute` (`src/engine/live.ts:656-689`) and `Live.tsx:352-367`. The last row is a set the checks never gave a row: the Intent names the formation-change rule (AC 43) as half of the author's problem.

| Set (size) | Recomputed from | Member -> proof | Unproven |
| --- | --- | --- | --- |
| destination of the player coming on (2) | `live.ts:665` branch | out slot C2 · red slot C1 | - |
| refusals (6) | `live.ts:660-668` | occupied, injury, −1/11, red slot leaving, limit, returning: all C3 | - |
| «Posição» options (2) | `Live.tsx:355-363` | out slot C5 · red slot C5 | - |
| field presence (2) | `Live.tsx:352` `redSlots.length > 0` | with a red card C5 · without C6 | - |
| the chosen position after the next decision (2): another sub, a formation change | Intent (AC 43, «nenhuma formação o leva para a zaga») and `changeFormation` (`live.ts:698-736`) | another sub: nothing changes, not proven but not at risk; formation change: no proof, and the probe shows it undoes the choice | formation change - the hole returns to the expelled player's sector and a defender goes «fora de posição» (Finding 1) |

## Swept existing

Verified at `a2ce79b`.

- **concurrency** («decisões só com o relógio parado», `decide` na store): present. `src/store.ts:443` - `if (!live || !game?.userClubId || clock === "running" || finishing) return;`. The store `substitute` goes through `decide` (`src/store.ts:610-615`), so the new `target` argument inherits the guard.

## Substitution rules - regression read

The caller asked for this read. It is based on `src/engine/live.ts:656-689` at HEAD.

- **5 subs max**: the `limit` guard (`:659`) runs before the new branch, and the new branch calls `bringOn`, which does `subsUsed++` (`live.ts:259`). C3 «limite» and C1 `:837` prove this.
- **Nobody returns**: the `returning` guard (`:661`) runs before the branch. `bringOn` pushes the leaving player to `subbedOff` (`live.ts:254`), because the branch first seats `outId` in `target` (`:671`), so `slots[target]` is the player leaving. C1 `:838` and C3 «quem já saiu» prove this.
- **No direct entry into a red slot without someone leaving**: `sent_off` rejects `slot` being the red slot (`:660`), and the new branch rejects an empty `slot` with `!outId` (`:668`). The count stays at 10 (C1 `:845`).
- **Clock stopped only**: `decide`, as described under Swept existing.
- **Parada-obrigatoria keeper rule**: unchanged, and still reached. The UI's default `chosenTarget` is `outSlot` (`Live.tsx:168`), so `target === slot` and the keeper rule at `live.ts:678-685` runs as before. The pre-existing keeper tests pass in the full suite (for example `live.test.ts:681`). An explicit `target` does bypass the rule, which is Finding 3.
- **Pre-existing tests with changed expectations**: none. `git diff --numstat 4c230a5..86e3475` shows `0` deleted lines in `live.test.ts`, `store.test.ts` and `Live.test.tsx`. The only removed lines in the diff are the old `substitute` signature and doc (`live.ts`, 3 lines), the store signature (`store.ts`, 3 lines), and the Live «Sai» select and «Substituir» button (`Live.tsx`, 2 lines).

## Findings

1. **Major, feature gap (fails the feature): a formation change undoes the chosen position.** `substitute` with a `target` moves the red vacancy to the slot that was left, but it keeps `playerId: <expelled>` (`src/engine/live.ts:669`), and C1 pins that shape (`live.test.ts:835`). `changeFormation` then places each vacancy «no setor do jogador que saiu» by `live.players[v.playerId]?.position` (`src/engine/live.ts:709-716`). After the case in the print, any formation change moves the hole back to the last DF slot, and the leftover defender is seated in a free FW or MF slot «fora de posição». This happens even when the user re-selects the same 4-4-2 (see Proof run, item 5). The user solves the problem once, and the next formation tap brings it back. That is the «nenhuma formação o leva para a zaga» half of the Intent. No check covers the interaction, and Swept «state transitions» lists only C1 and C2. It is not a regression, because the pre-feature code did the same after a formation change. Possible fix, for the author to decide: record the sector the hole now belongs to, for example the `slotPos` of the slot that was left, and have `changeFormation` use it. Then add a check for «substitution on the red slot, then a formation change, keeps the defender in defence».
2. **Minor, UX: the «Posição» field offers an option that is always refused.** When «Sai» is an empty slot, whether an injury vacancy or a plain «Vaga», the field still lists «na vaga de <expulso> ...» (`src/ui/Live.tsx:352-365`), and choosing it returns `not_vacant` because `!outId` (`src/engine/live.ts:668`). The message «Escolha a vaga de quem sai ou a de um expulso» does not explain why. This is consistent with the rule «ninguém entra direto na vaga de um expulso sem que alguém saia», but the screen offers the option anyway.
3. **Minor, UX: the keeper rule and the «Posição» label disagree.** When the goalkeeper is sent off and the user brings a keeper on for an outfield player, the default option reads «no lugar de <outfield> (ZAG)» (`src/ui/Live.tsx:355-357`). The engine still sends the keeper into goal through the parada-obrigatoria rule (`src/engine/live.ts:678-685`), because `target === slot`. The result is correct, but the label is wrong. Choosing another red outfield slot with a keeper coming on also bypasses the rule on purpose (`live.ts:665`), which is legitimate in real football, and `forcedVacancy` still asks for the goal while a keeper is on the bench and subs remain.
4. **Minor, layout not measured with the field shown.** The extra `decision-row` (`src/ui/Live.tsx:352-367`) appears only after a red card, and `check:layout` cannot force one. The checks declare this in C7 and under Coverage, so it is not a failed check. Whether the paused live screen still fits in 400 × 700 with a red card on the pitch is unproven.

## Gate

- Named-proof batch: 7 passed, 0 failed (6 of them this feature's), 4 files.
- `npx vitest run`: 608 passed, 0 failed, 48 files.
- `npm run check:layout`: exit 0, `layout: as 16 telas cabem em 400 × 700 px`.
