# Roadmap: SOLDI

## Overview

Seven-phase, 13-week roadmap that takes SOLDI from empty git repo to live App Store listing. Each phase is a vertical MVP slice that delivers an observable user capability and a hiring signal. Phase 0 is foundation only (no user-facing features); Phases 1-5 build the product; Phase 6 submits and launches.

## Phases

**Phase Numbering:**

- Integer phases (0, 1, 2, ...): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

- [~] **Phase 0: Foundation** — Expo scaffold, design tokens, CI, EAS, Supabase + Anthropic accounts (code complete; device/cloud verification outstanding — see STATE.md)
- [x] **Phase 1: Onboarding + Data Ingest** — User onboards in <90s and lands on dashboard with seeded data (4/4 plans, device-verified 2026-05-13)
- [ ] **Phase 2: Dashboard + Transactions + Categories** — Animated overview + 60fps list + category CRUD
- [ ] **Phase 3: AI Categorization + Chat** — Auto-categorization that learns + NL query bottom sheet (2026-05-15: code-complete, no open code gaps; human_needed — SC#1 accuracy / SC#3 latency / SC#5 offline-on-device, gated on P0 #5 Supabase + #6 Anthropic key. Mark [x] after 03-HUMAN-UAT passes.)
- [ ] **Phase 4: Jars + i18n + Accessibility** — monobank-style jars + full Ukrainian + WCAG AA pass
- [ ] **Phase 5: Polish + TestFlight Beta** — Settings, biometric, notifications, performance, 50-user beta
- [ ] **Phase 6: App Store Submission + Launch** — Review, screenshots, case study, public launch

## Phase Details

### Phase 0: Foundation

**Goal**: Project scaffold runs on physical iPhone via Expo Go with design tokens loaded and CI green.
**Mode**: mvp
**Depends on**: Nothing (first phase)
**Requirements**: (none — foundation only)
**Success Criteria** (what must be TRUE):

  1. `npx tsc --noEmit` exits 0
  2. `npx expo lint` exits 0
  3. App launches on physical iPhone showing welcome screen with Oswald + EB Garamond + Manrope fonts loaded
  4. GitHub Actions CI passes on a no-op PR
  5. EAS Build successfully produces an iOS preview build

**Plans**: 4 plans

Plans:

- [x] 00-01: Initialize Expo SDK 52 project with TypeScript strict + expo-router skeleton (built on SDK 54 — newer LTS; commit 956ad98)
- [x] 00-02: Install core dependencies (zustand, tanstack-query, op-sqlite, reanimated, skia, gesture-handler, secure-store, local-authentication, font, sentry-expo, posthog-react-native, i18next, expo-localization) — mmkv deferred; victory-native added; commit 956ad98
- [x] 00-03: Create design system (tokens.ts, typography.ts) + load Oswald/EBGaramond/Manrope fonts (commits 956ad98 + 14bd96e). shadows.ts deferred to Phase 1.
- [~] 00-04: Configure EAS Build profiles + GitHub Actions CI (done; commit 956ad98) + Sentry/PostHog initialization (deferred to Phase 5 — needs EU project DSN/keys from user)

### Phase 1: Onboarding + Data Ingest

**Goal**: A new user picks a language, picks a data source, and lands on a populated dashboard within 90 seconds.
**Mode**: mvp (Walking Skeleton — first phase of new project)
**Depends on**: Phase 0
**Requirements**: ONBD-01, ONBD-02, ONBD-03, DATA-01, DATA-02, DATA-03, DATA-04
**Wave Structure**: Wave 1 → 01-01 (scaffold + Welcome). Wave 2 (parallel) → 01-02 (data-source pick) + 01-03 (synthetic generator). Wave 3 → 01-04 (monobank + CSV + manual + 90s device checkpoint).
**Success Criteria** (what must be TRUE):

  1. User completes onboarding flow from launch to dashboard in under 90 seconds (timed)
  2. User can paste a monobank token and see real transactions appear in the local DB
  3. User can pick a CSV file and have transactions parsed into the local DB
  4. User who picks "synthetic" sees 90 days of realistic Irish + Ukrainian transactions
  5. User can manually add a transaction via a form and see it in the list

**Plans**: 4 plans

Plans:

- [x] 01-01: Welcome + language pick screen with Reanimated transitions
- [x] 01-02: Data-source pick screen (synthetic / manual / monobank / CSV) with paths branching
- [x] 01-03: Synthetic transaction generator (Irish + Ukrainian merchants, MCC-aware, 90 days)
- [x] 01-04: monobank token paste + CSV import + manual entry data adapters with op-sqlite persistence (device-verified 2026-05-13)

### Phase 2: Dashboard + Transactions + Categories

**Goal**: User sees a beautifully designed monthly overview and scrolls 5000 transactions at 60fps while editing categories.
**Mode**: mvp
**Depends on**: Phase 1
**Requirements**: DASH-01, DASH-02, DASH-03, TXN-01, TXN-02, TXN-03, TXN-04, CAT-01, CAT-02
**Success Criteria** (what must be TRUE):

  1. Dashboard renders monthly total, donut chart, top categories, and digest card in under 100ms
  2. Transaction list scrolls 5000 entries at 60fps on iPhone SE 2020 (Reanimated/FlashList tuned)
  3. User can search transactions and see results filter live
  4. User can swipe a transaction row and reassign category from the action sheet
  5. User can rename, merge, and create custom categories with SVG icons

**Plans**: 4 plans

Plans:

- [x] 02-01: Dashboard screen with Skia donut chart + Oswald monthly total + category breakdown rows
- [x] 02-02: "Yesterday in money" digest card with Skia sparkline + month-vs-month comparison
- [x] 02-03: FlashList transaction list with date grouping, swipe-to-recategorize, search, filter pills
- [x] 02-04: Category editor (view/rename/merge/create) + SVG icon picker (no emoji)

### Phase 3: AI Categorization + Chat

**Goal**: New transactions auto-categorize accurately, user corrections propagate, and the chat answers NL queries in under 3 seconds.
**Mode**: mvp
**Depends on**: Phase 2
**Requirements**: CAT-03, CAT-04, CHAT-01, CHAT-02, CHAT-03, CHAT-04
**Success Criteria** (what must be TRUE):

  1. Claude Haiku categorizes a new transaction with ≥85% accuracy on a curated 100-transaction test set
  2. When a user corrects a category, the same merchant pattern across other transactions updates
  3. User asks "how much on groceries last month" and gets an accurate numeric answer with mini chart in under 3 seconds
  4. AI request payloads contain only category names + date ranges + aggregates — never raw transaction descriptions
  5. Chat fallback gracefully shows "service unavailable" when the Edge Function returns non-200

**Plans**: 3 plans

Plans:

- [x] 03-01: Supabase Edge Function `ai-categorize` (Claude Haiku, batched, MCC pre-pass, GDPR-safe payload)
- [x] 03-02: User-correction propagation via `merchant_overrides` table + retroactive update on similar merchants
- [x] 03-03: Chat bottom sheet UI + Edge Function `ai-query` (Claude Sonnet intent extraction → SQL → response with mini chart)

### Phase 4: Jars + i18n + Accessibility

**Goal**: monobank-style goal jars feel delightful, the full app reads natively in Ukrainian, and VoiceOver navigates every screen.
**Mode**: mvp
**Depends on**: Phase 3
**Requirements**: JAR-01, JAR-02, JAR-03, SET-02, QUAL-01, QUAL-02, QUAL-03, QUAL-04
**Success Criteria** (what must be TRUE):

  1. User creates a jar, contributes via round-up rule, and sees Skia progress ring animate smoothly
  2. Native Ukrainian speaker reviews the full app and confirms translations feel native (paid Upwork QA pass)
  3. User can switch language EN ↔ UK at runtime; every screen retranslates without restart
  4. VoiceOver walks every tab + every modal without dead-end focus
  5. axe-style contrast audit reports zero AA failures

**Plans**: 4 plans

Plans:
**Wave 1**

- [x] 04-01: Jar creation flow + jar list + jar detail with animated Skia progress ring

**Wave 2** *(blocked on Wave 1 completion)*

- [ ] 04-02: Round-up calculation engine (rules: round-up, fixed weekly, percentage of income)
- [ ] 04-03: Full Ukrainian translation pass via Claude + Upwork native reviewer

**Wave 3** *(blocked on Wave 2 completion)*

- [ ] 04-04: Accessibility audit + fixes (accessibilityLabel/role, dynamic type, contrast, VoiceOver order)

### Phase 5: Polish + TestFlight Beta

**Goal**: 50 TestFlight users experience the app for 7 days with 99.5%+ crash-free and a polished settings/notifications layer.
**Mode**: mvp
**Depends on**: Phase 4
**Requirements**: ONBD-04, SET-01, SET-03, SET-04, NOTIF-01, NOTIF-02, QUAL-05, QUAL-06
**Success Criteria** (what must be TRUE):

  1. Biometric (FaceID/TouchID) gate triggers on cold start when enabled
  2. User can export all data as CSV from settings
  3. 09:00 local daily digest notification fires
  4. Jar milestone notifications fire at 25/50/100%
  5. Cold start under 2 seconds on iPhone SE 2020 (perfetto/Sentry-measured)
  6. TestFlight external beta with 50 users active 7+ days, crash-free ≥99.5%

**Plans**: 4 plans

Plans:

- [ ] 05-01: Settings screen + biometric toggle + CSV data export
- [ ] 05-02: Local push notifications (daily digest 09:00, jar milestones) via expo-notifications
- [ ] 05-03: Performance pass (cold start, list scroll, chart render) — measure + tune Reanimated/FlashList/Skia
- [ ] 05-04: TestFlight beta recruitment (Ukrainian-diaspora Telegram channels) + crash monitoring + iterative fixes

### Phase 6: App Store Submission + Launch

**Goal**: App is live in the App Store and the founder has a public artifact set ready to link from a resume.
**Mode**: mvp
**Depends on**: Phase 5
**Requirements**: DIST-01, DIST-02, DIST-03
**Success Criteria** (what must be TRUE):

  1. App passes App Store Review (Finance category) with test account provided
  2. Privacy Policy and Terms hosted at `soldi.app/privacy` and `/terms`
  3. App Store metadata (description, keywords, subtitle, screenshots) live in EN + UK
  4. Medium case study (1500-2500 words) published and linked from GitHub README
  5. GitHub repo public with MIT license, polished README, hero GIF, App Store badge

**Plans**: 3 plans

Plans:

- [ ] 06-01: App Store metadata (screenshots, description, privacy nutrition labels) + privacy policy hosting
- [ ] 06-02: Submission to App Review + iteration on rejections (typical 1-2 cycles)
- [ ] 06-03: Launch materials (Medium case study, Twitter thread with GIFs, LinkedIn post, GitHub README polish)

## Progress

**Execution Order:**
Phases execute in numeric order: 0 → 1 → 2 → 3 → 4 → 5 → 6

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 0. Foundation | 3/4 + 1 partial | Code complete; device/cloud pending | 2026-05-13 (code) |
| 1. Onboarding + Data Ingest | 4/4 | Complete (device-verified) | 2026-05-13 |
| 2. Dashboard + Transactions + Categories | 0/4 | Not started | - |
| 3. AI Categorization + Chat | 3/3 | Complete   | 2026-05-15 |
| 4. Jars + i18n + Accessibility | 1/4 | In Progress|  |
| 5. Polish + TestFlight Beta | 0/4 | Not started | - |
| 6. App Store Submission + Launch | 0/3 | Not started | - |

---
*Roadmap created: 2026-05-13 — synthesized from `/home/iskan/.claude/plans/cosmic-wibbling-cocke.md`*
