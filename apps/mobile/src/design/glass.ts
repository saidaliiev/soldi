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

import { GLASS, ELEVATION, SHADOWS } from './tokens';

/**
 * Glass renders only when the native effect is actually available (iOS 26+).
 * @see isSafeToRenderGlass — use when the GlassEffect API availability is also known (expo/expo#40911).
 */
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
 * Delegates to resolveChromeSurface (ChromeSurface fields: tint/tintAlpha/backgroundColor) — refactor both in the same commit.
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

export type SheetChrome =
  | {
      readonly glass: true;
      /** GlassView.glassEffectStyle */
      readonly glassEffectStyle: 'regular';
      /** GlassView.tintColor — warm sheet wash, alpha baked in (#RRGGBBAA) */
      readonly tintColor: string;
      /** GlassView.isInteractive — the sheet receives drag/tap (parity with chrome) */
      readonly isInteractive: true;
    }
  | {
      readonly glass: false;
      /** opaque solid editorial fill (mandatory non-glass fallback) */
      readonly backgroundColor: string;
      /** SHADOWS.modal — a bottom sheet is modal-class, not the floating pill */
      readonly shadow: typeof SHADOWS.modal;
    };

/**
 * Resolve the FINAL RN-ready bottom-sheet chrome (Wave 4: ChatBottomSheet).
 * Mirrors resolveTabBarChrome, with sheet tokens and a modal-class shadow.
 * `safeGlass` is isSafeToRenderGlass()'s result, injected from the RN
 * boundary. Glass path: warm sheet tint (alpha baked in), interactive,
 * regular style. Fallback path: opaque solid warm fill (GLASS.fallbackChromeBg
 * — the generic warm editorial fill; there is no separate sheet-bg token) +
 * SHADOWS.modal (a sheet is modal-class, NOT the detached tab-bar pill, so it
 * does NOT use ELEVATION.floating). NEVER a transparent sheet — the library's
 * internal degrade is transparent, so the component MUST use backgroundColor.
 * Glass is sheet CHROME only — never the bubbles/content (CLAUDE.md).
 */
export function resolveSheetChrome(safeGlass: boolean): SheetChrome {
  if (shouldRenderGlass(safeGlass)) {
    return {
      glass: true,
      glassEffectStyle: 'regular',
      tintColor: composeGlassTint(GLASS.sheetTint, GLASS.sheetTintAlpha),
      isInteractive: true,
    };
  }
  return {
    glass: false,
    backgroundColor: GLASS.fallbackChromeBg,
    shadow: SHADOWS.modal,
  };
}
