# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-05-13)

**Core value:** A consumer installs SOLDI from the App Store and within 90 seconds sees their own spending visualized with care — without exposing real banking credentials.
**Current focus:** Phase 0 — Foundation

## Current Position

Phase: 0 of 6 (Foundation)
Plan: 1 of 4 in current phase
Status: In progress
Last activity: 2026-05-13 — Bootstrapped .planning/ directory and ROADMAP.md

Progress: [░░░░░░░░░░] 0%

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
