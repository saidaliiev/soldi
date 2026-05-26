/**
 * Canonical category-emoji mapping (2026-05-26 emoji refactor).
 *
 * Single source of truth for the 30 default category emojis + 5 historical
 * alias slugs. Mirrored by SCHEMA_006 in src/lib/db/schema.sql.ts — keep the
 * two in sync when adding a new default slug.
 *
 * Why a single curated set:
 *   - SQLite-backed `categories.emoji` is the runtime value at render time.
 *   - This module is the JS-side ground truth, used by the EmojiPicker to
 *     enumerate user-pickable emojis and by tests to enforce invariants.
 *
 * Rules (enforced by categoryEmojis.test.ts):
 *   - Every entry is non-empty and a single grapheme cluster.
 *   - Every alias maps to a slug that appears in CATEGORY_EMOJIS_MAP.
 */

/**
 * Default emoji per canonical slug. Ordering is editorial — picker cells
 * render in this order to keep related categories visually adjacent.
 */
export const CATEGORY_EMOJIS_MAP = {
  food: '🍽️',
  groceries: '🛒',
  restaurant: '🍴',
  coffee: '☕',
  transport: '🚗',
  fuel: '⛽',
  'public-transport': '🚌',
  travel: '✈️',
  bills: '🧾',
  rent: '🏠',
  utilities: '💡',
  subscriptions: '🔁',
  shopping: '🛍️',
  clothing: '👕',
  electronics: '📱',
  entertainment: '🎬',
  hobbies: '🎨',
  fitness: '🏃',
  beauty: '💅',
  health: '💊',
  education: '📚',
  gifts: '🎁',
  charity: '💝',
  family: '👪',
  pets: '🐾',
  savings: '🐖',
  salary: '💵',
  investments: '📈',
  tax: '📊',
  misc: '📌',
} as const;

export type CategoryEmojiSlug = keyof typeof CATEGORY_EMOJIS_MAP;

/**
 * The 30 canonical emojis in picker display order. EmojiPicker iterates this
 * array; tests assert it stays length 30 and matches the map keys.
 */
export const CATEGORY_EMOJIS: readonly string[] = Object.values(CATEGORY_EMOJIS_MAP);

/**
 * Historical slug aliases — five seed slugs that never had a 1:1 SVG icon
 * (eating-out → restaurant, kids → family, etc.). Preserved here so callers
 * that still pass an alias slug can resolve to the canonical emoji.
 *
 * Migration 006 backfills these directly into the DB so this map is not
 * consulted at render time — kept exported for test coverage + any future
 * code path that reads alias slugs from external sources (e.g. CSV import).
 */
export const SLUG_ALIASES: Readonly<Record<string, CategoryEmojiSlug>> = {
  'eating-out': 'restaurant',
  mobile: 'electronics',
  transfers: 'investments',
  refunds: 'salary',
  kids: 'family',
};

/**
 * Resolves a slug (canonical or alias) to its emoji, falling back to the
 * `misc` 📌 pin for unknown slugs. Never returns undefined.
 */
export function emojiForSlug(slug: string | null | undefined): string {
  if (slug == null) return CATEGORY_EMOJIS_MAP.misc;
  const direct = (CATEGORY_EMOJIS_MAP as Record<string, string>)[slug];
  if (direct != null) return direct;
  const aliasTarget = SLUG_ALIASES[slug];
  if (aliasTarget != null) return CATEGORY_EMOJIS_MAP[aliasTarget];
  return CATEGORY_EMOJIS_MAP.misc;
}

/** Default emoji used for newly-created custom categories. */
export const DEFAULT_CATEGORY_EMOJI: string = CATEGORY_EMOJIS_MAP.misc;
