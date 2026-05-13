# SOLDI — Design Engineering Showcase Plan

> Premium iOS personal finance manager — portfolio piece for Designer / Design Engineer hiring + investor pitch.
> Solo dev on Windows. React Native + Expo. ~3 months to App Store. €99/year + ~€20/mo infra.

---

## Context

The user originally wrote two strategic documents (`CLAUDE_MD_FINTECH.md` + `roadmap.md`) describing SOLDI as a regulated EU Open Banking expense tracker requiring TrueLayer agent agreements, €5–15k legal spend, CBI notification, and a 26-week roadmap to public launch with real banks.

After clarifying questions, the actual situation is:
- **Windows-only dev machine** — native Swift/Xcode is not viable
- **Solo developer** powered by Claude Code + AI agents
- **Bootstrap budget** (~€0–€100 total for the project) — TrueLayer agent path is out of reach
- **Portfolio motivation** — show investors and product-company recruiters that the user ships beautiful, detail-rich, technically deep work
- **Target role** — Designer / Design Engineer at product-led companies (Linear, Stripe, Vercel, Arc, Raycast, monobank-class quality)
- **Existing portfolio** — SVP CRM (shipped B2B), Lumina (built consumer, not shipped). SOLDI must add something they don't.

**The gap to fill**: a **shipped consumer iOS app with premium design craft, motion design, accessibility, i18n, and AI features** that recruiters can install from the App Store and that investors can demo in 30 seconds.

The right way to use the work already in `CLAUDE_MD_FINTECH.md` is to keep the **design system, brand voice, AI architecture, monobank-inspired UX** — and drop everything that requires a banking license. The result is a beautiful personal finance app, shipped, demoable, with zero regulatory risk.

---

## What This Plan Builds

A polished iOS-first React Native app called SOLDI, branded as a "personal finance & savings tracker", that demonstrates the user's craft in five distinct areas. Each area maps to a hiring signal a Designer / Design Engineer recruiter looks for.

| Craft area | Hiring signal |
|---|---|
| Design system in code | "Builds reusable component libraries, thinks in tokens" |
| Motion + interaction design (Reanimated v3 + Skia) | "Has taste, ships motion vocabulary, not generic AI-slop" |
| Accessibility from day one | "Cares about inclusion, knows WCAG, thoughtful defaults" |
| i18n EN + UK with native QA | "Detail-oriented, ships for real markets, not English-only" |
| AI chat for natural-language queries | "Can integrate LLMs as a product surface, not a gimmick" |

Investors get an additional signal: a real consumer product with a real (small) Ukrainian-diaspora user base from launch, demonstrating market validation muscle.

---

## What's Out of Scope (And Why)

| Original feature | Why removed |
|---|---|
| TrueLayer / GoCardless / PSD2 integration | Requires €5–15k legal, CBI agent registration, PI insurance — incompatible with bootstrap. Also: irrelevant signal for Designer hiring. |
| AISP licensing / agent model | Same as above. |
| DPO / DPIA / GDPR Art. 9 explicit consent infrastructure | Required only when handling real bank-sourced transaction data. With user-typed and CSV-import data, regular GDPR + privacy policy is enough. |
| 180-day re-consent UX | No PSD2 = no consent expiry. |
| Multi-aggregator abstraction layer (3+ adapters) | Overengineering for the chosen scope. Keep abstraction for future use, ship with one data path. |
| Subscription billing + paywall | Adds App Store review complexity and RevenueCat integration cost. Ship free. Premium can be a v2.0 if traction emerges. |
| CBI / Central Bank of Ireland notification | Not applicable to a non-AISP app. |
| Anomaly detection cron jobs | Replace with simpler on-device pattern matching. |

Each item moves from "must build" to "could build later if SOLDI grows beyond portfolio".

---

## Stack (Locked, Windows-Compatible)

### Mobile (only platform for v1)

- **React Native 0.76+** with New Architecture (Fabric + TurboModules)
- **Expo SDK 52+** with EAS Build (cloud Mac compiles — works from Windows + WSL2)
- **TypeScript** strict mode
- **expo-router** v3 file-based routing
- **Zustand 4** for app state (auth, language, ui, data slices)
- **TanStack Query v5** for cache layer (used here for synthetic data + monobank fetches)
- **op-sqlite** for local DB (transactions, categories, jars, overrides)
- **FlashList v2** for transaction lists
- **react-native-skia** for animated charts
- **Victory Native XL** for accessible chart axes/legends layered on Skia
- **react-native-reanimated v3** for all animations
- **react-native-gesture-handler** v2 for swipes/long-press
- **expo-secure-store** for tokens (monobank personal token if user opts in)
- **expo-local-authentication** for FaceID/TouchID app-open gate
- **expo-camera** + **expo-image-manipulator** for optional receipt OCR (on-device, ML Kit text recognition)
- **i18next** + **react-i18next** + **expo-localization** for EN/UK
- **react-native-mmkv** for cheap key-value cache (theme prefs, onboarding flags)
- **Sentry Expo** for crash reporting (EU region, free tier)
- **PostHog React Native** for product analytics (EU region, free tier)

### Backend (minimal — only what AI chat needs)

Two backend choices, pick one in P0:

**Option A — Supabase Edge Functions (recommended)**
- Supabase free tier: Postgres + Auth + Edge Functions + Storage
- One Edge Function: `/ai-query` — receives intent JSON from mobile, calls Anthropic API, returns aggregated result. Mobile sends only category names + date ranges + aggregates, never raw PII.
- Total backend code: ~150 lines of TypeScript in one function.
- Cost: free for first 50k MAU.

**Option B — FastAPI on Railway**
- More flexible but more setup. Choose if Supabase Edge limits feel too tight.
- ~€5/mo Railway hobby tier.

### AI

- **Anthropic Claude API**
- Two models: `claude-haiku-4-5` for categorization (cheap), `claude-sonnet-4-6` for chat (smart)
- Cost ceiling: SOLDI sends ~500 tokens per chat query. At ~$3/M input tokens, 1k chat queries = ~$1.50. Free for portfolio scale.

### CI/CD

- **GitHub Actions** for tsc + jest on PR (free for private repo, 2000 min/mo)
- **EAS Build** free tier (30 builds/mo) for iOS preview + TestFlight
- **EAS Submit** for App Store submission (free)
- **Apple Developer Program** — €99/yr (required for App Store)

### Tooling

- **WSL2 Ubuntu** on Windows for Node/Python (already standard for the user)
- **VS Code** + Claude Code CLI
- **Expo Go** on physical iPhone for fast iteration
- **TestFlight** for beta and final QA
- **Figma** (free tier) for design source-of-truth + Code Connect
- **Notion / Linear** for task tracking (Linear free tier)

---

## Design System (Source: `CLAUDE_MD_FINTECH.md` Section "Design System")

Preserve the original palette and typography. They're the strongest part of the existing plan.

### Tokens

```typescript
// src/design/tokens.ts
export const COLORS = {
  // Surfaces
  background:    '#F7F1E8',  // warm cream
  surface:       '#FAF5F0',  // card surface
  white:         '#FFFFFF',

  // Text
  textPrimary:   '#2C1810',  // deep warm brown
  textSecondary: '#7A5C52',
  textMuted:     '#B8968A',

  // Accents
  accent:        '#C97B5C',  // terracotta — primary CTA
  accentSoft:    '#D9997A',
  accentDeep:    '#A86147',

  // Sage — success, savings, "money in"
  sage:          '#9DA88C',
  sageSoft:      '#B5C0A5',
  sageDeep:      '#7A876A',

  // States
  error:         '#B85C5C',  // muted warm red, never bright
  success:       '#7A876A',  // sage-derived

  // Semantic
  income:        '#7A876A',
  expense:       '#C97B5C',
} as const;

export const GRADIENTS = {
  primary: ['#D9997A', '#C97B5C'] as const,
  warm:    ['#F2D5C5', '#D9A994'] as const,
  hero:    ['#F7F1E8', '#F0E6D8'] as const,
  sage:    ['#B5C0A5', '#9DA88C'] as const,
  dark:    ['#2E1F1F', '#4A2E2E', '#3D2626'] as const,
} as const;

export const FONTS = {
  display:   { family: 'Oswald',     weights: { light: '300', medium: '500', bold: '700' } },
  editorial: { family: 'EBGaramond', weights: { regular: '400', italic: 'italic-400', semibold: '600' } },
  ui:        { family: 'Manrope',    weights: { medium: '500', semibold: '600', bold: '700' } },
} as const;

export const SPACING = { xs: 4, sm: 8, md: 16, lg: 24, xl: 32, xxl: 48 } as const;
export const RADIUS  = { sm: 8, md: 12, lg: 16, xl: 24, pill: 999 } as const;
```

### Banned (never appear)
- `#667EEA` blue, `#8B7AB8` purple, `#E8E0FF` lavender (AI-slop blacklist)
- Bright green `#10B981` (use sage)
- Fintech blue `#1A73E8`, `#2563EB`
- Neon gradients, glassmorphism, floating blur cards
- Emoji as UI icons

### Components (built in P1, reused everywhere)

- `Card` — surface bg, RADIUS.lg, soft shadow (opacity 0.04)
- `CTAButton` — GRADIENTS.primary, white text, height 52, RADIUS.lg
- `SecondaryButton` — surface bg, accent border 1px, RADIUS.lg
- `TextField` — surface bg, RADIUS.md, focus state with accent border
- `TransactionRow` — icon left, merchant name + category right-stacked, amount right (expense terracotta / income sage)
- `CategoryChip` — pill shape, sage or terracotta tint based on type
- `Jar` — circular SVG progress ring (Skia), top-up amount center, name below
- `Chart` — Skia-rendered, terracotta for spending, sage for income
- `BottomSheet` — surface bg, RADIUS.xl top-only, 36×4 handle
- `ChatBubble` — user = terracotta gradient, AI = surface bg
- `InsightCard` — editorial Garamond body, Manrope meta footer
- `DigestCard` — daily "yesterday in money" card with Skia spark chart

Each component lives in `src/components/`. Each ships with: `.tsx`, `.styles.ts`, `.test.tsx`, `accessibility` props, dark mode (if implemented in v1.5).

---

## Feature Set (MVP — 14 features, 11 weeks)

Ranked by hiring-signal value. Build top-down.

### Tier 1 — Core Demo (must ship before TestFlight)

1. **Onboarding flow** with motion-rich transitions, language picker (EN/UK), category preferences. 4 screens. ~5 days work. **Signal: visual craft + motion + i18n.**

2. **Synthetic data generator + manual entry** — user lands on dashboard with realistic seeded transactions OR can paste monobank token to pull real ones OR import CSV. ~4 days. **Signal: thoughtful empty states + data layer.**

3. **Dashboard with monthly overview** — animated Skia donut chart, monthly total in Oswald 64pt, category breakdown row, "yesterday in money" digest card. ~6 days. **Signal: data visualization craft.**

4. **Transaction list (FlashList)** — grouped by date, swipe-to-categorize gesture, search, filter pills. ~5 days. **Signal: performance + interaction design.**

5. **Category editor** — view, rename, merge, create custom with emoji-free SVG icons. User corrections feed back to categorizer. ~3 days. **Signal: thoughtful CRUD.**

6. **AI categorization** — Claude Haiku categorizes new transactions. MCC fallback for monobank data. User can override; override propagates to merchant pattern. ~4 days. **Signal: AI integration done right.**

7. **AI chat ("how much on groceries last month")** — bottom sheet, intent extraction with Claude Sonnet, structured response with mini-chart. ~5 days. **Signal: LLM as product surface.**

8. **Goal jars (monobank-inspired)** — create jar with name + target + icon, top-up via round-ups or fixed weekly. Progress ring animated. ~4 days. **Signal: distinctive interaction primitive.**

### Tier 2 — Polish (before App Store submission)

9. **Settings + biometric gate** — FaceID/TouchID on cold start, language switch, data export (CSV), about. ~2 days. **Signal: production-grade defaults.**

10. **Push notifications (local, no server)** — daily 9am "yesterday in money" digest, jar milestones. ~2 days. **Signal: lifecycle thinking.**

11. **Accessibility pass** — every interactive element has accessibilityLabel + role, all colors meet WCAG AA, dynamic type support, VoiceOver tested. ~3 days. **Signal: inclusive design discipline.**

12. **Performance pass** — cold start <2s on iPhone SE, transaction list 60fps with 5000 rows, chart render <100ms. Use FlashList tuning + Reanimated UI-thread animations. ~3 days. **Signal: performance literacy.**

13. **Empty states + error states + offline mode** — every screen has a designed empty state. ~2 days. **Signal: detail orientation.**

14. **Onboarding analytics + funnel events** — PostHog events for first run, OAuth, first chat query, jar creation. Public-facing analytics dashboard on personal site. ~1 day. **Signal: product instincts.**

### Optional Tier 3 (post-launch, if time)

15. Receipt OCR via expo-camera + Vision framework
16. monobank webhook real-time push (requires public HTTPS endpoint)
17. Dark mode (uses GRADIENTS.dark palette)
18. Predictive end-of-month projection
19. Subscription detection from recurring patterns
20. Apple Watch companion app

---

## Timeline (Realistic, Solo, Windows)

### Pre-week 0 — Setup (3 days)

- Apple Developer Program enrollment (€99) — takes 24–48h to activate
- Expo account + EAS project init
- GitHub repo: `soldi` (private until launch, public after)
- Figma file: `SOLDI Design System v1` — paste tokens, build component shell
- Buy domain: `soldi.app` or alternatives (~€20/yr)
- Set up Supabase free project (EU Frankfurt region)
- Set up Anthropic API key, PostHog EU project, Sentry EU project
- Apply for Claude API EU region access if not auto-granted

### Week 1–2 — P0 Foundation

- Expo SDK 52 init with TypeScript strict
- File structure: `apps/mobile/`
- expo-router skeleton: index, onboarding/*, (tabs)/*, settings, chat, jars
- `src/design/tokens.ts` from spec above
- Font loading (Oswald, EB Garamond, Manrope via expo-font)
- Zustand stores scaffolded
- op-sqlite schema + first migration
- CI: GitHub Actions runs tsc + jest + lint on PR
- EAS Build profiles: development, preview, production
- First EAS preview build runs on physical iPhone via Expo Go

**Gate**: TypeScript clean, app launches on device showing welcome screen with fonts loaded correctly.

### Week 3–4 — P1 Onboarding + Synthetic Data

- 4-screen onboarding flow with Reanimated transitions
- Synthetic transaction generator (90 days of realistic Irish + Ukrainian transactions: Tesco, SuperValu, Aldi, BoI ATM, Revolut, monobank, Nova Poshta, etc.)
- Manual transaction entry form
- CSV import (let user paste OR pick file via expo-document-picker)
- Optional monobank personal token paste flow with expo-secure-store

**Gate**: User completes onboarding in <90 seconds. Lands on dashboard with seeded data.

### Week 5–6 — P2 Dashboard + Transaction List

- Dashboard layout: Oswald monthly total, Skia donut chart, top categories, "yesterday in money" card
- FlashList transaction list with date headers, swipe gestures, search
- Pull-to-refresh with "last synced" timestamp
- Empty states for no data

**Gate**: Dashboard renders 5000 synthetic transactions at 60fps on iPhone SE.

### Week 7–8 — P3 AI Categorization + Chat

- Edge Function: `/ai-categorize` (Claude Haiku, batched, MCC pre-pass)
- Category editor screen
- User correction → `merchant_pattern` upsert → propagation to existing transactions
- Edge Function: `/ai-query` (Claude Sonnet, intent extraction + SQL execution + response formatting)
- Chat bottom sheet with bubbles, typing indicator, mini-chart embed for aggregate answers

**Gate**: Ask "groceries last month" in chat → correct number in <3s with mini chart.

### Week 9–10 — P4 Jars + i18n + Accessibility

- Jar creation flow, jar list, jar detail with animated SVG progress ring
- Round-up calculation against income/expense
- Full Ukrainian translation pass (use Anthropic Claude + native UK QA via Upwork ~€100 one-time)
- Accessibility pass: VoiceOver verification, dynamic type, WCAG AA contrast check
- Performance pass: cold start, list scroll, chart render measurements

**Gate**: Native UK speaker reviews app and approves. VoiceOver navigates every screen. Cold start under 2s on iPhone SE.

### Week 11 — P5 Polish + TestFlight Beta

- Settings screen, biometric gate, data export, about
- Local push notifications (daily 9am digest, jar milestones)
- PostHog event instrumentation
- Sentry verification
- TestFlight internal build (10 users)
- TestFlight external beta (50 users via Ukrainian-diaspora Telegram channels)

**Gate**: 50 TestFlight users for at least 7 days. Crash-free 99.5%+. D7 retention >40%.

### Week 12–13 — P6 App Store Submission + Launch Materials

- App Store screenshots (6.7" + 5.5") — built in Figma, exported with real app frames
- App Store description, keywords, subtitle (EN + UK)
- Privacy policy page (self-hosted on `soldi.app/privacy`)
- App Store privacy nutrition labels
- Submit to App Review
- Iterate on rejections (typical 1–2 cycles for non-financial consumer app)
- **In parallel**: write Medium/blog case study (1500–2500 words). Outline: problem framing, design rationale (palette, typography, monobank inspiration), motion vocabulary decisions, AI integration architecture, accessibility pass, what I'd do next.
- **In parallel**: prep launch content for Twitter/LinkedIn (5–8 GIF demos, threads)

**Gate**: App live in App Store. Public launch tweet + LinkedIn post.

### Week 14+ — Post-launch

- Monitor crashes/feedback
- Quick fixes
- Share with target recruiters/investors directly
- Update resume + LinkedIn profile with App Store link + Medium case study
- Consider v1.5: dark mode, receipt OCR, German translation if traction supports it

**Total: 13 weeks (~3 months) from kickoff to App Store live.**

---

## File Structure (When Execute Phase Starts)

```
soldi/
├── apps/
│   └── mobile/
│       ├── app/                              # expo-router screens
│       │   ├── _layout.tsx                   # Root with theme + i18n providers
│       │   ├── index.tsx                     # Welcome
│       │   ├── onboarding/
│       │   │   ├── language.tsx
│       │   │   ├── categories.tsx
│       │   │   ├── data-source.tsx           # CSV / monobank / synthetic
│       │   │   └── biometric.tsx
│       │   ├── (tabs)/
│       │   │   ├── _layout.tsx
│       │   │   ├── dashboard.tsx
│       │   │   ├── transactions.tsx
│       │   │   ├── jars.tsx
│       │   │   └── settings.tsx
│       │   ├── chat.tsx                      # Modal
│       │   ├── transaction/[id].tsx
│       │   ├── category-editor.tsx
│       │   ├── jar/new.tsx
│       │   └── jar/[id].tsx
│       ├── src/
│       │   ├── design/
│       │   │   ├── tokens.ts                 # Spec from above
│       │   │   ├── typography.ts
│       │   │   └── shadows.ts
│       │   ├── components/
│       │   │   ├── Card/
│       │   │   ├── CTAButton/
│       │   │   ├── TransactionRow/
│       │   │   ├── Chart/
│       │   │   ├── Jar/
│       │   │   ├── ChatBubble/
│       │   │   ├── DigestCard/
│       │   │   └── ... (15 components total)
│       │   ├── stores/                       # Zustand slices
│       │   │   ├── auth.ts
│       │   │   ├── language.ts
│       │   │   ├── ui.ts
│       │   │   └── data.ts
│       │   ├── data/
│       │   │   ├── db.ts                     # op-sqlite setup
│       │   │   ├── schema.ts
│       │   │   ├── migrations/
│       │   │   ├── synthetic.ts              # Generator
│       │   │   ├── csv.ts                    # Parser
│       │   │   └── monobank.ts               # Token-based fetch
│       │   ├── api/
│       │   │   ├── ai-categorize.ts          # Edge Function client
│       │   │   ├── ai-query.ts
│       │   │   └── client.ts                 # TanStack Query setup
│       │   ├── lib/
│       │   │   ├── i18n/
│       │   │   │   ├── index.ts
│       │   │   │   ├── en.json
│       │   │   │   └── uk.json
│       │   │   ├── biometric.ts
│       │   │   ├── analytics.ts              # PostHog wrapper
│       │   │   └── crash.ts                  # Sentry wrapper
│       │   └── utils/
│       │       ├── currency.ts
│       │       ├── dates.ts
│       │       └── categorize.ts
│       ├── assets/
│       │   ├── fonts/
│       │   ├── icons/                        # SVG category icons (no emoji)
│       │   └── illustrations/
│       ├── app.config.ts
│       ├── eas.json
│       ├── package.json
│       ├── tsconfig.json
│       └── README.md
├── supabase/
│   ├── functions/
│   │   ├── ai-categorize/index.ts
│   │   └── ai-query/index.ts
│   └── migrations/                           # (Empty in v1 — no user data on server)
├── docs/
│   ├── DESIGN.md                             # Full design system doc
│   ├── ARCHITECTURE.md
│   ├── PRIVACY_POLICY.md
│   ├── TERMS.md
│   └── CASE_STUDY.md                         # Source for Medium post
├── .github/workflows/ci.yml
├── CLAUDE.md                                 # Project memory
├── LICENSE                                   # MIT recommended (portfolio-friendly)
└── README.md                                 # Public-facing repo readme
```

The `README.md` is critical — it's the first thing recruiters open. Must include: hero GIF, app screenshots, App Store badge, "Built with" tech stack, design system preview, link to Medium case study, link to live Figma file.

---

## Deliverables Checklist (Hiring Signal)

After 3 months, the user should have all of these public artifacts ready to link from a resume:

- [ ] **App Store listing** — `apps.apple.com/app/soldi/...` (link from resume header)
- [ ] **GitHub repo** — open-source, MIT license, polished README with GIFs, 100+ stars target
- [ ] **Figma community file** — published with Code Connect annotations, design system free for fork
- [ ] **Medium case study** — 1500–2500 words with cover image, ~5 inline GIFs, embedded in personal site
- [ ] **Personal site update** — `iskan.dev/work/soldi` (or equivalent) with hero video, key metrics, links
- [ ] **Twitter launch thread** — 8–12 tweets with GIFs of each major surface, design rationale tweets, link to App Store
- [ ] **LinkedIn launch post** — single post with App Store link, 2–3 GIFs, project description
- [ ] **ProductHunt launch** — optional, gives one-week visibility spike
- [ ] **Updated resume** — SOLDI listed as "Solo founder + design engineer" with bullet points: shipped iOS app, custom design system, AI integration, accessibility AA, i18n EN/UK

Recruiter at Linear / Stripe / Vercel / Arc / Raycast / Tally / Cron / Pitch / Linear opens the resume, clicks App Store link, sees a beautiful, motion-rich, AI-powered consumer app in 30 seconds. Strong signal.

Investor opens the same link, sees a real shipped product solo-built, decides whether to take a meeting. Strong signal.

---

## Specifics on Each Hiring Surface

### App Store listing

- **Name**: SOLDI
- **Subtitle**: Smart, calm personal finance
- **Category**: Finance (or Lifestyle — A/B test post-launch)
- **Screenshots (6.7")**: Hero showing Oswald monthly total + Skia chart + 3 transactions; Dashboard with category breakdown; Transaction list with swipe; AI chat with example query; Jar creation; Settings
- **App preview video**: 30s montage of key interactions, no narration, sage and terracotta motion
- **Description**: editorial English, warm voice. Lead with "A calm, beautiful expense tracker for people who want to understand their money without spreadsheets." Ukrainian version for UK locale.

### GitHub README structure

```markdown
# SOLDI

A calm, beautiful expense tracker built with React Native + Expo.

[App Store badge] [Figma badge] [Medium badge]

![Hero GIF — dashboard with animated chart]

## Highlights

- Custom design system in code (tokens, components, motion)
- AI-powered categorization (Anthropic Claude Haiku)
- Natural-language financial queries (Claude Sonnet)
- Goal jars inspired by monobank's UX
- EN + UK localization
- Accessibility AA, dynamic type, VoiceOver
- 60fps transaction list with 10k rows

## Stack

React Native 0.76 • Expo SDK 52 • TypeScript • Reanimated v3 • Skia • op-sqlite • Supabase Edge Functions • Claude API

## Design System

[Inline preview of palette, typography, components]
[Link to Figma]
[Link to Medium case study]

## Local development

[3 commands max]
```

### Medium case study outline

1. Hook: monobank screenshot vs typical EU bank app screenshot. "Why does my bank feel like a 2008 spreadsheet?"
2. Why this exists: shipping consumer iOS apps in EU is a design wasteland.
3. Design system rationale — why Aesop palette, why three typefaces, what they each do.
4. Motion vocabulary — when transitions accelerate, when they breathe. Reanimated v3 patterns used.
5. AI integration — why intent JSON, why GDPR-safe aggregates, what queries surfaced unexpectedly useful.
6. Accessibility — what changed when I tested with VoiceOver.
7. Performance — what I had to drop or refactor to hit 60fps.
8. Shipping solo on Windows — EAS Build workflow, what worked, what hurt.
9. What's next.

---

## Things That Could Kill This Plan (Plan For Them)

| Risk | Mitigation |
|---|---|
| App Store rejection cycles eat 4+ weeks | Build a buffer into Week 12–13. Pre-read App Store Review Guidelines, especially 5.2.1 and finance category guidance. Don't use the word "banking" or "PSD2" anywhere in App Store metadata. |
| Anthropic API outage during demo | All AI calls have a fallback: categorization defaults to MCC table; chat falls back to "service unavailable, try again". Categorization works offline once user-overrides table is populated. |
| FlashList performance on iPhone SE drops | Pre-test on Week 5 with 5000 rows. If issues, reduce row complexity, virtualize chart axes, lazy-load chart on scroll-in. |
| Ukrainian translation feels machine-made | Budget €100–200 for native UK reviewer on Upwork. Test on 3 native speakers before submission. |
| Solo burnout in week 8 | Build in two weekend-off blocks (week 4 and week 9). Keep scope locked — defer Tier 3 features ruthlessly. |
| User finds bugs after launch on a Windows-only iOS build | Always test on physical device via TestFlight Internal before promoting to External. Maintain a TestFlight Internal user (yourself + a friend with iPhone) on every release. |
| EAS Build free tier 30-builds/mo runs out | Iterate locally with Expo Go where possible. Reserve EAS builds for TestFlight-bound versions. |
| Monobank API changes breaking integration | Wrap monobank in adapter with feature flag. If broken, default to synthetic + CSV only. App still works. |
| Recruiter pipeline ignores App Store apps | Add web demo (Expo Web export) on `soldi.app` as backup signal — frontend designers without iPhones can still see motion. |

---

## What This Plan Does Not Promise

- **Does not promise revenue.** App is free. No billing infra in v1. Monetization is post-portfolio decision.
- **Does not promise large user base.** Target is 200–1000 TestFlight users from Ukrainian-diaspora-in-Ireland Telegram channels. Plenty for portfolio credibility.
- **Does not connect to real EU bank accounts.** Manual + CSV + monobank (Ukrainian) only. No PSD2, no AISP, no legal liability.
- **Does not ship Android in v1.** If RN MVP proves successful, Android via the same codebase is a 2-week pass in v1.1. Not week-1 commitment.
- **Does not require Mac purchase.** Everything builds on Windows + WSL2 + EAS Build cloud Macs.

---

## Open Decisions (Resolve Before P0 Kickoff)

These don't block writing the plan but must be answered before the first commit:

1. **App name confirmation.** Is "SOLDI" the locked name? Check trademark/App Store conflicts before logo/Figma work.
2. **Domain.** `soldi.app` vs alternatives. Buy via Cloudflare Registrar (cheapest).
3. **Logo + icon.** Use `brandkit` or `ckm-design` skill to generate 3–5 logo concepts in P0. Lock by end of week 1.
4. **Backend choice.** Supabase Edge Functions (recommended) or FastAPI on Railway.
5. **GitHub visibility.** Private during development, public on App Store launch day? Or public from day one (signals build-in-public confidence)?
6. **Apple Developer account type.** Individual (€99/yr) — sufficient for solo. Company entity not needed unless investor pitch requires it later.
7. **Native UK reviewer source.** Upwork, Preply, or personal contact from Ukrainian-diaspora-in-Ireland community.
8. **Pre-launch beta channel.** Telegram groups (which ones?), Reddit (r/UkraineConflict r/Ireland?), Instagram (Ukrainian-diaspora pages?). List 5–10 specific channels by end of P0.

---

## Verification Approach

Each phase has its own gate (table in Timeline section). Cross-cutting verification commands the user runs at every phase boundary:

```bash
# from apps/mobile/
npx tsc --noEmit             # type safety, exit 0
npx expo lint                 # ESLint, exit 0
npm test -- --watchAll=false  # Jest, exit 0
eas build --platform ios --profile preview --non-interactive
# then install on physical iPhone via TestFlight Internal, smoke test golden path

# Supabase Edge Functions
supabase functions deploy ai-categorize
supabase functions deploy ai-query
curl -X POST <function-url> -H "Authorization: Bearer ..." -d '{"intent":"sum","category":"groceries","period":"last_month"}'
# expect JSON response with aggregate value
```

End-to-end smoke at App Store submission gate:
- Open app on fresh iPhone (no prior state)
- Complete onboarding in <90 seconds
- See dashboard populate with synthetic data
- Tap chat → ask "how much on groceries this month" → get correct answer in <3s
- Create a jar called "Vacation" → animate from 0 to target
- Toggle language to UK → all screens translate correctly
- Enable VoiceOver → navigate every tab using only voice
- Background app → reopen → biometric gate triggers
- Force-quit → relaunch → state persists from op-sqlite cache

---

## Skills + Plugins Per Phase

| Phase | Auto-invoke |
|---|---|
| Pre-week 0 | `brandkit` for logo concepts, `frontend-design` for design system code, `claude-mem:mem-search` for prior project patterns |
| P0 | `context7` (Expo SDK 52, Supabase Edge), `react-native-best-practices`, `superpowers:writing-plans` |
| P1 | `superpowers:test-driven-development` for synthetic data generator, `caveman:cavecrew-investigator` for file lookups |
| P2 | `frontend-design`, `everything-claude-code:performance-optimizer` (FlashList tuning) |
| P3 | `claude-api` skill for Anthropic best practices, `everything-claude-code:security-reviewer` (token storage) |
| P4 | `humanizer` for UK localization sanity check, `everything-claude-code:a11y-architect`, `everything-claude-code:performance-optimizer` |
| P5 | `gstack` for QA testing, `mobile-mcp` if iOS simulator accessible via cloud Mac |
| P6 | `seo` for App Store keywords, `article-writing` or `brand-voice` for Medium case study, `crosspost` for launch thread |

`Agent` tool with `subagent_type=Explore` whenever exploring >3 files in main context.

---

## Source Documents Synthesized

- `C:\Users\saida\Documents\Projects\CLAUDE_MD_FINTECH.md` (read in full)
- `C:\Users\saida\Documents\Projects\roadmap.md` (read in full)
- User answers in this session:
  - Windows-only dev
  - Solo + AI agents
  - Bootstrap budget (~€0–€100)
  - Quality-first timeline
  - Portfolio goal: job hunt at product companies + investor pitch
  - Target role: Designer / Design Engineer
  - Existing portfolio: SVP CRM (shipped B2B), Lumina (built consumer, not shipped)

Preserved from originals:
- Design system (palette, typography, spacing, banned list) — `CLAUDE_MD_FINTECH.md` §Design System
- monobank-inspired UX (jars, daily digest, instant push, mascot tone) — `roadmap.md` §6 + §10
- AI architecture (GDPR-safe intent JSON, EU region, aggregates only) — `CLAUDE_MD_FINTECH.md` §AI Layer
- Component patterns and motion vocabulary — `CLAUDE_MD_FINTECH.md` §Design System

Dropped vs originals (with explicit rationale):
- All PSD2 / TrueLayer / GoCardless / AISP / agent / CBI / DPO / DPIA-heavy infrastructure
- 26-week roadmap → 13-week portfolio roadmap
- Multi-aggregator abstraction with 5 adapters → single data layer with optional monobank adapter
- Freemium tier + RevenueCat → free app, no billing
- Phase 7 launch prep replaced by Week 12–13 App Store submission
- Ireland-first geographic strategy → diaspora-Telegram beta, then public App Store
```
