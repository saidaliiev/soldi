---
gsd_state_version: 1.0
milestone: v1.0
milestone_name: milestone
status: executing
stopped_at: Phase 5 context gathered
last_updated: "2026-05-16T10:19:11.412Z"
last_activity: 2026-05-16 -- Phase 05 execution started
progress:
  total_phases: 7
  completed_phases: 4
  total_plans: 19
  completed_plans: 15
  percent: 57
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-05-13)

**Core value:** A consumer installs SOLDI from the App Store and within 90 seconds sees their own spending visualized with care — without exposing real banking credentials.
**Current focus:** Phase 05 — polish-testflight-beta

## Current Position

Phase: 05 (polish-testflight-beta) — LAUNCHED, awaiting D-04 device confirm
Plan: 4 of 4 done; 05-04 build #4 a29159a3 v1.0.0 uploaded to App Store Connect TestFlight
Status: Phase 05 TestFlight launch COMPLETE — P0 #3/#4 cleared, ASC API key submit, binary in App Store Connect (submission 86769705-..., ASC app 6770086922). Apple processing. Phase [~] until ≥1 internal tester runs it on device (D-04: cold launch + biometric gate + dashboard).
Last activity: 2026-05-16 session 2 -- 05-04 launched; 7 forward-only commits (c139bda→cab1a28), 4 EAS builds (2 real blocker fixes: chat-empty Metro resolve, Sentry source-map upload)
2026-05-17: Redesign Wave 0 (foundation) complete: motion.ts/glass.ts/tokens/deps/governance landed, UI-inert, gates green (tsc:0 lint:0 174/0 export:0). Next: Wave 1 (glass tab bar) — requires Xcode-26 EAS image decision (spec R1).
2026-05-17: Redesign Wave 1 (glass tab bar) CODE complete: glass.ts safe-gate/tint/resolveTabBarChrome (node-tested), GlassTabBar.tsx (sole expo-glass-effect importer), _layout wired, eas image=latest (R1 gate). Gates green (tsc0/lint0/181-0/export0). Device-UAT DEFERRED to batched W1+W2 EAS build (after TestFlight #6) — .planning/phases/redesign/W1-DEVICE-UAT.md.
2026-05-17: Redesign Wave 2 (dashboard hero kinetic) CODE complete: selectMotionPreset + dashboardMotion (interpolateSliceAngles/interpolateScalar) + arcsFromSliceAngles (node-tested), useMotion reanimated boundary, hero count-up / donut arcDraw+arcInterpolate (D-05 CLOSED) / FAB scroll-reveal / sharedMonth carry / editorial spacing wired. Gates green (tsc0/lint0/196-0/export0). Device-UAT DEFERRED to batched W1+W2 EAS build (after TestFlight #6) — .planning/phases/redesign/W2-DEVICE-UAT.md. Wave-3 carry-forward: MonthSwiper internal pan-snap still ad-hoc 250ms (out of W2 scope). [RESOLVED 2026-05-19 — W3 T6: → MOTION.fabReveal via new worklet-safe useMotionSnap boundary]
2026-05-19: Palette Foundation (Slate & Sand) EXECUTED — Oat & Ink rejected ("for women only"), gender-neutral relock. 7 tasks subagent-driven + 2-stage review + final integration review. 6 commits a85bcb6..75e7350 on main (PUSHED 2026-05-19, origin/main==e4c7ee2; +a516adf STATE +a55860e/c90cb9d/e4c7ee2 follow-ups): spec→plan→plan-fix→Commit1 e213c4b (tokens.ts COLORS/GLASS/GRADIENTS + residue sweep, 10 files)→Commit2 cea14aa (W1-DEVICE-UAT + 02-UI-SPEC re-cell)→Commit3 75e7350 (soldify-screens.html recolor + Oat&Ink plan/spec SUPERSEDED). tokens.ts==HTML :root==contracts==spec §3 (INTEGRATION-COHERENT). textMuted WCAG hard-floor #6E695F 4.54:1 asserted. §4 cohesive no-seam header preserved (recolor-only, 485→485 lines, no structural/type/motion change). Gates green tsc0/lint0/208-0/export0. Deferred (plan Appendix): schema.sql.ts 18 category seed colors = separate data-migration spec (existing-user customized-color implications). Unblocks Wave 3 (transactions) — binds to landed Slate & Sand tokens.
2026-05-19: Redesign Wave 3 (transactions) CODE complete. Plan docs/superpowers/plans/2026-05-19-soldi-redesign-wave-3-transactions.md (7 tasks). Design-sync checkpoint vs soldify-screens.html:205-256 RESOLVED with user decisions (recorded in plan). Commits 4d30a59→1dc71be on main: T1 MOTION.listRowEnter (pure, additive) → T2 useRowEnter recycle-safe boundary (deviation documented: first-call window not module-load) → T6 useMotionSnap worklet-safe boundary + MonthSwiper debt RETIRED → T4 DateHeader eyebrow+hairline, subtotal dropped (authority) → T3 TransactionRow icon-badge+muted meta (CategoryChip off this surface), expense→accent, inter-row hairline, useRowEnter wired → T5 in-body Oswald title + header two-tone-seam fix by construction (mirrors W2), FilterPillsRow verified-no-change (accepted-drift: chips model kept). Gate spec §4 4/4 GREEN: tsc0/lint0/210-0/expo-export-ios0. R6: no banned/raw hex in W3 files, MonthSwiper motion-clean. context7-verified reanimated v4.1.5 Keyframe + worklet patterns. Device-UAT .planning/phases/redesign/W3-DEVICE-UAT.md BATCHED into W1+W2 EAS build (user decision; W1/W2 UAT cross-linked) — Wave 3 [~] code-complete until that batched build runs on device. Accepted design-sync drift logged (FilterPillsRow segment-vs-chips, DateHeader label format, full-width hairline). Next: Wave 4 (chat) or run batched W1+W2+W3 build after TestFlight #6.
2026-05-19: Redesign Wave 4 (chat) CODE complete. Plan docs/superpowers/plans/2026-05-19-soldi-redesign-wave-4-chat.md (6 tasks). Design-sync checkpoint vs soldify-screens.html:400-446 RESOLVED (4 user decisions in plan). Commits 280aefc→46ea4e1 on main: T1 'spring' boundary support (closes W2/W3 fail-fast) + MOTION.chatBubbleEnter + SHEET_DAMPING_RATIO → T2 pure glass.ts resolveSheetChrome (mirrors resolveTabBarChrome) → T4 bubbles governance (already editorial-correct; enter→chatBubbleEnter, toggle→fabReveal) → T3 opt-in glassSurface prop on SHARED BottomSheetPrimitive (2nd sanctioned expo-glass-effect boundary; ChatBottomSheet opts in; 3 W5 sheets byte-identical default path; absolute-fill GlassView behind content + mandatory solid+SHADOWS.modal fallback) → T5 MOTION.pressFeedback (additive) + ChatMiniChart governed reveal + ChatInputRow 58pt/42pt-accent-send + EmptyState/ErrorBanner literal→governed. Gate spec §4 4/4 GREEN: tsc0/lint0/216-0/expo-export-ios0. R6 no banned/raw hex W4 files. R5: GlassView ONLY in GlassTabBar(W1)+BottomSheetPrimitive(W4) — zero glass on bubbles/content (CLAUDE.md intact). 'spring' boundary gap CLOSED (withMotion + useMotionSnap spring-capable). context7-verified reanimated v4.1.5 (Keyframe W3, withSpring W4). Device-UAT .planning/phases/redesign/W4-DEVICE-UAT.md BATCHED into W1+W2+W3 glass build (first new native glass since W1; after TestFlight #6) — Wave 4 [~] code-complete until that build runs on device. NEW deferred debt logged: shared-primitive (BottomSheetPrimitive) open/close motion still ad-hoc (4 sheets; not chat-specific) → dedicated governance task via the now-spring-capable boundary. Accepted design-sync drift logged: ChatBubbleAssistantTyping infinite-breath (loop archetype, no loop-aware boundary primitive), chat header spark/online/title, ChatMiniChart single-accent (multi-color needs ChartPayload change), ChatInputRow solid send (no expo-linear-gradient dep) + no blur (glass-on-content banned). Next: Wave 5 (secondary sweep) or run the batched W1-4 EAS build after TestFlight #6.

Progress: [█████████░] 95% (4/4 plans done; D-04 device confirm + phase verification pending)

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
| Infra | Android emulator setup for this WSL2 dev env (ANDROID_HOME, SDK, AVD) — user-flagged future need; NOT blocking (iOS-first; glass needs TestFlight not emu) | Deferred | 2026-05-19 |
| Tech-debt | Shared BottomSheetPrimitive open/close motion is ad-hoc (withSpring damping/stiffness, withTiming 220/200) — 4 sheets, not chat-specific. Dedicated governance task via the now-spring-capable useMotion/useMotionSnap boundary (MOTION.sheetSpring). Surfaced W4 checkpoint #2 | Deferred | 2026-05-19 |

## Session Continuity

Last session: 2026-05-15T23:41:50.286Z
Stopped at: Phase 5 context gathered
Resume file: .planning/phases/05-polish-testflight-beta/05-CONTEXT.md

## Version Note (2026-05-13)

Plan documents (`PLAN.md`, original CLAUDE_MD_FINTECH.md) reference Expo SDK 52 + React Native 0.76 + Reanimated v3 because those were the latest stable when the plan was written. By the time scaffolding started, Expo SDK 54 + RN 0.81 + Reanimated v4 had shipped. Project uses the SDK 54 stack. All references to "SDK 52" in `.planning/PLAN.md` should be read as "current Expo LTS, currently SDK 54".
