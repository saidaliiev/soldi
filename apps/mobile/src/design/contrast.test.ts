/**
 * Unit tests for contrast.ts — WCAG 2.1 contrast ratio utility + token audit.
 *
 * Pattern: node:test + node:assert (no jest — see STATE.md jest-harness-missing).
 * Run via: npx tsx --test src/design/contrast.test.ts
 *
 * Assertions:
 *   1. contrastRatio math: known reference values (black/white = 21:1, same = 1:1)
 *   2. Symmetry: contrastRatio(a, b) === contrastRatio(b, a)
 *   3. auditTokenPairs(): every entry passes WCAG AA after D-09 remediation
 *   4. No remediated token value present in BANNED_COLORS
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';

import { contrastRatio, auditTokenPairs } from './contrast.js';
import { BANNED_COLORS, COLORS } from './tokens.js';

// ---------------------------------------------------------------------------
// contrastRatio — math assertions
// ---------------------------------------------------------------------------

test('contrastRatio: black on white = 21:1', () => {
  const ratio = contrastRatio('#000000', '#FFFFFF');
  // WCAG spec gives exactly 21; floating-point should be extremely close.
  assert.ok(Math.abs(ratio - 21) < 0.01, `expected ~21, got ${ratio}`);
});

test('contrastRatio: same color = 1:1', () => {
  assert.strictEqual(contrastRatio('#FFFFFF', '#FFFFFF'), 1);
  assert.strictEqual(contrastRatio('#000000', '#000000'), 1);
  assert.strictEqual(contrastRatio('#EDEAE3', '#EDEAE3'), 1);
});

test('contrastRatio: is symmetric', () => {
  const a = '#221F1B';
  const b = '#EDEAE3';
  const ab = contrastRatio(a, b);
  const ba = contrastRatio(b, a);
  assert.ok(Math.abs(ab - ba) < Number.EPSILON * 100,
    `contrastRatio not symmetric: ${ab} vs ${ba}`);
});

test('contrastRatio: known reference pair (Slate & Sand background)', () => {
  // textPrimary #221F1B on background #EDEAE3 — known ~13.7:1 (Slate & Sand)
  const ratio = contrastRatio('#221F1B', '#EDEAE3');
  assert.ok(ratio > 13 && ratio < 15, `expected ~13.7, got ${ratio}`);
});

test('contrastRatio: throws on malformed hex', () => {
  assert.throws(() => contrastRatio('not-a-color', '#FFFFFF'), /invalid hex/);
  assert.throws(() => contrastRatio('#FFFFFF', 'rgb(0,0,0)'), /invalid hex/);
});

// ---------------------------------------------------------------------------
// auditTokenPairs — every real pair passes AA after D-09 remediation
// ---------------------------------------------------------------------------

test('auditTokenPairs: every entry passes WCAG AA', () => {
  const pairs = auditTokenPairs();
  assert.ok(pairs.length > 0, 'audit table must not be empty');

  const failures: string[] = [];
  for (const pair of pairs) {
    if (!pair.passes) {
      failures.push(
        `FAIL ${pair.fgToken} (${pair.fg}) on ${pair.bgToken} (${pair.bg}): ` +
        `ratio=${pair.ratio.toFixed(2)} required=${pair.requiredAA}`,
      );
    }
  }
  assert.deepStrictEqual(failures, [],
    `AA failures detected after D-09 remediation:\n${failures.join('\n')}`);
});

test('auditTokenPairs: ratio >= requiredAA for each entry individually', () => {
  for (const pair of auditTokenPairs()) {
    assert.ok(pair.ratio >= pair.requiredAA,
      `${pair.fgToken} on ${pair.bgToken}: ratio ${pair.ratio.toFixed(2)} < required ${pair.requiredAA}`);
  }
});

// ---------------------------------------------------------------------------
// BANNED_COLORS — no remediated token value is in the banned list
// ---------------------------------------------------------------------------

test('COLORS: no remediated token value is in BANNED_COLORS', () => {
  // The tokens we changed in D-09: textMuted, accent, sage (and semantic aliases)
  const remediatedTokens: readonly [string, string][] = [
    ['textMuted', COLORS.textMuted],
    ['accent', COLORS.accent],
    ['expense', COLORS.expense],
    ['sage', COLORS.sage],
  ];
  for (const [tokenName, value] of remediatedTokens) {
    assert.ok(
      !BANNED_COLORS.includes(value as typeof BANNED_COLORS[number]),
      `Remediated token ${tokenName}=${value} is in BANNED_COLORS — design violation`,
    );
  }
});

test('COLORS: no banned color introduced anywhere in COLORS object', () => {
  for (const [key, value] of Object.entries(COLORS)) {
    assert.ok(
      !BANNED_COLORS.includes(value as typeof BANNED_COLORS[number]),
      `COLORS.${key}=${value} matches a BANNED_COLOR`,
    );
  }
});
