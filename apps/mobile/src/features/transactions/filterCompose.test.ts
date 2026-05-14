/**
 * Tests for filterCompose — node:test + tsx runner.
 *
 * AI-safety contract: assert the `description` column NEVER appears in any
 * produced whereClause. This is the explicit grep gate from T-02-03-03.
 */

import test from 'node:test';
import assert from 'node:assert/strict';

import { buildFilterSql, isEmptyFilter } from './filterCompose';
import { EMPTY_FILTER, type FilterState } from './types';

function withFilter(patch: Partial<FilterState>): FilterState {
  return { ...EMPTY_FILTER, ...patch };
}

test('buildFilterSql: empty filter produces 1=1 with no params', () => {
  const { whereClause, params } = buildFilterSql(EMPTY_FILTER);
  assert.equal(whereClause, '1=1');
  assert.deepEqual(params, []);
});

test('buildFilterSql: search-only adds merchant LIKE on lowercased', () => {
  const { whereClause, params } = buildFilterSql(withFilter({ search: 'Coffee' }));
  assert.match(whereClause, /LOWER\(merchant_name\) LIKE \?/);
  assert.deepEqual(params, ['%coffee%']);
});

test('buildFilterSql: numeric search adds amount OR predicate', () => {
  const { whereClause, params } = buildFilterSql(withFilter({ search: '42.50' }));
  // Both merchant LIKE and amount equality should be present
  assert.match(whereClause, /LOWER\(merchant_name\) LIKE \?/);
  assert.match(whereClause, /ABS\(amount_cents\) = \?/);
  // Inside parens, OR-joined
  assert.match(whereClause, /\(LOWER\(merchant_name\) LIKE \? OR ABS\(amount_cents\) = \?\)/);
  assert.deepEqual(params, ['%42.50%', 4250]);
});

test('buildFilterSql: categoryIds adds IN clause with positional binds', () => {
  const { whereClause, params } = buildFilterSql(withFilter({ categoryIds: [1, 3, 7] }));
  assert.match(whereClause, /category_id IN \(\?, \?, \?\)/);
  assert.deepEqual(params, [1, 3, 7]);
});

test('buildFilterSql: amount range with sign=expense uses BETWEEN ABS', () => {
  const { whereClause, params } = buildFilterSql(
    withFilter({ minCents: 1000, maxCents: 5000, sign: 'expense' })
  );
  assert.match(whereClause, /amount_cents < 0/);
  assert.match(whereClause, /ABS\(amount_cents\) BETWEEN \? AND \?/);
  assert.deepEqual(params, [1000, 5000]);
});

test('buildFilterSql: sign=income adds amount_cents > 0', () => {
  const { whereClause, params } = buildFilterSql(withFilter({ sign: 'income' }));
  assert.match(whereClause, /amount_cents > 0/);
  assert.deepEqual(params, []);
});

test('buildFilterSql: sign=both adds no sign predicate', () => {
  const { whereClause } = buildFilterSql(withFilter({ sign: 'both' }));
  assert.doesNotMatch(whereClause, /amount_cents < 0/);
  assert.doesNotMatch(whereClause, /amount_cents > 0/);
});

test('buildFilterSql: date range bound on `date` column with unix seconds', () => {
  const from = '2026-05-01T00:00:00.000Z';
  const to = '2026-05-13T23:59:59.999Z';
  const { whereClause, params } = buildFilterSql(
    withFilter({ dateFromISO: from, dateToISO: to })
  );
  assert.match(whereClause, /date BETWEEN \? AND \?/);
  assert.deepEqual(params, [
    Math.floor(new Date(from).getTime() / 1000),
    Math.floor(new Date(to).getTime() / 1000),
  ]);
});

test('buildFilterSql: all axes compose with AND', () => {
  const { whereClause, params } = buildFilterSql({
    search: 'café',
    categoryIds: [2, 5],
    minCents: 500,
    maxCents: 5000,
    sign: 'expense',
    dateFromISO: '2026-05-01T00:00:00.000Z',
    dateToISO: '2026-05-13T23:59:59.999Z',
  });
  // Count AND joiners — 4 (after search-group, after categories, after amount+sign, after date range)
  const andCount = (whereClause.match(/ AND /g) ?? []).length;
  assert.ok(andCount >= 4, `expected ≥4 AND joiners, got ${andCount} in: ${whereClause}`);
  assert.ok(params.length === 7, `expected 7 params, got ${params.length}: ${JSON.stringify(params)}`);
});

test('AI-safety: buildFilterSql NEVER references description column', () => {
  // Build with every axis populated — description must not appear anywhere.
  const { whereClause } = buildFilterSql({
    search: 'description', // user even types the word — must still not leak into SQL
    categoryIds: [1],
    minCents: 100,
    maxCents: 999,
    sign: 'expense',
    dateFromISO: '2026-05-01T00:00:00.000Z',
    dateToISO: '2026-05-13T23:59:59.999Z',
  });
  // The column literal `description` MUST NOT appear in the SQL fragment.
  assert.doesNotMatch(whereClause, /\bdescription\b/);
});

test('isEmptyFilter returns true only for the default filter shape', () => {
  assert.equal(isEmptyFilter(EMPTY_FILTER), true);
  assert.equal(isEmptyFilter(withFilter({ search: 'a' })), false);
  assert.equal(isEmptyFilter(withFilter({ categoryIds: [1] })), false);
  assert.equal(isEmptyFilter(withFilter({ minCents: 0 })), false);
  assert.equal(isEmptyFilter(withFilter({ maxCents: 0 })), false);
  assert.equal(isEmptyFilter(withFilter({ sign: 'expense' })), false);
  assert.equal(isEmptyFilter(withFilter({ dateFromISO: '2026-01-01T00:00:00.000Z' })), false);
  assert.equal(isEmptyFilter(withFilter({ dateToISO: '2026-01-01T00:00:00.000Z' })), false);
});

test('buildFilterSql: search trim — pure whitespace does not trigger LIKE', () => {
  const { whereClause, params } = buildFilterSql(withFilter({ search: '   ' }));
  assert.equal(whereClause, '1=1');
  assert.deepEqual(params, []);
});
