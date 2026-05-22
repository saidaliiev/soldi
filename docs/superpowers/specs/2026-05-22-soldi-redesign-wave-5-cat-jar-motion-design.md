# Wave 5 — Categories + Jars + Sheet-Motion Governance

Design spec for the next slice of the Soldify redesign track. Closes the shared-primitive motion debt logged in W4 and lands two visual surfaces — Categories (spec §5) and Jars (spec §6) — to match `docs/design/soldify-screens.html`. Onboarding and Settings are out of scope and move to a later W6.

- **Status**: draft, pending user approval.
- **Predecessor**: W4 (chat) shipped 2026-05-19, commits `280aefc → 192da11`.
- **Successor**: W6 (Onboarding + Settings) after W5 lands.
- **Branch policy**: direct-to-main, per solo-project convention.

## Goal

Two user-facing surfaces (Categories, Jars) render to spec, and three bottom sheets (Recategorize, JarCreate, CategoryEditor) animate via a single governed motion preset instead of inline literals. After W5, every BottomSheetPrimitive consumer uses `MOTION.sheet`; ad-hoc `withTiming`/`withSpring` in sheet code is forbidden.

## Scope

In scope:

- New `MOTION.sheet` preset family (open / close / gestureClose / snapBack).
- `BottomSheetPrimitive` refactor: literal-to-preset swap, no behavior change.
- Categories surface refactor per spec §5 (CategoryListScreen, CategoryListRow, CategoryEditorBottomSheet, IconPicker, ColorSwatchPicker).
- Jars surface refactor per spec §6 (JarListScreen, JarRow, JarRing consolidation, JarDetailScreen, JarCreateBottomSheet).
- Wave gate (spec §4 4/4 GREEN: tsc / lint / test / expo export) + R-check evidence.
- W5-DEVICE-UAT.md batched into the deferred W1+W2+W3+W4 EAS device build.

Out of scope (anti-vision, declared upfront):

- Onboarding (7 screens) — moves to W6.
- Settings screen + BiometricToggle visual refactor — moves to W6.
- Spring-symmetric sheet motion (keep current open=spring / close=timing feel).
- DragMergeContext behavior changes (frozen as-is; visual untouched).
- JarRing visual rewrite beyond featured/mini consolidation.
- Jar reordering / priority / "feature this jar" UI control (no model change).
- New AI-pipeline integration.
- Android-platform glass paths (W4 boundary stays iOS-only).

## Principles

- **Governance before visual.** Sheet-motion preset lands first (T1+T2) so Categories and Jars consume it from day one. No new ad-hoc motion code introduced mid-wave.
- **Pure decision modules.** Geometry (`jarRingGeometry.ts`), motion config (`motion.ts`), glass resolution (`glass.ts`) stay node-test importable. Native imports only at the sanctioned RN boundaries.
- **Tokens-only.** Every color in changed W5 files comes from `tokens.ts`. No raw hex, no banned hex.
- **Editorial discipline.** Garamond for names that carry personality; Oswald for hero amounts; Manrope everywhere else. Never mixed within a single role.
- **Single primitive boundary.** BottomSheetPrimitive is the ONLY component that calls `withSpring` / `withTiming` for sheet open/close. Sheets consume it via `ref.open() / ref.close()`.

## Constraints

- Expo SDK 54, React Native 0.81.5, Reanimated v4.1.5 (context7-verified during W4).
- Skia v2 for JarRing geometry; no SVG-in-RN fallback.
- FlashList v2 for both Categories list and Jars list.
- Reduce-motion must be respected (existing `useReducedMotion` honored by motion presets).
- Tap targets ≥ 44×44pt on every interactive element.
- Tests stay green: existing 216 + new motion-preset tests + JarRing variant tests.

## Task breakdown

| # | Task | Output | Verifiable by |
|---|------|--------|---------------|
| T1 | `MOTION.sheet` preset added to `src/design/motion.ts` + tests | additive only, no consumer change | `npm test motion.test`; grep MOTION.sheet present |
| T2 | `BottomSheetPrimitive` swap: 4 inline motion sites → preset reads via `useMotionSheet` hook | 4 ad-hoc literals removed | grep `withSpring\|withTiming` in BottomSheetPrimitive.tsx returns only the hook-internal call sites |
| T3 | Categories surface refactor per spec §5 | List + Editor sheet + pickers re-styled, hairlines, tokens-only | screenshot vs spec §5 lines 305-347; rg banned-hex empty |
| T4 | Jars surface refactor per spec §6 | List + Detail + Ring (featured/mini) + Row + Create sheet re-styled | screenshot vs spec §6 lines 347-397; rg banned-hex empty |
| T5 | Wave gate + UAT doc + STATE update | tsc 0, lint 0, test green, export 0, W5-DEVICE-UAT.md, STATE.md updated | run gate commands, read STATE.md |

## Architecture changes

### `src/design/motion.ts` — additive

```ts
export const MOTION = {
  // ...existing presets...
  sheet: {
    open: { type: 'spring' as const, damping: 18, stiffness: 180 },
    close: { type: 'timing' as const, duration: 220, easing: 'outCubic' as const },
    gestureClose: { type: 'timing' as const, duration: 200, easing: 'outCubic' as const },
    snapBack: { type: 'spring' as const, damping: 20, stiffness: 200 },
  },
} as const;
```

Helper hook:

```ts
// src/design/useMotionSheet.ts
export function useMotionSheet() {
  // returns the 4 config objects with reduce-motion applied
}
```

### `BottomSheetPrimitive.tsx` — refactor

- Import `useMotionSheet` instead of inline literal config objects.
- 4 call sites (lines 194, 203, 228, 238 in current file) switch from inline `{damping, stiffness}` / `{duration, easing}` to the corresponding preset config.
- No new files, no API change, no signature change.

### Categories surface — `src/features/categories/`

- `app/(tabs)/categories.tsx` (expo-router route, exists): Oswald 30pt title "Categories", FlashList<Category>, hairline separators. Refactor in-place — no new file.
- `CategoryListRow.tsx`: icon-badge (40pt, palette swatch) + Manrope UI name + tabular numeric count meta + amount tabular right. Press → opens CategoryEditorBottomSheet.
- `CategoryEditorBottomSheet.tsx`: editorial title (Oswald 24pt), Manrope field labels, IconPicker + ColorSwatchPicker grid layout per spec §5. Solid surface + SHADOWS.modal (no glass).
- `ColorSwatchPicker.tsx`: circular swatches grid (8 per row), selected ring uses `accent`, 44×44pt tap targets, `tokens.palette.category.*` only.
- `IconPicker.tsx`: SVG icon grid (8 per row), selected accent ring, scroll-snap.

### Jars surface — `src/features/jars/`

- `app/(tabs)/jars.tsx` + `src/features/jars/JarListScreen.tsx` (route + feature component, both exist): Oswald 30pt title "Jars". Featured jar card at top (184×184 ring via JarRing, Oswald 38pt €amount, Garamond 21pt jar name, Manrope sub-meta). FlashList<Jar> below with JarRow for other jars. Refactor in-place.
- `JarRow.tsx`: 46×46 JarRing (mini variant) + Manrope name + meta + percentage right-aligned `moss-text`. Hairline separator.
- `JarRing.tsx`: consolidate to single Skia component with props `{size, strokeWidth, progress, palette}`. Two variants chosen by caller; no duplicate Skia trees. Uses `jarRingGeometry.ts` for dasharray math.
- `JarDetailScreen.tsx`: header (jar name + featured-size ring + Oswald amount + sub-meta), round-up rule card, sweep history list. Existing tabs unchanged.
- `JarCreateBottomSheet.tsx`: name field (Manrope), target € field, color pick (subset of ColorSwatchPicker), create button (accent pill 42pt). Consumes `BottomSheetPrimitive` with new motion preset.

### Geometry

`jarRingGeometry.ts` stays pure. Verify dasharray formula matches spec ratios (325/465 for r=74 stroke=14 featured; 79/113 and 34/113 for r=18 stroke=5 mini at 70% and 30%). Existing tests stay green; add ring-variant test if missing.

## Verification gates

Spec §4 wave gate (4/4 must be GREEN before commit T5):

```bash
cd apps/mobile
npx tsc --noEmit          # 0 errors
npx expo lint             # 0 errors
npm test                  # 216+ green, no new failures
npx expo export -p ios    # 0 errors
```

R-check evidence (capture in VERIFICATION.md or commit body):

| Check | Command | Pass condition |
|-------|---------|----------------|
| R5 motion vocab | `rg "withTiming\|withSpring" src/features/{categories,jars}/ src/components/BottomSheet/` | matches only inside `useMotionSheet` hook + BottomSheetPrimitive call sites consuming it |
| R6 banned hex | `rg '#667EEA\|#8B7AB8\|#E8E0FF\|#10B981\|#1A73E8\|#2563EB' src/features/{categories,jars}/` | empty |
| R-glass | `rg "from 'expo-glass-effect'\|from \"expo-glass-effect\"" src/` | only `GlassTabBar.tsx` + `BottomSheetPrimitive.tsx` |
| R-icon | `rg '[\u{1F300}-\u{1FAFF}]' src/features/{categories,jars}/` | empty (no emoji-as-UI) |
| R-tokens | `rg "style=\{\{[^}]*#[0-9A-Fa-f]" src/features/{categories,jars}/` | empty (no inline hex styles) |

## Anti-criteria

- Anti: No new visual diff at T2 commit (refactor must be byte-equivalent to user eye).
- Anti: No spring-vs-timing flip on close (kept current asymmetric feel intact).
- Anti: No drag-merge behavior changes.
- Anti: No emoji as UI icon in Categories or Jars.
- Anti: No glass effect on CategoryEditor or JarCreate sheet content.
- Anti: No raw hex in any inline `style={{...}}` block.
- Anti: No new file added under `src/components/BottomSheet/` (motion preset lives in `src/design/`).
- Anti: No Onboarding or Settings code touched in W5.

## Antecedents

- `docs/design/soldify-screens.html` §5 (lines 305–347) is the design source-of-truth for Categories.
- `docs/design/soldify-screens.html` §6 (lines 347–397) is the design source-of-truth for Jars.
- W4's `useMotionSnap` and `SHEET_DAMPING_RATIO` already provide spring-capable boundary helpers; W5 builds on them.

## Risks

| Risk | Mitigation |
|------|-----------|
| JarRing consolidation breaks existing snapshot tests | Add variant tests BEFORE refactor; snapshot updates only when intentional |
| `useMotionSheet` worklet-rule mismatch (reanimated v4) | Hook returns plain config objects, call sites still invoke `withSpring`/`withTiming` inline — no JS-thread-only code shipped to worklet context |
| Featured-jar selection ambiguous | Pick first jar by `createdAt`; no UI control added; deferred decision logged if user wants reorder |
| FlashList re-render thrash on Categories list | Use stable `keyExtractor` based on category id; memoize CategoryListRow with `React.memo` |
| Token rename collision (W2/W3 added `moss`, `moss-soft`, `moss-text`) | rg before T3/T4 to confirm token names; no rename in W5 scope |

## Documentation deliverables

- `docs/superpowers/specs/2026-05-22-soldi-redesign-wave-5-cat-jar-motion-design.md` (this file).
- `docs/superpowers/plans/2026-05-22-soldi-redesign-wave-5-cat-jar-motion.md` (next step — writing-plans skill).
- `.planning/phases/redesign/W5-DEVICE-UAT.md` (created at T5; batched into existing W1+W2+W3+W4 EAS device build).
- `.planning/STATE.md` updated at T5: W5 [~] until batched device build runs on physical iPhone.

## Euphoric surprise prediction

7/10 — When you open the app post-W5, Categories tab feels like a quiet catalog (Garamond names mixed with Manrope counts, monastic hairlines, no AI-slop emoji), Jars tab features one hero jar with a moss-green Skia ring that fills as you save, and every sheet that opens — Recategorize, JarCreate, CategoryEditor — settles with the same spring damping you already learned in W4's chat sheet. The motion debt disappears as a side-effect, not as the headline.
