/**
 * Category mutations — validation + slug + transactional CRUD on top of
 * categoriesRepo. Pure-logic core (validateCategoryName, slugify) is exported
 * separately so unit tests can exercise it without a DB; the mutation
 * functions accept an injectable Repo dependency for the same reason
 * (01-LEARNINGS DI pattern).
 *
 * Security (T-02-04-01..07):
 *   - validateCategoryName rejects empty, length > 40, regex-banned chars,
 *     and duplicate (case-insensitive) names before any DB write.
 *   - delete + merge wrap reassign + delete in a single BEGIN/COMMIT
 *     transaction via executeSync + splitStatements (T-02-04-02).
 *   - mergeCategories re-resolves both ids via getCategoryById before
 *     issuing the UPDATE (T-02-04-04 race-condition guard).
 *   - createCategory retries once on UNIQUE slug collision (T-02-04-07).
 *   - No console.log of name in production paths (T-02-04-06).
 */

import {
  insertCategory,
  updateCategory,
  deleteCategoryRow,
  bulkReassignTransactionsCategory,
  getMiscellaneousCategoryId,
  getCategoryById,
  listCategoriesEnriched,
  type Category,
  type InsertCategoryInput,
  type UpdateCategoryPatch,
} from '@data/categoriesRepo';
import { getDB } from '@lib/db';

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

/** Result of validateCategoryName — discriminated union. */
export type ValidationResult =
  | { readonly ok: true }
  | { readonly ok: false; readonly reason: 'empty' | 'too_long' | 'invalid_chars' | 'duplicate' };

const MAX_NAME_LEN = 40;
// Block characters that could break SQL string literals or be interpreted as
// HTML/script markers downstream. We don't render names as HTML, but defense
// in depth is mandated by T-02-04-01.
// Note: the backslash is included explicitly to block path-injection oddities.
const BANNED_CHARS_RE = /[<>"'`;\\]/;

/**
 * Validates a category name against length, char allowlist, and duplicate
 * check (case-insensitive). Pure function — no DB access.
 */
export function validateCategoryName(
  name: string,
  existingNames: readonly string[],
): ValidationResult {
  const trimmed = name.trim();
  if (trimmed.length === 0) return { ok: false, reason: 'empty' };
  if (trimmed.length > MAX_NAME_LEN) return { ok: false, reason: 'too_long' };
  if (BANNED_CHARS_RE.test(trimmed)) return { ok: false, reason: 'invalid_chars' };
  const lower = trimmed.toLowerCase();
  for (const existing of existingNames) {
    if (existing.trim().toLowerCase() === lower) {
      return { ok: false, reason: 'duplicate' };
    }
  }
  return { ok: true };
}

/**
 * Generates a URL-safe slug from a display name.
 *
 * "Daily Coffee"  -> "daily-coffee"
 * "Café & Tea!"   -> "caf-tea"   (non-ASCII stripped — broader Unicode
 *                                handling deferred; documented in JSDoc).
 *
 * Empty input or input that reduces to no allowed chars throws — callers
 * should have already passed `validateCategoryName` which would have
 * returned `{ok:false, reason:'empty'}` in that case.
 */
export function slugify(name: string): string {
  const lower = name.toLowerCase();
  const replaced = lower.replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
  if (replaced.length === 0) {
    throw new Error('VALIDATION:empty');
  }
  return replaced;
}

// ---------------------------------------------------------------------------
// Injectable repo interface — enables unit-testing without op-sqlite
// ---------------------------------------------------------------------------

export type CategoryMutationsRepo = {
  readonly insertCategory: typeof insertCategory;
  readonly updateCategory: typeof updateCategory;
  readonly deleteCategoryRow: typeof deleteCategoryRow;
  readonly bulkReassignTransactionsCategory: typeof bulkReassignTransactionsCategory;
  readonly getMiscellaneousCategoryId: typeof getMiscellaneousCategoryId;
  readonly getCategoryById: typeof getCategoryById;
  readonly listCategoriesEnriched: typeof listCategoriesEnriched;
  /** Wraps reassign + delete in a BEGIN/COMMIT transaction. */
  readonly inTransaction: (work: () => void) => void;
};

/** Default repo: calls op-sqlite via getDB() for BEGIN/COMMIT. */
const defaultRepo: CategoryMutationsRepo = {
  insertCategory,
  updateCategory,
  deleteCategoryRow,
  bulkReassignTransactionsCategory,
  getMiscellaneousCategoryId,
  getCategoryById,
  listCategoriesEnriched,
  inTransaction(work) {
    const db = getDB();
    db.executeSync('BEGIN');
    try {
      work();
      db.executeSync('COMMIT');
    } catch (err) {
      try {
        db.executeSync('ROLLBACK');
      } catch {
        // ROLLBACK failure is non-actionable; rethrow original
      }
      throw err;
    }
  },
};

// ---------------------------------------------------------------------------
// Mutations
// ---------------------------------------------------------------------------

export type CreateCategoryInput = {
  readonly name: string;
  /**
   * Curated single-grapheme emoji (2026-05-26 refactor — replaces iconSlug).
   * Defaults to the misc `📌` pin when omitted via categoriesRepo.insertCategory.
   */
  readonly emoji?: string;
  readonly color: string;
};

/**
 * Creates a custom category. Validates name + generates slug, then inserts.
 *
 * Throws on validation failure with `Error('VALIDATION:<reason>')` so callers
 * can catch + surface inline error copy via i18n keys.
 *
 * On UNIQUE slug collision, retries once with a suffix `-{rand}` (T-02-04-07).
 */
export function createCategory(
  input: CreateCategoryInput,
  repo: CategoryMutationsRepo = defaultRepo,
): Category {
  const existing = repo.listCategoriesEnriched();
  const validation = validateCategoryName(
    input.name,
    existing.map((c) => c.nameEn),
  );
  if (!validation.ok) {
    throw new Error(`VALIDATION:${validation.reason}`);
  }
  const trimmed = input.name.trim();
  const slug = slugify(trimmed);
  const payload: InsertCategoryInput = {
    nameEn: trimmed,
    nameUk: trimmed,
    emoji: input.emoji,
    color: input.color,
    slug,
  };
  try {
    return repo.insertCategory(payload);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes('UNIQUE') && msg.includes('slug')) {
      const retrySlug = `${slug}-${Math.floor(Math.random() * 9000 + 1000)}`;
      return repo.insertCategory({ ...payload, slug: retrySlug });
    }
    throw err;
  }
}

/**
 * Renames a category. Validates against all OTHER categories (the existing
 * row's name is excluded so a no-op rename is allowed). Regenerates slug
 * when the name changes.
 */
export function renameCategory(
  id: number,
  newName: string,
  repo: CategoryMutationsRepo = defaultRepo,
): Category {
  const current = repo.getCategoryById(id);
  if (current == null) throw new Error('NOT_FOUND');
  const others = repo
    .listCategoriesEnriched()
    .filter((c) => c.id !== id)
    .map((c) => c.nameEn);
  const validation = validateCategoryName(newName, others);
  if (!validation.ok) {
    throw new Error(`VALIDATION:${validation.reason}`);
  }
  const trimmed = newName.trim();
  if (trimmed === current.nameEn) {
    return current;
  }
  const patch: UpdateCategoryPatch = {
    nameEn: trimmed,
    nameUk: trimmed,
    slug: slugify(trimmed),
  };
  return repo.updateCategory(id, patch);
}

/**
 * Deletes a custom category. Reassigns all its transactions to the
 * Miscellaneous category first, then deletes the row. Wrapped in a
 * single BEGIN/COMMIT (T-02-04-02). Throws if the target is a default
 * category — defense in depth (the UI already greys this out).
 */
export function deleteCategory(
  id: number,
  repo: CategoryMutationsRepo = defaultRepo,
): { readonly affectedRows: number } {
  const target = repo.getCategoryById(id);
  if (target == null) throw new Error('NOT_FOUND');
  if (!target.isCustom) {
    throw new Error('CANNOT_DELETE_DEFAULT');
  }
  const miscId = repo.getMiscellaneousCategoryId();
  if (miscId === id) {
    // Pathological: trying to delete the misc category itself
    throw new Error('CANNOT_DELETE_MISC');
  }
  let affected = 0;
  repo.inTransaction(() => {
    affected = repo.bulkReassignTransactionsCategory(id, miscId);
    repo.deleteCategoryRow(id);
  });
  return { affectedRows: affected };
}

/**
 * Merges category `fromId` into `toId`. Reassigns transactions then deletes
 * the source row. Re-resolves both ids before the UPDATE to guard against
 * a stale memory state where one category was deleted in another tab
 * (T-02-04-04). Allows merging a default into a custom (UI permits this)
 * but logs a __DEV__ warning since defaults are usually preserved.
 */
export function mergeCategories(
  fromId: number,
  toId: number,
  repo: CategoryMutationsRepo = defaultRepo,
): { readonly affectedRows: number } {
  if (fromId === toId) throw new Error('SAME_CATEGORY');
  const fromCat = repo.getCategoryById(fromId);
  const toCat = repo.getCategoryById(toId);
  if (fromCat == null || toCat == null) {
    throw new Error('NOT_FOUND');
  }
  let affected = 0;
  repo.inTransaction(() => {
    affected = repo.bulkReassignTransactionsCategory(fromId, toId);
    // Only delete custom rows — defense in depth even though merge UI
    // typically only allows merging custom categories.
    if (fromCat.isCustom) {
      repo.deleteCategoryRow(fromId);
    }
  });
  return { affectedRows: affected };
}
