# Menu no Elenco verification

**Verdict**: PASS
**Profile**: light
**Diff range**: 86e3475..a2ce79b (checks in c834570, code in a2ce79b)
**Round**: 1 - full
**Verifier**: independent sub-agent (author != verifier)

## Binding sources

None. There is no `plan.md`; the Intent section of `checks.md` is the spec (the author's request of 30/09/2026). Step 1 runs only under `ui`.

## Proof run

Verified at `a2ce79b`. Before the run, `git status --porcelain` showed only `?? .specs/print.png`, and it showed the same afterwards.

1. **Batched named proofs**, one invocation shared with `posicao-na-substituicao`: `npx vitest run src/engine/live.test.ts src/store.test.ts src/ui/Live.test.tsx src/ui/Squad.test.tsx -t "entra na vaga do expulso|posição padrão é a de quem sai|posição na substituição: recusas|substituição com posição|substituição na vaga do expulso|sem expulso não há posição|menu principal pelo elenco" --reporter=verbose` exited 0: 4 files, **7 passed**, 125 skipped, 0 failed. This feature's proof printed its own line: `✓ src/ui/Squad.test.tsx > menu principal (menu-no-elenco) > menu principal pelo elenco 453ms`.
2. **Existence** (`rg -n`): `src/ui/Squad.test.tsx:588`. It was added in `a2ce79b`.
3. **Full suite**, `npx vitest run`: exit 0, 48 files, **608 passed, 0 failed**.
4. **Layout**, `npm run check:layout`: exit 0 in headless Chrome at 400 × 700 with seed 1. The run measured `ok    squad      scrollHeight 700 scrollWidth 400 · Música 267,14-320,35 · Efeitos 324,14-379,35` and `ok    squadOffer scrollHeight 700 scrollWidth 400 · Música 267,14-320,35 · Efeitos 324,14-379,35`. All 17 measured screens were `scrollHeight 700 scrollWidth 400`, and the last line was `layout: as 16 telas cabem em 400 × 700 px`. `check:layout:selftest` was not run, on the caller's instruction.

## Checks

Verified at `a2ce79b`.

| Check | Claim | Proof run | Evidence | Result |
| --- | --- | --- | --- | --- |
| C1 | on the Elenco, «Menu principal» opens the title screen with «Continuar» enabled; «Continuar» returns to the same club's Elenco, with the game unchanged | «menu principal pelo elenco» ✓ | `src/ui/Squad.test.tsx:596` `expect(useGame.getState().phase).toBe("home")`; `:598` `expect(continuar).toBeEnabled()`, where `continuar` is `findByRole("button", { name: "Continuar" })` (`:597`); `:600` `expect(await screen.findByRole("heading", { name: club.name })).toBeInTheDocument()`; `:601` `phase toBe("squad")`; `:602` `expect(useGame.getState().game).toEqual(game)`. The click is on `getByRole("button", { name: "Menu principal" })` (`:595`), which throws unless exactly one button has that exact name. The test goes through `<App />` (L-003). | PASS |
| C2 | `check:layout` exits 0 with 16 screens; `squad` and `squadOffer` still do not scroll with the new button | `npm run check:layout` exit 0, `layout: as 16 telas cabem em 400 × 700 px` | `scripts/layout-check.mjs:288` `await measure("squad")`; `:397` `await measure("squadOffer")`; `:420` required list includes `"squad"` and `"squadOffer"`. Run output: both at `scrollHeight 700 scrollWidth 400` | PASS |

## Coverage

Under `light` the join is not a gate step. The row was re-read against its proof.

| Set (size) | Recomputed from | Member -> proof | Unproven |
| --- | --- | --- | --- |
| round trip (2) | `Squad.tsx:350` `onClick={goHome}` → `store.ts:702-704` `set({ phase: "home" })`; «Continuar» → `continueGame` (`store.ts:684`), which reads the in-memory `game` | Elenco → menu C1 (`:596`, `:598`) · menu → Elenco C1 (`:600-602`) | - |

## Swept existing

None. Every `Swept` row in `checks.md` is `n/a` or points to C1.

## Code read

- `src/ui/Squad.tsx:83` subscribes to the existing store action `goHome`, and `:350` adds `<button onClick={goHome}>Menu principal</button>` to the `action-bar`, after «Copa». Nothing else changed (`git diff --numstat 86e3475..a2ce79b`: `Squad.tsx` 3 added and 0 removed, `Squad.test.tsx` 19 added and 0 removed).
- `goHome` does not write the save (`store.ts:702-704`). That is safe here: «Continuar» reopens from the in-memory `game`, which is what C1 `:602` asserts. It follows the same path «Sobre» already uses (`src/ui/About.tsx:17`, `:39`).
- Product name: the button text is «Menu principal», with no third-party brand (AGENTS.md).
- No pre-existing test changed its expected value; the diff only adds lines to test files.

## Findings

None that affect the verdict.

1. **Note: `game toEqual(game)` compares a deep copy of the fixture, not identity.** `src/ui/Squad.test.tsx:602` would also pass if the round trip swapped in a structurally equal game. For this check that is enough: the claim is «o jogo igual ao de antes», and the heading at `:600` pins the club.

## Gate

- Named-proof batch: 7 passed, 0 failed (1 of them this feature's), 4 files.
- `npx vitest run`: 608 passed, 0 failed, 48 files.
- `npm run check:layout`: exit 0, `layout: as 16 telas cabem em 400 × 700 px`.
