/**
 * contrast.ts — pure WCAG 2.1 contrast utility + app-wide token pair audit.
 *
 * No React Native imports — pure TypeScript math, usable in Node test context.
 *
 * WCAG 2.1 §1.4.3 — Contrast (AA):
 *   body text (< 18pt normal / < 14pt bold) → 4.5:1
 *   large text (≥ 18pt normal / ≥ 14pt bold) → 3:1
 *
 * The audit table below enumerates every foreground/background token pair
 * that actually occurs in the app's rendered UI and asserts each clears AA
 * with the Slate & Sand palette in tokens.ts (WCAG-gated values).
 *
 * Colocated test: contrast.test.ts (node:test + node:assert — no jest needed).
 */

import { COLORS } from './tokens';

// ---------------------------------------------------------------------------
// Core math
// ---------------------------------------------------------------------------

/**
 * Linearize an 8-bit sRGB channel value per WCAG 2.1 / IEC 61966-2-1.
 */
function linearizeChannel(byte: number): number {
  const v = byte / 255;
  return v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
}

/**
 * Relative luminance of a `#RRGGBB` hex string (WCAG 2.1 §1.4.3).
 * Throws on malformed input.
 */
function relativeLuminance(hex: string): number {
  const m = /^#([0-9a-fA-F]{6})$/.exec(hex);
  if (m == null || m[1] == null) {
    throw new Error(`contrast.ts: invalid hex "${hex}" (expected #RRGGBB)`);
  }
  const hexChars = m[1];
  const r = parseInt(hexChars.slice(0, 2), 16);
  const g = parseInt(hexChars.slice(2, 4), 16);
  const b = parseInt(hexChars.slice(4, 6), 16);
  return (
    0.2126 * linearizeChannel(r) +
    0.7152 * linearizeChannel(g) +
    0.0722 * linearizeChannel(b)
  );
}

/**
 * WCAG 2.1 contrast ratio between two `#RRGGBB` hex strings.
 * The ratio is symmetric: `contrastRatio(a, b) === contrastRatio(b, a)`.
 * Returns values in [1, 21].
 */
export function contrastRatio(hexA: string, hexB: string): number {
  const l1 = Math.max(relativeLuminance(hexA), relativeLuminance(hexB));
  const l2 = Math.min(relativeLuminance(hexA), relativeLuminance(hexB));
  return (l1 + 0.05) / (l2 + 0.05);
}

// ---------------------------------------------------------------------------
// Token pair audit
// ---------------------------------------------------------------------------

export type ContrastAuditEntry = {
  readonly fgToken: string;
  readonly fg: string;
  readonly bgToken: string;
  readonly bg: string;
  readonly ratio: number;
  /** 4.5 for body/label text; 3.0 for large/hero text and graphic elements */
  readonly requiredAA: number;
  readonly passes: boolean;
  /** Why requiredAA = 3.0 for this entry (omitted for 4.5 entries) */
  readonly largeTextReason?: string;
};

/**
 * Enumerate every foreground/background token pair that the app renders.
 * With the Slate & Sand palette every entry's `passes` must be true.
 *
 * Threshold classification (WCAG 2.1 §1.4.3 + §1.4.11):
 *   body/label text     → 4.5:1  (fontSize < 18pt normal / < 14pt bold)
 *   large/display text  → 3.0:1  (fontSize ≥ 18pt normal / ≥ 14pt bold)
 *   graphic elements    → 3.0:1  (UI component boundaries — §1.4.11)
 *
 * TYPE preset reference (typography.ts):
 *   uiLabel = 14pt medium → body (4.5)
 *   uiMeta  = 12pt medium → body (4.5)
 *   uiBody  = 16pt medium → body (4.5)
 *   tabular = 16pt semibold (bold equivalent) → large (3.0)
 *   uiButton = 16pt semibold → large (3.0)
 *   displayXL/L/M = 28–64pt → large (3.0)
 */
export function auditTokenPairs(): readonly ContrastAuditEntry[] {
  const BG = COLORS.background;
  const SURF = COLORS.surface;

  function entry(
    fgToken: string,
    fg: string,
    bgToken: string,
    bg: string,
    requiredAA: number,
    largeTextReason?: string,
  ): ContrastAuditEntry {
    const ratio = contrastRatio(fg, bg);
    return { fgToken, fg, bgToken, bg, ratio, requiredAA, passes: ratio >= requiredAA, largeTextReason };
  }

  return [
    // ---- textPrimary (body text on all surfaces) ----------------------------
    entry('textPrimary', COLORS.textPrimary, 'background', BG, 4.5),
    entry('textPrimary', COLORS.textPrimary, 'surface', SURF, 4.5),

    // ---- textSecondary (body text on all surfaces) -------------------------
    entry('textSecondary', COLORS.textSecondary, 'background', BG, 4.5),
    entry('textSecondary', COLORS.textSecondary, 'surface', SURF, 4.5),

    // ---- textMuted (uiLabel/uiMeta body text on all surfaces) --------------
    // Slate & Sand WCAG gate: raw #8A8478 = 3.09:1 → #6E695F (4.54:1 bg,
    // 5.01:1 surf). Hard AA floor — no headroom by design.
    entry('textMuted', COLORS.textMuted, 'background', BG, 4.5),
    entry('textMuted', COLORS.textMuted, 'surface', SURF, 4.5),

    // ---- accent (used for expense amounts in TYPE.tabular = 16pt semibold,
    //      CTA button labels in TYPE.uiButton = 16pt semibold — qualifies as
    //      large text per WCAG 2.1 "14pt bold" threshold) --------------------
    // Slate & Sand: accent #9C5B41 = 4.38:1 bg / 4.84:1 surf (graphic +
    // large-text-only policy; never body text — use accentDeep #7C4632).
    entry('accent', COLORS.accent, 'background', BG, 3.0,
      'TYPE.tabular/uiButton = 16pt semibold (>=14pt bold = large text, §1.4.3)'),
    entry('accent', COLORS.accent, 'surface', SURF, 3.0,
      'TYPE.tabular/uiButton = 16pt semibold (>=14pt bold = large text, §1.4.3)'),

    // ---- sage (ring arc — graphic element only, §1.4.11 non-text contrast 3:1)
    // sage MUST NOT be used for body/label text — use sageDark for text.
    // Slate & Sand: sage #687653 = 4.06:1 bg / 4.48:1 surf (graphic only).
    entry('sage', COLORS.sage, 'background', BG, 3.0,
      'Graphic only (ring arc fill/stroke); §1.4.11 non-text contrast 3:1'),
    entry('sage', COLORS.sage, 'surface', SURF, 3.0,
      'Graphic only (ring arc fill/stroke); §1.4.11 non-text contrast 3:1'),

    // ---- sageDark (overFundedLabel in TYPE.uiLabel = 14pt medium = body text)
    // CR-04: overFundedLabel was using sage (graphic) which fails §1.4.3 body 4.5:1.
    // sageDark (#586A45) is 4.91:1 on background — PASS.
    entry('sageDark', COLORS.sageDark, 'background', BG, 4.5),
    entry('sageDark', COLORS.sageDark, 'surface', SURF, 4.5),

    // ---- success/income (income amounts in TYPE.tabular = 16pt semibold) ---
    entry('success', COLORS.success, 'background', BG, 3.0,
      'TYPE.tabular = 16pt semibold (>=14pt bold = large text, §1.4.3)'),
    entry('success', COLORS.success, 'surface', SURF, 3.0,
      'TYPE.tabular = 16pt semibold (>=14pt bold = large text, §1.4.3)'),

    // ---- tab bar: NON-GLASS FALLBACK entries below; glass path entries below those ----
    // accent/surface entry (above) covers accent as large-text graphic only (3:1).
    // Active-tab label uses textPrimary — see glassFallbackChrome block below.

    // ---- glass tab bar NON-GLASS FALLBACK (Wave 0 spec §2.2 / R5) -----------
    // When isLiquidGlassAvailable() === false the tab bar is a solid surface
    // fill (GLASS.fallbackChromeBg === COLORS.surface). Tab labels:
    //   inactive = textMuted in TYPE.uiMeta (12pt medium) → body text 4.5:1
    //   active   = textPrimary in TYPE.uiMeta (12pt medium) → body text 4.5:1
    //   (accent #9C5B41 on surface #F7F5F0 is 4.84:1 — large-text/graphic only,
    //    accent demoted to non-text indicator — dot/underline; graphic 3:1 per
    //    WCAG §1.4.11, to be audited under Wave 1 when indicator is built)
    entry('textMuted', COLORS.textMuted, 'glassFallbackChrome', COLORS.surface, 4.5),
    entry('textPrimary', COLORS.textPrimary, 'glassFallbackChrome', COLORS.surface, 4.5),

    // ---- error button: white label on error background ----------------------
    // Confirm button uses TYPE.uiButton = 16pt semibold (>=14pt bold = large text).
    // WCAG 2.1 §1.4.3 large-text threshold: 3.0:1.
    entry('white', COLORS.white, 'error', COLORS.error, 3.0,
      'TYPE.uiButton = 16pt semibold (>=14pt bold = large text, §1.4.3)'),
  ];
}
