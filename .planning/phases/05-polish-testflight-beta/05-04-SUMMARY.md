---
phase: 05-polish-testflight-beta
plan: "04"
subsystem: eas-testflight-launch
tags: [eas, testflight, sentry-optional, observability, ios, beta-launch]
dependency_graph:
  requires:
    - perf-instrumentation      # 05-03: src/lib/perf.ts Sentry-optional pattern
    - biometric-cold-start-gate # 05-01: _layout.tsx render gate shape
  provides:
    - testflight-eas-profile    # eas.json testflight build + submit lane
    - observability-init        # initObservability() — activates Sentry when DSN present
  affects:
    - apps/mobile/eas.json
    - apps/mobile/src/lib/observability.ts
    - apps/mobile/app/_layout.tsx
tech_stack:
  added: []   # no new packages — @sentry/react-native already a dep
  patterns:
    - Graceful-optional Sentry init (absent DSN = no-op, never throw)
    - Idempotency guard (_initialized flag) on observability init
    - REPLACE_WITH_* placeholder convention for Apple credentials (no secrets in repo)
    - EAS distribution=store profile for TestFlight Internal (D-04)
key_files:
  created:
    - apps/mobile/src/lib/observability.ts
  modified:
    - apps/mobile/eas.json
    - apps/mobile/app/_layout.tsx
decisions:
  - "testflight EAS profile uses distribution=store (TestFlight Internal requires signed IPA, not internal Expo distribution) — Internal distribution in EAS means side-loaded via Expo Go, not TestFlight"
  - "observability.ts no-ops on absent DSN — providing EXPO_PUBLIC_SENTRY_DSN env var later (P0 #7) activates Sentry with zero code changes"
  - "initObservability() called at _layout.tsx module scope before render gate — ensures Sentry is init before perf.ts markAppReady() fires"
  - "beforeBreadcrumb filter drops any breadcrumb with a 'description' data key — prevents financial field names leaking into Sentry (CLAUDE.md security rule)"
  - "REPLACE_WITH_APPLE_ID_BEFORE_SUBMIT placeholders preserved in both submit.testflight and submit.production lanes — Apple IDs filled by user in Task 3 after P0 #3 Apple enrollment"
metrics:
  duration: ~20 min config + launch session 2026-05-16
  completed: "2026-05-16"
  tasks_completed: 3
  tasks_total: 3
  task_1_status: done
  task_2_status: done
  task_3_status: done
  files_created: 1
  files_modified: 2
  testflight_build: "4"
  testflight_build_id: a29159a3-65b4-4b93-82de-4c7241588285
  testflight_ipa: https://expo.dev/artifacts/eas/m5jPUiVShwMVj1gt1f3xJV.ipa
  asc_app_id: "6770086922"
  asc_submission: https://expo.dev/accounts/fartguy/projects/soldi/submissions/86769705-c5c1-405e-9a58-f918c83b4311
  device_uat_status: pending-d04-on-device-confirm
requirements: []
---

# Phase 5 Plan 04: Internal TestFlight Beta Launch Summary

**One-liner:** TestFlight Internal EAS build+submit profile added with Apple placeholder convention, plus a graceful-optional Sentry init wrapper wired at startup. **LAUNCHED 2026-05-16 (session 2):** P0 #3/#4 cleared, 4 EAS build attempts (2 real config bugs fixed), build #4 uploaded to App Store Connect TestFlight. Device D-04 confirm pending.

## Launch Record — 2026-05-16 session 2 (Tasks 2-3 DONE)

P0 #3 (Apple Developer Individual) active; P0 #4 EAS project linked `@fartguy/soldi` (`b842e5f5-...`). Submit auth via App Store Connect API key (`FJ9DL5B479`), non-interactive. ASC app record created → ascAppId `6770086922`. Build #4 `a29159a3` v1.0.0 → submitted to App Store Connect (submission `86769705-...`), Apple processing.

**7 forward-only commits (main):**
| Commit | Fix |
|--------|-----|
| `c139bda` | Removed invalid `@op-engineering/op-sqlite` config plugin (broke `expo config`→`eas init/build`); set real EAS projectId |
| `14b4f42` | eas.json submit.testflight → ASC API key schema (non-interactive) |
| `b3ec257` | ascAppId `6770086922` from App Store Connect record |
| `6dd616d` | Deduped android biometric permissions (eas init artifact) |
| `537250d` | Added `expo-updates` (eas update:configure) |
| `1303ea8` | **Build #1 blocker**: `chat-empty.svg.tsx`→`chat-empty.tsx`, fixed Metro `.svg` assetExt resolution failure in ChatEmptyState |
| `cab1a28` | **Build #3 blocker**: `SENTRY_DISABLE_AUTO_UPLOAD=true` in testflight env (sentry-cli failed: no org, Sentry intentionally skipped) |

**Build attempts:** #1 ba63512c (JS bundle fail, chat-empty) → #3 60f2ff4f (Xcode/Sentry fail) → #4 a29159a3 **finished** → submitted.

**Verification:** `expo export --platform ios` exit 1→0, tsc 0, expo lint 0 (each fix gated locally before rebuild).

**Remaining (UAT, not task-blocking):** Apple processing → user adds self as Internal Tester → installs via TestFlight → D-04 bar (cold launch + biometric gate + dashboard render). Phase-level verification deferred until D-04 device confirm.

---

### (Historical) Original blocked-launch instructions below — superseded by Launch Record above

## What Was Built

### Task 1: Internal TestFlight EAS profile + graceful crash-monitoring wrapper (commit: c033f6f)

**`apps/mobile/eas.json` — testflight build profile:**
- New `build.testflight` profile: `distribution: "store"`, `channel: "testflight"`,
  `ios.resourceClass: "m-medium"`, `autoIncrement: true`, `APP_VARIANT: "production"`,
  `EXPO_PUBLIC_ENV: "production"` — production-like release build targeting TestFlight Internal
- New `submit.testflight` lane: iOS block with `REPLACE_WITH_APPLE_ID_BEFORE_SUBMIT` /
  `REPLACE_WITH_ASC_APP_ID_BEFORE_SUBMIT` / `REPLACE_WITH_APPLE_TEAM_ID_BEFORE_SUBMIT`
  placeholders (filled by user in Task 3 after P0 #3 Apple enrollment)
- Existing `build.production` and `submit.production` lanes unchanged

**`apps/mobile/src/lib/observability.ts` — new file:**
- `initObservability(): void` — exported, idempotent (T-05-17 `_initialized` guard)
- Reads `process.env.EXPO_PUBLIC_SENTRY_DSN` at call time
- Absent or empty DSN → no-op, returns immediately, never throws (T-05-16 / P0 #7)
- Present DSN → initializes `@sentry/react-native` via guarded `require()` + try/catch:
  - `environment`: `APP_VARIANT` env (development / production)
  - `release`: `EXPO_PUBLIC_APP_VERSION ?? '1.0.0'` for crash→build correlation
  - `enableAutoSessionTracking: true`
  - `beforeBreadcrumb` filter: drops any breadcrumb with `data.description` field
    (prevents financial field names entering Sentry — CLAUDE.md security rule)
- Full Sentry init failure (malformed DSN, native module absent) caught silently

**`apps/mobile/app/_layout.tsx` — startup wiring:**
- `import { initObservability } from '@lib/observability'` added
- `initObservability()` called at module scope immediately after `markColdStart()`,
  before the render gate — ensures Sentry is active before `markAppReady()` fires
  so perf measurements enrich into Sentry once EU DSN is provided

## Tasks Blocked on Human-Action (P0 prerequisites)

### Task 2: Apple Developer enrollment + eas init + Apple IDs (BLOCKED — human-action)

These steps have no CLI path Claude can complete — they require the user's Apple identity:

**Step 1 — Apple Developer Program enrollment (P0 #3):**
```
# Enroll at: https://developer.apple.com/programs/enroll/
# Cost: €99/yr (Individual account)
# Wait for status: "Active" (24–48 hours)
```

**Step 2 — EAS project init (P0 #4):**
```bash
cd apps/mobile
eas login          # uses your Expo account (expo.dev)
eas init           # writes real projectId into app.json extra.eas.projectId
```
Confirm the placeholder `REPLACE_WITH_EAS_PROJECT_ID_AFTER_eas_init` in `app.json` is replaced.

**Step 3 — App Store Connect app record:**
```
# In App Store Connect (appstoreconnect.apple.com):
# New App → bundle ID: app.soldi.mobile → name: SOLDI
# Note the ASC App ID (numeric, e.g. 6712345678)
# Note your Apple Team ID (from developer.apple.com → Membership)
```

**Step 4 — (Recommended) Sentry EU DSN (P0 #7):**
```
# Create project at: https://sentry.io (select EU region)
# Copy DSN from: Project Settings → Client Keys → DSN
# Add to apps/mobile/.env: EXPO_PUBLIC_SENTRY_DSN=https://xxx@oXXX.ingest.de.sentry.io/YYY
```
If not provided, the beta runs with graceful no-op observability (acceptable per D-04).

### Task 3: Fill credentials + EAS build + TestFlight upload (BLOCKED — depends on Task 2)

After Task 2 is complete, run:

**Fill Apple IDs in eas.json submit.testflight lane:**
Replace the three `REPLACE_WITH_*` placeholders in `apps/mobile/eas.json` with the real values from Task 2.

**Build:**
```bash
cd apps/mobile
eas build --platform ios --profile testflight
```
Monitor at: https://expo.dev/accounts/[your-account]/projects/soldi/builds

**Submit to TestFlight:**
```bash
eas submit --platform ios --profile testflight --latest
```
Or use the EAS dashboard to submit the completed build.

**TestFlight Internal setup (in App Store Connect):**
```
TestFlight → Internal Testing → Add Build → select the uploaded build
Add Internal Tester: your own Apple ID (iamfknfly@gmail.com)
Wait for processing (typically 5–15 min) → install via TestFlight app on iPhone
```

**D-04 completion bar:** Cold launch + biometric gate + dashboard render — all working from TestFlight.

**Record in SUMMARY update:** build number + ASC build URL.

## Verification Gate Results

Run from `apps/mobile/` (jest N/A — no harness, known infra gap per STATE.md):

| Gate | Command | Exit Code |
|------|---------|-----------|
| JSON validity | `node -e "JSON.parse(...eas.json);JSON.parse(...app.json);console.log('json-ok')"` | **0** (json-ok printed) |
| TypeScript | `node_modules/.bin/tsc --noEmit` | **0** |
| Lint | `node_modules/.bin/expo lint` | **0** |

### Source grep-gates (Task 1 acceptance criteria)

| Gate | Result |
|------|--------|
| `grep -n "testflight" eas.json` — build profile + submit lane | PASS (lines 38, 44, 63) |
| `grep -n "REPLACE_WITH_APPLE_ID" eas.json` — placeholder preserved | PASS (lines 65, 72) |
| `grep -n "REPLACE_WITH_EAS_PROJECT_ID" app.json` — projectId unchanged | PASS (line 74) |
| `grep -n "initObservability" observability.ts _layout.tsx` — export + startup call | PASS |
| `grep -n "throw" observability.ts` — no unconditional throw | PASS (comments only, no statements) |
| `grep -n "_initialized" observability.ts` — idempotency guard | PASS (lines 17, 27, 28) |

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Wrong Sentry ReactNativeOptions property name**
- **Found during:** Task 1 tsc verification
- **Issue:** `autoSessionTracking` does not exist in `@sentry/react-native` `ReactNativeOptions` type; correct name is `enableAutoSessionTracking`
- **Fix:** Renamed property to `enableAutoSessionTracking` in `observability.ts`
- **Files modified:** `apps/mobile/src/lib/observability.ts`
- **Commit:** c033f6f (same task commit — single-pass fix before commit)

**2. [Rule 3 - Blocking] Worktree missing node_modules symlink**
- **Found during:** Plan start
- **Issue:** Worktree has no `node_modules`; tsc/expo unavailable via standard paths
- **Fix:** Symlinked `node_modules` from main repo (same pattern as 05-03 deviation #3)
- **Files modified:** `apps/mobile/node_modules` symlink (not committed — runtime tooling)
- **Commit:** (not committed)

## Known Stubs

None — `observability.ts` is fully wired. DSN-absent path is correct behavior (graceful no-op), not a stub. Build/upload/tester confirmation is human-action pending (Task 2–3), not a stub.

## Threat Flags

No new threat surface beyond the plan's threat model. Threat IDs addressed:

| Threat ID | Mitigation Status |
|-----------|-------------------|
| T-05-15 | DONE — Apple IDs remain REPLACE_WITH_* placeholders in repo; no real credentials committed |
| T-05-16 | DONE — `initObservability()` no-ops on absent DSN; no throw statement; try/catch wraps init |
| T-05-17 | DONE — `_initialized` guard prevents double-init across React re-renders |
| T-05-18 | DONE — `distribution: "store"` + Internal Testing lane only; action forbids external review |
| T-05-SC | N/A — no new packages installed |

## UAT / Launch Pending (Task 2 + 3 — human-action blocked)

| # | Item | Blocked on | Expected |
|---|------|------------|----------|
| UAT-05-04-1 | Apple Developer account Active | P0 #3 enrollment | Status = "Active" at developer.apple.com |
| UAT-05-04-2 | `eas init` writes real projectId to app.json | P0 #4 | `extra.eas.projectId` is a UUID, not the placeholder |
| UAT-05-04-3 | `eas build --profile testflight` succeeds | P0 #3 + #4 | Build appears in EAS dashboard |
| UAT-05-04-4 | Build uploaded to App Store Connect TestFlight | P0 #3 + #4 | Processing complete in TestFlight Internal |
| UAT-05-04-5 | Internal tester (user) installs + runs build | P0 #3 + #4 | Cold launch + biometric gate + dashboard render — D-04 bar |
| UAT-05-04-6 | Sentry active with EU DSN (optional) | P0 #7 | Crash events appear in Sentry EU dashboard |

## Self-Check: PASSED

| Item | Status |
|------|--------|
| `apps/mobile/src/lib/observability.ts` | FOUND |
| `apps/mobile/eas.json` (testflight profile) | FOUND |
| `apps/mobile/app/_layout.tsx` (initObservability wired) | FOUND |
| `.planning/phases/05-polish-testflight-beta/05-04-SUMMARY.md` | FOUND (this file) |
| Commit c033f6f (Task 1) | FOUND |
| tsc exit 0 | VERIFIED |
| expo lint exit 0 | VERIFIED |
| JSON validity (json-ok) | VERIFIED |
