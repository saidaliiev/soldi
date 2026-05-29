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

## Palette → Cold Minimal (Direction A)  `[2026-05-29, FOUNDATION PORTED — commit 5a9d149]`
- **Decision:** user reviewed warm directions in Figma + the Claude Design pass, was unconvinced, and chose **Cold Minimal**: slate-blue `#34506E` + graphite `#1C2024` on cool near-white `#F4F5F7`. Typography drops to **2-family** (Oswald hero + Manrope UI); **EB Garamond retired**. Cards = hairline borders, no content shadows. This **supersedes** "Slate & Sand" for the app's visual identity — Slate & Sand was a warm terracotta/sand palette merely *relabelled* gender-neutral (2026-05-19); it never actually went cold. Cold Minimal is the genuine gender-neutral answer to the "for women only" flag.
- **State:** **token foundation ported** (commit `5a9d149`): `tokens.ts` COLORS/GRADIENTS/GLASS cooled, EB Garamond presets remapped to Manrope, `contrast.ts` re-verified (auditTokenPairs live, 25/25 design tests, tsc+lint green). Components consume tokens → whole app reskinned. Design source: [spec](../superpowers/specs/2026-05-29-cold-minimal-redesign-design.md) + Figma `mQkHqa6xfWyyQpmS5gyoby` (pages "Cold Minimal — Dashboard" + "Cold Minimal — Screens"). **Pending:** per-screen STRUCTURAL alignment (flat hero band, slate donut hue-ramp, bento Categories grid); EB Garamond font-asset cleanup (token `FONTS.editorial` kept, just unused); `schema.sql.ts` seed category colors still warm.
- **Apply:** never reintroduce Oat&Ink/Slate&Sand warm hexes or banned AI-slop hexes. Warm hexes were intentionally NOT added to BANNED_COLORS (test files contain `#EDEAE3`/`#221F1B` literals → would red the lint); the decision is enforced here + by the token values, not by lint.
- **Known-unrelated:** 2 pre-existing schema-migration test failures on main (`getSchemaVersion===5` expects 5, actual 6) — NOT caused by this palette work; flagged for the data-layer owner.

## Palette = Slate & Sand (gender-neutral)  `[2026-05-19 — SUPERSEDED by Cold Minimal 2026-05-29; foundation ported 5a9d149]`
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
