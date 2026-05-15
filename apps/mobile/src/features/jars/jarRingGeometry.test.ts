/**
 * Unit tests for jarRingGeometry — pure arc math for the Skia jar ring.
 *
 * Pattern: node:test + tsx (project Pattern 11).
 * Run via: npx tsx --test src/features/jars/jarRingGeometry.test.ts
 *
 * Tests cover D-04 invariants: fraction clamping, 12 o'clock start angle,
 * Skia-compatible M/A SVG path output.
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';

import { jarRingArcPath } from './jarRingGeometry.js';

// ---------------------------------------------------------------------------
// Basic shape checks
// ---------------------------------------------------------------------------

test('jarRingArcPath: returns a non-empty string for fraction 0.5', () => {
  const path = jarRingArcPath(0.5, 60, 10);
  assert.ok(typeof path === 'string' && path.length > 0, 'non-empty string');
});

test('jarRingArcPath: contains M and A SVG commands', () => {
  const path = jarRingArcPath(0.5, 60, 10);
  assert.ok(path.startsWith('M'), 'path starts with M');
  assert.ok(path.includes('A'), 'path contains A arc command');
});

test('jarRingArcPath: no NaN in output', () => {
  const path = jarRingArcPath(0.5, 60, 10);
  assert.ok(!path.includes('NaN'), 'no NaN in path');
});

// ---------------------------------------------------------------------------
// fraction = 0 → degenerate (documented zero-sweep)
// ---------------------------------------------------------------------------

test('jarRingArcPath: fraction 0 returns empty string or zero-sweep degenerate', () => {
  const path = jarRingArcPath(0, 60, 10);
  // Acceptable: empty string OR a zero-length arc (documented degenerate)
  assert.ok(typeof path === 'string', 'returns a string');
  // Must not contain NaN
  assert.ok(!path.includes('NaN'), 'no NaN even for fraction 0');
});

// ---------------------------------------------------------------------------
// fraction = 1 → full ring (nearly 360°)
// ---------------------------------------------------------------------------

test('jarRingArcPath: fraction 1 → large-arc-flag is 1 (sweep > 180°)', () => {
  const path = jarRingArcPath(1, 60, 10);
  // A full ring sweeps ~360° which is > 180° — large-arc-flag must be 1
  // The A command format: A rx ry x-rotation large-arc-flag sweep-flag x y
  // large-arc-flag=1 appears in the A segment
  assert.ok(path.includes(' 1 1 '), 'large-arc-flag=1 for full ring');
  assert.ok(!path.includes('NaN'), 'no NaN');
});

// ---------------------------------------------------------------------------
// fraction > 1 → clamped to 1 (D-04 over-funded invariant)
// ---------------------------------------------------------------------------

test('jarRingArcPath: fraction 1.5 is clamped to same result as fraction 1 (D-04)', () => {
  const pathFull = jarRingArcPath(1, 60, 10);
  const pathOver = jarRingArcPath(1.5, 60, 10);
  assert.strictEqual(pathOver, pathFull, 'over-funded clamped to same path as full ring');
});

// ---------------------------------------------------------------------------
// Consistency — larger radius changes coordinates but not structure
// ---------------------------------------------------------------------------

test('jarRingArcPath: different radius produces different coordinate values', () => {
  const path60 = jarRingArcPath(0.5, 60, 10);
  const path80 = jarRingArcPath(0.5, 80, 10);
  assert.notStrictEqual(path60, path80, 'different radii produce different paths');
});

// ---------------------------------------------------------------------------
// 12 o'clock start (π/2 convention) — start point y < center for top start
// The center is at (radius + strokeWidth/2, radius + strokeWidth/2) matching donutArcs idiom.
// For fraction=0.25 starting at top, x1 should equal cx (within float tolerance).
// ---------------------------------------------------------------------------

test("jarRingArcPath: fraction=0.25 start x is approximately cx (12 o'clock start)", () => {
  const radius = 60;
  const strokeWidth = 10;
  const cx = radius; // center, matching chatChartGeometry idiom
  const path = jarRingArcPath(0.25, radius, strokeWidth);
  // Extract first numeric pair after 'M '
  const match = path.match(/^M\s+([\d.+-]+)[\s,]+([\d.+-]+)/);
  assert.ok(match, 'path has M x y at start');
  const startX = parseFloat(match![1]!);
  // At 12 o'clock, x = cx (within 1 unit float rounding)
  assert.ok(Math.abs(startX - cx) < 1, `start x ${startX} should be near cx ${cx}`);
});
