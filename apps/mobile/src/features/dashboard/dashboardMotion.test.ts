import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  interpolateScalar,
  interpolateSliceAngles,
  staggeredProgress,
  quantizeCents,
} from './dashboardMotion.js';
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

// ---- staggeredProgress (Task 10 Step 1) ----------------------------------

test('staggeredProgress: globalT=0 ⇒ every slice 0', () => {
  for (const overlap of [0, 0.5, 1]) {
    for (let i = 0; i < 5; i++) {
      assert.strictEqual(staggeredProgress(0, i, 5, overlap), 0, `i=${i} overlap=${overlap}`);
    }
  }
});

test('staggeredProgress: globalT=1 ⇒ every slice 1', () => {
  for (const overlap of [0, 0.5, 1]) {
    for (let i = 0; i < 5; i++) {
      assert.strictEqual(staggeredProgress(1, i, 5, overlap), 1, `i=${i} overlap=${overlap}`);
    }
  }
});

test('staggeredProgress: overlap=1 ⇒ all slices identical (current simultaneous behavior)', () => {
  for (const gt of [0, 0.25, 0.5, 0.75, 1]) {
    const ref = staggeredProgress(gt, 0, 6, 1);
    for (let i = 1; i < 6; i++) {
      assert.strictEqual(staggeredProgress(gt, i, 6, 1), ref, `gt=${gt} i=${i}`);
    }
  }
});

test('staggeredProgress: monotonic ordering — earlier index ≥ later index at any fixed globalT', () => {
  // earlier slices start sooner ⇒ reach (or exceed) the progress of later
  // slices for every fixed globalT and any overlap.
  for (const overlap of [0, 0.3, 0.7]) {
    for (const gt of [0.1, 0.25, 0.4, 0.55, 0.7, 0.9]) {
      for (let i = 0; i < 7; i++) {
        const earlier = staggeredProgress(gt, i, 8, overlap);
        const later = staggeredProgress(gt, i + 1, 8, overlap);
        assert.ok(
          earlier >= later - 1e-9,
          `earlier(i=${i})=${earlier} should be >= later(i=${i + 1})=${later} @ gt=${gt} overlap=${overlap}`,
        );
      }
    }
  }
});

test('staggeredProgress: earlier index reaches 1 at-or-before later index', () => {
  // Pin the lead-ordering property POINTWISE where it is observable (mid-sweep
  // globalT, not the trivial gt=1 endpoint). For sequential overlap=0 an
  // earlier slice starts sooner, so at every fixed interior globalT each slice
  // is at-or-ahead of the one after it — in particular it reaches 1 no later.
  const overlap = 0;
  const count = 5;
  for (const gt of [0.3, 0.5, 0.7]) {
    for (let i = 0; i <= count - 2; i++) {
      const earlier = staggeredProgress(gt, i, count, overlap);
      const later = staggeredProgress(gt, i + 1, count, overlap);
      assert.ok(
        earlier >= later,
        `earlier(i=${i})=${earlier} must be >= later(i=${i + 1})=${later} @ gt=${gt}`,
      );
    }
  }
});

test('staggeredProgress: output always clamped to [0,1]', () => {
  for (const overlap of [0, 0.25, 0.5, 0.75, 1]) {
    for (let s = -20; s <= 120; s++) {
      const gt = s / 100; // includes out-of-range globalT
      for (let i = 0; i < 6; i++) {
        const v = staggeredProgress(gt, i, 6, overlap);
        assert.ok(v >= 0 && v <= 1, `v=${v} out of [0,1] @ gt=${gt} i=${i} overlap=${overlap}`);
        assert.ok(Number.isFinite(v), `v not finite @ gt=${gt} i=${i} overlap=${overlap}`);
      }
    }
  }
});

test('staggeredProgress: count=1 degenerate ⇒ eased global progress, exact endpoints + clamp', () => {
  // A single slice has no neighbours to stagger against, so it follows the
  // global draw progress directly — but still eased (premium), not raw-linear.
  // The load-bearing contract: exact 0/1 endpoints, [0,1] clamp, monotonic.
  assert.strictEqual(staggeredProgress(0, 0, 1, 0), 0);
  assert.strictEqual(staggeredProgress(1, 0, 1, 0), 1);
  assert.strictEqual(staggeredProgress(-3, 0, 1, 0), 0); // clamp low
  assert.strictEqual(staggeredProgress(7, 0, 1, 0), 1); // clamp high
  // monotonic, strictly inside (0,1) for an interior globalT
  const mid = staggeredProgress(0.5, 0, 1, 0);
  assert.ok(mid > 0 && mid < 1, `mid=${mid} must be strictly inside (0,1)`);
  const lo = staggeredProgress(0.25, 0, 1, 0);
  const hi = staggeredProgress(0.75, 0, 1, 0);
  assert.ok(lo < mid && mid < hi, `expected ${lo} < ${mid} < ${hi}`);
  // overlap is irrelevant when count=1 (no neighbours to overlap with)
  assert.strictEqual(staggeredProgress(0.5, 0, 1, 1), mid);
});

test('staggeredProgress: sequential overlap=0 — slice 1 still 0 while slice 0 mid-sweep', () => {
  // With 2 slices fully sequential, at globalT just past the first half the
  // first slice is well underway but the second has not started.
  const v0 = staggeredProgress(0.25, 0, 2, 0);
  const v1 = staggeredProgress(0.25, 1, 2, 0);
  assert.ok(v0 > 0, `v0=${v0} should be > 0`);
  assert.strictEqual(v1, 0);
});

// ---- quantizeCents (Task 10 Step 3 — exact final-frame landing) ----------

test('quantizeCents: snaps to exact target when within epsilon (no off-by-one)', () => {
  // withTiming settles AT toValue on completion — sub-epsilon float noise
  // (e.g. 12344.9997 / 12345.0003) must still land EXACTLY on the total, not
  // an off-by-one. Default epsilon 0.5 = "within half a cent ⇒ effectively
  // complete". A value ≥0.5 away is a genuine mid-count frame, not a settle.
  assert.strictEqual(quantizeCents(12344.9997, 12345), 12345);
  assert.strictEqual(quantizeCents(12345.0003, 12345), 12345);
  assert.strictEqual(quantizeCents(12344.6, 12345), 12345); // within 0.5 → snap
  assert.strictEqual(quantizeCents(12345.4, 12345), 12345);
  assert.strictEqual(quantizeCents(12345, 12345), 12345);
  // Just outside epsilon is still mid-count → nearest integer (not snapped).
  assert.strictEqual(quantizeCents(12344.49, 12345), 12344);
});

test('quantizeCents: mid-count (outside epsilon) returns nearest integer', () => {
  assert.strictEqual(quantizeCents(8000.2, 12345), 8000);
  assert.strictEqual(quantizeCents(8000.7, 12345), 8001);
  assert.strictEqual(quantizeCents(0, 12345), 0);
});

test('quantizeCents: monotonic toward target across a count-up sweep', () => {
  const target = 5000;
  let prev = -1;
  for (let s = 0; s <= 100; s++) {
    const raw = (s / 100) * target;
    const q = quantizeCents(raw, target);
    assert.ok(q >= prev, `not monotonic at s=${s}: ${q} < ${prev}`);
    assert.ok(q >= 0 && q <= target, `q=${q} out of [0,${target}] at s=${s}`);
    prev = q;
  }
  assert.strictEqual(prev, target); // final frame is exactly target
});

test('quantizeCents: configurable epsilon', () => {
  assert.strictEqual(quantizeCents(100.9, 102, 0.5), 101); // outside 0.5 → round
  assert.strictEqual(quantizeCents(100.9, 102, 2), 102); // within 2 → snap
});
