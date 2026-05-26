/**
 * Tests for dateGrouping — node:test + tsx runner.
 */

import test from 'node:test';
import assert from 'node:assert/strict';

import {
  groupByDate,
  computeStickyIndices,
  formatDateHeader,
} from './dateGrouping';
import type { Transaction } from './types';

function tx(
  id: number,
  dateSec: number,
  amountCents: number,
  merchant = `m${id}`,
): Transaction {
  return {
    id,
    amountCents,
    currency: 'EUR',
    merchantName: merchant,
    categoryId: null,
    categoryName: null,
    categoryEmoji: null,
    categoryColor: null,
    dateSec,
  };
}

// Helper: convert YYYY-MM-DD UTC into unix seconds for test data.
function utcDateSec(yyyyMmDd: string, hour = 12): number {
  const d = new Date(`${yyyyMmDd}T${String(hour).padStart(2, '0')}:00:00.000Z`);
  return Math.floor(d.getTime() / 1000);
}

test('groupByDate: empty input returns empty feed', () => {
  assert.deepEqual(groupByDate([]), []);
});

test('groupByDate: single expense row emits header + row', () => {
  const t = tx(1, utcDateSec('2026-05-14'), -4250);
  const feed = groupByDate([t]);
  assert.equal(feed.length, 2);
  assert.equal(feed[0]!.kind, 'header');
  if (feed[0]!.kind === 'header') {
    assert.equal(feed[0]!.date, '2026-05-14');
    assert.equal(feed[0]!.subtotalCents, 4250);
  }
  assert.equal(feed[1]!.kind, 'row');
});

test('groupByDate: header subtotal excludes income (positive cents)', () => {
  const expense = tx(1, utcDateSec('2026-05-14', 14), -2000);
  const income = tx(2, utcDateSec('2026-05-14', 10), 5000);
  const feed = groupByDate([expense, income]);
  assert.equal(feed[0]!.kind, 'header');
  if (feed[0]!.kind === 'header') {
    assert.equal(feed[0]!.subtotalCents, 2000);
  }
});

test('groupByDate: multi-day mix produces correctly interleaved feed', () => {
  const rows: Transaction[] = [
    tx(1, utcDateSec('2026-05-14', 18), -500),
    tx(2, utcDateSec('2026-05-14', 9), -1500),
    tx(3, utcDateSec('2026-05-13', 20), -2000),
    tx(4, utcDateSec('2026-05-13', 11), -3000),
    tx(5, utcDateSec('2026-05-12', 8), -1000),
  ];
  const feed = groupByDate(rows);
  // 3 headers + 5 rows = 8
  assert.equal(feed.length, 8);
  // Headers appear at indices 0, 3, 6
  assert.equal(feed[0]!.kind, 'header');
  assert.equal(feed[3]!.kind, 'header');
  assert.equal(feed[6]!.kind, 'header');
  // Per-day subtotals
  if (feed[0]!.kind === 'header') {
    assert.equal(feed[0]!.date, '2026-05-14');
    assert.equal(feed[0]!.subtotalCents, 2000);
  }
  if (feed[3]!.kind === 'header') {
    assert.equal(feed[3]!.date, '2026-05-13');
    assert.equal(feed[3]!.subtotalCents, 5000);
  }
  if (feed[6]!.kind === 'header') {
    assert.equal(feed[6]!.date, '2026-05-12');
    assert.equal(feed[6]!.subtotalCents, 1000);
  }
});

test('computeStickyIndices returns indices of header items only', () => {
  const rows: Transaction[] = [
    tx(1, utcDateSec('2026-05-14'), -500),
    tx(2, utcDateSec('2026-05-13'), -1000),
  ];
  const feed = groupByDate(rows);
  const sticky = computeStickyIndices(feed);
  assert.deepEqual(sticky, [0, 2]);
  // Sanity — sticky length === count of headers
  const headerCount = feed.filter((f) => f.kind === 'header').length;
  assert.equal(sticky.length, headerCount);
});

test('formatDateHeader: Today branch', () => {
  const today = new Date('2026-05-14T12:00:00.000Z');
  assert.equal(formatDateHeader('2026-05-14', today, 'en-IE'), 'Today');
});

test('formatDateHeader: Yesterday branch', () => {
  const today = new Date('2026-05-14T12:00:00.000Z');
  assert.equal(formatDateHeader('2026-05-13', today, 'en-IE'), 'Yesterday');
});

test('formatDateHeader: Intl branch returns locale-aware short date', () => {
  const today = new Date('2026-05-14T12:00:00.000Z');
  const out = formatDateHeader('2026-05-12', today, 'en-IE');
  // Should NOT be Today/Yesterday
  assert.notEqual(out, 'Today');
  assert.notEqual(out, 'Yesterday');
  // Should contain "May" + "12" in some order
  assert.match(out, /May/);
  assert.match(out, /12/);
});

test('formatDateHeader: Ukrainian locale renders cyrillic short date', () => {
  const today = new Date('2026-05-14T12:00:00.000Z');
  const out = formatDateHeader('2026-05-12', today, 'uk-UA');
  // Cyrillic letter range — assert the output is non-Latin (locale honored).
  assert.match(out, /[А-Яа-я]/);
});
