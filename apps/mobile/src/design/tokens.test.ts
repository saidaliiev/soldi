/**
 * Structural guard for Wave-0 token additions.
 * node:test + tsx (no jest — see STATE.md). Run: npm test
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { ELEVATION, GLASS, BANNED_COLORS, SHADOWS } from './tokens.js';

test('ELEVATION: floating step exists and is heavier than modal', () => {
  assert.ok(ELEVATION.floating, 'ELEVATION.floating must exist');
  assert.ok(
    ELEVATION.floating.elevation > SHADOWS.modal.elevation,
    `floating elevation ${ELEVATION.floating.elevation} must exceed modal ${SHADOWS.modal.elevation}`,
  );
  assert.ok(ELEVATION.floating.shadowOpacity <= 0.12, 'keep editorial: opacity <= 0.12');
});

test('GLASS: warm tint constants present and are valid #RRGGBB', () => {
  for (const key of ['chromeTint', 'sheetTint'] as const) {
    assert.match(GLASS[key], /^#[0-9A-Fa-f]{6}$/, `GLASS.${key} must be #RRGGBB`);
  }
  assert.ok(GLASS.chromeTintAlpha > 0 && GLASS.chromeTintAlpha <= 1, 'alpha in (0,1]');
});

test('GLASS: no tint value is a banned color', () => {
  for (const [k, v] of Object.entries(GLASS)) {
    if (typeof v === 'string') {
      assert.ok(
        !BANNED_COLORS.includes(v as typeof BANNED_COLORS[number]),
        `GLASS.${k}=${v} matches a BANNED_COLOR`,
      );
    }
  }
});
