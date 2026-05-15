# Phase 5: Polish + TestFlight Beta - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-05-16
**Phase:** 05-polish-testflight-beta
**Areas discussed:** Biometric gate scope, CSV export shape, Digest notification voice, Beta completion bar

---

## Biometric Gate Scope

| Option | Description | Selected |
|--------|-------------|----------|
| Cold start + 5min resume | FaceID on cold start AND resume if backgrounded >5 min; failed → device passcode, no app retry cap | ✓ |
| Cold start only | Strict to SET-04 wording; lowest friction, weaker security | |
| Cold start + every resume | FaceID every foreground, immediate; max security, highest friction | |

**User's choice:** Cold start + 5min resume
**Notes:** Banking-app standard. CLAUDE.md "every cold start when enabled" is the floor; 5-min resume gating is the locked addition. OS biometric lockout relied on (no app-level retry cap).

---

## CSV Export Shape

| Option | Description | Selected |
|--------|-------------|----------|
| 2 files, share sheet | transactions.csv + jars.csv (incl. ledger + AI categories) via expo-sharing share sheet | ✓ |
| Single combined CSV | One stacked file; simpler flow, awkward mixed schema | |
| Transactions only | Minimal; fails "and jars" requirement text | |

**User's choice:** 2 files, share sheet
**Notes:** `transactions.description` already null by Phase 1 AI-safety design → no PII leak surface. Export is greenfield (only import existed).

---

## Digest Notification Voice

| Option | Description | Selected |
|--------|-------------|----------|
| Editorial, Settings opt-in OFF | EB-Garamond voice, Settings toggle default OFF, in-context permission, zero-spend → "A quiet day" | ✓ |
| Editorial, onboarding opt-in | Same voice, opt-in at onboarding, zero-spend suppressed | |
| Terse system style | Plain system tone, Settings opt-in | |

**User's choice:** Editorial, Settings opt-in OFF
**Notes:** Brand-consistent with locked DigestCard tone (Phase 2 D-07). Permission asked in-context per App Store best practice. Zero-spend day sends "A quiet day — nothing spent" (not suppressed).

---

## Beta Completion Bar

| Option | Description | Selected |
|--------|-------------|----------|
| Closes on LAUNCH | Internal TestFlight build uploaded + ≥1 internal tester; results → Phase 6 DIST-02 | ✓ |
| Closes on RESULTS | 50 users / 7 days / ≥99.5% crash-free; multi-week, Apple-Dev-blocked | |
| External TestFlight launch | Public link live; needs Apple beta review + recruit | |

**User's choice:** Closes on LAUNCH
**Notes:** Resolves ROADMAP↔REQUIREMENTS conflict toward REQUIREMENTS (DIST-02 already maps to Phase 6). Removes multi-week calendar gate from Phase 5; plan 05-04 = beta build+launch, not results.

## Claude's Discretion

- Settings section ordering/composition (extend Phase 4 D-06 pattern)
- expo-notifications scheduling config; NOTIF-02 milestone-crossing detection off jar_contributions ledger
- Perf instrumentation approach; graceful Sentry-absence fallback (P0 #7 EU keys may be unavailable)
- CSV per-entity column schema
- 5-min resume threshold as a constant (not user-configurable)

## Deferred Ideas

- Beta results gate (50/7d/99.5%) → Phase 6 DIST-02
- AI settings UI (model/cost-cap/on-off) — Phase 3 deferral, not in Phase 5 scope, stays deferred
- monobank multi-account picker — scope creep, deferred
- Cost-cap D-24 + Sentry breadcrumb wiring — dependency-blocked on P0 #7, Claude's-discretion graceful-absence design
