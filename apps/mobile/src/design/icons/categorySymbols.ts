/**
 * Category slug → SF Symbol name map (Cold Minimal icon system).
 *
 * Mirrors src/data/categoryEmojis.ts 1:1 (same slugs + aliases) but resolves to
 * Apple SF Symbols instead of emoji. SF Symbols render premium, monochrome and
 * palette-tintable on iOS — no colour noise against the cold slate palette.
 *
 * Android/Web fall back to the emoji set (see CategorySymbol.tsx) since SF
 * Symbols are iOS-only; Android is a preview-only target for this portfolio app.
 *
 * Names verified against the SFSymbol union exported by expo-symbols (tsc gate
 * rejects any non-existent symbol name).
 */

import type { SFSymbol } from 'expo-symbols';

/** Canonical slug → SF Symbol. Keep in lockstep with CATEGORY_EMOJIS_MAP. */
export const CATEGORY_SYMBOLS_MAP: Readonly<Record<string, SFSymbol>> = {
  food: 'fork.knife',
  groceries: 'cart.fill',
  restaurant: 'fork.knife',
  coffee: 'cup.and.saucer.fill',
  transport: 'car.fill',
  fuel: 'fuelpump.fill',
  'public-transport': 'bus.fill',
  travel: 'airplane',
  bills: 'doc.text.fill',
  rent: 'house.fill',
  utilities: 'lightbulb.fill',
  subscriptions: 'arrow.triangle.2.circlepath',
  shopping: 'bag.fill',
  clothing: 'tshirt.fill',
  electronics: 'iphone',
  entertainment: 'film.fill',
  hobbies: 'paintpalette.fill',
  fitness: 'figure.run',
  beauty: 'sparkles',
  health: 'pills.fill',
  education: 'book.fill',
  gifts: 'gift.fill',
  charity: 'heart.fill',
  family: 'person.2.fill',
  pets: 'pawprint.fill',
  savings: 'banknote.fill',
  salary: 'dollarsign.circle.fill',
  investments: 'chart.line.uptrend.xyaxis',
  tax: 'building.columns.fill',
  misc: 'tag.fill',
} as const;

/** Historical slug aliases (mirror SLUG_ALIASES in categoryEmojis.ts). */
const SLUG_ALIASES: Readonly<Record<string, string>> = {
  'eating-out': 'restaurant',
  mobile: 'electronics',
  transfers: 'investments',
  refunds: 'salary',
  kids: 'family',
} as const;

/** Generic fallback symbol for unknown/null slugs. */
export const DEFAULT_CATEGORY_SYMBOL: SFSymbol = 'tag.fill';

/**
 * Resolve a category slug to its SF Symbol name. Never returns undefined —
 * unknown slugs resolve to DEFAULT_CATEGORY_SYMBOL (parity with emojiForSlug).
 */
export function symbolForSlug(slug: string | null | undefined): SFSymbol {
  if (!slug) return DEFAULT_CATEGORY_SYMBOL;
  const direct = CATEGORY_SYMBOLS_MAP[slug];
  if (direct) return direct;
  const aliased = SLUG_ALIASES[slug];
  if (aliased && CATEGORY_SYMBOLS_MAP[aliased]) return CATEGORY_SYMBOLS_MAP[aliased]!;
  return DEFAULT_CATEGORY_SYMBOL;
}
