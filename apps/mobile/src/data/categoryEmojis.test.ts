/**
 * categoryEmojis tests — node:test + tsx (pure data invariants).
 *
 * Run:   cd apps/mobile && npx tsx --test src/data/categoryEmojis.test.ts
 *
 * Covered:
 *   - CATEGORY_EMOJIS has exactly 30 entries (matches canonical map size)
 *   - Every emoji is a non-empty string, 1-8 chars (allows ZWJ sequences)
 *   - SLUG_ALIASES has 5 entries (eating-out, mobile, transfers, refunds, kids)
 *   - Every alias target resolves to a key that exists in CATEGORY_EMOJIS_MAP
 *   - emojiForSlug handles null/unknown gracefully (falls back to misc 📌)
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
  CATEGORY_EMOJIS,
  CATEGORY_EMOJIS_MAP,
  SLUG_ALIASES,
  DEFAULT_CATEGORY_EMOJI,
  emojiForSlug,
} from './categoryEmojis';

// ---------------------------------------------------------------------------
// CATEGORY_EMOJIS — shape invariants
// ---------------------------------------------------------------------------

describe('CATEGORY_EMOJIS', () => {
  it('has exactly 30 entries', () => {
    assert.strictEqual(CATEGORY_EMOJIS.length, 30);
  });

  it('matches the canonical map size', () => {
    assert.strictEqual(CATEGORY_EMOJIS.length, Object.keys(CATEGORY_EMOJIS_MAP).length);
  });

  it('contains only non-empty strings of length 1-8', () => {
    for (const emoji of CATEGORY_EMOJIS) {
      assert.strictEqual(typeof emoji, 'string', `expected string, got ${typeof emoji}`);
      assert.ok(emoji.length >= 1, `emoji unexpectedly empty: "${emoji}"`);
      assert.ok(
        emoji.length <= 8,
        `emoji exceeds 8 chars (ZWJ sequence budget): "${emoji}" length=${emoji.length}`,
      );
    }
  });

  it('contains no duplicates', () => {
    const set = new Set(CATEGORY_EMOJIS);
    assert.strictEqual(set.size, CATEGORY_EMOJIS.length);
  });
});

// ---------------------------------------------------------------------------
// SLUG_ALIASES — every target must exist in the canonical map
// ---------------------------------------------------------------------------

describe('SLUG_ALIASES', () => {
  it('has exactly 5 entries', () => {
    assert.strictEqual(Object.keys(SLUG_ALIASES).length, 5);
  });

  it('every alias target resolves to a key in CATEGORY_EMOJIS_MAP', () => {
    for (const [alias, target] of Object.entries(SLUG_ALIASES)) {
      assert.ok(
        target in CATEGORY_EMOJIS_MAP,
        `alias "${alias}" -> "${target}" but "${target}" is not in CATEGORY_EMOJIS_MAP`,
      );
    }
  });
});

// ---------------------------------------------------------------------------
// emojiForSlug — graceful fallback
// ---------------------------------------------------------------------------

describe('emojiForSlug', () => {
  it('returns the canonical emoji for a known slug', () => {
    assert.strictEqual(emojiForSlug('groceries'), '🛒');
    assert.strictEqual(emojiForSlug('coffee'), '☕');
  });

  it('resolves alias slugs to their canonical emoji', () => {
    assert.strictEqual(emojiForSlug('eating-out'), CATEGORY_EMOJIS_MAP.restaurant);
    assert.strictEqual(emojiForSlug('kids'), CATEGORY_EMOJIS_MAP.family);
  });

  it('falls back to misc 📌 for null / undefined / unknown', () => {
    assert.strictEqual(emojiForSlug(null), DEFAULT_CATEGORY_EMOJI);
    assert.strictEqual(emojiForSlug(undefined), DEFAULT_CATEGORY_EMOJI);
    assert.strictEqual(emojiForSlug('totally-not-a-slug'), DEFAULT_CATEGORY_EMOJI);
  });
});
