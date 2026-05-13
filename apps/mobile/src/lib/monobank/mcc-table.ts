/**
 * SOLDI monobank MCC resolver.
 *
 * Wraps the shared categoryForMcc function with monobank-specific dual-MCC
 * resolution logic: monobank returns both `mcc` (terminal MCC) and
 * `originalMcc` (issuer MCC). If the primary MCC maps to 'misc' but the
 * originalMcc has a more specific mapping, prefer it.
 */

import { categoryForMcc } from '@lib/synthetic/mcc';

// ---------------------------------------------------------------------------
// resolveMcc
// ---------------------------------------------------------------------------

/**
 * Resolves the best category slug from a monobank transaction's MCC codes.
 *
 * Strategy:
 * 1. Try the primary `mcc` first.
 * 2. If it maps to 'misc' AND `originalMcc` is defined and different,
 *    retry with `originalMcc`.
 * 3. Return whichever lookup produced a non-misc slug; fall back to 'misc'.
 *
 * @param mcc         Primary MCC from the monobank statement item.
 * @param originalMcc Optional secondary MCC — sometimes more specific.
 * @returns           An object with `slug` (CategorySlug string) and `mcc`
 *                    (the MCC code that produced the result).
 */
export function resolveMcc(
  mcc: number,
  originalMcc?: number,
): { slug: string; mcc: number } {
  const primarySlug = categoryForMcc(mcc, 'misc');

  if (primarySlug !== 'misc') {
    return { slug: primarySlug, mcc };
  }

  // Primary was misc — try originalMcc if it's defined and different
  if (originalMcc !== undefined && originalMcc !== mcc) {
    const secondarySlug = categoryForMcc(originalMcc, 'misc');
    if (secondarySlug !== 'misc') {
      return { slug: secondarySlug, mcc: originalMcc };
    }
  }

  return { slug: 'misc', mcc };
}
