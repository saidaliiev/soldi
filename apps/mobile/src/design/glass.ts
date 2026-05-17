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
