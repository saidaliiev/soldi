/**
 * SOLDI categories repository.
 *
 * Provides read-only DB access to the categories table.
 * All functions use getDB() and op-sqlite v15 executeSync().
 *
 * Security: No user-supplied strings interpolated into SQL — all queries use
 * parameterized executeSync(sql, params) form.
 */

import { getDB } from '@lib/db';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type CategoryRow = {
  id: number;
  name_en: string;
  name_uk: string;
  icon_name: string;
  parent_id: number | null;
  is_custom: 0 | 1;
  created_at: number;
};

// ---------------------------------------------------------------------------
// Slug → English name mapping
// ---------------------------------------------------------------------------

/**
 * Maps the 18 default category slugs to the exact `name_en` values as seeded
 * in migration 001 (SEED_DEFAULT_CATEGORIES in schema.sql.ts).
 *
 * Used by getCategoryIdBySlug() to look up the DB id without hardcoding ids.
 */
const SLUG_TO_NAME_EN: Readonly<Record<string, string>> = {
  'groceries':     'Groceries',
  'transport':     'Transport',
  'eating-out':    'Eating out',
  'coffee':        'Coffee',
  'rent':          'Rent',
  'utilities':     'Utilities',
  'mobile':        'Mobile',
  'entertainment': 'Entertainment',
  'health':        'Health',
  'clothing':      'Clothing',
  'gifts':         'Gifts',
  'transfers':     'Transfers',
  'salary':        'Salary',
  'refunds':       'Refunds',
  'savings':       'Savings',
  'kids':          'Kids',
  'pets':          'Pets',
  'misc':          'Other',
};

// ---------------------------------------------------------------------------
// Queries
// ---------------------------------------------------------------------------

/**
 * Returns all rows from the categories table ordered by id ASC.
 */
export function listCategories(): CategoryRow[] {
  const db = getDB();
  const result = db.executeSync('SELECT id, name_en, name_uk, icon_name, parent_id, is_custom, created_at FROM categories ORDER BY id ASC');
  return result.rows.map((row) => ({
    id: row['id'] as number,
    name_en: row['name_en'] as string,
    name_uk: row['name_uk'] as string,
    icon_name: row['icon_name'] as string,
    parent_id: row['parent_id'] as number | null,
    is_custom: row['is_custom'] as 0 | 1,
    created_at: row['created_at'] as number,
  }));
}

/**
 * Looks up a category id by its slug (e.g. 'eating-out', 'salary').
 *
 * Translates the slug to the canonical `name_en` string from the seed table,
 * then runs a SELECT against the categories table. Returns null if the slug is
 * unknown or no matching row exists in the DB.
 *
 * Note: This performs a DB round-trip. For bulk use (generator resolver),
 * prefer caching the result or using listCategories() once.
 */
export function getCategoryIdBySlug(slug: string): number | null {
  const nameEn = SLUG_TO_NAME_EN[slug];
  if (nameEn === undefined) return null;

  const db = getDB();
  const result = db.executeSync(
    'SELECT id FROM categories WHERE name_en = ? LIMIT 1',
    [nameEn]
  );
  const row = result.rows[0];
  if (row == null) return null;
  return row['id'] as number;
}
