---
phase: 05-polish-testflight-beta
plan: "01"
subsystem: security-settings-export
tags: [biometric, faceid, touchid, export, csv, settings, onboarding, security]
dependency_graph:
  requires: []
  provides:
    - biometric-cold-start-gate
    - biometric-resume-gate
    - settings-security-section
    - settings-data-section
    - csv-export-share-sheet
    - onboarding-biometric-opt-in
  affects:
    - app/_layout.tsx
    - src/stores/onboarding.ts
    - src/features/settings/SettingsScreen.tsx
tech_stack:
  added:
    - expo-sharing (^12.0.1 via expo install — first explicit dep)
  patterns:
    - expo-file-system v19 File/Paths API (File.write + Paths.cache)
    - expo-local-authentication authenticateAsync (disableDeviceFallback:false)
    - AppState.addEventListener background/active resume gate
    - Zustand persist biometricEnabled flag inside existing soldi-onboarding blob
key_files:
  created:
    - apps/mobile/src/features/settings/BiometricToggle.tsx
    - apps/mobile/src/features/settings/ExportButton.tsx
    - apps/mobile/src/features/export/exportRepo.ts
    - apps/mobile/app/onboarding/biometric.tsx
  modified:
    - apps/mobile/src/lib/secure.ts
    - apps/mobile/src/stores/onboarding.ts
    - apps/mobile/app/_layout.tsx
    - apps/mobile/src/features/settings/SettingsScreen.tsx
    - apps/mobile/src/i18n/locales/en/settings.json
    - apps/mobile/src/i18n/locales/uk/settings.json
    - apps/mobile/src/lib/i18n/en.json
    - apps/mobile/src/lib/i18n/uk.json
    - apps/mobile/package.json
decisions:
  - "expo-file-system v19 uses File/Paths API (not legacy cacheDirectory/writeAsStringAsync) — rewrote exportRepo to File.write + Paths.cache"
  - "COLORS.border does not exist in token set — used COLORS.textMuted for Switch trackColor false state"
  - "No @features/* path alias in tsconfig — ExportButton uses relative import ../export/exportRepo"
  - "expo-sharing was not in package.json (only transitive) — added explicitly via npx expo install"
  - "Onboarding biometric keys added to base en.json/uk.json (not settings.json) — matches existing onboarding namespace location"
  - "biometricPassed initialised to !biometricEnabled so gate is transparent when feature is disabled"
  - "Cold-start auth loop re-prompts on failure — never renders partial UI (T-05-01 ASVS L1)"
metrics:
  duration: ~50 min
  completed: "2026-05-16"
  tasks_completed: 3
  tasks_total: 3
  task_3_status: resolved-device-deferred
  files_created: 4
  files_modified: 9
requirements: [ONBD-04, SET-01, SET-03, SET-04]
---

# Phase 5 Plan 01: Biometric Gate + Settings Security/Data + CSV Export Summary

**One-liner:** FaceID/TouchID cold-start and 5-min resume gate wired into _layout.tsx render gate, with Settings toggle, onboarding opt-in, and two-file CSV share-sheet export via expo-sharing.

## What Was Built

### Task 1: Biometric persistence + Settings toggle + onboarding opt-in (commit: 3b37c55)

- `src/lib/secure.ts`: `'soldi-biometric'` added to `SecureKey` union (reserved key slot)
- `src/stores/onboarding.ts`: `biometricEnabled: boolean` (default `false`) + `setBiometricEnabled` added to the existing `'soldi-onboarding'` secure-store blob — no second persist store
- `src/features/settings/BiometricToggle.tsx`: Switch bound to `biometricEnabled`; turning ON calls `LocalAuthentication.authenticateAsync` and only persists `true` on success; turning OFF is immediate; auth failure/throw stays `false` silently (CLAUDE.md security rule)
- `app/onboarding/biometric.tsx`: Enable/Skip opt-in screen (ONBD-04); Enable runs the same auth-then-persist path; Skip leaves gate disabled; both navigate to `/(tabs)` via `setCompleted(true)` + `router.replace`
- `src/i18n/locales/en/settings.json` + `uk/settings.json`: Extended from 6 to 13 keys (security_section, biometric_label, biometric_description, notifications_section, digest_toggle_label, digest_toggle_description, data_section, export_label) — D-08 parity gate green
- `src/lib/i18n/en.json` + `uk.json`: `onboarding.biometric_*` keys added (biometric_title, biometric_subtitle, biometric_enable, biometric_skip)

### Task 2: Cold-start gate + resume listener + CSV export slice (commit: 251b263)

- `app/_layout.tsx`:
  - `RESUME_LOCK_MS = 5 * 60 * 1000` module constant
  - `authenticateDevice()` async helper — `authenticateAsync({ disableDeviceFallback: false })`, catches all errors returning `false`, never logs failure detail
  - `biometricPassed` state — initialised to `!biometricEnabled` so gate is transparent when disabled
  - Cold-start effect: loops authenticateDevice until success when `biometricEnabled`; never renders partial UI on failed auth (T-05-01)
  - AppState resume listener: records `backgroundedAt` on `'background'`; on `'active'` if elapsed > RESUME_LOCK_MS → `setBiometricPassed(false)` triggers re-auth via render gate
  - Render gate extended: `!fontsLoaded || !i18nReady || !dbReady || !biometricPassed`
- `src/features/export/exportRepo.ts`: `buildExportFiles()` — two `executeSync` queries (transactions + jars LEFT JOIN jar_contributions), `rowsToCsv` helper, writes via expo-file-system v19 `File.write(csv)` to `Paths.cache`; catch logs `err.name` only; re-throws for ExportButton to handle
- `src/features/settings/ExportButton.tsx`: `Pressable` calling `buildExportFiles()` then two sequential `Sharing.shareAsync()` calls (D-02 — expo-sharing shares one file at a time); graceful try/catch; busy/button a11y; 44pt min tap target
- `src/features/settings/SettingsScreen.tsx`: Security section (`BiometricToggle`) + Data section (`ExportButton`) added in place; "Phase 5" placeholder comment removed; section order: Language → Security → Data

### Task 3: Device verification — checkpoint-resolved (device-deferred)

`checkpoint:human-verify` auto-approved by orchestrator (AUTO_MODE). No physical
iPhone available in this environment — per Phase 3/4 deferral pattern, the four
device verification items are recorded as UAT pending P0 #1 (see
"Human Verification Required" section below). Task 3 is **resolved (device-deferred)**,
not failed. Code-side acceptance gates (tsc, lint, i18n parity, source greps) all
pass — see Verification Gate Results.

## Requirement IDs Covered

| Requirement | Description | Status |
|-------------|-------------|--------|
| ONBD-04 | Onboarding opt-in to biometric gate | Code-complete (UAT pending P0 #1) |
| SET-01 | Toggle biometric gate from Settings | Code-complete (UAT pending P0 #1) |
| SET-03 | Export all data as CSV via share-sheet | Code-complete (UAT pending P0 #1) |
| SET-04 | FaceID/TouchID enforcement on app open | Code-complete (UAT pending P0 #1) |

## Verification Gate Results

Run from `apps/mobile/` (jest N/A — no harness, known infra gap per STATE.md):

| Gate | Command | Exit Code |
|------|---------|-----------|
| TypeScript | `npx tsc --noEmit` | **0** |
| Lint | `npx expo lint` | **0** |
| i18n parity | `node scripts/check-i18n-parity.mjs` | **0** (13 settings keys en/uk) |

All source grep-gates from Task 1 + Task 2 acceptance_criteria verified passing
(soldi-biometric in SecureKey union, biometricEnabled in store, zero AsyncStorage
import, authenticateAsync + setBiometricEnabled success-branch, biometricPassed in
render gate + resume listener, RESUME_LOCK_MS constant, AppState.addEventListener,
≥2 executeSync + jar_contributions in exportRepo, no description SELECT, both CSV
filenames written to Paths.cache, BiometricToggle + ExportButton in SettingsScreen
with placeholder comment removed).

## Human Verification Required (UAT — pending P0 #1)

These items require a physical iPhone (P0 #1: `cd apps/mobile && npx expo start`,
open Expo Go, scan QR). Deferred using the same pattern Phase 3/4 used for
device-blocked items. `/gsd:verify-work` should pick these up.

| # | Verification Item | Expected Behavior |
|---|-------------------|-------------------|
| UAT-05-01-1 | Settings biometric toggle enable/cancel/relaunch | Settings → enable Face ID/Touch ID → cancel OS prompt → toggle returns OFF (not persisted). Enable again + succeed → toggle stays ON, persists across force-quit + relaunch. On cold relaunch with gate ON the biometric prompt blocks app UI until success; failing biometrics offers device passcode (no app retry cap). |
| UAT-05-01-2 | >5-min background resume re-prompt | Gate ON → background app > 5 minutes → foreground → biometric prompt fires again before UI renders. Background < 5 minutes → foreground → no prompt (UI renders immediately). |
| UAT-05-01-3 | Fresh onboarding biometric opt-in | Reset app data → onboarding reaches the biometric opt-in step. "Skip for now" → proceeds to app with gate disabled. "Enable Face ID / Touch ID" → OS auth prompt → on success proceeds with gate enabled. |
| UAT-05-01-4 | Two-file CSV export share-sheet | Settings → Data → Export CSV → iOS share-sheet appears for `transactions.csv`, then a second share-sheet for `jars.csv`. Saved/AirDropped: `transactions.csv` has columns id,date,amount_cents,currency,merchant,category_id,ai_category (NO description column); `jars.csv` has jar_id,jar_name,target_cents,contribution_cents,source,created_at and contains the jar contribution ledger rows. |

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] expo-file-system v19 API mismatch**
- **Found during:** Task 2 — tsc showed `Property 'cacheDirectory' does not exist` and `Property 'EncodingType' does not exist`
- **Issue:** Plan's PATTERNS.md referenced the legacy `FileSystem.cacheDirectory`/`FileSystem.writeAsStringAsync`/`FileSystem.EncodingType` API. The installed version is expo-file-system v19 which uses the new `File`/`Paths` class API. The legacy functions are re-exported but throw at runtime.
- **Fix:** Rewrote `exportRepo.ts` to use `new File(Paths.cache, 'filename.csv')` + `file.write(csvString)` (synchronous, v19 API)
- **Files modified:** `src/features/export/exportRepo.ts`
- **Commit:** 251b263

**2. [Rule 1 - Bug] COLORS.border token does not exist**
- **Found during:** Task 1 tsc — `Property 'border' does not exist on type COLORS`
- **Issue:** PATTERNS.md pattern used `COLORS.border` for the Switch trackColor false state. This token is not in `src/design/tokens.ts`.
- **Fix:** Used `COLORS.textMuted` (the closest muted neutral in the token set)
- **Files modified:** `src/features/settings/BiometricToggle.tsx`
- **Commit:** 3b37c55

**3. [Rule 1 - Bug] COLORS.text token does not exist**
- **Found during:** Task 1 tsc — `Property 'text' does not exist on type COLORS`
- **Issue:** PATTERNS.md used `COLORS.text` for label color. Token is `COLORS.textPrimary`.
- **Fix:** Changed to `COLORS.textPrimary`
- **Files modified:** `src/features/settings/BiometricToggle.tsx`
- **Commit:** 3b37c55

**4. [Rule 3 - Blocking] @features/* path alias missing from tsconfig**
- **Found during:** Task 2 tsc — `Cannot find module '@features/export/exportRepo'`
- **Issue:** PATTERNS.md used `@features/export/exportRepo` import path. tsconfig.json has no `@features/*` alias.
- **Fix:** Changed to relative import `../export/exportRepo`
- **Files modified:** `src/features/settings/ExportButton.tsx`
- **Commit:** 251b263

**5. [Rule 3 - Blocking] expo-sharing not in package.json**
- **Found during:** Task 2 tsc — `Cannot find module 'expo-sharing'`
- **Issue:** PATTERNS.md stated expo-sharing was "already installed" but it was only a transitive dep not listed in package.json. tsc could not resolve it.
- **Fix:** Ran `npx expo install expo-sharing expo-file-system` (expo-sharing is an official first-party Expo package at expo.dev/sdk/sharing; expo-file-system was already in node_modules as transitive but needed explicit package.json entry for tsc resolution). Package verified as legitimate Expo SDK package.
- **Files modified:** `apps/mobile/package.json`, `apps/mobile/package-lock.json`
- **Commit:** 251b263

## Known Stubs

None — all implemented functionality is fully wired. The biometric gate is transparent when disabled (biometricPassed initialised to true). The CSV export builds real DB data.

## Threat Flags

No new threat surface beyond what the plan's threat model documents (T-05-01 through T-05-SC all addressed in implementation).

## Self-Check: PASSED
