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
  duration: ~45 min
  completed: "2026-05-16"
  tasks_completed: 2
  tasks_total: 3
  files_created: 4
  files_modified: 9
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

### Task 3: Device verification — checkpoint:human-verify (not yet approved)

UAT items for physical iPhone verification:
1. Settings → enable Face ID/Touch ID → cancel prompt → toggle stays OFF; succeed → toggle ON, persists across restart
2. Gate enabled → background > 5 min → foreground → biometric prompt fires; < 5 min → no prompt
3. Fresh onboarding → biometric opt-in step appears; Skip → gate off; Enable → gate on
4. Settings → Export CSV → share-sheet offers transactions.csv (no description column), then jars.csv (with contribution ledger)

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
