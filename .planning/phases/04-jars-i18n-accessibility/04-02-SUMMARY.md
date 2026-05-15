---
phase: 04-jars-i18n-accessibility
plan: "02"
subsystem: jars
tags: [jars, round-up, skia, animation, i18n, sweep]
dependency_graph:
  requires: ["04-01"]
  provides: ["JarRing", "sweepToJar", "roundUpCents", "pendingContributionCents", "jarRingArcPath"]
  affects: ["JarDetailScreen", "JarRow", "jars.json en/uk"]
tech_stack:
  added: []
  patterns:
    - "D-05: canvas-opacity crossfade 300ms Easing.out(Easing.cubic) — no usePathInterpolation"
    - "node assert test idiom (no jest) for pure modules"
    - "sweepToJar: aggregate round-up writer with lastSweepAt cutoff"
key_files:
  created:
    - apps/mobile/src/features/jars/roundUp.ts
    - apps/mobile/src/features/jars/roundUp.test.ts
    - apps/mobile/src/features/jars/jarRingGeometry.ts
    - apps/mobile/src/features/jars/jarRingGeometry.test.ts
    - apps/mobile/src/features/jars/sweepRepo.ts
    - apps/mobile/src/features/jars/sweepRepo.test.ts
    - apps/mobile/src/features/jars/JarRing.tsx
  modified:
    - apps/mobile/src/features/jars/JarDetailScreen.tsx
    - apps/mobile/src/features/jars/JarRow.tsx
    - apps/mobile/src/i18n/locales/en/jars.json
    - apps/mobile/src/i18n/locales/uk/jars.json
decisions:
  - "D-04: usePathInterpolation absent from installed react-native-reanimated types (grep confirmed) — D-05 opacity crossfade used"
  - "D-03: EUR-only round-up source enforced via currency='EUR' AND amount_cents<0 filter"
  - "D-01: unitCents parsed from rule_json per jar; defaults to 100 (euro-cent €1)"
  - "JAR-03 partial: round-up method only; fixed-weekly + %-income deferred post-v1 per 04-CONTEXT"
metrics:
  duration: "~30m"
  completed: "2026-05-15"
  tasks_completed: 3
  files_changed: 11
---

# Phase 4 Plan 02: Jars Round-Up Engine + Animated Ring Summary

**One-liner:** Configurable EUR round-up engine, Skia progress ring with 300ms crossfade animation, and manual sweep wired end-to-end into JarDetailScreen.

## Tasks Completed

| # | Name | Commit | Files |
|---|------|--------|-------|
| 1 | Pure round-up engine + jar ring geometry (+ tests) | effaa4a | roundUp.ts, roundUp.test.ts, jarRingGeometry.ts, jarRingGeometry.test.ts |
| 2 | sweepToJar transactional writer | 178f89e | sweepRepo.ts, sweepRepo.test.ts |
| 3 | Animated Skia JarRing + Sweep wiring + i18n | db22079 | JarRing.tsx, JarDetailScreen.tsx, JarRow.tsx, en/uk jars.json |

## What Was Built

### Task 1 — Pure round-up engine + ring geometry
- `roundUpCents(amountCents, unitCents)`: returns 0 for income (>=0), computes next-boundary distance for EUR expenses. D-01 configurable unit (euro-cent 100/500/1000).
- `pendingContributionCents(expenses, unitCents)`: sums round-ups; filters `currency === 'EUR' && amountCents < 0` (D-03 EUR-only).
- `jarRingArcPath(fraction, radius, strokeWidth)`: single progress arc, -pi/2 start (12 o'clock), clockwise sweep, fraction clamped [0,1] (D-04), returns SVG M/A path string for `Skia.Path.MakeFromSVGString`.
- Colocated `*.test.ts` files using node `assert` idiom (no jest per STATE.md).

### Task 2 — sweepToJar transactional writer
- `lastSweepAt(jarId)`: MAX(created_at) over jar_contributions WHERE source='roundup'; returns 0 if none (all-history first sweep).
- `sweepToJar(jarId, now?)`: reads rule_json to get unitCents; queries `amount_cents < 0 AND currency='EUR' AND created_at > lastSweepAt` (D-02 manual, D-03 EUR-only); never selects merchant_name/description (T-04-02-02 PII contract). Zero-pending sweep inserts no row (idempotent). Returns `{ contributedCents, newBalanceCents }`.
- Colocated `sweepRepo.test.ts`: seeded DB with EUR expenses + UAH + income; asserts EUR-only contribution, second sweep = 0, UAH/income excluded.

### Task 3 — Animated Skia JarRing + Sweep wiring + i18n
- `JarRing.tsx`: `<Canvas>` with background track (sage@20%) + progress arc (COLORS.sage). Single `Animated.View` wrapper carries the summarising `accessibilityLabel` + `accessibilityRole="image"`. Child `Path` elements carry no individual a11y labels (Skia canvas contract). Over-funded: ring stays full, `over_funded` label shown in center.
- Animation: `useSharedValue` + `withTiming(1, { duration: 300, easing: Easing.out(Easing.cubic) })` opacity crossfade on fraction change — D-05 locked pattern. `usePathInterpolation` NOT used (see context7 finding below).
- `JarDetailScreen.tsx`: `testID="jar-ring-slot"` placeholder removed; `<JarRing>` rendered; `sweepToJar()` called on Sweep tap; balance state refreshed; `sweep_done` / `sweep_nothing` result message shown. Button disabled during sweep (T-04-02-04 double-tap DoS mitigation). No raw amounts in console.log (CLAUDE.md security rule).
- `JarRow.tsx`: compact 44pt `<JarRing>` thumbnail on the right replaces the old flat progress bar.
- `en/jars.json` + `uk/jars.json`: added `ring_a11y`, `sweep_done`, `sweep_nothing` keys. `over_funded` already existed; key parity maintained (22/23 non-identical values).

## context7 usePathInterpolation Finding (D-04 traceability)

**Finding:** context7 CLI (`ctx7`) is not installed in this environment. The MCP context7 server tools were also unavailable in this execution context. As a fallback, the installed package type definitions were grepped directly:

```
find apps/mobile/node_modules/react-native-reanimated -name "*.d.ts" | xargs grep -l "usePathInterpolation"
-> (no output — usePathInterpolation absent from installed build)

find apps/mobile/node_modules/@shopify/react-native-skia -name "*.d.ts" | xargs grep -l "MakeFromSVGString"
-> found in PathFactory.d.ts, JsiSkPathFactory.d.ts (confirmed present)
```

**Decision:** `usePathInterpolation` is NOT present in the installed react-native-reanimated build. Per D-04: "ONLY use usePathInterpolation if context7 confirms a clean installed API; otherwise use the proven D-05 canvas-opacity crossfade." The D-05 crossfade was used.

**Animation path chosen:** D-05 canvas-opacity crossfade + single `useSharedValue` with `withTiming(1, { duration: 300, easing: Easing.out(Easing.cubic) })`.

## Deviations from Plan

None — plan executed as written. All D-01/D-02/D-03/D-04/D-05 invariants encoded. JAR-03 partial coverage documented (round-up only; fixed-weekly + %-income deferred per 04-CONTEXT).

## Known Stubs

None — sweep is fully wired. The `ring_a11y` i18n key uses interpolation placeholders (`{{balance}}`, `{{target}}`, `{{pct}}`) which are populated at runtime by JarRing.tsx.

## Threat Flags

None — no new network endpoints, auth paths, or schema changes introduced in Task 3. PII contract upheld (no merchant/description column read in sweepRepo; no amounts in production console.log).

## Self-Check: PASSED

- JarRing.tsx exists in worktree at `apps/mobile/src/features/jars/JarRing.tsx`
- JarDetailScreen.tsx: no `jar-ring-slot` testID; contains `<JarRing` and `sweepToJar(`
- en/uk jars.json: key parity PASS (22/23 non-identical values); all new keys present
- tsc --noEmit: exit 0
- expo lint: exit 0
- No BANNED_COLORS in any modified file
- COLORS.sage token used (not raw hex)
- Commits effaa4a, 178f89e, 72a9f67 (fix), db22079 all present in git log
