# SOLDI Premium Redesign — Design Spec

> Status: DRAFT (awaiting user spec-review)
> Date: 2026-05-17
> Topic: App-wide premium visual elevation ("конфеточка") for portfolio hiring signal
> Brainstorm artifacts: `.superpowers/brainstorm/3287565-1779020654/content/` (direction.html, direction-v2.html)

## 1. Context & Goal

SOLDI is a portfolio piece for a **Design Engineer + full-stack** hiring signal (per `CLAUDE.md`,
`.planning/PROJECT.md`). The redesign goal is not a specific aesthetic — it is to **maximize the
hiring signal per unit of risk and scope**.

Portfolio reviewers (employers, freelance clients) consume the work in two modes that must BOTH land:

1. **Static** — App Store screenshots, README, Dribbble, scroll-through. Needs editorial beauty.
2. **Live** — they open the TestFlight build. The first ~10 seconds must demonstrate motion and
   engineering depth (the rare differentiator that proves *Engineer*, not only designer).

The chosen direction is a synthesis (validated visually with the user via the brainstorm visual
companion): **A editorial base + B warm depth + C kinetic hero motion + warm iOS-26 Liquid Glass on
chrome (floating tab bar)**. The locked brand identity is preserved: cream/terracotta/sage palette,
Oswald/EB Garamond/Manrope typography, editorial content surfaces.

### Non-goals (YAGNI)

- No palette change, no typography change, no new fonts.
- No glassmorphism on content surfaces (lists, dashboard cards, chat bubbles) — explicitly retained ban.
- No Android-specific nav patterns (drawer) — iOS-native patterns only for a portfolio iOS app.
- No new product features. This is a visual/motion elevation only. Chat real-data demo remains gated
  on P0 #5/#6 (Supabase/Anthropic) and is out of scope here — chat visual polish is done independently.

### Success criteria

- Every hero screen produces a portfolio-grade **static screenshot** with no motion.
- On an iOS 26 device, the **first 10 seconds** of cold-launch-to-dashboard demonstrate: hero
  count-up, donut arc draw, and the warm Liquid Glass tab bar.
- On iOS < 26, the **fallback path** is independently premium (solid editorial, no broken/empty glass).
- Locked brand invariants intact: no banned hex, WCAG AA contrast on all pairs incl. glass-fallback,
  `TYPE.*` presets unchanged, tap targets ≥ 44pt.
- All existing verification gates stay green (tsc 0, expo lint 0, ≥164 tests, expo export ios 0)
  on every wave.

## 2. Design Language (approved — Section 1)

Identity unchanged. Three new layers added on top of the locked token system; every layer is
token-governed, not ad-hoc.

### 2.1 Motion vocabulary — new `src/design/motion.ts`

A single shared vocabulary. Components consume named presets; no ad-hoc `Animated`/timing in screens.

| Preset | Behavior | Notes |
|---|---|---|
| `MOTION.heroCountUp` | number 0 → total, ~600ms, `Easing.out(cubic)` | Reanimated; MonthlyTotalHero |
| `MOTION.arcDraw` | donut arcs draw in on mount | Skia + Reanimated |
| `MOTION.arcInterpolate` | arcs morph on month-swipe | Closes deferred decision **D-05** |
| `MOTION.fabReveal` | scroll-driven: FAB hides on scroll-down, reveals on scroll-up | ChatLaunchFAB |
| `MOTION.sharedMonth` | shared-element on month-swipe (hero number + donut carry) | Dashboard |
| `MOTION.sheetSpring` | bottom-sheet spring | chat / recategorize sheets |

Constraints: all durations/easing are constants in `motion.ts`. **reduce-motion must be respected**
(`AccessibilityInfo.isReduceMotionEnabled` → motion presets degrade to instant/opacity-only).

### 2.2 Warm Liquid Glass material — new `src/design/glass.ts`

Wrapper over `expo-glass-effect` (`GlassView`, `GlassContainer`, `isLiquidGlassAvailable`).
Verified API surface (Expo SDK 54, `from-docs:github.com/expo/expo sdk-54 glass-effect.mdx`):
`GlassView` props `glassEffectStyle` (`'clear'` | regular), `isInteractive`, tint via style;
iOS 26+ only, auto-falls back to a plain `View` on unsupported platforms; `GlassContainer spacing`
groups/morphs multiple glass views.

| Token | Use | Spec |
|---|---|---|
| `GLASS.chrome` | tab bar / nav | warm tint (surface + warm-gradient overlay), regular style, `isInteractive` |
| `GLASS.sheet` | bottom-sheet background | warm tint, regular style |

**Fallback contract (mandatory, not optional):** when `isLiquidGlassAvailable() === false`, render
the current solid editorial treatment (cream + `shadows.modal`). Both paths are designed explicitly
and both must be premium. Direct `expo-glass-effect` import in screens is banned — only via `glass.ts`.

### 2.3 GRADIENTS activation

`GRADIENTS.warm` / `GRADIENTS.hero` already exist in `tokens.ts` but are unused anywhere in the
codebase (confirmed by codebase map). Use them sparingly: hero-band underlay, donut conic fill. No
neon, no glass on content.

### 2.4 Token additions (additive to `tokens.ts` — no existing value changes)

- `ELEVATION` scale (currently only `card` / `modal`) → add `floating` for the glass tab bar.
- Glass tint alpha constants (warm-tinted, not neutral grey).
- `src/design/contrast.test.ts` extended: glass-fallback foreground/background pairs also asserted
  WCAG AA.

**Untouched:** all `TYPE.*`, all `COLORS.*` values, spacing/radius scales, existing contrast
invariants. Editorial content cards stay flat-editorial.

## 3. Surface Application & Sequencing (approved — Section 2)

Full-app sweep decomposed into **7 waves**, ordered by hiring-ROI × risk × dependency. Each wave is
atomic, independently shippable, with its own verification gate.

- **Wave 0 — Foundation:** `motion.ts`, `glass.ts`, `ELEVATION`/glass-tint tokens, `contrast.test`
  extension, reduce-motion plumbing. No standalone visual change. Gate only.
- **Wave 1 — Chrome (glass tab bar):** `app/(tabs)/_layout.tsx` → `GlassContainer` + 4 `GlassView`
  tabs, warm tint, `isInteractive`; `isLiquidGlassAvailable()` false → solid editorial fallback.
  Highest per-screen visibility. Device-UAT critical (both iOS 26 and fallback paths).
- **Wave 2 — Dashboard hero (money-shot):** `features/dashboard/*` — `MonthlyTotalHero` count-up,
  `DonutChart` arc draw/interpolate (closes D-05), `ChatLaunchFAB` scroll-reveal, month-swipe
  shared-element, editorial spacing/hairline pass.
- **Wave 3 — Transactions:** `transactions.tsx`, `TransactionRow`, `FilterPillsRow`, `DateHeader` —
  editorial polish, subtle list-enter motion, hairline date headers, sheet spring.
- **Wave 4 — Chat:** `features/chat/*` — bubbles editorial, `ChatMiniChart` motion, sheet glass
  background, input row. (Real-data demo gated on P0 #5/#6; visual polish done independently.)
- **Wave 5 — Secondary sweep:** Categories, Jars (`JarRing` motion), Onboarding ×7, Settings,
  tx detail/search. Consistency pass.
- **Wave 6 — QA / perf / device:** perf budget (cold start, list fps ≥ 58), reduce-motion,
  iOS < 26 fallback screenshots, contrast audit, device-UAT.

**EAS-build coupling** (per `eas-build-quota` memory): local gates run per-wave; device builds are
NOT per-wave — batch Wave 1–2 → build, Wave 3–5 → build, Wave 6 → final. ~3 builds total, sequenced
*after* the pending build #6 (no collision with the in-flight TestFlight launch).

**Decomposition note:** full sweep is milestone-sized. This spec fixes the design language (§2) and
wave map (§3). `writing-plans` will produce a **per-wave** implementation plan (not one mega-plan);
each wave is independently shippable and verifiable.

## 4. Risks & Verification (approved — Section 3)

| ID | Risk | Mitigation |
|---|---|---|
| R1 | `expo-glass-effect` needs Xcode 26+ build image + iOS 26 SDK; current `eas.json` testflight profile may use an older image → glass compiles to no-op or build fails. `expo export` does NOT catch native toolchain mismatch (same class as the prior module-scope crash lesson). | Before any glass-bearing EAS build, verify/set `build.testflight.image` to an Xcode-26 image in `eas.json`. Treat as a pre-build gate. |
| R2 | Glass is a native module → not runnable in Expo Go. Device testing requires TestFlight/dev-build. | Plan device-UAT for glass waves on TestFlight only; provide iOS 26 device path + iOS < 26 fallback screenshot. |
| R3 | Motion (count-up, arc interpolation) on Skia + Reanimated must hold ≥ 58fps; jank on low-end devices kills the live demo. | reduce-motion mandatory; perf budget verified in Wave 6; motion is post-mount so cold-start unaffected. |
| R4 | Device-UAT surface widens; P0 #1 (physical iPhone) still open. Glass needs an iOS 26 device for the real path. | Batch device-UAT per build checkpoint; explicit iOS 26 + iOS < 26 verification matrix in Wave 6. |
| R5 | Text on translucent surfaces can fail WCAG. | Glass restricted to chrome (no body text); tab labels keep ≥ 4.5:1 via tint or solid fallback; `contrast.test` extended to glass-fallback pairs; tap targets ≥ 44pt on the new tab bar. |
| R6 | Full sweep touches many files → regression. | Per-wave gate: tsc 0, expo lint 0, ≥164 tests, expo export ios 0; token-usage guard (no banned hex); contrast test. |
| R7 | Milestone-sized scope. | Sequenced after build #6; ~3 extra EAS builds; per-wave independently shippable so work can pause cleanly. |

**Per-wave verification gate (ordered, stop at first failure, report verbatim):**
`tsc --noEmit` 0 → `expo lint` 0 → `npm test` (≥164 pass) 0 → `expo export --platform ios` 0 →
device-UAT (motion/glass waves, batched per build checkpoint).

## 5. CLAUDE.md Banned-list Amendment (approved — Section 4)

This is a deliberate governance change to the user's own project rules, committed separately and
transparently. It narrows the glass ban to content surfaces and carves out iOS-native chrome glass.

**Current** (`CLAUDE.md` → Design rules → Banned values):

```
- Neon gradients, glassmorphism, floating blur cards
```

**Replacement:**

```
- Neon gradients
- Glassmorphism / floating blur cards ON CONTENT (lists, dashboard cards,
  bubbles) — still banned. AI-slop pattern.
- EXCEPTION: iOS 26 native Liquid Glass (`expo-glass-effect`) IS allowed on
  system chrome ONLY — tab bar, nav, bottom-sheet backgrounds — warm-tinted,
  with mandatory non-glass fallback for iOS<26. Never on content surfaces.
```

**Add to Design rules (new subsystem governance):**

```
- Motion: only via src/design/motion.ts vocabulary. No ad-hoc Animated/timing
  in components. reduce-motion (AccessibilityInfo) must be respected.
- Glass: only via src/design/glass.ts wrapper. Direct expo-glass-effect import
  in screens banned. Fallback path is not optional.
```

This amendment is itself a task in Wave 0 (foundation), committed atomically with message
`docs(claude-md): amend banned-list — allow iOS-26 Liquid Glass on chrome only`.

## 6. Open Items Carried to Planning

- Confirm exact Xcode-26 EAS build image identifier (`eas.json`) at plan time via current EAS docs.
- Confirm `expo-glass-effect` is the install target for SDK 54 (vs `@expo/ui` swift-ui `glassEffect`
  modifier) at plan time — both seen in Expo SDK 54 docs; `expo-glass-effect` chosen for the
  standalone `GlassView`/`GlassContainer` tab-bar use case.
- D-05 (donut arc interpolation) is closed by Wave 2 — update `.planning` decision log at execution.
