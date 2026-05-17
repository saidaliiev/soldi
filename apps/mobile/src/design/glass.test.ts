/**
 * glass.ts decision + style resolver. node:test + tsx. Availability injected.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { shouldRenderGlass, resolveChromeSurface, isSafeToRenderGlass, composeGlassTint, resolveTabBarChrome } from './glass.js';
import { GLASS, ELEVATION } from './tokens.js';

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

test('isSafeToRenderGlass: true ONLY when both api+liquid available', () => {
  assert.strictEqual(isSafeToRenderGlass(true, true), true);
  assert.strictEqual(isSafeToRenderGlass(true, false), false);
  assert.strictEqual(isSafeToRenderGlass(false, true), false);
  assert.strictEqual(isSafeToRenderGlass(false, false), false);
});

test('composeGlassTint: #RRGGBB + alpha → #RRGGBBAA (uppercase, 2-digit)', () => {
  assert.strictEqual(composeGlassTint('#FAF5F0', 0.62), '#FAF5F09E');
  assert.strictEqual(composeGlassTint('#FAF5F0', 1), '#FAF5F0FF');
  assert.strictEqual(composeGlassTint('#FAF5F0', 0), '#FAF5F000');
  assert.strictEqual(composeGlassTint('#faf5f0', 1), '#FAF5F0FF');
});

test('composeGlassTint: clamps alpha to [0,1]', () => {
  assert.strictEqual(composeGlassTint('#FAF5F0', 1.5), '#FAF5F0FF');
  assert.strictEqual(composeGlassTint('#FAF5F0', -0.2), '#FAF5F000');
});

test('composeGlassTint: rejects non-#RRGGBB input', () => {
  assert.throws(() => composeGlassTint('FAF5F0', 0.5), /#RRGGBB/);
  assert.throws(() => composeGlassTint('#FFF', 0.5), /#RRGGBB/);
  assert.throws(() => composeGlassTint('#FAF5F0FF', 0.5), /#RRGGBB/);
});

test('resolveTabBarChrome: glass path → tintColor hex8 + interactive, glass=true', () => {
  const c = resolveTabBarChrome(true);
  assert.strictEqual(c.glass, true);
  assert.strictEqual(c.tintColor, composeGlassTint(GLASS.chromeTint, GLASS.chromeTintAlpha));
  assert.strictEqual(c.isInteractive, true);
  assert.strictEqual(c.glassEffectStyle, 'regular');
});

test('resolveTabBarChrome: fallback path → solid bg + floating shadow, glass=false', () => {
  const c = resolveTabBarChrome(false);
  assert.strictEqual(c.glass, false);
  assert.strictEqual(c.backgroundColor, GLASS.fallbackChromeBg);
  assert.deepStrictEqual(c.shadow, ELEVATION.floating);
});

test('resolveTabBarChrome: discriminated union — no cross-branch field leak', () => {
  const g = resolveTabBarChrome(true);
  const f = resolveTabBarChrome(false);
  // Runtime shape guard: ensures literals leak no cross-branch fields (TS covers compile-time).
  assert.strictEqual('backgroundColor' in g, false);
  assert.strictEqual('tintColor' in f, false);
});
