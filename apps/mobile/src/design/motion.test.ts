/**
 * motion.ts vocabulary + reduce-motion degradation. node:test + tsx.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { MOTION, degradeForReducedMotion, selectMotionPreset, type MotionPreset, type ReducedMotionPreset } from './motion.js';

test('MOTION: every preset has positive duration and a named easing', () => {
  for (const [name, p] of Object.entries(MOTION)) {
    assert.ok(p.durationMs > 0, `${name}.durationMs must be > 0`);
    assert.ok(p.easing.length > 0, `${name}.easing must be a named token`);
  }
});

test('MOTION: expected presets exist', () => {
  for (const k of ['heroCountUp', 'arcDraw', 'arcInterpolate', 'fabReveal', 'sharedMonth', 'sheetSpring', 'listRowEnter', 'chatBubbleEnter', 'pressFeedback'] as const) {
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
  assert.strictEqual((p as ReducedMotionPreset).reduced, true);
});

test('selectMotionPreset: every MOTION name resolves in both modes', () => {
  for (const k of ['heroCountUp', 'arcDraw', 'arcInterpolate', 'fabReveal', 'sharedMonth', 'sheetSpring', 'listRowEnter', 'chatBubbleEnter', 'pressFeedback'] as const) {
    assert.ok(selectMotionPreset(k, false).durationMs > 0);
    assert.strictEqual(selectMotionPreset(k, true).durationMs, 0);
  }
});

test('selectMotionPreset: is pure (does not mutate MOTION)', () => {
  const before = { ...MOTION.arcInterpolate };
  selectMotionPreset('arcInterpolate', true);
  assert.deepStrictEqual({ ...MOTION.arcInterpolate }, before);
});

test('MOTION.listRowEnter is a subtle decelerate preset (Wave 3)', () => {
  assert.ok(
    MOTION.listRowEnter.durationMs > 0 && MOTION.listRowEnter.durationMs <= 320,
    'listRowEnter must stay subtle (≤320ms)',
  );
  assert.strictEqual(MOTION.listRowEnter.easing, 'outCubic');
});

test('selectMotionPreset: listRowEnter resolves in both modes (Wave 3)', () => {
  assert.deepStrictEqual(selectMotionPreset('listRowEnter', false), MOTION.listRowEnter);
  const r = selectMotionPreset('listRowEnter', true);
  assert.strictEqual(r.durationMs, 0);
  assert.strictEqual(r.easing, 'linear');
  assert.strictEqual((r as ReducedMotionPreset).reduced, true);
});

test('MOTION.chatBubbleEnter is a subtle decelerate preset (Wave 4)', () => {
  assert.ok(
    MOTION.chatBubbleEnter.durationMs > 0 && MOTION.chatBubbleEnter.durationMs <= 320,
    'chatBubbleEnter must stay subtle (≤320ms)',
  );
  assert.strictEqual(MOTION.chatBubbleEnter.easing, 'outCubic');
});

test('MOTION.pressFeedback is a fast tap preset (Wave 4)', () => {
  assert.ok(
    MOTION.pressFeedback.durationMs > 0 && MOTION.pressFeedback.durationMs <= 120,
    'pressFeedback must stay snappy (≤120ms) — a press blip, not an enter',
  );
  assert.strictEqual(MOTION.pressFeedback.easing, 'outCubic');
});

test('selectMotionPreset: sheetSpring resolves PURE (no throw — throw was boundary-only) (Wave 4)', () => {
  // The 'spring' fail-fast lived in the reanimated boundary, never the pure
  // layer. Lock that: the pure resolver returns the preset untouched, and
  // reduce-motion still collapses it like any other preset.
  assert.deepStrictEqual(selectMotionPreset('sheetSpring', false), MOTION.sheetSpring);
  assert.strictEqual(MOTION.sheetSpring.easing, 'spring');
  assert.strictEqual(selectMotionPreset('sheetSpring', true).durationMs, 0);
});
