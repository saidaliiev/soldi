---
phase: 05-polish-testflight-beta
plan: "02"
subsystem: notifications
tags: [notifications, daily-digest, jar-milestones, settings, onboarding, expo-notifications]
dependency_graph:
  requires:
    - biometric-cold-start-gate       # 05-01: AppState listener we extended
    - settings-security-section       # 05-01: SettingsScreen section/card pattern
    - onboarding-biometric-opt-in     # 05-01: digestEnabled rides same store
  provides:
    - notification-handler-foreground
    - daily-digest-scheduler-idempotent
    - jar-milestone-notifier
    - settings-notifications-section
    - onboarding-digest-opt-in
  affects:
    - app/_layout.tsx
    - src/stores/onboarding.ts
    - src/features/settings/SettingsScreen.tsx
    - src/features/jars/jarsRepo.ts
tech_stack:
  added: []   # expo-notifications already a dep (app.json plugin); no new packages
  patterns:
    - expo-notifications DailyTriggerInput (type:'daily', hour, minute) — v0.32.17
    - expo-notifications cancelScheduledNotificationAsync (stable-id idempotency)
    - Zustand persist digestEnabled flag inside existing 'soldi-onboarding' blob
    - AppState 'active' handler extended (05-01 listener; no second listener added)
    - fire-and-void milestone check (insertContribution return type unchanged)
key_files:
  created:
    - apps/mobile/src/features/notifications/notificationHandler.ts
    - apps/mobile/src/features/notifications/digestNotification.ts
    - apps/mobile/src/features/notifications/jarMilestoneNotification.ts
    - apps/mobile/src/features/settings/DigestToggle.tsx
  modified:
    - apps/mobile/src/stores/onboarding.ts
    - apps/mobile/app/_layout.tsx
    - apps/mobile/src/features/settings/SettingsScreen.tsx
    - apps/mobile/src/features/jars/jarsRepo.ts
decisions:
  - "expo-notifications v0.32.17 uses DailyTriggerInput with type:'daily' — not the old CalendarTriggerInput {hour,minute,repeats:true} pattern from PATTERNS.md; verified from installed .d.ts"
  - "insertContribution stays synchronous (return type number unchanged) — checkAndFireMilestone is fire-and-void to avoid cascading async into sweepRepo's BEGIN/COMMIT transaction"
  - "requestPermissionsAsync wrapped in requestNotificationPermission() helper in digestNotification.ts; DigestToggle calls the wrapper — semantic requirement met even if raw grep for requestPermissionsAsync in DigestToggle returns no match"
  - "i18n keys (notifications_section, digest_toggle_label, digest_toggle_description) were already added by 05-01 — no new i18n changes needed"
metrics:
  duration: ~45 min
  completed: "2026-05-16"
  tasks_completed: 3
  tasks_total: 3
  task_3_status: resolved-device-deferred
  files_created: 4
  files_modified: 4
requirements: [NOTIF-01, NOTIF-02]
---

# Phase 5 Plan 02: Daily Digest + Jar Milestone Notifications Summary

**One-liner:** Idempotent 09:00 daily digest (editorial voice, DailyTriggerInput, cancel-before-reschedule, foreground body refresh) and 25/50/100% jar milestone notifications wired into the contribution ledger.

## What Was Built

### Task 1: Notification handler + daily digest + Settings toggle (commit: 96ca3c7)

- `src/features/notifications/notificationHandler.ts`: `setNotificationHandler` at module scope — `shouldShowBanner:true, shouldShowList:true, shouldPlaySound:false, shouldSetBadge:false`; side-effect imported at top of `app/_layout.tsx` so the handler registers before any notification fires.
- `src/features/notifications/digestNotification.ts`:
  - `DIGEST_NOTIFICATION_ID = 'soldi-daily-digest'` — stable identifier for idempotent cancel
  - `requestNotificationPermission()` — wraps `Notifications.requestPermissionsAsync()`; returns granted boolean
  - `buildDigestBody(yesterdayCents, locale)` — zero-spend returns `'A quiet day — nothing spent'` (D-03, never suppressed); else editorial `"Yesterday's spending added up to €83"` voice via `Intl.NumberFormat` EUR (D-07)
  - `scheduleDailyDigest(enabled)` — ALWAYS `cancelScheduledNotificationAsync(DIGEST_NOTIFICATION_ID)` first (swallows "not found"); returns if `!enabled`; else schedules with `{ type: SchedulableTriggerInputTypes.DAILY, hour: 9, minute: 0 }` and `identifier: DIGEST_NOTIFICATION_ID`
- `src/features/settings/DigestToggle.tsx`: Switch bound to `digestEnabled`; on enable calls `requestNotificationPermission()` first; `setDigestEnabled(true)` + `scheduleDailyDigest(true)` only if granted; on disable `setDigestEnabled(false)` + `scheduleDailyDigest(false)`; full a11y (`accessibilityRole="switch"`, state, label); `minHeight:44`; tokens only (COLORS.textMuted for false track, COLORS.accent for true)
- `src/stores/onboarding.ts`: `digestEnabled: boolean` (default `false`) + `setDigestEnabled` added to `OnboardingState`; rides inside existing `'soldi-onboarding'` SecureStore blob — no new key
- `app/_layout.tsx`: side-effect import for `notificationHandler`; `digestEnabled` selector added; AppState `'active'` branch extended with `scheduleDailyDigest(true)` call (sibling of biometric check, not nested — fires on every foreground regardless of elapsed time; wrapped in `.catch` so notification failure never affects biometric branch); exactly 1 `AppState.addEventListener`
- `src/features/settings/SettingsScreen.tsx`: Notifications section added between Security and Data; imports `DigestToggle`

### Task 2: Jar milestone crossing detection (commit: 83be967)

- `src/features/notifications/jarMilestoneNotification.ts`: `checkAndFireMilestone(jarId, prevBalanceCents)` — reads `getJar`, skips null/no-target; computes prevRatio/newRatio; iterates `[0.25, 0.5, 1.0]` (no 0.75); fires `scheduleNotificationAsync({ title: jar.name, body: '<pct>% of the way there', trigger: null })` on first crossing; `break` after first match; catch logs `err.name` only (never jar.name + amount together — T-05-09)
- `src/features/jars/jarsRepo.ts`: `insertContribution` captures `prevBalanceCents = jarBalanceCents(c.jarId, db)` BEFORE the insert; calls `void checkAndFireMilestone(c.jarId, prevBalanceCents)` AFTER the insert (fire-and-void — return type stays `number`, no cascade async to sweepRepo)

### Task 3: Device verification — checkpoint-resolved (device-deferred)

`checkpoint:human-verify` auto-approved by orchestrator (AUTO_MODE). No physical
iPhone available in this environment — per Phase 3/4/05-01 deferral pattern, the
device verification items are recorded as UAT pending P0 #1. Task 3 is
**resolved (device-deferred)**, not failed.

## Requirement IDs Covered

| Requirement | Description | Status |
|-------------|-------------|--------|
| NOTIF-01 | Opt-in 09:00 daily digest, editorial voice, actual prior-day spend | Code-complete (UAT pending P0 #1) |
| NOTIF-02 | Jar milestone notifications at 25/50/100% crossing | Code-complete (UAT pending P0 #1) |

## Verification Gate Results

Run from `apps/mobile/` (jest N/A — no harness, known infra gap per STATE.md):

| Gate | Command | Exit Code |
|------|---------|-----------|
| TypeScript | `npx tsc --noEmit` | **0** |
| Lint | `npx expo lint` | **0** |
| i18n parity | `node scripts/check-i18n-parity.mjs` | **0** (13 settings keys en/uk) |

### Source grep-gates

| Gate | Result |
|------|--------|
| `setNotificationHandler` in notificationHandler.ts | PASS (line 14) |
| `notificationHandler` side-effect import in _layout.tsx | PASS (line 32) |
| `hour: 9` in digestNotification.ts | PASS (line 112) |
| `A quiet day — nothing spent` in digestNotification.ts | PASS (line 63) |
| `cancelScheduledNotificationAsync` in digestNotification.ts | PASS (line 93) |
| `DIGEST_NOTIFICATION_ID` used in both cancel + schedule | PASS (lines 93, 105) |
| `scheduleDailyDigest` in _layout.tsx active branch | PASS (line 198) |
| `grep -c "AppState.addEventListener" _layout.tsx` = 1 | PASS |
| `requestNotificationPermission` called in DigestToggle on enable path | PASS (line 34) |
| `setDigestEnabled(true)` only inside granted branch | PASS (line 39) |
| No AsyncStorage in onboarding.ts or DigestToggle.tsx | PASS |
| `DigestToggle` in SettingsScreen | PASS (lines 26, 65) |
| Thresholds [0.25, 0.5, 1.0] in jarMilestoneNotification.ts | PASS |
| No 0.75 threshold | PASS |
| `checkAndFireMilestone` invoked AFTER insert in jarsRepo | PASS (line 135 after executeSync at 128) |
| No data-leaking log in jarMilestoneNotification | PASS (only `name` logged at line 67) |

## Human Verification Required (UAT — pending P0 #1)

| # | Verification Item | Expected Behavior |
|---|-------------------|-------------------|
| UAT-05-02-1 | In-context permission on digest toggle enable | Settings → enable Daily spending digest → iOS permission prompt appears immediately (not at launch). Deny → toggle stays OFF. Grant → toggle stays ON. |
| UAT-05-02-2 | Digest fires at 09:00 with editorial voice | At/after 09:00 local a notification fires; body uses editorial voice with actual prior-day spend (e.g. "Yesterday's spending added up to €83"). On a zero-spend day body reads "A quiet day — nothing spent". |
| UAT-05-02-3 | Day-over-day freshness + no duplicate stacking | With digest enabled, background then foreground app on a later day (or after recording a new transaction) → exactly ONE 09:00 digest scheduled with body reflecting that day's prior-day spend. No stacked duplicates from repeated foregrounding. |
| UAT-05-02-4 | Jar milestone notifications 25/50/100% | Create jar with target T. Contribute crossing 25% → one "25% of the way there" notification titled with jar name. Contribute crossing 50% → one "50%". Contribute to ≥100% → one "100%". Contributions not crossing a threshold → no notification. No duplicates for same crossing. |

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] DailyTriggerInput requires `type: SchedulableTriggerInputTypes.DAILY`**
- **Found during:** Task 1 — verified from installed expo-notifications v0.32.17 `.d.ts`
- **Issue:** PATTERNS.md used old CalendarTriggerInput style `{ hour: 9, minute: 0, repeats: true }`. The installed v0.32.17 has a typed `DailyTriggerInput` that requires `type: SchedulableTriggerInputTypes.DAILY` (without `repeats`). The old pattern would cause a TypeScript error (`repeats` not in `DailyTriggerInput`).
- **Fix:** Used `{ type: SchedulableTriggerInputTypes.DAILY, hour: 9, minute: 0 }` per actual installed types
- **Files modified:** `src/features/notifications/digestNotification.ts`
- **Commit:** 96ca3c7

**2. [Rule 3 - Blocking] `insertContribution` async would cascade into `sweepRepo` BEGIN/COMMIT**
- **Found during:** Task 2 — saw `sweepRepo.ts:136` calls `insertContribution` inside a `db.executeSync('BEGIN')` / `db.executeSync('COMMIT')` block inside a synchronous `sweepToJar` function
- **Issue:** Making `insertContribution` async would require `sweepToJar` to become async, breaking the transactional integrity pattern (await inside a synchronous transaction wrapper) and changing the public API surface of `sweepRepo`
- **Fix:** Kept `insertContribution` return type as `number` (synchronous); used `void checkAndFireMilestone(...)` (fire-and-void) inside the function body — matches the plan's "fire-and-graceful" intent exactly; a notification failure cannot block the contribution
- **Files modified:** `src/features/jars/jarsRepo.ts`
- **Commit:** 83be967

**3. [Rule 1 - No-op] i18n keys already present from 05-01**
- **Found during:** Task 1 — read en/uk settings.json; `notifications_section`, `digest_toggle_label`, `digest_toggle_description` were already added by 05-01 Task 1
- **Issue:** Plan's Task 1 listed settings.json files in `<files>` and described adding notification keys — they were pre-added by 05-01 (05-01 SUMMARY line 74 explicitly lists these keys)
- **Fix:** No changes needed; parity gate confirmed 13 keys en/uk
- **Files modified:** none (no-op)

## Known Stubs

None — all features are fully wired. digestEnabled defaults to `false` (opt-in, not a stub). The zero-spend literal `'A quiet day — nothing spent'` is intentional behavior (D-03), not a stub.

## Threat Flags

No new threat surface beyond what the plan's threat model documents. All five threat IDs (T-05-07 through T-05-SC) addressed:
- T-05-07: digest body is single aggregate spend total (opted-in); no per-merchant detail
- T-05-08: milestone body is `<pct>% of the way there`; no absolute balance/target
- T-05-09: catch blocks log `err.name` only
- T-05-10: `scheduleDailyDigest` always cancels by DIGEST_NOTIFICATION_ID before rescheduling
- T-05-11: `requestPermissionsAsync` only inside DigestToggle enable path (no launch-time call)

## Self-Check: PASSED

All created files confirmed present in worktree. Both task commits (96ca3c7, 83be967) confirmed in git log.
