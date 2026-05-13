# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-05-13)

**Core value:** A consumer installs SOLDI from the App Store and within 90 seconds sees their own spending visualized with care — without exposing real banking credentials.
**Current focus:** Phase 1 — Onboarding + Data Ingest (plans locked, awaiting execution)

## Current Position

Phase: 1 of 6 (Onboarding + Data Ingest) — plans locked
Plan: 0 of 4 executed (4 plans + 1 SKELETON written, verified, committed)
Status: Phase 1 plans complete; ready for `/gsd-execute-phase 1`
Last activity: 2026-05-13 — `/gsd-plan-phase 1` finished (plan→check→revise→re-check). Plan-checker PASSED iteration 2/3 (4 blockers + 5 warnings resolved). Plans written to `.planning/phases/01-onboarding-data-ingest/`.

Progress: [██░░░░░░░░] ~15% (3 of 26 plans complete; Phase 1 plans locked but not executed; P0 device/cloud verification still pending)

## P0 Outstanding (device/cloud-dependent — user action required)

1. **Run on physical iPhone**: `cd apps/mobile && npx expo start`, open Expo Go on iPhone, scan QR. Confirms app launches and fonts load. (Counts as P0 Success Criterion #3.)
2. **Create GitHub remote** (private repo `soldi` recommended), push `main`, confirm CI yellow → green. (P0 Success Criterion #4.)
3. **Apple Developer Program enrollment** (€99/yr, 24-48h activation). Required before EAS Build can sign iOS builds.
4. **EAS project init**: `cd apps/mobile && eas login && eas init`. Records EAS project ID into `app.json` `extra.eas.projectId`. Required before `eas build --platform ios --profile preview` (P0 Success Criterion #5).
5. **Supabase project**: create free Frankfurt-region project. Save URL + anon key to `apps/mobile/.env.example`. Required for Phase 3 Edge Function work.
6. **Anthropic API key**: create + save. Required for Phase 3 categorization + chat.
7. **Sentry project (EU)** + **PostHog project (EU)**: free tiers. Saving DSN/key to `.env` enables crash + analytics from P5 onward.
8. **Domain**: buy `soldi.app` (~€20/yr via Cloudflare Registrar). Required for App Store metadata, privacy policy URL.
9. **App name trademark / App Store conflict check**: search App Store for "SOLDI" — if conflict, pick alt name before logo/Figma work.

## Performance Metrics

**Velocity:**
- Total plans completed: 0
- Average duration: —
- Total execution time: —

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| 0. Foundation | 0/4 | — | — |

**Recent Trend:**
- Last 5 plans: —
- Trend: —

*Updated after each plan completion*

## Accumulated Context

### Decisions

Decisions are logged in PROJECT.md Key Decisions table.
Recent decisions affecting current work:

- Init: Confirmed React Native + Expo (not native Swift) — Windows-only dev machine
- Init: Dropped PSD2 / TrueLayer integration — bootstrap budget incompatible
- Init: Supabase Edge Functions for backend, free tier
- Init: Ship free in v1 (no paywall) — App Store Review simplicity + portfolio focus

### Pending Todos

None yet.

### Blockers/Concerns

- Need Apple Developer Program enrollment (~€99, 24-48h activation) before EAS Build can produce signed iOS builds for TestFlight
- Need domain `soldi.app` purchased (~€20/yr) before App Store metadata and privacy policy URLs are final
- Need Supabase free project (Frankfurt), Anthropic API key, PostHog EU project, Sentry EU project created before Phase 3 Edge Function work
- App name "SOLDI" still requires trademark/App Store conflict check before logo work

## Deferred Items

| Category | Item | Status | Deferred At |
|----------|------|--------|-------------|
| Platform | Android v1.1 release | Deferred | Init |
| Languages | DE/FR/ES/IT/PL localization | Deferred to v1.5 | Init |
| Features | Receipt OCR, Dark mode, Predictive projection | Deferred to v1.5 | Init |
| Monetization | Premium tier + RevenueCat | Deferred to v2.0 | Init |

## Session Continuity

Last session: 2026-05-13 09:35
Stopped at: Phase 0 Plan 00-01 in flight — Expo template scaffolded via `create-expo-app@latest mobile --template default --no-install --yes`. Actual versions resolved: Expo SDK 54, React Native 0.81.5, React 19.1.0, expo-router 6.0, react-native-reanimated 4.1.1, react-native-gesture-handler 2.28, react-native-worklets 0.5.1. NEWER than plan's stated SDK 52 / RN 0.76 / Reanimated 3 — proceed with current latest. npm install running in background.
Resume file: None

## Version Note (2026-05-13)

Plan documents (`PLAN.md`, original CLAUDE_MD_FINTECH.md) reference Expo SDK 52 + React Native 0.76 + Reanimated v3 because those were the latest stable when the plan was written. By the time scaffolding started, Expo SDK 54 + RN 0.81 + Reanimated v4 had shipped. Project uses the SDK 54 stack. All references to "SDK 52" in `.planning/PLAN.md` should be read as "current Expo LTS, currently SDK 54".
