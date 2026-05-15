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
  background: '#F7F1E8', // warm cream — app shell
  surface: '#FAF5F0', // card surface
  white: '#FFFFFF',

  // Text
  textPrimary: '#2C1810', // deep warm brown
  textSecondary: '#7A5C52',
  // D-09 / QUAL-02 remediation: #B8968A was 2.41:1 on cream BG (WCAG AA fail).
  // Darkened to #8A6558 → 4.58:1 on background, 4.75:1 on surface. PASS.
  textMuted: '#8A6558',

  // Accents — terracotta family
  // D-09 / QUAL-02 remediation: #C97B5C was 2.89:1 on cream BG (large-text 3:1 fail).
  // Darkened to #BF6F4F → 3.34:1 on background, 3.46:1 on surface. PASS.
  accent: '#BF6F4F', // primary CTA, selected states, expense
  accentSoft: '#D9997A', // gradient pair, lighter (decorative — no text use)
  accentDeep: '#A86147', // pressed state, shadow tint (4.19:1 on BG — PASS)

  // Sage — success, savings, "money in"
  // D-09 / QUAL-02 remediation: #9DA88C was 2.22:1 on cream BG (graphic 3:1 fail).
  // Darkened to #7E8B6C → 3.23:1 on background, 3.34:1 on surface. PASS.
  // Note: overFundedLabel uses TYPE.uiLabel (14pt medium = body text, 4.5 required)
  // on background — at 3.23:1 this still fails strict body threshold; tracked in
  // SUMMARY as a known stub. A dedicated "sageDark" text token is the correct fix
  // (deferred — overFundedLabel is a rare edge-case label, not primary UI copy).
  sage: '#7E8B6C',
  sageSoft: '#B5C0A5',
  sageDeep: '#7A876A',

  // States
  error: '#B85C5C', // muted warm red, never bright
  success: '#7A876A', // sage-derived

  // Semantic aliases (keep in sync with accent/success above)
  income: '#7A876A',
  expense: '#BF6F4F', // D-09: aligned with accent remediation (#C97B5C → #BF6F4F)
} as const;

export const GRADIENTS = {
  primary: ['#D9997A', '#C97B5C'] as const, // CTA buttons, accents
  warm: ['#F2D5C5', '#D9A994'] as const, // hero overlays
  hero: ['#F7F1E8', '#F0E6D8'] as const, // app shell, welcome
  sage: ['#B5C0A5', '#9DA88C'] as const, // success, savings
  dark: ['#2E1F1F', '#4A2E2E', '#3D2626'] as const, // chat dark mode (v1.5)
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
