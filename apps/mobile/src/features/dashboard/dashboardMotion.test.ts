import { test } from 'node:test';
import assert from 'node:assert/strict';

import { interpolateScalar, interpolateSliceAngles } from './dashboardMotion.js';
import type { SliceAngle } from './donutArcs.js';

const A = (id: number | 'other', s: number, e: number, color = '#111111'): SliceAngle => ({
  startDeg: s,
  endDeg: e,
  color,
  categoryId: id,
});

test('interpolateScalar: endpoints exact, midpoint linear, t clamped', () => {
  assert.strictEqual(interpolateScalar(0, 100, 0), 0);
  assert.strictEqual(interpolateScalar(0, 100, 1), 100);
  assert.strictEqual(interpolateScalar(0, 100, 0.5), 50);
  assert.strictEqual(interpolateScalar(40, 80, -1), 40); // clamp low
  assert.strictEqual(interpolateScalar(40, 80, 2), 80); // clamp high
});

test('interpolateSliceAngles: t=0 yields prev geometry for matched slices', () => {
  const prev = [A(1, 1, 100), A(2, 102, 200)];
  const next = [A(1, 1, 60), A(2, 62, 358)];
  const r = interpolateSliceAngles(prev, next, 0);
  assert.strictEqual(r.length, 2);
  assert.strictEqual(r[0]!.startDeg, 1);
  assert.strictEqual(r[0]!.endDeg, 100);
  assert.strictEqual(r[1]!.endDeg, 200);
});

test('interpolateSliceAngles: t=1 equals next exactly (matched, order preserved)', () => {
  const prev = [A(1, 1, 100), A(2, 102, 200)];
  const next = [A(2, 1, 120), A(1, 122, 358)];
  const r = interpolateSliceAngles(prev, next, 1);
  assert.deepStrictEqual([...r], [...next]);
});

test('interpolateSliceAngles: matched slice morphs linearly at midpoint', () => {
  const prev = [A(1, 0, 100)];
  const next = [A(1, 0, 200)];
  const r = interpolateSliceAngles(prev, next, 0.5);
  assert.strictEqual(r[0]!.endDeg, 150);
  assert.strictEqual(r[0]!.color, '#111111');
});

test('interpolateSliceAngles: entering slice grows from its leading edge', () => {
  const prev: SliceAngle[] = [];
  const next = [A(7, 10, 50)];
  const zero = interpolateSliceAngles(prev, next, 0);
  assert.strictEqual(zero[0]!.startDeg, 10);
  assert.strictEqual(zero[0]!.endDeg, 10); // entering @ t=0 → zero-width at leading edge
  const half = interpolateSliceAngles(prev, next, 0.5);
  assert.strictEqual(half[0]!.startDeg, 10);
  assert.strictEqual(half[0]!.endDeg, 30); // lerp(10,50,0.5)
  const full = interpolateSliceAngles(prev, next, 1);
  assert.deepStrictEqual([...full], [...next]);
});

test('interpolateSliceAngles: exiting slice shrinks to zero then is dropped at t=1', () => {
  const prev = [A(1, 0, 100), A(9, 102, 200)];
  const next = [A(1, 0, 358)];
  const mid = interpolateSliceAngles(prev, next, 0.5);
  // matched #1 morphs, exiting #9 still present but half-collapsed
  const exiting = mid.find((a) => a.categoryId === 9)!;
  assert.strictEqual(exiting.startDeg, 102);
  assert.strictEqual(exiting.endDeg, 151); // lerp(200,102,0.5) -> shrink toward start
  const end = interpolateSliceAngles(prev, next, 1);
  assert.deepStrictEqual([...end], [...next]); // #9 fully dropped
});

test('interpolateSliceAngles: empty→empty is empty, never NaN', () => {
  assert.deepStrictEqual([...interpolateSliceAngles([], [], 0.5)], []);
});

test('interpolateSliceAngles: clamps t to [0,1]', () => {
  const prev = [A(1, 0, 100)];
  const next = [A(1, 0, 200)];
  assert.strictEqual(interpolateSliceAngles(prev, next, -5)[0]!.endDeg, 100);
  assert.strictEqual(interpolateSliceAngles(prev, next, 5)[0]!.endDeg, 200);
});
