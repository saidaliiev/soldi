/**
 * filterCompose — pure SQL composition for the transactions list filter.
 *
 * AI-safety contract (T-02-03-03 from 02-03-PLAN + 01-LEARNINGS):
 *   We search `merchant_name` and `amount_cents`. NEVER search or read the
 *   `description` column — Phase 1 SKELETON locked description=NULL across
 *   all ingest paths and this contract is enforced here. The
 *   filterCompose.test.ts has an explicit assertion that the produced
 *   whereClause does not contain the word "description".
 *
 * Security contract (T-02-03-01):
 *   ALL user-supplied values are bound via positional `?` placeholders.
 *   LIKE wildcards are baked into the bound STRING (`'%' + val + '%'`),
 *   never into the SQL fragment. No string-interpolated user input ever.
 */

import type { FilterState, FilterSign } from './types';

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

export type SqlBind = string | number;

export type CompiledFilter = {
  /** WHERE-clause body, without the leading "WHERE". '1=1' when no axis active. */
  readonly whereClause: string;
  /** Positional binds for executeSync — order matches `?` placeholders. */
  readonly params: readonly SqlBind[];
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Parses a numeric search token (e.g. "42.50") into integer cents.
 * Returns null when the token doesn't look like a number.
 *
 * We do NOT use the heavier money.parseAmount here because the search bar
 * tokens are simple — digits + at most one decimal separator. parseAmount's
 * locale heuristics overshoot for this use case.
 */
function parseSearchAmountCents(token: string): number | null {
  const trimmed = token.trim();
  if (trimmed === '') return null;
  // Accept either "42", "42.5", "42,5". Reject anything with letters/symbols.
  if (!/^[+-]?\d+([.,]\d+)?$/.test(trimmed)) return null;
  const decimal = parseFloat(trimmed.replace(',', '.'));
  if (!Number.isFinite(decimal)) return null;
  return Math.round(Math.abs(decimal) * 100);
}

function signPredicate(sign: FilterSign): string | null {
  if (sign === 'expense') return 'amount_cents < 0';
  if (sign === 'income') return 'amount_cents > 0';
  return null;
}

// ---------------------------------------------------------------------------
// buildFilterSql
// ---------------------------------------------------------------------------

/**
 * Compose the WHERE-clause body and bind parameters for a FilterState.
 *
 * Composition order (stable for test predictability):
 *   1. Search group   — (LOWER(merchant_name) LIKE ? [OR ABS(amount_cents) = ?])
 *   2. Categories     — category_id IN (?, ?, ...)
 *   3. Amount range   — ABS(amount_cents) BETWEEN ? AND ?
 *   4. Sign           — amount_cents < 0 | amount_cents > 0
 *   5. Date range     — date BETWEEN ? AND ?  (date column = unix seconds)
 *
 * All groups AND together. An empty filter compiles to '1=1' so the consumer
 * never has to special-case an empty WHERE.
 */
export function buildFilterSql(filter: FilterState): CompiledFilter {
  const fragments: string[] = [];
  const params: SqlBind[] = [];

  // --- 1. Search ----------------------------------------------------------
  const search = filter.search.trim();
  if (search.length > 0) {
    const subFragments: string[] = ['LOWER(merchant_name) LIKE ?'];
    params.push(`%${search.toLowerCase()}%`);

    const amountCents = parseSearchAmountCents(search);
    if (amountCents !== null) {
      subFragments.push('ABS(amount_cents) = ?');
      params.push(amountCents);
    }

    fragments.push(
      subFragments.length === 1 ? subFragments[0]! : `(${subFragments.join(' OR ')})`
    );
  }

  // --- 2. Categories ------------------------------------------------------
  if (filter.categoryIds.length > 0) {
    const placeholders = filter.categoryIds.map(() => '?').join(', ');
    fragments.push(`category_id IN (${placeholders})`);
    for (const id of filter.categoryIds) params.push(id);
  }

  // --- 3. Amount range ----------------------------------------------------
  if (filter.minCents !== null && filter.maxCents !== null) {
    fragments.push('ABS(amount_cents) BETWEEN ? AND ?');
    params.push(filter.minCents, filter.maxCents);
  } else if (filter.minCents !== null) {
    fragments.push('ABS(amount_cents) >= ?');
    params.push(filter.minCents);
  } else if (filter.maxCents !== null) {
    fragments.push('ABS(amount_cents) <= ?');
    params.push(filter.maxCents);
  }

  // --- 4. Sign ------------------------------------------------------------
  const sign = signPredicate(filter.sign);
  if (sign !== null) fragments.push(sign);

  // --- 5. Date range (column = `date`, unix seconds) ----------------------
  if (filter.dateFromISO !== null && filter.dateToISO !== null) {
    fragments.push('date BETWEEN ? AND ?');
    params.push(
      Math.floor(new Date(filter.dateFromISO).getTime() / 1000),
      Math.floor(new Date(filter.dateToISO).getTime() / 1000),
    );
  } else if (filter.dateFromISO !== null) {
    fragments.push('date >= ?');
    params.push(Math.floor(new Date(filter.dateFromISO).getTime() / 1000));
  } else if (filter.dateToISO !== null) {
    fragments.push('date <= ?');
    params.push(Math.floor(new Date(filter.dateToISO).getTime() / 1000));
  }

  const whereClause = fragments.length === 0 ? '1=1' : fragments.join(' AND ');

  return { whereClause, params };
}

// ---------------------------------------------------------------------------
// isEmptyFilter
// ---------------------------------------------------------------------------

/**
 * Returns true when no filter axis is active. Used to hide FilterPillsRow
 * and to show the "Clear all" button only when relevant.
 */
export function isEmptyFilter(filter: FilterState): boolean {
  return (
    filter.search === '' &&
    filter.categoryIds.length === 0 &&
    filter.minCents === null &&
    filter.maxCents === null &&
    filter.sign === 'both' &&
    filter.dateFromISO === null &&
    filter.dateToISO === null
  );
}
