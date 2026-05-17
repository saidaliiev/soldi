# SOLDI Redesign — Wave 0 (Foundation) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Land the design-system foundation (motion vocabulary, glass decision/style layer, new tokens, dependency installs, governance amendment) that every later redesign wave consumes — inert in the UI, fully tested, all gates green.

**Architecture:** Wave 0 ships only *node-importable pure logic* + tokens + deps + the CLAUDE.md amendment. No RN component renders glass or motion yet (that is Wave 1+). `motion.ts` and `glass.ts` deliberately avoid importing `react-native-reanimated` / `expo-glass-effect` at module scope so the node:test runner (`src/**/*.test.ts`, tsx) can import them — mirroring the existing pure `contrast.ts` pattern. The native-bound RN wrapper components are explicitly out of Wave 0 scope.

**Tech Stack:** Expo SDK 54, React Native 0.81.5, TypeScript 5.9 strict, `node:test` + `tsx` test runner, `expo-glass-effect` (new), `expo-linear-gradient` (new), Reanimated 4 / Skia 2 (already installed, consumed in later waves).

**Source of truth:** `docs/superpowers/specs/2026-05-17-soldi-premium-redesign-design.md` (committed `3990710`).

**Sequencing constraint:** Wave 0 has NO native build and NO device-UAT — it is safe to land alongside the in-flight TestFlight build #6 (no `eas.json` build-profile change here; the Xcode-26 `image` decision belongs to Wave 1's plan, per spec R1/§6).

**Working directory:** all `apps/mobile/...` paths are relative to repo root `/home/iskan/projects/soldi`. Run commands from `apps/mobile` unless stated.

---

## File Structure (decomposition locked here)

| File | Responsibility | Wave 0 action |
|---|---|---|
| `CLAUDE.md` (repo root) | Project design governance | Modify — amend banned-list, add motion/glass rules |
| `apps/mobile/src/design/tokens.ts` | Color/gradient/spacing/radius/shadow source of truth | Modify — add `ELEVATION`, `GLASS` (additive only) |
| `apps/mobile/src/design/tokens.test.ts` | Structural guard for token additions + no banned hex | Create |
| `apps/mobile/src/design/contrast.ts` | Pure WCAG audit | Modify — add glass-fallback chrome pairs |
| `apps/mobile/src/design/motion.ts` | Pure motion vocabulary + reduce-motion degradation | Create (node-safe, no reanimated import) |
| `apps/mobile/src/design/motion.test.ts` | Motion vocab + degradation logic tests | Create |
| `apps/mobile/src/design/glass.ts` | Pure glass decision + style resolver (no native import) | Create |
| `apps/mobile/src/design/glass.test.ts` | Glass decision/style resolver tests | Create |
| `apps/mobile/package.json` + lockfile | Dependencies | Modify — `expo install expo-glass-effect expo-linear-gradient` |

Out of Wave 0 scope (later waves): any `.tsx` that imports `expo-glass-effect`/reanimated, the glass tab bar, hero motion, `eas.json` build `image`.

---

## Task 1: CLAUDE.md banned-list amendment (governance)

**Files:**
- Modify: `CLAUDE.md` (repo root) — Design rules → Banned values block

This is a deliberate, transparent governance change (spec §5). No code/test; verification is a grep.

- [ ] **Step 1: Apply the banned-list replacement**

In `CLAUDE.md`, under `**Banned values** (never appear in code, even in tests):`, replace the single line:

```
- Neon gradients, glassmorphism, floating blur cards
```

with:

```
- Neon gradients
- Glassmorphism / floating blur cards ON CONTENT (lists, dashboard cards, chat bubbles) — still banned, AI-slop pattern
- EXCEPTION: iOS 26 native Liquid Glass (`expo-glass-effect`) IS allowed on system chrome ONLY — tab bar, nav, bottom-sheet backgrounds — warm-tinted, with mandatory non-glass fallback for iOS<26. Never on content surfaces.
```

- [ ] **Step 2: Add subsystem governance under Component rules**

In `CLAUDE.md`, under the `**Component rules**:` bullet list, append two bullets:

```
- Motion: only via `apps/mobile/src/design/motion.ts` vocabulary. No ad-hoc `Animated`/`withTiming` literals in components. reduce-motion (`AccessibilityInfo`) must be respected.
- Glass: only via `apps/mobile/src/design/glass.ts`. Direct `expo-glass-effect` import in screens is banned. The non-glass fallback path is not optional.
```

- [ ] **Step 3: Verify the amendment text is present and the old line is gone**

Run: `grep -n "EXCEPTION: iOS 26 native Liquid Glass" CLAUDE.md && ! grep -nx -- "- Neon gradients, glassmorphism, floating blur cards" CLAUDE.md && echo OK`
Expected: prints the matching line then `OK` (old combined line absent).

- [ ] **Step 4: Commit**

```bash
git add CLAUDE.md
git commit -m "docs(claude-md): amend banned-list — allow iOS-26 Liquid Glass on chrome only"
```

---

## Task 2: Add ELEVATION + GLASS tokens (additive)

**Files:**
- Modify: `apps/mobile/src/design/tokens.ts` (append after `SHADOWS`, before `BANNED_COLORS` at line 112)
- Create: `apps/mobile/src/design/tokens.test.ts`

`GLASS` holds warm tint colors for the fallback/tint layer; `ELEVATION` adds the `floating` step for the detached glass tab bar. All additive — no existing value changes (preserves D-09 contrast invariants and the `tokens.test`/`contrast.test` guards).

- [ ] **Step 1: Write the failing test**

Create `apps/mobile/src/design/tokens.test.ts`:

```ts
/**
 * Structural guard for Wave-0 token additions.
 * node:test + tsx (no jest — see STATE.md). Run: npm test
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { ELEVATION, GLASS, BANNED_COLORS, SHADOWS } from './tokens.js';

test('ELEVATION: floating step exists and is heavier than modal', () => {
  assert.ok(ELEVATION.floating, 'ELEVATION.floating must exist');
  assert.ok(
    ELEVATION.floating.elevation > SHADOWS.modal.elevation,
    `floating elevation ${ELEVATION.floating.elevation} must exceed modal ${SHADOWS.modal.elevation}`,
  );
  assert.ok(ELEVATION.floating.shadowOpacity <= 0.12, 'keep editorial: opacity <= 0.12');
});

test('GLASS: warm tint constants present and are valid #RRGGBB', () => {
  for (const key of ['chromeTint', 'sheetTint'] as const) {
    assert.match(GLASS[key], /^#[0-9A-Fa-f]{6}$/, `GLASS.${key} must be #RRGGBB`);
  }
  assert.ok(GLASS.chromeTintAlpha > 0 && GLASS.chromeTintAlpha <= 1, 'alpha in (0,1]');
});

test('GLASS: no tint value is a banned color', () => {
  for (const [k, v] of Object.entries(GLASS)) {
    if (typeof v === 'string') {
      assert.ok(
        !BANNED_COLORS.includes(v as typeof BANNED_COLORS[number]),
        `GLASS.${k}=${v} matches a BANNED_COLOR`,
      );
    }
  }
});
```

- [ ] **Step 2: Run test to verify it fails**

Run (from `apps/mobile`): `npm test 2>&1 | grep -E "tokens\.test|fail"`
Expected: FAIL — `ELEVATION`/`GLASS` not exported from `./tokens.js`.

- [ ] **Step 3: Add the tokens**

In `apps/mobile/src/design/tokens.ts`, insert AFTER the `SHADOWS` `} as const;` (line 110) and BEFORE the `/** Banned values. */` comment (line 112):

```ts
/**
 * Elevation scale. `card`/`modal` mirror SHADOWS; `floating` is the detached
 * glass tab bar (Wave 1). Opacity kept <= 0.12 to preserve editorial warmth.
 */
export const ELEVATION = {
  floating: {
    shadowColor: COLORS.textPrimary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 26,
    elevation: 12, // Android — above modal (6)
  },
} as const;

/**
 * Warm Liquid Glass tint layer. Used by glass.ts: `*Tint` is overlaid on the
 * native GlassView (warm wash) and IS the fill on the non-glass fallback.
 * Values are warm cream/terracotta — never neutral grey glass (anti-AI-slop).
 */
export const GLASS = {
  chromeTint: '#FAF5F0', // == surface; tab bar / nav wash
  sheetTint: '#F7F1E8', // == background; bottom-sheet wash
  chromeTintAlpha: 0.62, // overlay alpha on native glass
  sheetTintAlpha: 0.55,
  fallbackChromeBg: '#FAF5F0', // solid fill when isLiquidGlassAvailable() === false
} as const;
```

- [ ] **Step 4: Add the type exports**

In `apps/mobile/src/design/tokens.ts`, after the existing `export type RadiusToken = ...` (line 127), append:

```ts
export type ElevationToken = keyof typeof ELEVATION;
export type GlassToken = keyof typeof GLASS;
```

- [ ] **Step 5: Run test to verify it passes**

Run (from `apps/mobile`): `npm test 2>&1 | tail -6`
Expected: total test count increased by 3, `# fail 0`.

- [ ] **Step 6: Commit**

```bash
git add apps/mobile/src/design/tokens.ts apps/mobile/src/design/tokens.test.ts
git commit -m "feat(design): add ELEVATION.floating + warm GLASS tint tokens (Wave 0)"
```

---

## Task 3: Extend contrast audit with glass-fallback chrome pairs

**Files:**
- Modify: `apps/mobile/src/design/contrast.ts` — add entries to `auditTokenPairs()` return array
- Test: `apps/mobile/src/design/contrast.test.ts` (existing — already asserts every pair passes; no edit needed)

The glass tab bar's non-glass fallback (Wave 1) renders the active tab label in `accent` and inactive in `textMuted` over the solid `GLASS.fallbackChromeBg` (= `surface` value `#FAF5F0`). Document these explicitly so the fallback chrome is contrast-audited, not implicit.

- [ ] **Step 1: Add the fallback-chrome entries**

In `apps/mobile/src/design/contrast.ts`, inside the array returned by `auditTokenPairs()`, immediately BEFORE the final `// ---- error button:` block (currently line 159), insert:

```ts
    // ---- glass tab bar NON-GLASS FALLBACK (Wave 0 spec §2.2 / R5) -----------
    // When isLiquidGlassAvailable() === false the tab bar is a solid surface
    // fill (GLASS.fallbackChromeBg === COLORS.surface). Tab labels:
    //   inactive = textMuted in TYPE.uiMeta (12pt medium) → body text 4.5:1
    //   active   = accent   in TYPE.uiMeta (12pt medium) → body text 4.5:1
    entry('textMuted', COLORS.textMuted, 'glassFallbackChrome', COLORS.surface, 4.5),
    entry('accent', COLORS.accent, 'glassFallbackChrome', COLORS.surface, 4.5),
```

- [ ] **Step 2: Run the contrast audit**

Run (from `apps/mobile`): `npm test 2>&1 | grep -E "auditTokenPairs|# (pass|fail)"`
Expected: `auditTokenPairs` tests PASS, `# fail 0`.

> NOTE — possible real finding: `accent` (`#BF6F4F`) on `surface` (`#FAF5F0`) is ~3.46:1 (documented at tokens.ts:25–28), which is BELOW the 4.5:1 body threshold this entry requires. If Step 2 FAILS on the `accent` entry, that is a genuine design constraint, not a flaky test. Resolve by changing the active-tab label spec: active tab uses `accentDeep` (`#A86147`, ~4.19:1 — still <4.5) OR `textPrimary` (`#2C1810`, ~15:1 — passes) with `accent` used only as a non-text indicator (dot/underline, §1.4.11 graphic 3:1). Apply the `textPrimary`-label + `accent`-indicator variant: change the inserted `accent` line to `entry('textPrimary', COLORS.textPrimary, 'glassFallbackChrome', COLORS.surface, 4.5),` and record in the commit body that the active-tab label is `textPrimary` with an `accent` non-text indicator. Re-run Step 2; expected PASS.

- [ ] **Step 3: Commit**

```bash
git add apps/mobile/src/design/contrast.ts
git commit -m "test(design): audit glass tab-bar non-glass fallback contrast pairs (Wave 0)"
```

---

## Task 4: Install expo-glass-effect + expo-linear-gradient

**Files:**
- Modify: `apps/mobile/package.json` + lockfile (via expo install — picks SDK-54-compatible versions)

`expo-linear-gradient` renders the existing-but-unused `GRADIENTS` tuples (spec §2.3); `expo-glass-effect` provides the verified iOS-26 Liquid Glass primitives (spec §2.2, decided over `@expo/ui` swift-ui modifier). Both are inert in Wave 0 (no component imports them yet). `expo-glass-effect` falls back to a plain `View` off iOS-26, so installing it cannot regress Expo Go / older devices.

- [ ] **Step 1: Install via expo (do NOT hand-edit versions)**

Run (from `apps/mobile`): `npx expo install expo-glass-effect expo-linear-gradient`
Expected: both added to `package.json` `dependencies` with `~`-pinned SDK-54-compatible versions; lockfile updated.

- [ ] **Step 2: Typecheck still clean**

Run (from `apps/mobile`): `npx tsc --noEmit; echo "exit:$?"`
Expected: `exit:0`.

- [ ] **Step 3: Bundle still resolves (Metro) — catches native-pkg resolution issues `tsc` can't**

Run (from `apps/mobile`): `npx expo export --platform ios --output-dir /tmp/soldi-wave0-export; echo "exit:$?"`
Expected: `exit:0`, ios bundle emitted. (This is the Metro-resolve gate, per the prior `.svg`/`op-sqlite` lessons — `tsc` alone would not catch a bad native-package resolution.)

- [ ] **Step 4: Commit**

```bash
git add apps/mobile/package.json apps/mobile/package-lock.json
git commit -m "build(deps): add expo-glass-effect + expo-linear-gradient (SDK 54, Wave 0)"
```

> If the lockfile is `yarn.lock`/`pnpm-lock.yaml` instead of `package-lock.json`, stage that file instead. Check with `git status --porcelain apps/mobile` before the commit.

---

## Task 5: Create motion vocabulary (`motion.ts`) — node-safe

**Files:**
- Create: `apps/mobile/src/design/motion.ts`
- Create: `apps/mobile/src/design/motion.test.ts`

Pure vocabulary: named duration/easing presets + a pure `degradeForReducedMotion()` that collapses any preset to an instant/opacity-only form. NO `react-native-reanimated` import (keeps it node-importable like `contrast.ts`). Components in later waves map these presets onto Reanimated; this file is the single source of motion truth.

- [ ] **Step 1: Write the failing test**

Create `apps/mobile/src/design/motion.test.ts`:

```ts
/**
 * motion.ts vocabulary + reduce-motion degradation. node:test + tsx.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { MOTION, degradeForReducedMotion, type MotionPreset } from './motion.js';

test('MOTION: every preset has positive duration and a named easing', () => {
  for (const [name, p] of Object.entries(MOTION)) {
    assert.ok(p.durationMs > 0, `${name}.durationMs must be > 0`);
    assert.ok(p.easing.length > 0, `${name}.easing must be a named token`);
  }
});

test('MOTION: expected presets exist', () => {
  for (const k of ['heroCountUp', 'arcDraw', 'arcInterpolate', 'fabReveal', 'sharedMonth', 'sheetSpring'] as const) {
    assert.ok(MOTION[k], `MOTION.${k} missing`);
  }
});

test('degradeForReducedMotion: collapses duration to 0 and easing to linear', () => {
  const p: MotionPreset = MOTION.heroCountUp;
  const d = degradeForReducedMotion(p);
  assert.strictEqual(d.durationMs, 0);
  assert.strictEqual(d.easing, 'linear');
  assert.strictEqual(d.reduced, true);
});

test('degradeForReducedMotion: is pure (does not mutate input)', () => {
  const before = { ...MOTION.arcDraw };
  degradeForReducedMotion(MOTION.arcDraw);
  assert.deepStrictEqual({ ...MOTION.arcDraw }, before);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run (from `apps/mobile`): `npm test 2>&1 | grep -E "motion\.test|Cannot find module"`
Expected: FAIL — `./motion.js` not found.

- [ ] **Step 3: Implement `motion.ts`**

Create `apps/mobile/src/design/motion.ts`:

```ts
/**
 * SOLDI motion vocabulary — single source of motion truth (spec §2.1).
 *
 * Pure: NO react-native-reanimated import (node-test importable, like
 * contrast.ts). Later-wave components map these presets onto Reanimated
 * worklets; they MUST NOT invent ad-hoc durations/easings (CLAUDE.md rule).
 *
 * `easing` is a NAMED token resolved to a Reanimated Easing fn at the call
 * site (Wave 1 helper). reduce-motion: call degradeForReducedMotion() when
 * AccessibilityInfo.isReduceMotionEnabled() is true.
 */

export type EasingToken = 'outCubic' | 'inOutCubic' | 'spring' | 'linear';

export type MotionPreset = {
  readonly durationMs: number;
  readonly easing: EasingToken;
};

export type ReducedMotionPreset = {
  readonly durationMs: 0;
  readonly easing: 'linear';
  readonly reduced: true;
};

export const MOTION = {
  /** Hero total counts 0 → value on mount (MonthlyTotalHero). */
  heroCountUp: { durationMs: 600, easing: 'outCubic' },
  /** Donut arcs draw in on first mount (DonutChart). */
  arcDraw: { durationMs: 700, easing: 'outCubic' },
  /** Donut arcs morph between months (closes deferred D-05). */
  arcInterpolate: { durationMs: 450, easing: 'inOutCubic' },
  /** Scroll-driven FAB hide/reveal (ChatLaunchFAB). */
  fabReveal: { durationMs: 220, easing: 'outCubic' },
  /** Shared-element carry on month-swipe (hero number + donut). */
  sharedMonth: { durationMs: 380, easing: 'inOutCubic' },
  /** Bottom-sheet open/close spring (chat / recategorize). */
  sheetSpring: { durationMs: 420, easing: 'spring' },
} as const satisfies Record<string, MotionPreset>;

export type MotionName = keyof typeof MOTION;

/**
 * Collapse a preset to an instant, linear, opacity-only form for users with
 * reduce-motion enabled. Pure — returns a new object, never mutates input.
 */
export function degradeForReducedMotion(_preset: MotionPreset): ReducedMotionPreset {
  return { durationMs: 0, easing: 'linear', reduced: true };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run (from `apps/mobile`): `npm test 2>&1 | tail -6`
Expected: `# fail 0`, total count up by 4.

- [ ] **Step 5: Commit**

```bash
git add apps/mobile/src/design/motion.ts apps/mobile/src/design/motion.test.ts
git commit -m "feat(design): add motion.ts vocabulary + reduce-motion degradation (Wave 0)"
```

---

## Task 6: Create glass decision/style layer (`glass.ts`) — node-safe

**Files:**
- Create: `apps/mobile/src/design/glass.ts`
- Create: `apps/mobile/src/design/glass.test.ts`

Pure decision + style resolver. NO `expo-glass-effect` import (native, breaks node tests). Availability is INJECTED (caller passes the boolean from `isLiquidGlassAvailable()` at the RN call site in Wave 1). This file decides glass-vs-fallback and produces the warm-tint style for each path.

- [ ] **Step 1: Write the failing test**

Create `apps/mobile/src/design/glass.test.ts`:

```ts
/**
 * glass.ts decision + style resolver. node:test + tsx. Availability injected.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { shouldRenderGlass, resolveChromeSurface } from './glass.js';
import { GLASS } from './tokens.js';

test('shouldRenderGlass: true only when available', () => {
  assert.strictEqual(shouldRenderGlass(true), true);
  assert.strictEqual(shouldRenderGlass(false), false);
});

test('resolveChromeSurface: glass path returns tint + alpha, glass=true', () => {
  const s = resolveChromeSurface(true);
  assert.strictEqual(s.glass, true);
  assert.strictEqual(s.tint, GLASS.chromeTint);
  assert.strictEqual(s.tintAlpha, GLASS.chromeTintAlpha);
});

test('resolveChromeSurface: fallback path is opaque solid fill, glass=false', () => {
  const s = resolveChromeSurface(false);
  assert.strictEqual(s.glass, false);
  assert.strictEqual(s.backgroundColor, GLASS.fallbackChromeBg);
  assert.strictEqual(s.tintAlpha, 1);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run (from `apps/mobile`): `npm test 2>&1 | grep -E "glass\.test|Cannot find module"`
Expected: FAIL — `./glass.js` not found.

- [ ] **Step 3: Implement `glass.ts`**

Create `apps/mobile/src/design/glass.ts`:

```ts
/**
 * SOLDI warm Liquid Glass decision + style layer (spec §2.2).
 *
 * Pure: NO expo-glass-effect import (native; node-test importable). The RN
 * wrapper component (Wave 1) calls expo-glass-effect's isLiquidGlassAvailable()
 * and passes the boolean here. Direct expo-glass-effect import in screens is
 * banned (CLAUDE.md) — screens consume the Wave-1 wrapper, which consumes this.
 *
 * Fallback is NOT optional: when glass is unavailable the chrome is a warm
 * SOLID editorial fill (never an empty/transparent bar).
 */

import { GLASS } from './tokens';

/** Glass renders only when the native effect is actually available (iOS 26+). */
export function shouldRenderGlass(isLiquidGlassAvailable: boolean): boolean {
  return isLiquidGlassAvailable === true;
}

export type ChromeSurface =
  | {
      readonly glass: true;
      /** warm wash overlaid on the native GlassView */
      readonly tint: string;
      readonly tintAlpha: number;
    }
  | {
      readonly glass: false;
      /** opaque solid editorial fill (fallback path) */
      readonly backgroundColor: string;
      readonly tintAlpha: 1;
    };

/**
 * Resolve the chrome (tab bar / nav) surface style for the current device.
 * `isLiquidGlassAvailable` is injected from the RN call site.
 */
export function resolveChromeSurface(isLiquidGlassAvailable: boolean): ChromeSurface {
  if (shouldRenderGlass(isLiquidGlassAvailable)) {
    return { glass: true, tint: GLASS.chromeTint, tintAlpha: GLASS.chromeTintAlpha };
  }
  return { glass: false, backgroundColor: GLASS.fallbackChromeBg, tintAlpha: 1 };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run (from `apps/mobile`): `npm test 2>&1 | tail -6`
Expected: `# fail 0`, total count up by 3.

- [ ] **Step 5: Commit**

```bash
git add apps/mobile/src/design/glass.ts apps/mobile/src/design/glass.test.ts
git commit -m "feat(design): add glass.ts decision + warm-tint resolver (Wave 0)"
```

---

## Task 7: Wave 0 verification gate + ship

**Files:** none modified — verification + state only.

- [ ] **Step 1: Full ordered gate (stop at first failure, report verbatim)**

Run (from `apps/mobile`), in order:

```bash
npx tsc --noEmit; echo "tsc:$?"
npx expo lint; echo "lint:$?"
npm test 2>&1 | tail -6
npx expo export --platform ios --output-dir /tmp/soldi-wave0-final; echo "export:$?"
```

Expected: `tsc:0`, `lint:0`, `# fail 0` with total ≥ 164 + 14 new Wave-0 assertions (= ≥ 178), `export:0`.

- [ ] **Step 2: Confirm Wave 0 is UI-inert**

Run (from `apps/mobile`): `grep -rn "expo-glass-effect\|from './glass'\|from './motion'\|expo-linear-gradient" app src --include="*.tsx" || echo "INERT-OK"`
Expected: `INERT-OK` (no screen/component consumes the new modules yet — Wave 0 ships foundation only; consumption starts Wave 1).

- [ ] **Step 3: Update planning state**

Append to `.planning/STATE.md` under an appropriate progress note (one line): `Redesign Wave 0 (foundation) complete: motion.ts/glass.ts/tokens/deps/governance landed, UI-inert, gates green. Next: Wave 1 (glass tab bar) — requires Xcode-26 EAS image decision (spec R1).`

- [ ] **Step 4: Commit state**

```bash
git add .planning/STATE.md
git commit -m "chore(planning): mark redesign Wave 0 foundation complete"
```

---

## Self-Review (completed during authoring)

**1. Spec coverage:**
- §2.1 motion vocabulary → Task 5 ✓
- §2.2 glass wrapper + mandatory fallback → Task 6 (pure layer) ✓; native RN wrapper explicitly deferred to Wave 1 (documented)
- §2.3 GRADIENTS activation → Task 4 installs `expo-linear-gradient` (renderer); actual gradient placement is Wave 2 (hero) / per spec wave map ✓
- §2.4 token additions (ELEVATION, glass tint, contrast.test extension) → Task 2 + Task 3 ✓
- §4 R1 (Xcode-26 EAS image) → explicitly deferred to Wave 1 with rationale (Wave 0 has no build) ✓
- §4 R5 (a11y/contrast on fallback) → Task 3 ✓ (with documented accent-on-surface resolution path)
- §5 CLAUDE.md amendment → Task 1 ✓
- §6 open item (expo-glass-effect vs @expo/ui) → resolved in plan preamble + Task 4 ✓

**2. Placeholder scan:** No TBD/TODO/"handle edge cases"/"similar to". Every code step contains full file content or an exact insertion with surrounding anchors. ✓

**3. Type consistency:** `MotionPreset`/`degradeForReducedMotion`/`MOTION` names match between Task 5 test and impl. `shouldRenderGlass`/`resolveChromeSurface`/`ChromeSurface`/`GLASS.*` names match between Task 6 test and impl and Task 2's `GLASS` token shape (`chromeTint`, `chromeTintAlpha`, `fallbackChromeBg`). `ELEVATION.floating` shape matches Task 2 test assertions. ✓

**4. Known risk surfaced inline:** Task 3 Step 2 documents the real possibility that `accent`-on-`surface` fails the 4.5:1 body threshold and gives the exact resolution (textPrimary label + accent non-text indicator) rather than a vague "fix contrast". ✓

---

## Execution Handoff

Wave 0 is independently shippable and fully gated. Subsequent waves (1–6) each get their own plan authored AFTER Wave 0 lands (so they bind to the real `motion.ts`/`glass.ts`/token API, not speculative signatures).
