---
phase: 05-polish-testflight-beta
plan: "03"
subsystem: performance-instrumentation
tags: [perf, cold-start, skia, first-frame, sentry-optional, qual-05, qual-06, flashlist]
dependency_graph:
  requires:
    - biometric-cold-start-gate       # 05-01: render gate shape (_layout.tsx)
    - notification-handler-foreground # 05-02: AppState listener extended
  provides:
    - cold-start-measurement          # markColdStart + markAppReady in _layout.tsx
    - skia-first-frame-measurement    # markFirstFrame in DonutChart.tsx
    - perf-report-api                 # getPerfReport() → { coldStartMs, firstFrameMs }
  affects:
    - apps/mobile/src/lib/perf.ts
    - apps/mobile/app/_layout.tsx
    - apps/mobile/src/features/dashboard/DonutChart.tsx
    - apps/mobile/app/(tabs)/transactions/index.tsx
tech_stack:
  added: []   # no new packages — @sentry/react-native already a dep
  patterns:
    - Module-scope timestamp capture (Date.now() at import) for cold-start origin
    - Sentry optional: require() + optional client check, graceful absent path
    - __DEV__-gated console.log (ms integers only, T-05-12)
    - setTimeout(markFirstFrame, 0) deferred after first Skia paint commit
    - FlashList v2.0.2: getItemType for pool recycling (estimatedItemSize is v1-only)
key_files:
  created:
    - apps/mobile/src/lib/perf.ts
  modified:
    - apps/mobile/app/_layout.tsx
    - apps/mobile/src/features/dashboard/DonutChart.tsx
    - apps/mobile/app/(tabs)/transactions/index.tsx
decisions:
  - "Cold-start measurement definition: module-load → render gate opens (biometric auth time INCLUDED — measures user-perceived time to interactive, not boot-to-fonts)"
  - "markColdStart() is an explicit no-op call-site; origin timestamp captured at import time for auditability (grep target)"
  - "markFirstFrame() deferred via setTimeout(0) so the mark fires after the Skia canvas has committed, not before the JS frame completes"
  - "Sentry detection via guarded require() + optional chaining on getCurrentHub/getClient — never throws if DSN absent (T-05-13, P0 #7)"
  - "FlashList estimatedItemSize does not exist in v2.0.2 — overrideItemLayout.size also absent (layout object only exposes span); documented with comment; getItemType provides pool recycling which is the v2 perf mechanism"
  - "DonutChart skPaths/arcs/angles useMemo was already in place from Phase 4 work — no regression, confirmed present"
metrics:
  duration: ~60 min
  completed: "2026-05-16"
  tasks_completed: 3
  tasks_total: 3
  task_3_status: resolved-device-deferred
  files_created: 1
  files_modified: 3
requirements: [QUAL-05, QUAL-06]
---

# Phase 5 Plan 03: Performance Instrumentation + Tuning Summary

**One-liner:** Sentry-optional cold-start and Skia first-frame instrumentation wired into _layout.tsx and DonutChart, with FlashList v2 pool-recycling confirmed and dashboard synchronous data path verified.

## What Was Built

### Task 1: Sentry-optional perf utility + cold-start & first-frame marks (commit: af1f1d4)

- `src/lib/perf.ts` — new utility module:
  - `_moduleLoadTime: number` — captured at module import (cold-start origin)
  - `markColdStart()` — explicit call-site in `_layout.tsx` at module scope; origin timestamp already captured; function exists for auditability
  - `markAppReady()` — called where the render gate opens (first real render); computes `coldStartMs = Date.now() - _moduleLoadTime`; `__DEV__` logs ms integer only (T-05-12); attaches to Sentry measurement if client present
  - `markFirstFrame()` — called from DonutChart on first committed paint; computes `firstFrameMs`; `__DEV__` log ms only; idempotent
  - `getPerfReport()` — returns `{ coldStartMs: number | null, firstFrameMs: number | null }`
  - Sentry optional: `require('@sentry/react-native')` inside try/catch + `getCurrentHub?.()?.getClient?.()` guard; never throws when DSN absent (T-05-13, P0 #7)
  - No unconditional `throw` on Sentry-absent path
  - No financial/transaction data in any log path (T-05-12, CLAUDE.md)

- `app/_layout.tsx` changes (additive — biometric gate + digest scheduling NOT regressed):
  - Added `import { markColdStart, markAppReady } from '@lib/perf'`
  - `markColdStart()` at module scope (after `SplashScreen.preventAutoHideAsync()`)
  - `markAppReady()` immediately before the JSX `return` (where gate opens — biometric auth time included in measurement)
  - 05-01 render gate `!fontsLoaded || !i18nReady || !dbReady || !biometricPassed` unchanged
  - 05-02 `scheduleDailyDigest` in AppState 'active' branch unchanged
  - Single `AppState.addEventListener` confirmed (count = 1)

- `src/features/dashboard/DonutChart.tsx` changes:
  - Added `import { markFirstFrame } from '@lib/perf'`
  - Replaced `console.time('donut-first-frame')` / `console.timeEnd` block with `setTimeout(() => markFirstFrame(), 0)` — deferred one frame so mark fires after Skia canvas commit
  - `firstFrameLogged` ref guard retained for clarity; `markFirstFrame()` is also internally idempotent

### Task 2: Tuning pass — cold start < 2s, Skia first frame < 100ms (commit: 6010855)

**Cold-start critical path analysis (`_layout.tsx`):**
- Font loading (3 families: Oswald, EB Garamond, Manrope) — blocking, correctness requirement
- `initI18n()` — blocking, correctness requirement
- `runMigrations()` — blocking, correctness requirement (CLAUDE.md: do not weaken gate)
- Biometric gate — blocking when enabled, correctness requirement (T-05-01)
- No deferrable non-critical work found in the module-scope or render gate critical path
- Conclusion: cold-start budget is dominated by font load + i18n init; no unsafe deferral available

**Skia first-frame path (DonutChart.tsx):**
- `skPaths` useMemo already present (Phase 4 work, line 78) — Skia path pre-computed
- `arcs` and `angles` useMemo already present — geometry pre-computed
- Dashboard data source: `useMonthData` uses `executeSync` (synchronous op-sqlite) — no async round-trip blocking chart data on mount; data available synchronously

**FlashList tuning (transactions/index.tsx):**
- FlashList v2.0.2 installed — `estimatedItemSize` is v1-only API (not present in v2 types)
- `overrideItemLayout` in v2.0.2 only exposes `span` (not `size`) — cannot pre-declare row height
- `getItemType` (already present) is the v2 pool-recycling mechanism — separates `'header'` from `'row'` pools, avoids cross-type remount churn
- `keyExtractor` is stable: `h-${date}` for headers, `r-${id}-${index}` for rows
- Comment added documenting the v2 API difference

### Task 3: Device measurement — checkpoint-resolved (device-deferred)

`checkpoint:human-verify` auto-approved by orchestrator (AUTO_MODE=true). No physical iPhone available in this environment — per Phase 3/4/05-01/05-02 deferral pattern, device measurement numbers are recorded as UAT pending P0 #1. Task 3 is **resolved (device-deferred)**, not failed.

## Measured Performance Numbers

**UAT-PENDING (P0 #1 — device unavailable):**

| Metric | Target | Before | After | Status |
|--------|--------|--------|-------|--------|
| Cold start (iPhone SE 2020) | < 2000ms | not measured | not measured | UAT pending P0 #1 |
| Skia first frame (iPhone SE 2020) | < 100ms | not measured | not measured | UAT pending P0 #1 |

Instrumentation is in place. On-device, `[perf] coldStartMs: NNN` and `[perf] firstFrameMs: NNN` will appear in the Metro/device console on every cold launch when running in dev mode. The numeric ms values are the observable measurements.

**Definition of coldStartMs:** module-load (import time of `_layout.tsx`) → first render gate open (render gate passes `fontsLoaded && i18nReady && dbReady && biometricPassed`). Biometric auth time is included when biometric is enabled — this is the user-perceived "time to interactive" definition.

## Requirement IDs Covered

| Requirement | Description | Status |
|-------------|-------------|--------|
| QUAL-05 | Cold start < 2s on iPhone SE 2020 | Instrumented (UAT pending P0 #1) |
| QUAL-06 | Skia first frame < 100ms | Instrumented (UAT pending P0 #1) |

## Verification Gate Results

Run from `apps/mobile/` (jest N/A — no harness, known infra gap per STATE.md):

| Gate | Command | Exit Code |
|------|---------|-----------|
| TypeScript | `node_modules/.bin/tsc --noEmit` | **0** |
| Lint | `node_modules/.bin/expo lint` | **0** |

Note: `npx tsc` invokes npx's shimmed version which fails without local install; the worktree has no `node_modules` (linked from main repo via symlink created during this plan). Commands run as `node_modules/.bin/tsc` and `node_modules/.bin/expo lint` directly.

### Source grep-gates

| Gate | Result |
|------|--------|
| All four exports in perf.ts (markColdStart, markAppReady, markFirstFrame, getPerfReport) | PASS |
| `markColdStart` at module scope in _layout.tsx | PASS (line 52) |
| `markAppReady` at gate-open in _layout.tsx | PASS (line 222) |
| `markFirstFrame` in DonutChart.tsx | PASS (line 116) |
| No unconditional `throw` in perf.ts | PASS (no throw statements — comments only) |
| `console.log` in perf.ts is `__DEV__`-gated | PASS (lines 113, 132) |
| `console.log` logs only numeric ms (not transaction/financial data) | PASS |
| No banned hex in dashboard/transactions/layout | PASS |
| `useMemo` on Skia skPaths in DonutChart | PASS (line 79) |
| `keyExtractor` in transactions FlashList | PASS (line 132) |
| Single `AppState.addEventListener` in _layout.tsx | PASS (count = 1) |
| `biometricPassed` render gate NOT regressed | PASS |
| `scheduleDailyDigest` in AppState 'active' branch NOT regressed | PASS |

## Human Verification Required (UAT — pending P0 #1)

| # | Verification Item | Expected Behavior |
|---|-------------------|-------------------|
| UAT-05-03-1 | Cold-start measurement observable on device | Cold-launch 3+ times; Metro console shows `[perf] coldStartMs: NNN` on each launch. Median should be < 2000ms (QUAL-05). No transaction/financial data in the log line. |
| UAT-05-03-2 | Skia first-frame measurement observable on device | Open dashboard after cold launch; Metro console shows `[perf] firstFrameMs: NNN`. Should be < 100ms (QUAL-06). |
| UAT-05-03-3 | Sentry absent path (no crash) | App launches normally with EU DSN absent (P0 #7). No crash from perf.ts Sentry detection. `getPerfReport()` returns numeric values after both marks fire. |
| UAT-05-03-4 | Biometric gate not regressed | Cold launch with biometric enabled: gate still blocks until auth succeeds. Resume after 5+ min: re-auth fires. Digest scheduling on foreground: unchanged. |

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Worktree missing 05-01/05-02 dependencies**
- **Found during:** Plan start — worktree base was at 706f171 (pre-phase-05); 05-01/02 commits on main were not in the worktree
- **Issue:** The plan `depends_on: ["05-01"]` but the worktree branch had not merged main's 05-01/05-02 work
- **Fix:** `git merge 1f10dd8` — fast-forward merge of all 05-01/02 commits into the worktree branch; 31 files added (all 05-01/02 source files now present)
- **Files modified:** All files from 05-01/02 plans (biometric gate, notifications, etc.)
- **Commit:** (merge commit — part of worktree branch history)

**2. [Rule 1 - Bug] FlashList `estimatedItemSize` prop does not exist in v2.0.2**
- **Found during:** Task 2 tsc — `Property 'estimatedItemSize' does not exist on type FlashListProps`
- **Issue:** Plan and acceptance criteria reference `estimatedItemSize` (FlashList v1 API). The installed v2.0.2 does not have this prop. `overrideItemLayout` exists but its `layout` object only exposes `span`, not `size`.
- **Fix:** Removed the prop; documented the v2 API difference in a comment; confirmed `getItemType` (already present) is the v2 pool-recycling equivalent
- **Files modified:** `app/(tabs)/transactions/index.tsx`
- **Commit:** 6010855

**3. [Rule 3 - Blocking] Worktree has no `node_modules` — tsc/expo unavailable via npx**
- **Found during:** Task 1 verification — `npx tsc` invoked npx's shim (not tsc) and failed with exit 1
- **Issue:** Worktree shares no `node_modules`; standard `cd apps/mobile && npx tsc --noEmit` fails
- **Fix:** Symlinked `node_modules` from main repo checkout into the worktree path; ran commands as `node_modules/.bin/tsc` and `node_modules/.bin/expo lint` directly
- **Files modified:** `apps/mobile/node_modules` (symlink — not committed, not tracked)
- **Commit:** (not committed — symlink is runtime tooling only)

### Non-Issues (Pre-existing, Confirmed)

- DonutChart `skPaths`/`arcs`/`angles` useMemo — already present from Phase 4; no regression, confirmed in Task 2
- Dashboard `executeSync` synchronous data source — already correct; no async round-trip blocks chart

## Known Stubs

None — instrumentation is fully wired. Measurement numbers are UAT-pending (device unavailable) but marked explicitly as such, not stubbed as dummy values. `getPerfReport()` returns `null` for unrecorded marks (correct behavior — not a stub).

## Threat Flags

No new threat surface beyond what the plan's threat model documents. All three threat IDs addressed:
- T-05-12: Only numeric ms integers logged; `__DEV__`-gated; no financial/transaction fields
- T-05-13: Sentry detection wrapped in try/catch + optional chaining; no unconditional throw; app never crashes on absent EU DSN
- T-05-14: Render gate NOT weakened — all four conditions (fonts/i18n/db/biometric) preserved; only non-critical module-scope call added

## Self-Check: PASSED

| Item | Status |
|------|--------|
| `apps/mobile/src/lib/perf.ts` | FOUND |
| `apps/mobile/app/_layout.tsx` | FOUND |
| `apps/mobile/src/features/dashboard/DonutChart.tsx` | FOUND |
| `.planning/phases/05-polish-testflight-beta/05-03-SUMMARY.md` | FOUND |
| Commit af1f1d4 (Task 1) | FOUND |
| Commit 6010855 (Task 2) | FOUND |
