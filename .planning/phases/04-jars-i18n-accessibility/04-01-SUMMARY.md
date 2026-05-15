---
phase: 04-jars-i18n-accessibility
plan: "01"
subsystem: jars
tags: [sqlite, zustand, i18n, expo-router, skia, accessibility]
dependency_graph:
  requires: []
  provides:
    - migration-v5-jars-tables
    - jarsRepo-CRUD-API
    - jar-create-sheet
    - jars-tab-route
    - jar-list-screen
    - jar-detail-screen
    - jars-i18n-namespace-en-uk
  affects:
    - apps/mobile/src/lib/db/schema.sql.ts
    - apps/mobile/src/lib/db/migrations.ts
    - apps/mobile/src/lib/i18n/index.ts
    - apps/mobile/app/(tabs)/_layout.tsx
tech_stack:
  added: []
  patterns:
    - op-sqlite executeSync parameter binding
    - Zustand open/close store (mirrors recategorizeStore)
    - BottomSheetPrimitive modal pattern
    - expo-router useFocusEffect data reload
    - Skia SVG path icon idiom (strokeWidth 1.6, round caps)
key_files:
  created:
    - apps/mobile/src/lib/db/schema.sql.ts (appended SCHEMA_005)
    - apps/mobile/src/lib/db/migrations.ts (version:5 entry)
    - apps/mobile/src/features/jars/types.ts
    - apps/mobile/src/features/jars/jarsRepo.ts
    - apps/mobile/src/features/jars/jarsRepo.test.ts
    - apps/mobile/src/features/jars/jarStore.ts
    - apps/mobile/src/features/jars/JarCreateBottomSheet.tsx
    - apps/mobile/src/features/jars/JarListScreen.tsx
    - apps/mobile/src/features/jars/JarRow.tsx
    - apps/mobile/src/features/jars/JarDetailScreen.tsx
    - apps/mobile/src/design/icons/jars/index.tsx
    - apps/mobile/app/(tabs)/jars.tsx
    - apps/mobile/app/jars/[id].tsx
    - apps/mobile/src/i18n/locales/en/jars.json
    - apps/mobile/src/i18n/locales/uk/jars.json
  modified:
    - apps/mobile/src/lib/i18n/index.ts
    - apps/mobile/src/design/icons/tabs/index.tsx
    - apps/mobile/app/(tabs)/_layout.tsx
decisions:
  - "JarCreateBottomSheet mounted from JarListScreen (not root app/_layout.tsx) to avoid ownership conflict with plan 04-03 — plan spec directive"
  - "ruleJson default: {kind:'roundup',unitCents:100} — D-01 €1 round-up tier"
  - "JarDetailScreen uses Stack.Screen screen-local title — no root _layout.tsx edit needed (expo-router file-based routing)"
  - "jarsRepo functions accept optional DB arg (defaults to getDB()) — enables isolated node test DBs without mocking"
  - "UK jars.json is real first-pass translation (95% values differ from EN) — audited parity gate is 04-03's job"
  - "Sweep CTA on detail screen is a disabled placeholder — 04-02 wires actual round-up sweep logic"
metrics:
  duration: "~20 minutes"
  completed_date: "2026-05-15T17:39:02Z"
  tasks_completed: 3
  files_created: 15
  files_modified: 3
---

# Phase 4 Plan 01: Jars Foundation Slice Summary

**One-liner:** op-sqlite migration v5 with jars+jar_contributions tables, Zustand create sheet, 6-icon Skia SVG picker, EN+UK i18n namespace, and expo-router Jars tab with list+detail screens wired end-to-end.

## Tasks Completed

| Task | Name | Commit | Key Files |
|------|------|--------|-----------|
| 1 | Migration v5 + jarsRepo + tests | 3384bee | schema.sql.ts, migrations.ts, jarsRepo.ts, jarsRepo.test.ts, types.ts |
| 2 | Jar store + create sheet + icons + i18n | cb14f37 | jarStore.ts, JarCreateBottomSheet.tsx, jars/index.tsx, en+uk jars.json, i18n/index.ts |
| 3 | Jars tab + list + detail screens | 3ac2ac5 | (tabs)/_layout.tsx, jars.tsx, [id].tsx, JarListScreen.tsx, JarRow.tsx, JarDetailScreen.tsx |

## Verification Results

- `cd apps/mobile && npx tsc --noEmit` — EXIT 0
- `cd apps/mobile && npx expo lint` — EXIT 0
- `grep SCHEMA_005 schema.sql.ts migrations.ts` — declared, imported, wired version:5
- `CREATE TABLE IF NOT EXISTS` count in schema.sql.ts: 7 (+2 for jars + jar_contributions)
- EN/UK jars.json key parity: PASS (identical 20-key sets)
- UK translation coverage: 95% values differ from EN (real first-pass, not stubs)
- `testID="jar-ring-slot"` present in JarDetailScreen with 04-02 deferral comment
- `JarDetailScreen` hero balance uses `TYPE.displayL` (Oswald family)
- `app/_layout.tsx` (root) NOT in `git diff` — ownership isolation preserved
- All interactive elements have `accessibilityRole` + `accessibilityLabel`
- No BANNED_COLORS hex literals in any new file

## Deviations from Plan

### Auto-fixed Issues

None.

### Design Decisions Within Discretion

**1. JarRow progress bar** — Added a thin 4pt progress bar in JarRow showing balance/target ratio. Not specified in the plan but improves the list UX without adding behaviour (purely visual). No plan conflict.

**2. Sweep CTA on detail screen** — Rendered as a `disabled` Pressable (opacity 0.4, no onPress) rather than omitting entirely. Gives 04-02 a clear hook point and improves visual completeness. The `testID="jar-ring-slot"` is on the ring area above it as specified.

**3. Empty state** — Implemented inline in JarListScreen (text + CTA Pressable) rather than reusing the `EmptyState` component, which requires a `variant` enum and specific translation key contracts tied to the dashboard. Avoids coupling the jars namespace to dashboard component internals.

## Known Stubs

| Stub | File | Reason |
|------|------|--------|
| `testID="jar-ring-slot"` + ring placeholder `View` | JarDetailScreen.tsx:80 | Animated Skia ring deferred to 04-02 per plan spec |
| Sweep CTA `disabled` | JarDetailScreen.tsx:143 | Round-up sweep logic deferred to 04-02 per plan spec |
| `jarsRepo.test.ts` cannot run | jarsRepo.test.ts | No jest harness (STATE.md [[jest-harness-missing]]); file typechecks and lints clean |

## Threat Surface Scan

No new network endpoints, auth paths, or trust-boundary violations introduced. All jars data is local-only (SQLite). SQL parameter binding used throughout jarsRepo (T-04-01-01 mitigated). Catch blocks log `error.name` only, never jar name or amounts (T-04-01-02 mitigated). `CREATE TABLE IF NOT EXISTS` ensures idempotent migration re-runs (T-04-01-03 mitigated).

## Self-Check: PASSED

Verified:
- `3384bee` exists: `git log --oneline` confirms feat(04-01): migration v5 jars+jar_contributions + jarsRepo + tests
- `cb14f37` exists: feat(04-01): jar store + create sheet + icons + jars i18n namespace
- `3ac2ac5` exists: feat(04-01): jars tab + list + detail screens + 4th tab bar icon
- All 15 created files present on disk
- tsc exits 0; expo lint exits 0
- SCHEMA_005 in schema.sql.ts and migrations.ts
- UK translation 95% different from EN
- testID="jar-ring-slot" present in JarDetailScreen
- Root app/_layout.tsx unmodified
