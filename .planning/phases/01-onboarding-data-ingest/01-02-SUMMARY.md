---
phase: 01-onboarding-data-ingest
plan: 02
subsystem: onboarding
tags: [onboarding, ui, reanimated, store, routing, a11y, i18n]
dependency_graph:
  requires:
    - "01-01: @stores/onboarding (useOnboardingStore, DataSource), @components/PressableButton, @lib/i18n, design tokens"
  provides:
    - "@components/SourceTile: staggered-entrance tile with a11y and Reanimated v4"
    - "app/onboarding/data-source.tsx: 4-tile picker writing dataSource to store"
    - "app/onboarding/synthetic.tsx: stub destination screen"
    - "app/onboarding/manual.tsx: stub destination screen"
    - "app/onboarding/monobank.tsx: stub destination screen"
    - "app/onboarding/csv.tsx: stub destination screen"
  affects:
    - "01-03: SyntheticScreen stub replaced with real ingest flow"
    - "01-04: monobank.tsx, csv.tsx, manual.tsx stubs replaced with real ingest flows"
tech_stack:
  added: []
  patterns:
    - "Reanimated v4 useSharedValue + withDelay + withTiming for staggered list entrance"
    - "Pressable style callback for scale + opacity pressed feedback"
    - "expo-router typed literal routes — 4 explicit push paths, no string interpolation"
key_files:
  created:
    - apps/mobile/src/components/SourceTile.tsx
    - apps/mobile/app/onboarding/synthetic.tsx
    - apps/mobile/app/onboarding/manual.tsx
    - apps/mobile/app/onboarding/monobank.tsx
    - apps/mobile/app/onboarding/csv.tsx
  modified:
    - apps/mobile/app/onboarding/data-source.tsx
decisions:
  - "Explicit 4-branch if/else in choose() instead of template literal — satisfies typedRoutes type-check and acceptance criteria grep test"
  - "SourceTile uses Pressable style callback (not Reanimated) for pressed state — simpler, avoids extra shared values per tile"
  - "Icon placeholder 32×32 View (accentSoft) in Phase 1 — Phase 2 SVG wiring task will replace"
metrics:
  duration: "~3 minutes"
  completed_date: "2026-05-13"
  tasks_completed: 2
  files_created: 5
  files_modified: 1
---

# Phase 01 Plan 02: Data-source picker Summary

Replaced the 01-01 stub with a real 4-tile picker (SourceTile component + staggered Reanimated v4 entrances), writing dataSource to the persisted store and pushing explicit typed routes to four new stub destination screens.

## Tasks Completed

| Task | Description | Commit |
|------|-------------|--------|
| 1 | Build SourceTile component with Reanimated v4 staggered entrance, Pressable feedback, a11y | ebadf8c |
| 2 | Implement data-source picker screen + 4 stub destination screens | 5e12878 |

## Verification Gate Results

| Check | Result |
|-------|--------|
| `npx tsc --noEmit` | exit 0 |
| `npx expo lint` | exit 0 (0 errors, 0 warnings) |
| `grep -c "<SourceTile" data-source.tsx` | 4 |
| All 4 literal route paths present | confirmed |
| All 4 destination files exist | confirmed |
| `setCompleted(true)` + `router.replace('/(tabs)')` in all stubs | confirmed |
| No inline hex in any onboarding file | confirmed |
| `minHeight: 88` on SourceTile pressable | confirmed |
| `accessibilityRole` + `accessibilityLabel` on all interactive elements | confirmed |

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Acceptance criteria] Explicit route literals instead of template literal**
- **Found during:** Task 2 acceptance criteria check
- **Issue:** Initial implementation used `router.push(\`/onboarding/${source}\`)` — correct TypeScript behavior (DataSource union prevents injection), but `grep "'/onboarding/synthetic'"` would not match a template literal.
- **Fix:** Changed `choose()` to an explicit 4-branch if/else with string literals. Satisfies typedRoutes, T-01-02-01 mitigation, and acceptance criteria grep test.
- **Files modified:** `app/onboarding/data-source.tsx`
- **Commit:** 5e12878 (same task commit, inline fix)

## Known Stubs

| File | Stub | Reason |
|------|------|--------|
| `app/onboarding/synthetic.tsx` | Calls `setCompleted(true)` + `router.replace('/(tabs)')` directly | Intentional placeholder; plan 01-03 replaces with real synthetic generation flow |
| `app/onboarding/manual.tsx` | Same Continue stub | Intentional; plan 01-04 adds manual entry form |
| `app/onboarding/monobank.tsx` | Same Continue stub | Intentional; plan 01-04 adds token input + sync |
| `app/onboarding/csv.tsx` | Same Continue stub | Intentional; plan 01-04 adds file-picker + parser |
| `SourceTile.iconName` | 32×32 View placeholder (accentSoft) | Intentional; Phase 2 SVG wiring plan will map iconName to real SVG assets |

## Threat Surface Scan

No new network endpoints or auth paths introduced. T-01-02-01 (route literal tampering) mitigated: `choose()` accepts only `DataSource` union values, explicit literals prevent string injection. T-01-02-02 and T-01-02-03 accepted per plan.

## Self-Check: PASSED

All 5 created/modified files exist on disk. Both task commits present in git log:
- ebadf8c: feat(p01-02): add SourceTile component with Reanimated v4 entrance
- 5e12878: feat(p01-02): data-source picker + 4 stub destination screens

## Next Plan Handoff Notes

Plan 01-03 (synthetic ingest) should:
- Replace `app/onboarding/synthetic.tsx` stub with real generator call (from `@lib/synthetic/generator.ts`)
- The stub already calls `setCompleted(true)` + `router.replace('/(tabs)')` — 01-03 keeps this navigation, adds ingest work before it

Plan 01-04 (monobank / csv / manual) should:
- Replace respective stub screens with real ingest UIs
- `SourceTile.iconName` strings are available for Phase 2 SVG mapping: `'sparkle'`, `'pencil'`, `'bank'`, `'file-text'`
