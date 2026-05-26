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
import { DEFAULT_CATEGORY_EMOJI, emojiForSlug } from '@data/categoryEmojis';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type CategoryRow = {
  id: number;
  name_en: string;
  name_uk: string;
  icon_name: string;
  emoji: string;
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
  readonly emoji: string;
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

/**
 * Resolves the display name for a category in the active language.
 *
 * `name_en` stays the canonical identifier (slug derivation, SQL grouping,
 * analytics) — this helper is render-layer only. Accepts either the i18next
 * two-letter language ('uk') or an Intl locale ('uk-UA'); both resolve via a
 * case-insensitive 'uk' prefix test. Falls back to `nameEn` when the Ukrainian
 * name is absent/empty (custom categories may not carry a uk name).
 */
export function localizedCategoryName(
  cat: { readonly nameEn: string; readonly nameUk?: string | null },
  language: string,
): string {
  if (language.toLowerCase().startsWith('uk')) {
    const uk = cat.nameUk;
    if (uk != null && uk.length > 0) return uk;
  }
  return cat.nameEn;
}

// ---------------------------------------------------------------------------
// Queries
// ---------------------------------------------------------------------------

/**
 * Returns all rows from the categories table ordered by id ASC.
 */
export function listCategories(): CategoryRow[] {
  const db = getDB();
  const result = db.executeSync('SELECT id, name_en, name_uk, icon_name, emoji, parent_id, is_custom, created_at FROM categories ORDER BY id ASC');
  return result.rows.map((row) => {
    const storedEmoji = row['emoji'] as string | null | undefined;
    return {
      id: row['id'] as number,
      name_en: row['name_en'] as string,
      name_uk: row['name_uk'] as string,
      icon_name: row['icon_name'] as string,
      emoji: storedEmoji != null && storedEmoji.length > 0 ? storedEmoji : DEFAULT_CATEGORY_EMOJI,
      parent_id: row['parent_id'] as number | null,
      is_custom: row['is_custom'] as 0 | 1,
      created_at: row['created_at'] as number,
    };
  });
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
    'SELECT id, name_en, name_uk, icon_name, emoji, is_custom, slug, color FROM categories WHERE id = ? LIMIT 1',
    [id]
  );
  const row = result.rows[0];
  if (row == null) return null;

  const nameEn = row['name_en'] as string;
  const storedSlug = row['slug'] as string | null | undefined;
  const slug = storedSlug != null && storedSlug.length > 0 ? storedSlug : slugForCategoryName(nameEn);
  const storedColor = row['color'] as string | null | undefined;
  const color = storedColor != null && storedColor.length > 0 ? storedColor : colorForCategorySlug(slug);
  const storedEmoji = row['emoji'] as string | null | undefined;
  const emoji = storedEmoji != null && storedEmoji.length > 0 ? storedEmoji : emojiForSlug(slug);
  return {
    id: row['id'] as number,
    slug,
    nameEn,
    nameUk: row['name_uk'] as string,
    iconName: row['icon_name'] as string,
    emoji,
    color,
    isCustom: ((row['is_custom'] as number) ?? 0) === 1,
  };
}

// ---------------------------------------------------------------------------
// listCategoriesEnriched
// ---------------------------------------------------------------------------

/**
 * Returns every category enriched with derived slug + color, in id order.
 *
 * Phase 2 plan 02-04 added persistent `slug` + `color` columns via migration 002.
 * This function prefers the DB-stored values when present, falling back to the
 * derived helpers for any row that predates the migration on existing devices.
 */
export function listCategoriesEnriched(): readonly Category[] {
  const db = getDB();
  const result = db.executeSync(
    'SELECT id, name_en, name_uk, icon_name, emoji, parent_id, is_custom, slug, color, created_at FROM categories ORDER BY id ASC'
  );
  return result.rows.map((row) => {
    const nameEn = row['name_en'] as string;
    const storedSlug = row['slug'] as string | null | undefined;
    const slug = storedSlug != null && storedSlug.length > 0 ? storedSlug : slugForCategoryName(nameEn);
    const storedColor = row['color'] as string | null | undefined;
    const color = storedColor != null && storedColor.length > 0 ? storedColor : colorForCategorySlug(slug);
    const storedEmoji = row['emoji'] as string | null | undefined;
    const emoji = storedEmoji != null && storedEmoji.length > 0 ? storedEmoji : emojiForSlug(slug);
    return {
      id: row['id'] as number,
      slug,
      nameEn,
      nameUk: row['name_uk'] as string,
      iconName: row['icon_name'] as string,
      emoji,
      color,
      isCustom: ((row['is_custom'] as number) ?? 0) === 1,
    };
  });
}

// ---------------------------------------------------------------------------
// 02-04 mutations: insertCategory / updateCategory / deleteCategoryRow /
// bulkReassignTransactionsCategory / getMiscellaneousCategoryId
// ---------------------------------------------------------------------------

/**
 * Input shape for inserting a new (user-created) category. is_custom is forced
 * to 1 by this repo function — defaults are seeded only via migrations.
 *
 * `emoji` defaults to DEFAULT_CATEGORY_EMOJI ('📌') when omitted. The legacy
 * `icon_name` schema column is filled with the same emoji string — the column
 * is NOT NULL and retained only to avoid a destructive ALTER. Renderers no
 * longer read it.
 */
export type InsertCategoryInput = {
  readonly nameEn: string;
  readonly nameUk: string | null;
  readonly emoji?: string;
  readonly color: string;
  readonly slug: string;
};

/**
 * Inserts a new custom category row and returns the enriched Category.
 *
 * Uses parameterized executeSync — never string-interpolates user input
 * (T-02-04-01 mitigation). Slug is also user-derived via slugify but enforced
 * UNIQUE via idx_categories_slug; caller catches the UNIQUE constraint failure.
 */
export function insertCategory(input: InsertCategoryInput): Category {
  const db = getDB();
  const now = Math.floor(Date.now() / 1000);
  const emoji = input.emoji ?? DEFAULT_CATEGORY_EMOJI;
  // icon_name is the legacy NOT NULL column — backfill it with the emoji so
  // the constraint is satisfied without an extra migration; nothing reads it.
  db.executeSync(
    'INSERT INTO categories (name_en, name_uk, icon_name, emoji, parent_id, is_custom, slug, color, usage_count, created_at) VALUES (?, ?, ?, ?, NULL, 1, ?, ?, 0, ?)',
    [input.nameEn, input.nameUk ?? input.nameEn, emoji, emoji, input.slug, input.color, now]
  );
  const rowidResult = db.executeSync('SELECT last_insert_rowid() AS id');
  const newId = rowidResult.rows[0]?.['id'] as number;
  const cat = getCategoryById(newId);
  if (cat == null) {
    throw new Error('Inserted category not retrievable');
  }
  return cat;
}

/**
 * Patches an existing category. Pass `emoji` to swap the rendered glyph;
 * the (now-dead) `icon_name` column is updated in lockstep to keep legacy
 * tooling consistent until a future migration drops the column.
 */
export type UpdateCategoryPatch = {
  readonly nameEn?: string;
  readonly nameUk?: string | null;
  readonly emoji?: string;
  readonly color?: string;
  readonly slug?: string;
};

export function updateCategory(id: number, patch: UpdateCategoryPatch): Category {
  if (!Number.isInteger(id) || id <= 0) {
    throw new Error('updateCategory: invalid id');
  }
  const sets: string[] = [];
  const values: (string | number | null)[] = [];
  if (patch.nameEn !== undefined) {
    sets.push('name_en = ?');
    values.push(patch.nameEn);
  }
  if (patch.nameUk !== undefined) {
    sets.push('name_uk = ?');
    values.push(patch.nameUk);
  }
  if (patch.emoji !== undefined) {
    sets.push('emoji = ?');
    values.push(patch.emoji);
    // Mirror into the legacy NOT NULL icon_name column so future readers of
    // either column see the same glyph. Cheaper than a column drop migration.
    sets.push('icon_name = ?');
    values.push(patch.emoji);
  }
  if (patch.color !== undefined) {
    sets.push('color = ?');
    values.push(patch.color);
  }
  if (patch.slug !== undefined) {
    sets.push('slug = ?');
    values.push(patch.slug);
  }
  if (sets.length === 0) {
    const existing = getCategoryById(id);
    if (existing == null) throw new Error('updateCategory: category not found');
    return existing;
  }
  values.push(id);
  const db = getDB();
  db.executeSync(`UPDATE categories SET ${sets.join(', ')} WHERE id = ?`, values);
  const after = getCategoryById(id);
  if (after == null) throw new Error('updateCategory: row vanished');
  return after;
}

/**
 * Deletes a non-default category row. Defense-in-depth: the WHERE clause
 * enforces is_custom = 1 so even a malformed call cannot delete a default
 * category (T-02-04-02 mitigation).
 */
export function deleteCategoryRow(id: number): void {
  if (!Number.isInteger(id) || id <= 0) {
    throw new Error('deleteCategoryRow: invalid id');
  }
  const db = getDB();
  db.executeSync('DELETE FROM categories WHERE id = ? AND is_custom = 1', [id]);
}

/**
 * Reassigns all transactions from one category to another. Returns the number
 * of affected rows. Wrapped in a transaction by callers in categoryMutations.
 */
export function bulkReassignTransactionsCategory(fromCategoryId: number, toCategoryId: number): number {
  if (!Number.isInteger(fromCategoryId) || fromCategoryId <= 0) {
    throw new Error('bulkReassignTransactionsCategory: invalid fromCategoryId');
  }
  if (!Number.isInteger(toCategoryId) || toCategoryId <= 0) {
    throw new Error('bulkReassignTransactionsCategory: invalid toCategoryId');
  }
  const db = getDB();
  const result = db.executeSync(
    'UPDATE transactions SET category_id = ? WHERE category_id = ?',
    [toCategoryId, fromCategoryId]
  );
  // op-sqlite QueryResult exposes rowsAffected; fall back to 0 if absent.
  return (result as unknown as { rowsAffected?: number }).rowsAffected ?? 0;
}

/**
 * Resolves the numeric id of the Miscellaneous fallback category, used when
 * deleting a custom category to reassign its transactions. Tries 'misc' first
 * (canonical seed slug), then falls back to the literal 'miscellaneous' slug
 * for forward-compat. Throws if neither is present — the seed MUST contain
 * one of these slugs.
 */
export function getMiscellaneousCategoryId(): number {
  const db = getDB();
  // Try slug column first (post-migration 002), then the canonical name_en match.
  let result = db.executeSync(
    "SELECT id FROM categories WHERE slug = 'misc' OR slug = 'miscellaneous' LIMIT 1"
  );
  let row = result.rows[0];
  if (row == null) {
    // Pre-migration fallback: look up by name_en.
    result = db.executeSync("SELECT id FROM categories WHERE name_en = 'Other' LIMIT 1");
    row = result.rows[0];
  }
  if (row == null) {
    throw new Error('Miscellaneous category missing from seed');
  }
  return row['id'] as number;
}
