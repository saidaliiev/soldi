# Phase 4: Jars + i18n + Accessibility - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-05-15
**Phase:** 4-Jars + i18n + Accessibility
**Areas discussed:** Jar mechanics + persistence, Settings + runtime i18n, Translation QA + contrast scope, VoiceOver + dynamic-type contract, merchant_overrides deferral

---

## Round-up rule unit (JAR-03)

| Option | Description | Selected |
|--------|-------------|----------|
| Configurable €1/€5/€10 | Per-jar setting, default nearest-€1 | ✓ |
| Fixed nearest-€1 only | Hardcoded round-to-€1 | |
| Round-up + fixed weekly + % income | All three JAR-03 methods | |

**User's choice:** Configurable €1/€5/€10 (default €1)
**Notes:** Fixed-weekly + %-income explicitly NOT chosen → deferred to post-v1; JAR-03 ships as round-up only with configurable unit (flagged partial coverage in CONTEXT deferred).

---

## Round-up contribution trigger

| Option | Description | Selected |
|--------|-------------|----------|
| Manual "sweep to jar" | User taps Sweep; sums pending round-ups | ✓ |
| Auto at tx-ingest hook | Auto-contribute per new expense | |
| Scheduled weekly | Batch weekly | |

**User's choice:** Manual "sweep to jar"
**Notes:** Deterministic, testable without device/background tasks; no silent balance mutation.

---

## Jar persistence model (op-sqlite v5)

| Option | Description | Selected |
|--------|-------------|----------|
| jars + jar_contributions ledger | Two tables; contribution history | ✓ |
| Single jars table w/ balance | One table, running balance | |

**User's choice:** jars + jar_contributions ledger (migration v5, SCHEMA_005)
**Notes:** Ledger required for JAR-02 old→new ring delta, Phase-5 milestone notifs, undo/audit.

---

## Round-up source-transaction scope

| Option | Description | Selected |
|--------|-------------|----------|
| EUR expenses only | Negative-cents EUR tx only; UAH excluded | ✓ |
| All expenses regardless of currency | Include UAH | |

**User's choice:** EUR expenses only
**Notes:** Honors locked EUR-only / no-currency-segmentation (Phase-1 D-03); mixed-currency round-up undefined.

---

## Settings UI placement

| Option | Description | Selected |
|--------|-------------|----------|
| New Settings route, not a tab | app/settings.tsx via header gear | ✓ |
| New 5th (tabs)/settings.tsx tab | Adds Settings tab | |
| Inline toggle in onboarding/profile | No Settings screen | |

**User's choice:** New stack route `app/settings.tsx`, gear entry from dashboard header
**Notes:** Preserves locked Phase-2 four-tab editorial shell; minimal nav disruption.

---

## Runtime language-switch binding + re-render

| Option | Description | Selected |
|--------|-------------|----------|
| setLanguage + store + root key-bump | Force full remount on switch | ✓ |
| languageDetector + trust i18next reactivity | No remount | |

**User's choice:** setLanguage(lng) + write onboarding.language + root layout key-bump remount
**Notes:** i18next reactivity proven insufficient for module-scope t(), Intl date headers, FlashList sticky headers; brief flash acceptable on explicit action.

---

## UK translation completeness QA loop

| Option | Description | Selected |
|--------|-------------|----------|
| Claude first-pass + tsc key-parity gate + Upwork review | Full ns + parity script + paid native review | ✓ |
| Claude pass only, defer native review | Skip paid QA this phase | |

**User's choice:** Claude first-pass (all ns incl. new jars/settings) + key-parity script gating tsc/CI + paid Upwork native review (reviewer edits = approval artifact)
**Notes:** AI chat response language is model-side, out of i18next scope, does not block SET-02.

---

## a11y scope: focus + Skia + contrast + dynamic-type

| Option | Description | Selected |
|--------|-------------|----------|
| Full contract, audit existing + new | setAccessibilityFocus, Skia summary label, global token contrast sweep, maxFontSizeMultiplier clamp | ✓ |
| New-surface only | Apply only to new jar+settings UI | |

**User's choice:** Full contract, existing + new (QUAL-01..04 = "every screen")
**Notes:** Phase-2 a11y claims treated as unverified; contrast remediated globally in tokens.ts; focus contract standardized in BottomSheetPrimitive.

---

## merchant_overrides remote DDL deferral

| Option | Description | Selected |
|--------|-------------|----------|
| Re-defer to Phase 5/6 | Keep Tier-1 no-op; add explicit ROADMAP line later | ✓ |
| Add a Phase 4 plan | Remote DDL+RLS + wire resolveTier1 now | |
| Accept permanent v1 no-op | Remove deferral; local-only forever | |

**User's choice:** Re-defer to Phase 5/6
**Notes:** Orphaned Phase-3→Phase-4 deferral; planner must repoint STATE.md + 03-VERIFICATION deferred-target to the real later phase. Out of Phase 4 scope.

---

## Claude's Discretion

- Jar progress-ring rendering specifics: pure `jarRingGeometry.ts`+test (DonutChart analog), canvas-opacity crossfade animation, `usePathInterpolation` only if context7 confirms API; clamp display at 100%, over-funded label.
- Exact `rule_json` shape; Settings screen layout beyond language toggle; key-parity script implementation language/location.

## Deferred Ideas

- JAR-03 fixed-weekly + %-of-income top-up methods → post-v1.
- merchant_overrides remote DDL + RLS + resolveTier1 wiring → Phase 5/6 (re-deferred).
- Per-currency / UAH round-up → v1.5 (unchanged, Phase-1 D-03).
