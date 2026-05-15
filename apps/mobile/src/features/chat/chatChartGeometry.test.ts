/**
 * chatChartGeometry.test.ts — tests for pure geometry functions.
 *
 * Pattern: node:test + tsx (matches project test pattern).
 * Run via: npx tsx --test src/features/chat/chatChartGeometry.test.ts
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { sparklinePath, donutArcs, barLayout } from './chatChartGeometry';

// ---------------------------------------------------------------------------
// sparklinePath
// ---------------------------------------------------------------------------

test('sparklinePath: produces M...L path for 3 values', () => {
  const path = sparklinePath([0, 1, 0], 100, 50);
  assert.ok(path.startsWith('M '), 'Should start with M');
  assert.ok(path.includes('L '), 'Should include L');
  // Three points → M + 2 L commands = starts with M and has exactly 2 L
  const lCount = (path.match(/L /g) ?? []).length;
  assert.strictEqual(lCount, 2);
});

test('sparklinePath: handles flat data (all same value)', () => {
  const path = sparklinePath([5, 5, 5], 100, 50);
  assert.ok(path.length > 0, 'Should produce a path even for flat data');
});

test('sparklinePath: returns empty string for < 2 values', () => {
  assert.strictEqual(sparklinePath([5], 100, 50), '');
  assert.strictEqual(sparklinePath([], 100, 50), '');
});

test('sparklinePath: respects zero width/height guard', () => {
  assert.strictEqual(sparklinePath([1, 2, 3], 0, 50), '');
  assert.strictEqual(sparklinePath([1, 2, 3], 100, 0), '');
});

// ---------------------------------------------------------------------------
// donutArcs
// ---------------------------------------------------------------------------

test('donutArcs: returns correct number of arcs', () => {
  const slices = [
    { label: 'groceries', value: 100, color: 'accent' },
    { label: 'dining', value: 50, color: 'sage' },
    { label: 'transport', value: 30, color: 'textMuted' },
  ];
  const arcs = donutArcs(slices, 40, 8);
  assert.strictEqual(arcs.length, 3);
});

test('donutArcs: each arc d-string starts with M and contains A', () => {
  const slices = [
    { label: 'groceries', value: 100, color: 'accent' },
    { label: 'dining', value: 50, color: 'sage' },
  ];
  const arcs = donutArcs(slices, 40, 8);
  for (const arc of arcs) {
    assert.ok(arc.d.startsWith('M '), `Arc d should start with M: ${arc.d}`);
    assert.ok(arc.d.includes(' A '), `Arc d should contain A command: ${arc.d}`);
  }
});

test('donutArcs: returns empty for empty slices', () => {
  assert.deepStrictEqual(donutArcs([], 40, 8), []);
});

// ---------------------------------------------------------------------------
// barLayout
// ---------------------------------------------------------------------------

test('barLayout: returns correct number of bars', () => {
  const bars = [
    { label: 'A', value: 100 },
    { label: 'B', value: 80 },
    { label: 'C', value: 60 },
  ];
  const layout = barLayout(bars, 300, 100);
  assert.strictEqual(layout.length, 3);
});

test('barLayout: tallest bar has height equal to innerH', () => {
  const bars = [
    { label: 'A', value: 100 },
    { label: 'B', value: 50 },
  ];
  const layout = barLayout(bars, 200, 100, 20);
  const innerH = 100 - 20;
  assert.strictEqual(layout[0]!.h, innerH);
});

test('barLayout: returns empty for empty bars', () => {
  assert.deepStrictEqual(barLayout([], 200, 100), []);
});
