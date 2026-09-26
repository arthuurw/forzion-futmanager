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

### L-007 - When a check says available, the fixture must include an unavailable member so exclusion is actually exercised.
- signal: `spec_precision_gap` · recurrence: 2 feature(s) · scope: `tests` · harmful: 0
- features: partida-ao-vivo, elenco-mercado-financas
- evidence: checks.md C14 (tests) (+1 more)
- last seen: 2026-09-26T22:12:05Z

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

### L-005 - A check that says every/all members of a set needs a table-driven proof over the whole set, not one sample.
- signal: `spec_precision_gap` · recurrence: 1 feature(s) · scope: `checks` · harmful: 0
- features: partida-ao-vivo
- evidence: checks.md C47 (checks)
- last seen: 2026-09-26T20:54:52Z

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

### L-009 - A one-way door added during the build needs its own check before the build closes.
- signal: `ac_gap` · recurrence: 1 feature(s) · scope: `checks` · harmful: 0
- features: elenco-mercado-financas
- evidence: plan.md Landing door 5 / src/engine/finance.ts:121 (checks)
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

## Quarantined (failed when applied - ignore)

A confirmed lesson that recurred alongside failure. Kept for the maintainer to review.

_none_
