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
import { COLORS } from '@design/tokens';

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

/**
 * Enriched category shape consumed by Phase 2 dashboard and downstream plans.
 *
 * Phase 2 deviation: the migration-001 schema does NOT carry `slug`, `color`,
 * or `usage_count` columns. To unblock Wave 1 without a schema change, those
 * values are derived in the repository layer:
 *   - slug:   reverse-lookup from SLUG_TO_NAME_EN (canonical English name → slug)
 *   - color:  per-slug assignment from the D-22 swatch palette (DEFAULT_COLORS)
 *   - usage_count: computed at query time when needed (not in v1.0)
 * Full schema migration (add slug/color/usage_count columns + backfill) lands
 * in 02-04. The downstream API contract is unaffected.
 */
export type Category = {
  readonly id: number;
  readonly slug: string;
  readonly nameEn: string;
  readonly nameUk: string;
  readonly iconName: string;
  readonly color: string;
  readonly isCustom: boolean;
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
/**
 * Default color assignment per slug from the D-22 swatch palette
 * (terracotta / sage families + warm red + brown). Phase 2 dashboard
 * uses this until the schema gains a `color` column in 02-04.
 *
 * "Other" / unknown slugs fall back to COLORS.textMuted (matches the
 * donut Other-slice contract in dashboardRepo.getCategoryBreakdown).
 */
export const DEFAULT_CATEGORY_COLORS: Readonly<Record<string, string>> = {
  'groceries':     COLORS.accent,
  'transport':     COLORS.sage,
  'eating-out':    COLORS.accentSoft,
  'coffee':        COLORS.accentDeep,
  'rent':          COLORS.textSecondary,
  'utilities':     COLORS.sageDeep,
  'mobile':        COLORS.sageSoft,
  'entertainment': COLORS.accent,
  'health':        COLORS.error,
  'clothing':      COLORS.accentSoft,
  'gifts':         COLORS.accentDeep,
  'transfers':     COLORS.textSecondary,
  'salary':        COLORS.sage,
  'refunds':       COLORS.sageSoft,
  'savings':       COLORS.sageDeep,
  'kids':          COLORS.accent,
  'pets':          COLORS.sage,
  'misc':          COLORS.textSecondary,
};

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

/** Inverse of SLUG_TO_NAME_EN — built once at module load. */
const NAME_EN_TO_SLUG: Readonly<Record<string, string>> = (() => {
  const out: Record<string, string> = {};
  for (const [slug, nameEn] of Object.entries(SLUG_TO_NAME_EN)) {
    out[nameEn] = slug;
  }
  return out;
})();

/**
 * Returns the canonical slug for a category's English name. Falls back to
 * a lowercased + hyphenated version for custom-created categories (02-04
 * persists slugs explicitly; this is a temporary derivation).
 */
export function slugForCategoryName(nameEn: string): string {
  const seeded = NAME_EN_TO_SLUG[nameEn];
  if (seeded !== undefined) return seeded;
  return nameEn.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}

/**
 * Returns the brand-palette color assigned to a category slug. Unknown slugs
 * fall back to COLORS.textMuted so the donut never renders an undefined fill.
 */
export function colorForCategorySlug(slug: string): string {
  return DEFAULT_CATEGORY_COLORS[slug] ?? COLORS.textMuted;
}

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

// ---------------------------------------------------------------------------
// getCategoryById (Phase 2 dashboard read scaffold)
// ---------------------------------------------------------------------------

/**
 * Returns the enriched Category for a given numeric id, or null when no row
 * matches. Used by dashboardRepo when assembling CategorySlice rows.
 *
 * Parameterized SELECT — no user-controlled string interpolation.
 */
export function getCategoryById(id: number): Category | null {
  // Defensive bounds: ids are AUTOINCREMENT positives; reject anything else
  // before touching the DB (T-02-01-01 mitigation — defense in depth).
  if (!Number.isInteger(id) || id <= 0) return null;

  const db = getDB();
  const result = db.executeSync(
    'SELECT id, name_en, name_uk, icon_name, is_custom FROM categories WHERE id = ? LIMIT 1',
    [id]
  );
  const row = result.rows[0];
  if (row == null) return null;

  const nameEn = row['name_en'] as string;
  const slug = slugForCategoryName(nameEn);
  return {
    id: row['id'] as number,
    slug,
    nameEn,
    nameUk: row['name_uk'] as string,
    iconName: row['icon_name'] as string,
    color: colorForCategorySlug(slug),
    isCustom: ((row['is_custom'] as number) ?? 0) === 1,
  };
}

// ---------------------------------------------------------------------------
// listCategoriesEnriched
// ---------------------------------------------------------------------------

/**
 * Returns every category enriched with derived slug + color, in id order.
 *
 * Distinct from `listCategories()` (which returns the raw CategoryRow shape
 * for Phase 1 backwards compatibility). Phase 2 UI consumers prefer this
 * enriched shape.
 */
export function listCategoriesEnriched(): readonly Category[] {
  const rows = listCategories();
  return rows.map((r) => {
    const slug = slugForCategoryName(r.name_en);
    return {
      id: r.id,
      slug,
      nameEn: r.name_en,
      nameUk: r.name_uk,
      iconName: r.icon_name,
      color: colorForCategorySlug(slug),
      isCustom: r.is_custom === 1,
    };
  });
}
