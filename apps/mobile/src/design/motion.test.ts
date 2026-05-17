/**
 * motion.ts vocabulary + reduce-motion degradation. node:test + tsx.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { MOTION, degradeForReducedMotion, selectMotionPreset, type MotionPreset } from './motion.js';

test('MOTION: every preset has positive duration and a named easing', () => {
  for (const [name, p] of Object.entries(MOTION)) {
    assert.ok(p.durationMs > 0, `${name}.durationMs must be > 0`);
    assert.ok(p.easing.length > 0, `${name}.easing must be a named token`);
  }
});

test('MOTION: expected presets exist', () => {
  for (const k of ['heroCountUp', 'arcDraw', 'arcInterpolate', 'fabReveal', 'sharedMonth', 'sheetSpring'] as const) {
    assert.ok(MOTION[k], `MOTION.${k} missing`);
  }
});

test('degradeForReducedMotion: collapses duration to 0 and easing to linear', () => {
  const p: MotionPreset = MOTION.heroCountUp;
  const d = degradeForReducedMotion(p);
  assert.strictEqual(d.durationMs, 0);
  assert.strictEqual(d.easing, 'linear');
  assert.strictEqual(d.reduced, true);
});

test('degradeForReducedMotion: is pure (does not mutate input)', () => {
  const before = { ...MOTION.arcDraw };
  degradeForReducedMotion(MOTION.arcDraw);
  assert.deepStrictEqual({ ...MOTION.arcDraw }, before);
});

test('selectMotionPreset: full motion returns the named MOTION preset unchanged', () => {
  const p = selectMotionPreset('arcDraw', false);
  assert.deepStrictEqual(p, MOTION.arcDraw);
  assert.strictEqual('reduced' in p, false);
});

test('selectMotionPreset: reduce-motion collapses to instant linear reduced preset', () => {
  const p = selectMotionPreset('heroCountUp', true);
  assert.strictEqual(p.durationMs, 0);
  assert.strictEqual(p.easing, 'linear');
  assert.strictEqual((p as { reduced?: true }).reduced, true);
});

test('selectMotionPreset: every MOTION name resolves in both modes', () => {
  for (const k of ['heroCountUp', 'arcDraw', 'arcInterpolate', 'fabReveal', 'sharedMonth', 'sheetSpring'] as const) {
    assert.ok(selectMotionPreset(k, false).durationMs >= 0);
    assert.strictEqual(selectMotionPreset(k, true).durationMs, 0);
  }
});

test('selectMotionPreset: is pure (does not mutate MOTION)', () => {
  const before = { ...MOTION.arcInterpolate };
  selectMotionPreset('arcInterpolate', true);
  assert.deepStrictEqual({ ...MOTION.arcInterpolate }, before);
});
