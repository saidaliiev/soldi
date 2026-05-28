# SOLDI (soldify) — Decision Log (ADR-lite)

> Why we chose X, with date + tradeoff. In-repo so reasoning survives. The canonical decision table
> is in [.planning/PROJECT.md](../../.planning/PROJECT.md) "Key Decisions"; this captures the
> load-bearing ones plus the blocking reality. Newest first.

## Human-blocked P0 — NOT code-blocked  `[live, see .planning/STATE.md "P0 Outstanding"]`
- **Reality:** soldify code is ~75% done but progress is gated on **user-only actions**, not code:
  1. Apple Developer Program enrollment (€99/yr, 24–48h) — required before EAS can sign iOS builds.
  2. `cd apps/mobile && eas login && eas init` — writes real `extra.eas.projectId` into `app.json`. Required before `eas build`.
  3. GitHub remote push (`main`) — CI yellow→green (P0 Success Criterion #4).
  4. Supabase Frankfurt project + Anthropic API key — required for the Phase 3 AI pipeline.
  5. Sentry/PostHog EU, domain `soldi.app`, "SOLDI" trademark/App-Store conflict check.
- **Apply:** do NOT attempt to "unblock" these with code. A separate GSD executor drives implementation; this is the standing blocker list. `eas build` is permission-DENIED in this repo — never work around it.

## Palette = Slate & Sand (gender-neutral)  `[2026-05-19]`
- **Decision:** "Slate & Sand" token palette. "Oat & Ink" was **rejected** ("for women only") → gender-neutral relock. `tokens.ts` COLORS/GLASS/GRADIENTS == HTML `:root` == design contracts. `textMuted` WCAG hard-floor `#6E695F` (4.54:1).
- **Apply:** never reintroduce Oat&Ink or the banned AI-slop hexes (CLAUDE.md "Banned values"). Reference tokens, never literals.

## iOS 26 Liquid Glass — chrome only, with crash gate  `[2026-05-24]`
- **Decision:** `expo-glass-effect` allowed ONLY on system chrome (tab bar, nav, sheet backgrounds), never on content surfaces. Mandatory non-glass fallback for iOS<26. Access only via `apps/mobile/src/design/glass.ts` + `src/lib/glassEffect.ts` lazy-gate (`Platform.Version>=26`). Direct `expo-glass-effect` import in screens is banned. See [gotchas.md](./gotchas.md) for the crash that forced the gate.

## Emoji as category icons — narrow exception  `[2026-05-26]`
- Emoji are banned as UI icons EXCEPT category icons (single-grapheme curated set). Tab bar + jars stay SVG.

## Stack & scope locked at init  `[init]`
- React Native + Expo, **not native Swift** — Windows-only dev machine, no Mac.
- Dropped PSD2 / TrueLayer / AISP — bootstrap budget incompatible + out of portfolio scope.
- Supabase Edge Functions backend (free tier); op-sqlite local-first.
- Ship **free** in v1 (no paywall) — App Store Review simplicity + portfolio focus. Monetization deferred to v2.0.
- Android deferred to v1.1; DE/FR/ES/IT/PL i18n + Receipt OCR + dark mode deferred to v1.5.

## SDK version reality  `[2026-05-13]`
- `.planning/PLAN.md` references Expo SDK 52 / RN 0.76 / Reanimated v3 (latest-stable when written). The project actually ships **SDK 54 / RN 0.81 / Reanimated v4**. Read any "SDK 52" in plan docs as "current Expo LTS (SDK 54)".
