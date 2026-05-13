# SOLDI

A calm, beautiful personal finance and savings tracker for iOS. Built with React Native + Expo, Anthropic Claude AI, and a custom editorial design system.

> Solo founder portfolio piece showcasing end-to-end product craft: backend (Supabase Edge Functions) → AI integration (Claude) → mobile (React Native + Reanimated + Skia) → custom design system → accessibility → i18n.

🚧 **Status**: Phase 0 — Foundation. App Store launch targeted for ~Week 13.

## Highlights

- Custom design system in code (`apps/mobile/src/design/`) — tokens, typography presets, banned-color enforcement
- AI-powered categorization (Anthropic Claude Haiku) with user-correction propagation
- Natural-language financial queries via Claude Sonnet — GDPR-safe intent JSON, aggregates only
- Goal jars inspired by monobank's UX — animated Skia progress rings
- EN + UK localization with native-speaker QA
- WCAG AA accessibility, dynamic type, VoiceOver
- 60fps transaction list with 5000+ rows on iPhone SE 2020
- Local push notifications: daily 9am digest, jar milestones

## Stack

| Layer | Choice |
|-------|--------|
| Mobile | Expo SDK 54 • React Native 0.81 • TypeScript strict • expo-router v6 |
| State | Zustand • TanStack Query v5 |
| Local DB | op-sqlite |
| Lists | @shopify/flash-list |
| Charts / Motion | @shopify/react-native-skia • Victory Native • react-native-reanimated v4 |
| Security | expo-secure-store • expo-local-authentication (FaceID / TouchID) |
| i18n | i18next • react-i18next • expo-localization |
| Backend | Supabase Edge Functions (Frankfurt EU) |
| AI | Anthropic Claude (`claude-haiku-4-5` + `claude-sonnet-4-6`) |
| Observability | Sentry (EU) • PostHog (EU) |
| Build | EAS Build (iOS cloud Mac) |
| CI | GitHub Actions — tsc + expo lint + jest |

## Design system

Color tokens (warm editorial palette):

| Surface | Cream `#F7F1E8` · Card `#FAF5F0` |
|---------|---|
| **Accent** | Terracotta `#C97B5C` for CTAs and expense |
| **Sage** | `#9DA88C` for income, savings, success |
| **Text** | Deep warm brown `#2C1810` on cream |

Typography: **Oswald** (display) · **EB Garamond** (editorial body) · **Manrope** (UI).

Banned: AI-slop blue/purple/lavender, bright Tailwind green, fintech blue, neon gradients, glassmorphism, emoji as UI icons.

Full design system at [`apps/mobile/src/design/`](apps/mobile/src/design/).

## Repository layout

```
soldi/
├── apps/
│   └── mobile/          # Expo + RN iOS app
│       ├── app/         # expo-router screens
│       ├── src/
│       │   ├── design/  # tokens.ts, typography.ts
│       │   ├── components/
│       │   ├── stores/  # Zustand
│       │   ├── data/    # op-sqlite, synthetic generator, csv, monobank
│       │   ├── api/     # Edge Function clients
│       │   ├── lib/i18n
│       │   └── utils/
│       ├── app.json
│       ├── eas.json
│       └── tsconfig.json
├── supabase/
│   └── functions/       # ai-categorize, ai-query Edge Functions
├── docs/                # DESIGN.md, ARCHITECTURE.md, case study draft
├── .planning/           # GSD planning artifacts (PROJECT, REQUIREMENTS, ROADMAP, STATE, PLAN)
├── .github/workflows/   # CI pipelines
└── CLAUDE.md            # Project memory for Claude Code
```

## Local development

```bash
# from repo root
cd apps/mobile

# install dependencies
npm install

# start Metro + Expo Go on physical device
npx expo start

# type check
npx tsc --noEmit

# lint
npx expo lint

# tests (none yet)
npm test
```

Build for TestFlight via EAS:

```bash
eas build --platform ios --profile preview
eas submit --platform ios --profile production
```

## Out of scope

- TrueLayer / GoCardless / PSD2 Open Banking — requires AISP agent agreement, out of bootstrap budget
- Android v1 — RN+Expo gives Android in v1.1 if traction warrants
- Native Swift / Xcode — founder's machine is Windows; cross-platform stack is the right tradeoff
- Subscription paywall / RevenueCat — ships free; monetization is post-portfolio decision

## Links

- 📱 App Store — _coming Phase 6_
- 🎨 Figma file — _coming Phase 0_
- 📝 Case study — _coming Phase 6_
- 🐦 Twitter launch thread — _coming Phase 6_

## License

MIT — see [LICENSE](LICENSE).

---
Built solo with [Claude Code](https://claude.com/claude-code).
