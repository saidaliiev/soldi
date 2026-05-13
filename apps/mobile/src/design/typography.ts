/**
 * Typography presets that map to the three SOLDI typefaces. Use these instead
 * of inline fontSize/fontWeight to keep the editorial scale consistent.
 *
 * Display (Oswald): hero numbers, large titles, monthly totals.
 * Editorial (EB Garamond): chat, long-form insights, body copy with personality.
 * UI (Manrope): buttons, labels, pills, meta, tabular numbers in lists.
 */

import { FONTS } from './tokens';

type TextStyle = {
  fontFamily: string;
  fontWeight: string;
  fontSize: number;
  lineHeight: number;
  letterSpacing?: number;
};

export const TYPE = {
  /** Hero monthly total on the dashboard. */
  displayXL: {
    fontFamily: FONTS.display.family,
    fontWeight: FONTS.display.weights.medium,
    fontSize: 64,
    lineHeight: 72,
    letterSpacing: -1,
  } satisfies TextStyle,

  displayL: {
    fontFamily: FONTS.display.family,
    fontWeight: FONTS.display.weights.medium,
    fontSize: 40,
    lineHeight: 48,
    letterSpacing: -0.5,
  } satisfies TextStyle,

  displayM: {
    fontFamily: FONTS.display.family,
    fontWeight: FONTS.display.weights.medium,
    fontSize: 28,
    lineHeight: 34,
  } satisfies TextStyle,

  /** Long-form chat and insight body. */
  editorialBody: {
    fontFamily: FONTS.editorial.family,
    fontWeight: FONTS.editorial.weights.regular,
    fontSize: 16,
    lineHeight: 24,
  } satisfies TextStyle,

  editorialLead: {
    fontFamily: FONTS.editorial.family,
    fontWeight: FONTS.editorial.weights.semibold,
    fontSize: 20,
    lineHeight: 28,
  } satisfies TextStyle,

  /** UI primitives. */
  uiBody: {
    fontFamily: FONTS.ui.family,
    fontWeight: FONTS.ui.weights.medium,
    fontSize: 16,
    lineHeight: 22,
  } satisfies TextStyle,

  uiButton: {
    fontFamily: FONTS.ui.family,
    fontWeight: FONTS.ui.weights.semibold,
    fontSize: 16,
    lineHeight: 20,
  } satisfies TextStyle,

  uiLabel: {
    fontFamily: FONTS.ui.family,
    fontWeight: FONTS.ui.weights.medium,
    fontSize: 14,
    lineHeight: 18,
  } satisfies TextStyle,

  uiMeta: {
    fontFamily: FONTS.ui.family,
    fontWeight: FONTS.ui.weights.medium,
    fontSize: 12,
    lineHeight: 16,
    letterSpacing: 0.3,
  } satisfies TextStyle,

  /** Tabular numbers in transaction lists — Manrope's tnum is enabled in app.json. */
  tabular: {
    fontFamily: FONTS.ui.family,
    fontWeight: FONTS.ui.weights.semibold,
    fontSize: 16,
    lineHeight: 22,
    letterSpacing: 0,
  } satisfies TextStyle,
} as const;

export type TypeToken = keyof typeof TYPE;
