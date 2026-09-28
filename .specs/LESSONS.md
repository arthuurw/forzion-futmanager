# LESSONS - auto-maintained by scripts/lessons.py

> Machine-owned. Do NOT hand-edit. Changes are overwritten on the next `lessons.py` write.
> Canonical state lives in `.specs/lessons.json`. Edit lessons only via the script.
> promote_threshold=2 distinct features · window_days=45 · quarantine_threshold=2

## Confirmed (load these at Plan/Checks)

Corroborated across multiple features. Safe to apply as guidance.

### L-003 - Assert the caller wiring of a helper through its entry point, not only the helper in isolation
- signal: `spec_precision_gap` · recurrence: 2 feature(s) · scope: `engine` · harmful: 0
- features: nucleo-liga-partida, elenco-mercado-financas
- evidence: C27 / src/engine/season.ts:34 (engine) (+1 more)
- last seen: 2026-09-26T22:12:06Z

### L-005 - A check that says every/all members of a set needs a table-driven proof over the whole set, not one sample.
- signal: `spec_precision_gap` · recurrence: 2 feature(s) · scope: `checks` · harmful: 0
- features: partida-ao-vivo, copa-nacional
- evidence: checks.md C47 (checks) (+1 more)
- last seen: 2026-09-27T15:59:05Z

### L-007 - When a check says available, the fixture must include an unavailable member so exclusion is actually exercised.
- signal: `spec_precision_gap` · recurrence: 2 feature(s) · scope: `tests` · harmful: 0
- features: partida-ao-vivo, elenco-mercado-financas
- evidence: checks.md C14 (tests) (+1 more)
- last seen: 2026-09-26T22:12:05Z

### L-009 - A one-way door added during the build needs its own check before the build closes.
- signal: `ac_gap` · recurrence: 2 feature(s) · scope: `checks` · harmful: 0
- features: elenco-mercado-financas, multiplas-temporadas
- evidence: plan.md Landing door 5 / src/engine/finance.ts:121 (checks) (+1 more)
- last seen: 2026-09-27T01:23:53Z

## Candidates (under observation - do NOT load as guidance yet)

Seen once or not yet corroborated. Tracked, not trusted.

### L-001 - Prove a screen state driven by storage by writing the stored document and rendering the app, not by setting store state directly
- signal: `spec_precision_gap` · recurrence: 1 feature(s) · scope: `ui-persistence` · harmful: 0
- features: nucleo-liga-partida
- evidence: C36 / src/store.ts:77 (ui-persistence)
- last seen: 2026-09-26T19:16:04Z

### L-002 - When a criterion names columns shown on screen, assert the rendered header set, not only the engine rows
- signal: `spec_precision_gap` · recurrence: 1 feature(s) · scope: `ui` · harmful: 0
- features: nucleo-liga-partida
- evidence: C28 / src/ui/Table.tsx:4 (ui)
- last seen: 2026-09-26T19:16:04Z

### L-004 - Compute expected values in tests independently of the production helper under test
- signal: `spec_precision_gap` · recurrence: 1 feature(s) · scope: `tests` · harmful: 0
- features: nucleo-liga-partida
- evidence: C7 / src/ui/ChooseClub.test.tsx (tests)
- last seen: 2026-09-26T19:16:04Z

### L-006 - A selection-rule check must name who takes the slot and the no-alternative fallback, with a fixture where the right and the likely wrong pick differ.
- signal: `spec_precision_gap` · recurrence: 1 feature(s) · scope: `checks` · harmful: 0
- features: partida-ao-vivo
- evidence: checks.md C48 (checks)
- last seen: 2026-09-26T20:54:53Z

### L-008 - When a check quotes a user-facing message, assert the exact text where it is rendered or mapped, not only the engine reason code.
- signal: `ac_gap` · recurrence: 1 feature(s) · scope: `ui` · harmful: 0
- features: elenco-mercado-financas
- evidence: C23 / src/store.ts:49 (ui)
- last seen: 2026-09-26T22:12:06Z

### L-010 - Give every displayed value a non-zero fixture so a miswired field cannot pass by showing zero.
- signal: `spec_precision_gap` · recurrence: 1 feature(s) · scope: `tests` · harmful: 0
- features: elenco-mercado-financas
- evidence: C9 / src/ui/Finance.test.tsx (tests)
- last seen: 2026-09-26T22:12:06Z

### L-011 - When a fix adds a test to strengthen a check, add it as a Proof line on that check too, or the check's proof never runs it.
- signal: `spec_precision_gap` · recurrence: 1 feature(s) · scope: `checks` · harmful: 0
- features: elenco-mercado-financas
- evidence: C7 / checks.md:35 (checks)
- last seen: 2026-09-26T22:19:36Z

### L-012 - When one piece of state feeds several screens, prove it renders on each screen that can trigger it.
- signal: `spec_precision_gap` · recurrence: 1 feature(s) · scope: `ui` · harmful: 0
- features: elenco-mercado-financas
- evidence: C23 / src/ui/Squad.tsx:260 (ui)
- last seen: 2026-09-26T22:19:36Z

### L-013 - A check that pins a seed or stream needs an assertion that reproduces the literal formula, not only determinism.
- signal: `spec_precision_gap` · recurrence: 1 feature(s) · scope: `tests` · harmful: 0
- features: multiplas-temporadas
- evidence: C52 / src/engine/migrate.test.ts:131 (tests)
- last seen: 2026-09-27T01:23:53Z

### L-014 - Pin an RNG stream over several draws and assert the rejected alternative gives different values; one draw can coincide.
- signal: `surviving_mutant` · recurrence: 1 feature(s) · scope: `tests` · harmful: 0
- features: multiplas-temporadas
- evidence: C19 / src/engine/rollover.test.ts:126 (F8, F9) (tests)
- last seen: 2026-09-27T01:23:53Z

### L-015 - When a check says a count equals a total, assert it against an independently derived total, not a sum that is equal by construction.
- signal: `spec_precision_gap` · recurrence: 1 feature(s) · scope: `tests` · harmful: 0
- features: copa-nacional
- evidence: C19 / src/engine/cup.test.ts:472 (tests)
- last seen: 2026-09-27T15:59:05Z

### L-016 - Word a check's fixture the way the test builds it; a value read through production code is not a hand-built fixture.
- signal: `spec_precision_gap` · recurrence: 1 feature(s) · scope: `checks` · harmful: 0
- features: copa-nacional
- evidence: C9 / src/engine/rollover.test.ts:434 (checks)
- last seen: 2026-09-27T15:59:05Z

### L-017 - When two criteria gate the same action, add a check for the case where both apply at once.
- signal: `ac_gap` · recurrence: 1 feature(s) · scope: `checks` · harmful: 0
- features: copa-nacional
- evidence: plan.md AC 23 x AC 44 / src/ui/Squad.tsx:312 (checks)
- last seen: 2026-09-27T15:59:05Z

### L-018 - When a rule reads one of two candidate values, build the fixture so the two differ, or the test passes under either reading.
- signal: `spec_precision_gap` · recurrence: 1 feature(s) · scope: `tests` · harmful: 0
- features: gastos-da-ia
- evidence: C1 / src/engine/market.test.ts:486 (ruling 1, purchase salary) (tests)
- last seen: 2026-09-27T17:37:45Z

### L-019 - When a check places one element beside another, assert their shared container, not only that both are present.
- signal: `spec_precision_gap` · recurrence: 1 feature(s) · scope: `ui` · harmful: 0
- features: gastos-da-ia
- evidence: C25 / src/ui/Market.test.tsx:249 (ui)
- last seen: 2026-09-27T17:37:46Z

### L-020 - List in the Superseded table every old assertion over a per-league collection, such as history division records, not only league and club counts.
- signal: `spec_deviation` · recurrence: 1 feature(s) · scope: `checks` · harmful: 0
- features: paises
- evidence: src/engine/rollover.test.ts:402 (verification.md Finding 1) (checks)
- last seen: 2026-09-27T20:03:35Z

### L-021 - Derive superseded expected values under the plan's new defaults, such as a list filter that starts on the user's own country.
- signal: `spec_precision_gap` · recurrence: 1 feature(s) · scope: `checks` · harmful: 0
- features: paises
- evidence: checks.md Superseded row 2 vs AC 18 (verification.md Finding 2) (checks)
- last seen: 2026-09-27T20:03:35Z

### L-022 - When a criterion says every event of a tick plays, assert the exact list of effects, not toContain on one event's effects.
- signal: `spec_precision_gap` · recurrence: 1 feature(s) · scope: `checks` · harmful: 0
- features: ajustes-audio
- evidence: C6 / src/ui/Live.test.tsx:452-454 (verification.md Finding 1) (checks)
- last seen: 2026-09-28T21:06:50Z

### L-023 - Give a browser layout check a fixed seed option so a green run is reproducible and not one random game.
- signal: `spec_precision_gap` · recurrence: 1 feature(s) · scope: `layout` · harmful: 0
- features: ajustes-audio
- evidence: C1/C2 / src/store.ts:266 randomSeed (verification.md Finding 2) (layout)
- last seen: 2026-09-28T21:06:50Z

## Quarantined (failed when applied - ignore)

A confirmed lesson that recurred alongside failure. Kept for the maintainer to review.

_none_
