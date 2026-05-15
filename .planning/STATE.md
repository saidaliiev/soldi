---
gsd_state_version: 1.0
milestone: v1.0
milestone_name: milestone
status: executing
stopped_at: Phase 5 context gathered
last_updated: "2026-05-15T23:41:50.293Z"
last_activity: 2026-05-15 -- Phase 04 execution started
progress:
  total_phases: 7
  completed_phases: 4
  total_plans: 15
  completed_plans: 15
  percent: 57
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-05-13)

**Core value:** A consumer installs SOLDI from the App Store and within 90 seconds sees their own spending visualized with care — without exposing real banking credentials.
**Current focus:** Phase 04 — jars-i18n-accessibility

## Current Position

Phase: 04 (jars-i18n-accessibility) — EXECUTING
Plan: 1 of 4
Status: Executing Phase 04
Last activity: 2026-05-15 -- Phase 04 execution started

Progress: [██████████] 100%

## RESUME (Phase 3 Wave 2 — 03-03 chat)

After usage limit resets (2:50pm Europe/Dublin, 2026-05-15): re-run
`/gsd-execute-phase 3`. It will detect 03-03 has no SUMMARY and resume.
03-03 state on main (branching=none, executor committed to main directly —
deviation from worktree isolation, accepted):

- `2e415d5` Task 1: ai-query Edge Function + facts-runner + chat schemas — committed
- `ce3c6e6` Task 2: mobile chat plumbing (service/store/facts-pack/i18n/icons) — committed
- `98c7064` Task 3: chat UI (bubbles, mini chart, geometry+test) — **WIP, INCOMPLETE,
  UNVERIFIED**. Finish Task 3, wire chat bottom sheet, run `cd apps/mobile &&
  npx tsc --noEmit` + `npx expo lint` (both must exit 0; jest N/A — see below),
  write `.planning/phases/03-ai-categorization-chat/03-03-SUMMARY.md`, then
  ROADMAP `[x] 03-03` + Phase 3 verification (gsd-verifier).
NOTE: dispatch executor with a SHORT prompt — the long-prompt variant failed
"Prompt is too long". gsd-executor loads its own execute-plan context.

## Known Infra Gaps (P1 — pre-existing, not Wave-1 regression)

- **jest harness never set up** in `apps/mobile`: no `jest`/`jest-expo` devDep, no
  `jest.config.*`, no `test` npm script, no `node_modules/.bin/jest`. `.test.ts`
  files exist (Phase 1/2/3) but cannot run. **Project CI `ci.yml` step `npm test`
  is therefore already broken** (Missing script: test) independent of Phase 3.
  Verification currently rests on `tsc --noEmit` (exit 0) + `expo lint` (exit 0),
  both green on merged Wave 1. Action: dedicated jest-harness setup task before
  App Store (jest + jest-expo + babel-jest + jest.config + `test` script), then
  run Phase 1/2/3 suites. Deferred per user 2026-05-15.

## Phase 3 deferred → UAT / later phases

- 03-01 Task 4 (device checkpoint: network-off → tx stays Uncategorized, no crash)
  → UAT, BLOCKED on P0 #5 (Supabase Frankfurt project) + P0 #6 (Anthropic API key)

- Real-API eval ≥0.85 accuracy run → UAT, same P0 blockers (CI `ai-eval` job is
  workflow_dispatch-gated, needs `ANTHROPIC_API_KEY` secret)

- Remote `supabase/migrations/0001_merchant_overrides.sql` DDL+RLS → Phase 4
- Cost-cap (D-24) activation + Sentry breadcrumb wiring → Phase 5

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
| Phase 01-onboarding-data-ingest P03 | 40m | 2 tasks | 12 files |
| Phase 01-onboarding-data-ingest P04 (Tasks 1-3) | 12m | 3 tasks | 14 files |
| Phase 03-ai-categorization-chat P03 | 90 | 3 tasks | 11 files |

## Accumulated Context

### Decisions

Decisions are logged in PROJECT.md Key Decisions table.
Recent decisions affecting current work:

- Init: Confirmed React Native + Expo (not native Swift) — Windows-only dev machine
- Init: Dropped PSD2 / TrueLayer integration — bootstrap budget incompatible
- Init: Supabase Edge Functions for backend, free tier
- Init: Ship free in v1 (no paywall) — App Store Review simplicity + portfolio focus
- [Phase 01-onboarding-data-ingest]: slug→name_en resolved at query time in getCategoryIdBySlug — no hardcoded category ids
- [Phase 01-onboarding-data-ingest]: readonly T[] over ReadonlyArray<T> — project ESLint @typescript-eslint/array-type rule
- [Phase 01-onboarding-data-ingest]: Phase 1 dashboard EUR-only rollup for 30-day total — UAH rows in DB but excluded from sum (SKELETON Out-of-Scope)
- [Phase 01-onboarding-data-ingest P04]: Token saved to secure-store AFTER all API calls succeed — prevents bad token from persisting
- [Phase 01-onboarding-data-ingest P04]: monobank syncs client.accounts[0] only (B3 scope reduction; multi-account picker → Phase 5)
- [Phase 01-onboarding-data-ingest P04]: description column null for all ingest paths (monobank/csv/manual) — Phase 3 AI safety contract

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

Last session: 2026-05-15T23:41:50.286Z
Stopped at: Phase 5 context gathered
Resume file: .planning/phases/05-polish-testflight-beta/05-CONTEXT.md

## Version Note (2026-05-13)

Plan documents (`PLAN.md`, original CLAUDE_MD_FINTECH.md) reference Expo SDK 52 + React Native 0.76 + Reanimated v3 because those were the latest stable when the plan was written. By the time scaffolding started, Expo SDK 54 + RN 0.81 + Reanimated v4 had shipped. Project uses the SDK 54 stack. All references to "SDK 52" in `.planning/PLAN.md` should be read as "current Expo LTS, currently SDK 54".
