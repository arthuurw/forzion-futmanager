# LESSONS - auto-maintained by scripts/lessons.py

> Machine-owned. Do NOT hand-edit. Changes are overwritten on the next `lessons.py` write.
> Canonical state lives in `.specs/lessons.json`. Edit lessons only via the script.
> promote_threshold=2 distinct features · window_days=45 · quarantine_threshold=2

## Confirmed (load these at Plan/Checks)

Corroborated across multiple features. Safe to apply as guidance.

_none_

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

### L-003 - Assert the caller wiring of a helper through its entry point, not only the helper in isolation
- signal: `spec_precision_gap` · recurrence: 1 feature(s) · scope: `engine` · harmful: 0
- features: nucleo-liga-partida
- evidence: C27 / src/engine/season.ts:34 (engine)
- last seen: 2026-09-26T19:16:04Z

### L-004 - Compute expected values in tests independently of the production helper under test
- signal: `spec_precision_gap` · recurrence: 1 feature(s) · scope: `tests` · harmful: 0
- features: nucleo-liga-partida
- evidence: C7 / src/ui/ChooseClub.test.tsx (tests)
- last seen: 2026-09-26T19:16:04Z

## Quarantined (failed when applied - ignore)

A confirmed lesson that recurred alongside failure. Kept for the maintainer to review.

_none_
