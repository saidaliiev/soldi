# SOLDI

## What This Is

SOLDI is a calm, beautifully designed personal finance and savings tracker for iOS, built as a portfolio showcase. It targets Ukrainian-diaspora-in-Ireland users for initial validation but ships to the general App Store. The product demonstrates the founder's full-stack craft (Supabase + Claude AI + React Native + custom design system) across a single shipped consumer app.

## Core Value

A consumer can install SOLDI from the App Store and within 90 seconds see their own spending visualized with care — without exposing real banking credentials, without filling a spreadsheet, and without a single fintech-blue gradient.

## Requirements

### Validated

(None yet — ship to validate)

### Active

- [ ] Premium design system in code (tokens, components, motion vocabulary) — observable across every screen
- [ ] Onboarding under 90 seconds with language pick + data source pick + optional biometric
- [ ] User can ingest data via manual entry, CSV import, monobank personal token, or synthetic generator
- [ ] Dashboard renders monthly total, per-category chart, "yesterday in money" digest at 60fps
- [ ] Transaction list handles 5000+ entries at 60fps on iPhone SE 2020
- [ ] AI auto-categorizes new transactions and learns from user corrections
- [ ] AI chat answers natural-language financial questions in under 3 seconds
- [ ] Goal jars (monobank-inspired) with animated progress and round-up rules
- [ ] Local push notifications: daily 9am digest, jar milestones
- [ ] Full EN + UK localization with native-speaker QA
- [ ] WCAG AA accessibility: VoiceOver, dynamic type, contrast
- [ ] Biometric (FaceID/TouchID) app-open gate
- [ ] App Store Review approval (Finance category) and TestFlight beta with 50+ users

### Out of Scope

- TrueLayer / GoCardless / any PSD2 Open Banking integration — requires €5-15k legal spend incompatible with bootstrap budget and irrelevant to Designer/Design Engineer hiring signal
- AISP licensing or agent registration with CBI — not applicable to a non-bank-connected app
- DPO appointment / full DPIA / GDPR Art. 9 explicit-consent infrastructure — required only when handling real bank-sourced transaction data
- 180-day PSD2 re-consent UX — no PSD2 = no consent expiry
- Subscription billing / RevenueCat / freemium tiers — app ships free for v1 to keep App Store Review simple
- Android v1 — RN+Expo gives cheap Android in v1.1 if traction emerges; not a v1 commitment
- Native Swift / Xcode workflow — founder's dev machine is Windows-only
- Receipt OCR (deferred to v1.5)
- Dark mode (deferred to v1.5)
- Predictive end-of-month projection (deferred to v1.5)

## Context

The project originates from two strategic documents written by the founder on a Windows laptop:
- `C:\Users\saida\Documents\Projects\CLAUDE_MD_FINTECH.md`
- `C:\Users\saida\Documents\Projects\roadmap.md`

Those documents described SOLDI as a regulated EU Open Banking expense tracker requiring a TrueLayer agent agreement, a DPO, and a 26-week roadmap to public launch. After clarifying the founder's actual situation (Windows-only laptop, solo, bootstrap budget, quality-first timeline, Designer/Design Engineer + full-stack hiring goal), the scope was pivoted to a 3-month portfolio piece. The design system, brand voice, AI architecture, and monobank-inspired UX were preserved; everything requiring a banking license was dropped.

The founder ships through Claude Code on WSL2 Ubuntu, develops on a physical iPhone via Expo Go, and produces iOS builds via EAS Build's cloud Mac infrastructure. Existing portfolio: SVP CRM (shipped B2B SaaS), Lumina (built consumer mobile, not shipped). SOLDI is the third piece and the first targeting Designer/Design Engineer + full-stack hiring signals.

Primary plan reference: `/home/iskan/.claude/plans/cosmic-wibbling-cocke.md` (the approved synthesis of the original two documents and the constraint conversation).

## Constraints

- **Tech stack**: React Native 0.76+ + Expo SDK 52+ + TypeScript strict — Windows-only dev machine eliminates native Swift/Xcode
- **Backend**: Supabase Edge Functions (Frankfurt EU region) — free tier sufficient for portfolio scale
- **AI provider**: Anthropic Claude API — Haiku for categorization, Sonnet for chat. GDPR-safe intent JSON pipeline; aggregates only, never raw PII
- **Timeline**: 13 weeks from kickoff to App Store live, quality-first (no aggressive sprint pressure)
- **Budget**: ~€99 Apple Developer Program + ~€20/yr domain + €0-30/mo infra (free tiers everywhere)
- **Team**: Solo founder + AI agents (Claude Code orchestrates implementation per founder's intent)
- **Distribution**: iOS App Store v1, Android via Play Store in v1.1 if traction warrants

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| React Native + Expo (not native Swift) | Windows-only dev machine; EAS Build provides cloud Mac compilation | — Pending |
| Drop PSD2 / TrueLayer integration | Requires €5-15k legal spend incompatible with bootstrap; irrelevant to Designer hiring signal | — Pending |
| Supabase Edge Functions for backend | One Edge Function for AI queries; free tier 50k MAU; EU Frankfurt region; ~150 lines TypeScript total | — Pending |
| Claude Haiku for categorization, Sonnet for chat | Haiku is ~5x cheaper than Sonnet; categorization is high-volume; chat is low-volume but quality-sensitive | — Pending |
| Ship free in v1 (no paywall) | App Store Review for finance + paywall combos faces more 5.2.1 rejections; portfolio focus, not revenue | — Pending |
| Ukrainian-diaspora-in-Ireland as TestFlight cohort | Original ICP from research; reachable via Telegram channels; small enough for solo support | — Pending |
| Apple Developer Program: Individual (not Company) | Solo founder, no business entity required, €99/yr cheaper than DUNS-required Company route | — Pending |

## Evolution

This document evolves at phase transitions and milestone boundaries.

**After each phase transition** (via `/gsd-transition`):
1. Requirements invalidated? → Move to Out of Scope with reason
2. Requirements validated? → Move to Validated with phase reference
3. New requirements emerged? → Add to Active
4. Decisions to log? → Add to Key Decisions
5. "What This Is" still accurate? → Update if drifted

**After each milestone** (via `/gsd-complete-milestone`):
1. Full review of all sections
2. Core Value check — still the right priority?
3. Audit Out of Scope — reasons still valid?
4. Update Context with current state

---
*Last updated: 2026-05-13 after initialization*
