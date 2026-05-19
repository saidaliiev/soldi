/**
 * SOLDI design tokens.
 *
 * Source of truth for color, gradient, typography, spacing, and radius.
 * Banned values are enforced via ESLint rule (see eslint.config.js) — never
 * introduce fintech blue, AI-slop purple/lavender, neon green, or emoji as UI
 * icons. Editorial warm palette only.
 */

export const COLORS = {
  // Surfaces
  background: '#EDEAE3', // warm slate — app shell
  surface: '#F7F5F0', // card surface
  white: '#FFFFFF',

  // Text
  textPrimary: '#221F1B', // deep warm slate
  textSecondary: '#6A645A',
  // Slate & Sand + WCAG gate: raw --muted #8A8478 = 3.09:1 on
  // background (#EDEAE3) — WCAG AA body 4.5:1 FAIL. Darkened
  // (warm-grey hue preserved) to #6E695F → 4.54:1 background,
  // 5.01:1 surface. PASS. Hard AA floor: no headroom by design —
  // do NOT darken textMuted alone (collapses the step vs
  // textSecondary 4.88). contrast.ts auditTokenPairs asserts ≥4.5.
  textMuted: '#6E695F',

  // Accents — sandstone family
  // Slate & Sand + WCAG gate: accent #9C5B41 = 4.38:1 on background,
  // 4.84:1 on surface. Below body 4.5:1 — graphic + large-text-only
  // policy: ≥24px regular / ≥18.66px bold, never body text.
  accent: '#9C5B41', // primary CTA, selected states, expense
  accentSoft: '#B97A5A', // gradient pair, lighter (decorative — no text use)
  accentDeep: '#7C4632', // pressed state, shadow tint (6.29:1 on BG — text-safe)

  // Sage — success, savings, "money in"
  // Slate & Sand + WCAG gate: sage #687653 = 4.06:1 on background.
  // Below body 4.5:1 — graphic-only (ring arcs, decorative fills).
  // sageDark (#586A45) is the text-safe positive variant — 4.91:1 on
  // background (#EDEAE3). Use sageDark for all text rendered with
  // TYPE.uiLabel/uiBody/uiMeta on background. Use sage only for
  // graphic elements (ring arcs, decorative fills).
  sage: '#687653',
  sageDark: '#586A45', // text-safe sage — 4.91:1 on #EDEAE3 (WCAG AA body 4.5:1 ✓)
  sageSoft: '#9AA585',
  sageDeep: '#4F5C3C',

  // States
  error: '#97463A', // muted warm red, never bright
  success: '#586A45', // sage-derived

  // Semantic aliases (keep in sync with accent/success above)
  income: '#586A45',
  expense: '#7C4632', // Slate & Sand: text-safe deep sandstone (accentDeep)
} as const;

export const GRADIENTS = {
  primary: ['#B97A5A', '#9C5B41'] as const, // CTA, FAB, send button — white text 5.27:1
  warm: ['#E6E1D4', '#D9D2C0'] as const, // header hero band (cohesive top region)
  hero: ['#EDEAE3', '#E2DDD0'] as const, // subtle full-bleed hero background
  sage: ['#9AA585', '#788566'] as const, // positive decorative sweep
  dark: ['#2A2622', '#3A332C', '#322B25'] as const, // dark surfaces (dark-mode theme = future milestone; token value per spec §3)
} as const;

export const FONTS = {
  display: {
    family: 'Oswald',
    weights: { light: '300', medium: '500', bold: '700' },
  },
  editorial: {
    family: 'EBGaramond',
    weights: { regular: '400', italic: '400i', semibold: '600' },
  },
  ui: {
    family: 'Manrope',
    weights: { medium: '500', semibold: '600', bold: '700' },
  },
} as const;

export const SPACING = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
} as const;

export const RADIUS = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  pill: 999,
} as const;

/**
 * Shadow presets. Keep opacity low (<= 0.06) to preserve the warm editorial
 * feel — no harsh shadows, no glassmorphism.
 */
export const SHADOWS = {
  card: {
    shadowColor: COLORS.textPrimary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2, // Android
  },
  modal: {
    shadowColor: COLORS.textPrimary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.06,
    shadowRadius: 24,
    elevation: 6,
  },
} as const;

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
  chromeTint: '#F7F5F0', // == surface; tab bar / nav wash
  sheetTint: '#EDEAE3', // == background; bottom-sheet wash
  chromeTintAlpha: 0.62, // unchanged (spec §3)
  sheetTintAlpha: 0.55, // unchanged (spec §3)
  fallbackChromeBg: '#F7F5F0', // solid fill when isLiquidGlassAvailable() === false
} as const;

/**
 * Banned values. Importing this list in tests prevents drift.
 */
export const BANNED_COLORS = [
  '#667EEA', // AI-slop blue
  '#8B7AB8', // AI-slop purple
  '#E8E0FF', // AI-slop lavender
  '#10B981', // bright tailwind green
  '#1A73E8', // Google fintech blue
  '#2563EB', // Stripe-ish fintech blue
] as const;

export type ColorToken = keyof typeof COLORS;
export type GradientToken = keyof typeof GRADIENTS;
export type SpacingToken = keyof typeof SPACING;
export type RadiusToken = keyof typeof RADIUS;
export type ElevationToken = keyof typeof ELEVATION;
export type GlassToken = keyof typeof GLASS;
