# SOLDI Redesign — Wave 1 (Warm Liquid Glass Floating Tab Bar) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the flat expo-router tab bar with a warm iOS-26 Liquid Glass floating tab bar (spec §2.2/§3 Wave 1), with a mandatory, equally-premium solid editorial fallback for iOS<26 — all decision logic in the pure node-tested `glass.ts` layer, the native effect isolated to one component.

**Architecture:** All glass-vs-fallback decision + style composition is added to the pure `apps/mobile/src/design/glass.ts` (node:test importable, extends Wave 0 — additive, W0 tests stay green). Exactly ONE new RN component, `src/features/chrome/GlassTabBar.tsx`, imports `expo-glass-effect` (governance: direct import in screens banned — screens consume this via the expo-router `tabBar` prop). It calls the two native availability functions at the RN boundary, passes plain booleans into the pure layer, and renders `GlassContainer` + 4 `GlassView` tabs (glass path) or a solid `View` + `ELEVATION.floating` (fallback path). `app/(tabs)/_layout.tsx` only wires the `tabBar` prop. R1 (Xcode-26 EAS image) is a config-edit + pre-build gate — the actual EAS build is deferred and batched with Wave 2.

**Tech Stack:** Expo SDK 54 (`~54.0.33`), React Native 0.81.5, expo-router `~6.0.23`, TypeScript 5.9 strict, `node:test`+`tsx` runner, `expo-glass-effect@0.1.10` (installed Wave 0, consumed here for the first time), `@shopify/react-native-skia` (existing tab icons), `react-i18next` (existing labels).

**Source of truth:** `docs/superpowers/specs/2026-05-17-soldi-premium-redesign-design.md` (`3990710`). Wave 0 foundation: commits `c955cb2..ac657a9` + `e2fc82c` (I-01). This plan binds to the REAL Wave-0 API (verified in tree), not speculative signatures.

**Sequencing constraint (R1 — read before executing):** Wave 1 introduces the first `expo-glass-effect`-bearing native code. `expo-glass-effect` requires an Xcode-26 / iOS-26-SDK build image; `eas.json` currently has **NO `image` key on any profile** (verified ABSENT). `expo export` does NOT catch native-toolchain mismatch (prior crash-class lesson). Therefore: **NO EAS build is triggered by this plan.** Wave 1 lands code + the `eas.json` `image` fix as a *pre-build gate*; the actual TestFlight build is batched with Wave 2 and must come AFTER the in-flight TestFlight build #6 (do not collide; EAS quota ~10-15/mo — batch, never auto-rebuild). Glass is NOT testable in Expo Go or `expo export` — only on a real iOS 26 device via TestFlight, and the iOS<26 fallback on any older device. Device-UAT is authored here (Task 6) and deferred to the batched build checkpoint.

**Working directory:** all `apps/mobile/...` paths are relative to repo root `/home/iskan/projects/soldi`. Run `npm`/`tsc`/`lint`/`expo`/`git` commands from `apps/mobile` unless stated.

---

## File Structure (decomposition locked here)

| File | Responsibility | Wave 1 action |
|---|---|---|
| `apps/mobile/src/design/glass.ts` | Pure glass decision + style resolver (node-safe, NO native import) | Modify — add `isSafeToRenderGlass`, `composeGlassTint`, `resolveTabBarChrome` (additive; W0 exports untouched) |
| `apps/mobile/src/design/glass.test.ts` | Pure-layer guard | Modify — add tests for the 3 new pure helpers |
| `apps/mobile/src/features/chrome/GlassTabBar.tsx` | The ONLY file importing `expo-glass-effect`; custom expo-router `tabBar`; native boundary → pure layer | Create |
| `apps/mobile/app/(tabs)/_layout.tsx` | expo-router `Tabs` wiring only | Modify — set `tabBar={...}`, strip duplicated tint/style now owned by `GlassTabBar` |
| `apps/mobile/eas.json` | Build profiles | Modify — add `"image": "latest"` to `testflight` + `production` iOS (R1 pre-build gate) |
| `.planning/STATE.md` | Planning state | Modify — record Wave 1 landed (code) + device-UAT deferred |

Out of Wave 1 scope (later waves): bottom-sheet glass (Wave 2+, needs `GLASS.fallbackSheetBg` + `resolveSheetSurface` — W0 forward-note), hero/donut kinetic motion (Wave 2), the actual EAS build (batched W1+W2). No tab-switch animation — spec defines tab switching as instant; do NOT invent a `MOTION` preset for it.

**Key design decisions (locked, with spec citations):**
- **`GlassContainer` + 4 `GlassView`** (spec §3 W1: "`GlassContainer` + 4 `GlassView` tabs"), NOT a single glass bar. The container's `spacing` lets the per-tab glass merge/morph — this is the intended iOS-26 visual and the primary device-UAT checkpoint.
- **Tint alpha baked into hex8.** `GlassView` exposes `tintColor?: string` (a prop, not `style`). `GLASS.chromeTintAlpha` (0.62) is not a separate prop → compose `#RRGGBB` + alpha into `#RRGGBBAA` (`composeGlassTint`). (Resolves the brief's spec-imprecision flag #2.)
- **Two availability checks, not one.** Installed `expo-glass-effect@0.1.10` exposes BOTH `isLiquidGlassAvailable()` and `isGlassEffectAPIAvailable()`; the latter guards against iOS-26-beta crashes (expo/expo#40911) and MUST be checked first. Wave 0 `glass.ts` only modeled `isLiquidGlassAvailable`. Wave 1 adds the pure `isSafeToRenderGlass(api, liquid)` gate; the component supplies both booleans from the native boundary.
- **Fallback renders an explicit solid surface.** Off-iOS-26, `GlassView` degrades to a transparent `View` (empty bar) — unacceptable. The fallback path renders a plain `View` with `backgroundColor: GLASS.fallbackChromeBg` + `ELEVATION.floating`, never relying on the library's internal degrade.

---

## Task 1: Extend `glass.ts` — safe-availability gate + tint composer (pure, node-safe)

**Files:**
- Modify: `apps/mobile/src/design/glass.ts` (append AFTER `resolveChromeSurface`, before EOF — do NOT alter W0 exports `shouldRenderGlass`, `resolveChromeSurface`, `ChromeSurface`)
- Modify: `apps/mobile/src/design/glass.test.ts` (append new tests; keep W0 tests unchanged)

Still pure: NO `expo-glass-effect` / RN import. `isSafeToRenderGlass` is the both-checks gate (expo#40911). `composeGlassTint` turns `#RRGGBB` + alpha (0–1) into `#RRGGBBAA`.

- [ ] **Step 1: Write the failing tests**

Append to `apps/mobile/src/design/glass.test.ts`:

```ts
import {
  isSafeToRenderGlass,
  composeGlassTint,
} from './glass.js';

test('isSafeToRenderGlass: true ONLY when both api+liquid available', () => {
  assert.strictEqual(isSafeToRenderGlass(true, true), true);
  assert.strictEqual(isSafeToRenderGlass(true, false), false);
  assert.strictEqual(isSafeToRenderGlass(false, true), false);
  assert.strictEqual(isSafeToRenderGlass(false, false), false);
});

test('composeGlassTint: #RRGGBB + alpha → #RRGGBBAA (uppercase, 2-digit)', () => {
  assert.strictEqual(composeGlassTint('#FAF5F0', 0.62), '#FAF5F09E');
  assert.strictEqual(composeGlassTint('#FAF5F0', 1), '#FAF5F0FF');
  assert.strictEqual(composeGlassTint('#FAF5F0', 0), '#FAF5F000');
});

test('composeGlassTint: clamps alpha to [0,1]', () => {
  assert.strictEqual(composeGlassTint('#FAF5F0', 1.5), '#FAF5F0FF');
  assert.strictEqual(composeGlassTint('#FAF5F0', -0.2), '#FAF5F000');
});

test('composeGlassTint: rejects non-#RRGGBB input', () => {
  assert.throws(() => composeGlassTint('FAF5F0', 0.5), /#RRGGBB/);
  assert.throws(() => composeGlassTint('#FFF', 0.5), /#RRGGBB/);
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run (from `apps/mobile`): `npm test 2>&1 | grep -E "glass\.test|isSafeToRenderGlass|composeGlassTint|# fail"`
Expected: FAIL — `isSafeToRenderGlass`/`composeGlassTint` not exported from `./glass.js`.

- [ ] **Step 3: Implement the helpers**

Append to `apps/mobile/src/design/glass.ts` (after `resolveChromeSurface`'s closing brace, before any trailing EOF newline — do not touch existing code):

```ts

/**
 * Glass is safe to render ONLY when BOTH native checks pass:
 *  - isGlassEffectAPIAvailable(): the Liquid Glass API exists at runtime
 *    (some iOS 26 BETA builds lack it → hard crash; expo/expo#40911).
 *  - isLiquidGlassAvailable(): the effect is actually available on this device.
 * The RN boundary (GlassTabBar) reads both natively and passes the booleans
 * here so this module stays node-test importable (no expo-glass-effect import).
 */
export function isSafeToRenderGlass(
  isGlassEffectApiAvailable: boolean,
  isLiquidGlassAvailable: boolean,
): boolean {
  return isGlassEffectApiAvailable === true && isLiquidGlassAvailable === true;
}

/**
 * Compose a `#RRGGBB` token + alpha (0–1) into an 8-digit `#RRGGBBAA` string.
 * `GlassView.tintColor` is a single color prop (no separate alpha), so the
 * warm-tint alpha (GLASS.chromeTintAlpha) must be encoded into the color.
 * Alpha is clamped to [0,1]. Throws on malformed input (fail fast — a bad
 * tint would silently break the chrome material).
 */
export function composeGlassTint(hex6: string, alpha: number): string {
  if (!/^#[0-9A-Fa-f]{6}$/.test(hex6)) {
    throw new Error(`composeGlassTint: expected #RRGGBB, got "${hex6}"`);
  }
  const clamped = Math.min(1, Math.max(0, alpha));
  const aa = Math.round(clamped * 255)
    .toString(16)
    .toUpperCase()
    .padStart(2, '0');
  return `${hex6.toUpperCase()}${aa}`;
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run (from `apps/mobile`): `npm test 2>&1 | tail -6`
Expected: `# fail 0`; total = previous + 4 (the 4 new `test(...)` blocks).

- [ ] **Step 5: Typecheck**

Run (from `apps/mobile`): `npx tsc --noEmit; echo "tsc:$?"` → `tsc:0`.

- [ ] **Step 6: Commit**

```bash
git add apps/mobile/src/design/glass.ts apps/mobile/src/design/glass.test.ts
git commit -m "feat(design): glass.ts safe-availability gate + tint composer (Wave 1)"
```

---

## Task 2: Extend `glass.ts` — `resolveTabBarChrome` (pure RN-ready style intent)

**Files:**
- Modify: `apps/mobile/src/design/glass.ts` (append after Task 1's helpers)
- Modify: `apps/mobile/src/design/glass.test.ts` (append tests)

Produces the FINAL, RN-ready chrome style so `GlassTabBar.tsx` carries zero decision logic. Reuses W0 `resolveChromeSurface` + Task 1 `composeGlassTint` + `ELEVATION.floating` (DRY — no duplicated branch). Still pure (imports only `./tokens`).

- [ ] **Step 1: Write the failing tests**

Append to `apps/mobile/src/design/glass.test.ts`:

```ts
import { resolveTabBarChrome } from './glass.js';
import { GLASS, ELEVATION } from './tokens.js';

test('resolveTabBarChrome: glass path → tintColor hex8 + interactive, glass=true', () => {
  const c = resolveTabBarChrome(true);
  assert.strictEqual(c.glass, true);
  assert.strictEqual(c.tintColor, '#FAF5F09E'); // composeGlassTint(chromeTint, 0.62)
  assert.strictEqual(c.isInteractive, true);
  assert.strictEqual(c.glassEffectStyle, 'regular');
});

test('resolveTabBarChrome: fallback path → solid bg + floating shadow, glass=false', () => {
  const c = resolveTabBarChrome(false);
  assert.strictEqual(c.glass, false);
  assert.strictEqual(c.backgroundColor, GLASS.fallbackChromeBg);
  assert.deepStrictEqual(c.shadow, ELEVATION.floating);
});

test('resolveTabBarChrome: discriminated union — no cross-branch field leak', () => {
  const g = resolveTabBarChrome(true);
  const f = resolveTabBarChrome(false);
  assert.strictEqual('backgroundColor' in g, false);
  assert.strictEqual('tintColor' in f, false);
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run (from `apps/mobile`): `npm test 2>&1 | grep -E "resolveTabBarChrome|# fail"`
Expected: FAIL — `resolveTabBarChrome` not exported.

- [ ] **Step 3: Implement**

Append to `apps/mobile/src/design/glass.ts` (after Task 1 helpers). Note the import line at the top of `glass.ts` is currently `import { GLASS } from './tokens';` — CHANGE it to also import `ELEVATION`:

First, modify the existing import line at the top of `apps/mobile/src/design/glass.ts`:

```ts
import { GLASS, ELEVATION } from './tokens';
```

Then append:

```ts

export type TabBarChrome =
  | {
      readonly glass: true;
      /** GlassView.glassEffectStyle */
      readonly glassEffectStyle: 'regular';
      /** GlassView.tintColor — warm wash, alpha baked in (#RRGGBBAA) */
      readonly tintColor: string;
      /** GlassView.isInteractive — chrome reacts to touches per spec §2.2 */
      readonly isInteractive: true;
    }
  | {
      readonly glass: false;
      /** opaque solid editorial fill (mandatory non-glass fallback) */
      readonly backgroundColor: string;
      /** ELEVATION.floating — detached pill shadow on the fallback bar */
      readonly shadow: typeof ELEVATION.floating;
    };

/**
 * Resolve the FINAL RN-ready tab-bar chrome style. `safeGlass` is the result
 * of isSafeToRenderGlass() (both native checks) injected from the RN boundary.
 * Glass path: warm tint with alpha baked in, interactive, regular style.
 * Fallback path: solid warm fill + floating shadow (NEVER an empty/transparent
 * bar — the library's internal degrade gives a transparent View, so the
 * component MUST use this backgroundColor explicitly).
 */
export function resolveTabBarChrome(safeGlass: boolean): TabBarChrome {
  const surface = resolveChromeSurface(safeGlass);
  if (surface.glass) {
    return {
      glass: true,
      glassEffectStyle: 'regular',
      tintColor: composeGlassTint(surface.tint, surface.tintAlpha),
      isInteractive: true,
    };
  }
  return {
    glass: false,
    backgroundColor: surface.backgroundColor,
    shadow: ELEVATION.floating,
  };
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run (from `apps/mobile`): `npm test 2>&1 | tail -6`
Expected: `# fail 0`; total = previous + 3.

- [ ] **Step 5: Typecheck + W0 regression**

Run (from `apps/mobile`):
```bash
npx tsc --noEmit; echo "tsc:$?"
npm test 2>&1 | grep -E "shouldRenderGlass|resolveChromeSurface: (glass|fallback)|# (pass|fail)"
```
Expected: `tsc:0`; the 3 original W0 `glass.test` assertions still PASS (additive change did not regress them); `# fail 0`.

- [ ] **Step 6: Commit**

```bash
git add apps/mobile/src/design/glass.ts apps/mobile/src/design/glass.test.ts
git commit -m "feat(design): resolveTabBarChrome — RN-ready glass/fallback intent (Wave 1)"
```

---

## Task 3: Create `GlassTabBar.tsx` — the native-boundary tab bar component

**Files:**
- Create: `apps/mobile/src/features/chrome/GlassTabBar.tsx`

This is the ONLY file in the codebase permitted to import `expo-glass-effect` (CLAUDE.md governance). It is a custom expo-router `tabBar` render component. It reads both native availability functions, derives `safeGlass` via the pure `isSafeToRenderGlass`, gets the RN-ready style via `resolveTabBarChrome`, and renders either the glass path (`GlassContainer` + per-tab `GlassView`) or the solid fallback. NOT node-testable (imports native + Skia) — verified by device-UAT (Task 6 checklist).

- [ ] **Step 1: Create the component (full content)**

Create `apps/mobile/src/features/chrome/GlassTabBar.tsx`:

```tsx
/**
 * SOLDI warm Liquid Glass floating tab bar (redesign Wave 1, spec §2.2/§3).
 *
 * The ONLY file allowed to import expo-glass-effect (CLAUDE.md governance).
 * Screens never import it — they get this via app/(tabs)/_layout.tsx's
 * `tabBar` prop. All glass-vs-fallback DECISION + style lives in the pure,
 * node-tested src/design/glass.ts; this component only:
 *   1. reads the two native availability fns at the RN boundary,
 *   2. asks glass.ts what to render,
 *   3. renders GlassContainer+GlassView (glass) OR a solid View (fallback).
 *
 * Fallback is mandatory and equally premium (spec §2.2): off iOS-26 the
 * library degrades GlassView to a TRANSPARENT View, so the fallback path
 * renders an explicit solid warm fill + ELEVATION.floating — never an empty
 * bar. Tab switching is instant (spec — no tab-switch motion preset).
 *
 * Accessibility: each tab is role="tab" with selected state + i18n label;
 * tap target ≥ 44pt (spec R5). reduce-transparency: isLiquidGlassAvailable()
 * may still be true under accessibility limits, so we additionally honor
 * AccessibilityInfo.isReduceTransparencyEnabled() → force the solid path.
 */

import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import {
  GlassContainer,
  GlassView,
  isGlassEffectAPIAvailable,
  isLiquidGlassAvailable,
} from 'expo-glass-effect';
import React from 'react';
import { useEffect, useState } from 'react';
import {
  AccessibilityInfo,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { COLORS, RADIUS, SPACING } from '@design/tokens';
import { TYPE } from '@design/typography';
import { isSafeToRenderGlass, resolveTabBarChrome } from '@/src/design/glass';
import {
  DashboardIcon,
  TransactionsIcon,
  CategoriesIcon,
  JarsIcon,
} from '@/src/design/icons/tabs';

const MIN_TAP = 44; // spec R5 — minimum tap target (pt)
const BAR_HEIGHT = 56;
const BAR_MARGIN = SPACING.md; // floating inset from screen edges

type IconCmp = (props: { color: string; size?: number }) => React.JSX.Element;

// route name (expo-router) → tab icon. `explore` is hidden (href:null) and
// never reaches the tabBar (filtered below by descriptors).
const ICONS: Record<string, IconCmp> = {
  index: DashboardIcon,
  transactions: TransactionsIcon,
  categories: CategoriesIcon,
  jars: JarsIcon,
};

export function GlassTabBar({
  state,
  descriptors,
  navigation,
}: BottomTabBarProps): React.JSX.Element {
  const insets = useSafeAreaInsets();

  // reduce-transparency: glass may still report available under a11y limits.
  const [reduceTransparency, setReduceTransparency] = useState(false);
  useEffect(() => {
    let mounted = true;
    AccessibilityInfo.isReduceTransparencyEnabled().then((v) => {
      if (mounted) setReduceTransparency(v);
    });
    const sub = AccessibilityInfo.addEventListener(
      'reduceTransparencyChanged',
      (v) => setReduceTransparency(v),
    );
    return () => {
      mounted = false;
      sub.remove();
    };
  }, []);

  // Native boundary: read both availability fns, collapse to a pure boolean.
  const safeGlass =
    !reduceTransparency &&
    isSafeToRenderGlass(isGlassEffectAPIAvailable(), isLiquidGlassAvailable());
  const chrome = resolveTabBarChrome(safeGlass);

  const bottom = Math.max(insets.bottom, BAR_MARGIN);

  const tabs = state.routes
    .filter((route) => descriptors[route.key]?.options.href !== null)
    .map((route) => {
      const { options } = descriptors[route.key];
      const routeIndex = state.routes.findIndex((r) => r.key === route.key);
      const focused = state.index === routeIndex;
      const color = focused ? COLORS.accent : COLORS.textMuted; // icon = accent indicator (I-01)
      const labelColor = focused ? COLORS.textPrimary : COLORS.textMuted; // label AA body (I-01)
      const label =
        typeof options.tabBarLabel === 'string'
          ? options.tabBarLabel
          : (options.title ?? route.name);
      const Icon = ICONS[route.name];

      const onPress = () => {
        const event = navigation.emit({
          type: 'tabPress',
          target: route.key,
          canPreventDefault: true,
        });
        if (!focused && !event.defaultPrevented) {
          navigation.navigate(route.name);
        }
      };

      const tabContent = (
        <Pressable
          key={route.key}
          onPress={onPress}
          accessibilityRole="tab"
          accessibilityState={{ selected: focused }}
          accessibilityLabel={options.tabBarAccessibilityLabel ?? label}
          style={styles.tab}
        >
          {Icon ? <Icon color={color} size={24} /> : null}
          <Text
            allowFontScaling
            maxFontSizeMultiplier={1.0}
            numberOfLines={1}
            style={[styles.label, { color: labelColor }]}
          >
            {label}
          </Text>
        </Pressable>
      );

      if (chrome.glass) {
        return (
          <GlassView
            key={route.key}
            glassEffectStyle={chrome.glassEffectStyle}
            tintColor={chrome.tintColor}
            isInteractive={chrome.isInteractive}
            style={styles.glassTab}
          >
            {tabContent}
          </GlassView>
        );
      }
      return tabContent;
    });

  if (chrome.glass) {
    return (
      <View
        pointerEvents="box-none"
        style={[styles.wrap, { bottom, left: BAR_MARGIN, right: BAR_MARGIN }]}
      >
        <GlassContainer spacing={SPACING.xs} style={styles.glassContainer}>
          {tabs}
        </GlassContainer>
      </View>
    );
  }

  // Mandatory solid fallback — explicit warm fill + floating shadow.
  return (
    <View
      pointerEvents="box-none"
      style={[styles.wrap, { bottom, left: BAR_MARGIN, right: BAR_MARGIN }]}
    >
      <View
        style={[
          styles.solidBar,
          { backgroundColor: chrome.backgroundColor },
          chrome.shadow,
        ]}
      >
        {tabs}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
  },
  glassContainer: {
    flexDirection: 'row',
    borderRadius: RADIUS.pill,
    overflow: 'hidden',
    height: BAR_HEIGHT,
  },
  glassTab: {
    flex: 1,
    height: BAR_HEIGHT,
  },
  solidBar: {
    flexDirection: 'row',
    borderRadius: RADIUS.pill,
    height: BAR_HEIGHT,
    overflow: 'hidden',
  },
  tab: {
    flex: 1,
    minHeight: MIN_TAP,
    height: BAR_HEIGHT,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  label: {
    ...TYPE.uiLabel,
  },
});
```

- [ ] **Step 2: Typecheck**

Run (from `apps/mobile`): `npx tsc --noEmit; echo "tsc:$?"`
Expected: `tsc:0`. If `BottomTabBarProps` is not resolvable from `@react-navigation/bottom-tabs`, fall back to importing it from `expo-router` (`import type { BottomTabBarProps } from 'expo-router'` is not exported; the correct source for SDK-54 expo-router v6 is `@react-navigation/bottom-tabs`, a transitive dep). If tsc reports the module missing, run `npm ls @react-navigation/bottom-tabs` from `apps/mobile` to confirm it is present (it is a transitive dep of `expo-router`); if absent, STOP and report — do NOT add a new top-level dependency without escalating.

- [ ] **Step 3: Lint**

Run (from `apps/mobile`): `npx expo lint 2>&1 | tail -3; echo "lint:$?"`
Expected: `lint:0`. Fix only lint errors in the new file (import order, unused) — do not refactor logic.

- [ ] **Step 4: Commit**

```bash
git add apps/mobile/src/features/chrome/GlassTabBar.tsx
git commit -m "feat(chrome): GlassTabBar — warm Liquid Glass tab bar + solid fallback (Wave 1)"
```

> No test step: this component imports native `expo-glass-effect` + Skia icons and cannot be loaded by the `node:test` runner. Its behavior is verified by the Task 6 device-UAT checklist (both iOS-26 glass path and iOS<26 fallback path). All DECISION logic it relies on is already node-tested in Tasks 1–2.

---

## Task 4: Wire `_layout.tsx` to the custom tab bar

**Files:**
- Modify: `apps/mobile/app/(tabs)/_layout.tsx`

Replace the default tab-bar rendering with `tabBar={(props) => <GlassTabBar {...props} />}` and remove the now-duplicated `tabBarActiveTintColor`/`tabBarInactiveTintColor`/`tabBarStyle` and the inline `TabLabel`/`tabBarLabel`/`tabBarIcon` color logic (that ownership moved to `GlassTabBar`). Keep: `headerShown:false`, every `Tabs.Screen` `name`, i18n `title`, `tabBarAccessibilityLabel`, the hidden `explore` route, and the icon→route mapping (now in `GlassTabBar.ICONS`).

- [ ] **Step 1: Replace the file content**

Overwrite `apps/mobile/app/(tabs)/_layout.tsx` with:

```tsx
/**
 * SOLDI tab bar wiring — three+1 tabs (Overview / Transactions / Categories
 * / Jars). The actual bar is the warm Liquid Glass `GlassTabBar` (redesign
 * Wave 1) with a mandatory solid editorial fallback for iOS<26.
 *
 * This file only wires expo-router → GlassTabBar. Color/contrast contract
 * (I-01, audited in src/design/contrast.ts) and the glass/fallback decision
 * live in GlassTabBar + the pure src/design/glass.ts. Do NOT re-add
 * tabBarActiveTintColor/tabBarStyle here — GlassTabBar owns appearance.
 *
 * Accessibility: each tab declares role="tab" + label + selected state
 * inside GlassTabBar; titles/labels are i18n (update on language switch).
 */

import { Tabs } from 'expo-router';
import React from 'react';
import { useTranslation } from 'react-i18next';

import { GlassTabBar } from '@/src/features/chrome/GlassTabBar';

export default function TabLayout(): React.JSX.Element {
  const { t } = useTranslation();
  return (
    <Tabs
      tabBar={(props) => <GlassTabBar {...props} />}
      screenOptions={{ headerShown: false }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: t('dashboard.tab_overview'),
          tabBarAccessibilityLabel: t('dashboard.tab_overview'),
        }}
      />
      <Tabs.Screen
        name="transactions"
        options={{
          title: t('dashboard.tab_transactions'),
          tabBarAccessibilityLabel: t('dashboard.tab_transactions'),
        }}
      />
      <Tabs.Screen
        name="categories"
        options={{
          title: t('dashboard.tab_categories'),
          tabBarAccessibilityLabel: t('dashboard.tab_categories'),
        }}
      />
      <Tabs.Screen
        name="jars"
        options={{
          title: t('dashboard.tab_jars'),
          tabBarAccessibilityLabel: t('dashboard.tab_jars'),
        }}
      />
      {/* Phase 1 placeholder — kept out of the tab bar (href:null). The
          GlassTabBar filters href:null routes so this never renders a tab. */}
      <Tabs.Screen name="explore" options={{ href: null }} />
    </Tabs>
  );
}
```

- [ ] **Step 2: Verify the label source matches `GlassTabBar`**

`GlassTabBar` derives each tab's visible label from `options.tabBarLabel` (string) else `options.title`. This file sets `title` (i18n) and no `tabBarLabel`, so `GlassTabBar` uses `title` — correct, labels stay i18n + update on language switch. Confirm by reading both files; no code change expected in this step.

- [ ] **Step 3: Gate (tsc + lint + Metro export)**

Run (from `apps/mobile`), in order, stop on first non-zero:
```bash
npx tsc --noEmit; echo "tsc:$?"
npx expo lint 2>&1 | tail -3; echo "lint:$?"
npx expo export --platform ios --output-dir /tmp/soldi-wave1-export; echo "export:$?"
```
Expected: `tsc:0`, `lint:0`, `export:0` (Metro resolves `expo-glass-effect` + the new component — this is the resolution gate `tsc` can't give; it does NOT validate the native glass effect, only JS bundling).

- [ ] **Step 4: Commit**

```bash
git add "apps/mobile/app/(tabs)/_layout.tsx"
git commit -m "feat(chrome): wire (tabs) layout to GlassTabBar (Wave 1)"
```

---

## Task 5: R1 pre-build gate — set Xcode-26 EAS image (NO build triggered)

**Files:**
- Modify: `apps/mobile/eas.json` (or repo-root `eas.json` — verify location first)

`eas.json` has NO `image` key on any profile (verified ABSENT). `expo-glass-effect` needs an Xcode-26 / iOS-26-SDK build image or the glass effect compiles to a no-op (or the build fails). This task ONLY edits config and records a pre-build gate. **It does NOT run `eas build`** — the Wave-1 TestFlight build is batched with Wave 2 and must come after TestFlight build #6 (EAS quota; do not collide).

- [ ] **Step 1: Locate eas.json and read the `testflight` + `production` profiles**

Run (from repo root): `git status --porcelain | head; ls apps/mobile/eas.json eas.json 2>/dev/null`
Read the file. Confirm no `image` key exists on `development`/`preview`/`testflight`/`production`.

- [ ] **Step 2: Add `"image": "latest"` to the iOS build for `testflight` and `production`**

In the `build.testflight` profile, the `ios` block currently is `{ "resourceClass": "m-medium" }`. Change it to:

```json
      "ios": {
        "resourceClass": "m-medium",
        "image": "latest"
      }
```

If a `build.production` profile exists, add the same `"image": "latest"` to its `ios` block (create the `ios` block if absent: `"ios": { "image": "latest" }`). Do NOT modify `development`/`preview` (no glass build needed there).

> `"latest"` is the documented stable EAS iOS image that tracks the newest available Xcode. It is a real, valid value (not a placeholder). Pinning a specific `macos-…-xcode-26.x` image is the stricter alternative but the exact identifier changes over time and MUST be confirmed against the live infra doc at gate time (next step) — `"latest"` is correct and forward-safe for a deferred build.

- [ ] **Step 3: Validate eas.json is well-formed + resolves**

Run (from `apps/mobile`): `npx expo config --type public > /dev/null; echo "config:$?"` then `node -e "JSON.parse(require('fs').readFileSync('eas.json','utf8')); console.log('eas.json: valid JSON')"` (run from the dir containing `eas.json`).
Expected: `config:0`, `eas.json: valid JSON`. (If `eas.json` uses JSON5 comments, skip the `JSON.parse` check and instead run `npx eas config --platform ios --profile testflight --non-interactive 2>&1 | tail -20` and confirm it prints the resolved profile WITHOUT an eas-json schema error — this requires EAS CLI auth; if not authenticated, note it and rely on the schema being a single added key.)

- [ ] **Step 4: Record the pre-build gate (do NOT build)**

This task deliberately stops at config. Add NOTHING that triggers a build. The pre-build verification ("`latest` resolves to ≥ Xcode 26 with the iOS 26 SDK; if Expo requires a pinned image, set the exact `macos-…-xcode-26.x` id from https://docs.expo.dev/build-reference/infrastructure/") is owned by the batched W1+W2 build checkpoint and is captured in Task 6's deferred device-UAT/build section.

- [ ] **Step 5: Commit**

```bash
git add apps/mobile/eas.json
git commit -m "build(eas): set ios image=latest for glass native build (Wave 1 R1 gate)"
```

> If `eas.json` is at repo root, `git add eas.json` instead — use the path found in Step 1.

---

## Task 6: Wave 1 verification gate + device-UAT authoring + ship

**Files:**
- Modify: `.planning/STATE.md`
- Create: `.planning/phases/redesign/W1-DEVICE-UAT.md` (deferred-UAT checklist; create the directory if absent)

- [ ] **Step 1: Full ordered gate (stop at first failure, report verbatim)**

Run (from `apps/mobile`), in order:
```bash
npx tsc --noEmit; echo "tsc:$?"
npx expo lint 2>&1 | tail -3; echo "lint:$?"
npm test 2>&1 | tail -6
npx expo export --platform ios --output-dir /tmp/soldi-wave1-final; echo "export:$?"
```
Expected: `tsc:0`, `lint:0`, `# fail 0` with total = 174 (Wave-0 baseline) + 7 new pure tests from Tasks 1–2 = **181**, `export:0`.

- [ ] **Step 2: Governance grep — expo-glass-effect isolated; glass.ts still pure**

Run (from `apps/mobile`):
```bash
grep -rn "expo-glass-effect" app src --include="*.tsx" --include="*.ts" | grep -v "src/features/chrome/GlassTabBar.tsx" | grep -vE "design/glass\.(ts|test\.ts):.*(comment|//)" || echo "ISOLATED-OK"
grep -nE "expo-glass-effect|react-native|reanimated" src/design/glass.ts | grep -v "^[0-9]*: *\*\|^[0-9]*: *//" || echo "GLASS-TS-PURE-OK"
```
Expected: first → `ISOLATED-OK` (only `GlassTabBar.tsx` imports `expo-glass-effect`; any `glass.ts`/`glass.test.ts` hits are comment-only). Second → `GLASS-TS-PURE-OK` (`glass.ts` has no native import; only comment mentions). If a real import leaks into any other file, STOP — governance violation, report it.

- [ ] **Step 3: Author the deferred device-UAT checklist**

Create `.planning/phases/redesign/W1-DEVICE-UAT.md`:

```markdown
# Wave 1 — Device UAT (DEFERRED to batched W1+W2 EAS build)

NOT runnable in Expo Go or `expo export` — native glass needs a TestFlight
build on a real device. Batched with Wave 2; AFTER TestFlight build #6.

## Pre-build gate (R1) — do BEFORE the batched EAS build
- [ ] `eas.json` testflight/production ios `image` set (Task 5 = "latest").
- [ ] Confirm "latest" resolves to ≥ Xcode 26 / iOS 26 SDK via
      https://docs.expo.dev/build-reference/infrastructure/ — if Expo requires
      a pinned image, set the exact `macos-…-xcode-26.x` id and re-commit.
- [ ] Confirm not colliding with in-flight TestFlight build #6.

## iOS 26 device (glass path)
- [ ] Tab bar renders as a floating warm Liquid Glass pill (GlassContainer +
      4 GlassView), not flat. Warm cream tint (#FAF5F0 @ ~0.62), NOT grey.
- [ ] Glass is interactive (specular/refraction reacts to scroll/touch).
- [ ] Active tab: accent (#BF6F4F) icon + textPrimary (#2C1810) label.
      Inactive: textMuted. Labels legible over glass at all scroll positions
      (R5 — if any position drops below AA, escalate: tighten tint alpha).
- [ ] Tap targets ≥ 44pt; all 4 tabs switch correctly; `explore` absent.
- [ ] First 10s cold-launch-to-dashboard demo shows the glass bar (spec §1).
- [ ] Settings → Accessibility → Reduce Transparency ON → bar switches to the
      solid fallback (no broken/empty bar).

## iOS < 26 device (fallback path)
- [ ] Tab bar is a solid warm pill (GLASS.fallbackChromeBg #FAF5F0) with the
      ELEVATION.floating shadow — premium, NOT an empty/transparent bar.
- [ ] Same color/contrast/tap-target/i18n behavior as glass path.

## Both
- [ ] Language switch updates tab labels live (i18n).
- [ ] No regression vs pre-Wave-1 navigation behavior.
```

- [ ] **Step 4: Update planning state**

Append one line to `.planning/STATE.md` in a coherent location (do not disturb YAML frontmatter or existing content):
`2026-05-17: Redesign Wave 1 (glass tab bar) CODE complete: glass.ts safe-gate/tint/resolveTabBarChrome (node-tested), GlassTabBar.tsx (sole expo-glass-effect importer), _layout wired, eas image=latest (R1 gate). Gates green (tsc0/lint0/181-0/export0). Device-UAT DEFERRED to batched W1+W2 EAS build (after TestFlight #6) — .planning/phases/redesign/W1-DEVICE-UAT.md.`

- [ ] **Step 5: Commit state + UAT doc**

```bash
git add .planning/STATE.md .planning/phases/redesign/W1-DEVICE-UAT.md
git commit -m "chore(planning): Wave 1 code complete; device-UAT deferred to batched build"
```

---

## Self-Review (completed during authoring)

**1. Spec coverage:**
- §2.2 glass wrapper (`GlassView`/`GlassContainer`/`isLiquidGlassAvailable`) → Task 3 (sole importer) consuming pure Tasks 1–2 ✓
- §2.2 mandatory non-glass fallback (solid editorial, never empty) → Task 2 `resolveTabBarChrome` fallback branch + Task 3 explicit solid `View`+`ELEVATION.floating` ✓
- §2.2 warm tint + `isInteractive`, `glassEffectStyle:'regular'` → Task 2 (tint hex8 via `composeGlassTint`, interactive true) + Task 3 props ✓
- §2.1 motion / reduce-motion → tab switching is instant per spec (NO preset invented); reduce-transparency handled in Task 3 ✓
- §3 W1 "`GlassContainer` + 4 `GlassView` tabs" → Task 3 renders exactly that ✓
- §4 R1 (Xcode-26 EAS image) → Task 5 config gate + Task 6 deferred pre-build verification (build intentionally NOT triggered) ✓
- §5 governance (glass only via glass.ts/one wrapper; no ad-hoc) → Task 3 sole importer + Task 6 Step-2 grep enforces ✓
- §5/R5 a11y/contrast (≥4.5:1 labels, ≥44pt, audited) → I-01 colors reused (already audited in contrast.ts Wave 0), `MIN_TAP=44`, reduce-transparency → solid path; glass-path label contrast is content-dependent → explicit device-UAT line ✓
- §1 success criteria → Task 6 device-UAT checklist enumerates each ✓
- expo#40911 beta-crash guard (`isGlassEffectAPIAvailable`) → Task 1 `isSafeToRenderGlass` + Task 3 boundary call ✓
- W0 forward-notes: `AnyMotionPreset`/`fallbackSheetBg`/sheet resolver explicitly OUT of W1 scope (sheet = later wave) — not silently dropped ✓

**2. Placeholder scan:** No TBD/TODO/"handle edge cases"/"similar to". Every code step is full file content or an exact append with anchors. `eas.json` `image` has a concrete real value (`"latest"`) with the pinned-image alternative explicitly deferred to a named gate doc + URL, not left blank. ✓

**3. Type consistency:** `isSafeToRenderGlass(api,liquid)` / `composeGlassTint(hex6,alpha)` / `resolveTabBarChrome(safeGlass): TabBarChrome` names + signatures match between Task 1/2 tests, impl, and Task 3 consumption. `TabBarChrome` discriminant `glass:true|false` with per-branch fields (`glassEffectStyle`/`tintColor`/`isInteractive` vs `backgroundColor`/`shadow`) consumed exactly in Task 3. `resolveTabBarChrome` reuses W0 `resolveChromeSurface` (no duplicated branch). `GlassView`/`GlassContainer` prop names (`glassEffectStyle`,`tintColor`,`isInteractive`,`spacing`) match installed `expo-glass-effect@0.1.10` `.d.ts` from the brief. ✓

**4. Known risks surfaced inline:** R1 build-image deferral framed as an explicit non-build gate (Task 5 + Task 6 UAT doc) — no EAS build triggered, no quota burn, no collision with TestFlight #6. Glass un-testable by `node:test`/`expo export` stated repeatedly; all decision logic pushed into the node-tested pure layer so the untestable surface is minimal. `BottomTabBarProps` import source has an explicit tsc-fail fallback instruction (Task 3 Step 2). ✓

---

## Execution Handoff

Wave 1 is independently shippable as CODE (gates green) with device-verification explicitly deferred to the batched W1+W2 EAS build (after TestFlight #6, per EAS quota + R1). Wave 2 (dashboard hero kinetic + donut interpolation, closes deferred D-05) gets its own plan authored AFTER Wave 1 lands, binding to the real `GlassTabBar`/`glass.ts` API.
