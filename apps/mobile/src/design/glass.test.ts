/**
 * glass.ts decision + style resolver. node:test + tsx. Availability injected.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { shouldRenderGlass, resolveChromeSurface } from './glass.js';
import { GLASS } from './tokens.js';

test('shouldRenderGlass: true only when available', () => {
  assert.strictEqual(shouldRenderGlass(true), true);
  assert.strictEqual(shouldRenderGlass(false), false);
});

test('resolveChromeSurface: glass path returns tint + alpha, glass=true', () => {
  const s = resolveChromeSurface(true);
  assert.strictEqual(s.glass, true);
  assert.strictEqual(s.tint, GLASS.chromeTint);
  assert.strictEqual(s.tintAlpha, GLASS.chromeTintAlpha);
});

test('resolveChromeSurface: fallback path is opaque solid fill, glass=false', () => {
  const s = resolveChromeSurface(false);
  assert.strictEqual(s.glass, false);
  assert.strictEqual(s.backgroundColor, GLASS.fallbackChromeBg);
  assert.strictEqual(s.tintAlpha, 1);
});
