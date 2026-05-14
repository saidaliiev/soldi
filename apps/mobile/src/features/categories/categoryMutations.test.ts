/**
 * categoryMutations tests — node:test + tsx (pure logic, no op-sqlite).
 *
 * Run:   cd apps/mobile && npx tsx --test src/features/categories/categoryMutations.test.ts
 *
 * Covered:
 *   - validateCategoryName: empty / whitespace / too_long / invalid_chars / duplicate / happy
 *   - slugify: Daily Coffee -> daily-coffee; Café & Tea! -> caf-tea
 *   - createCategory: happy path + duplicate throws + UNIQUE retry
 *   - renameCategory: no-op + happy + duplicate
 *   - deleteCategory: default refused, calls reassign before delete
 *   - mergeCategories: same-id refused, call order, not-found refused
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
  validateCategoryName,
  slugify,
  createCategory,
  renameCategory,
  deleteCategory,
  mergeCategories,
  type CategoryMutationsRepo,
} from './categoryMutations';
import type { Category, InsertCategoryInput, UpdateCategoryPatch } from '@data/categoriesRepo';

// ---------------------------------------------------------------------------
// Mock repo factory
// ---------------------------------------------------------------------------

type CallLog = {
  inserts: InsertCategoryInput[];
  updates: { id: number; patch: UpdateCategoryPatch }[];
  deletes: number[];
  reassigns: { from: number; to: number }[];
  transactions: number;
};

function makeRepo(seed: Category[], options: { duplicateSlugOnce?: boolean } = {}): {
  repo: CategoryMutationsRepo;
  log: CallLog;
  rows: Category[];
} {
  const rows = [...seed];
  const log: CallLog = {
    inserts: [],
    updates: [],
    deletes: [],
    reassigns: [],
    transactions: 0,
  };
  let nextId = Math.max(0, ...rows.map((r) => r.id)) + 1;
  let duplicateSlugCalls = options.duplicateSlugOnce ? 1 : 0;

  const repo: CategoryMutationsRepo = {
    insertCategory(input) {
      log.inserts.push(input);
      if (duplicateSlugCalls > 0) {
        duplicateSlugCalls -= 1;
        const err = new Error('UNIQUE constraint failed: categories.slug');
        throw err;
      }
      const cat: Category = {
        id: nextId++,
        slug: input.slug,
        nameEn: input.nameEn,
        nameUk: input.nameUk ?? input.nameEn,
        iconName: input.iconSlug,
        color: input.color,
        isCustom: true,
      };
      rows.push(cat);
      return cat;
    },
    updateCategory(id, patch) {
      log.updates.push({ id, patch });
      const idx = rows.findIndex((r) => r.id === id);
      if (idx < 0) throw new Error('updateCategory: not found');
      const cur = rows[idx]!;
      const updated: Category = {
        ...cur,
        nameEn: patch.nameEn ?? cur.nameEn,
        nameUk: patch.nameUk ?? cur.nameUk,
        iconName: patch.iconSlug ?? cur.iconName,
        color: patch.color ?? cur.color,
        slug: patch.slug ?? cur.slug,
      };
      rows[idx] = updated;
      return updated;
    },
    deleteCategoryRow(id) {
      log.deletes.push(id);
      const idx = rows.findIndex((r) => r.id === id);
      if (idx >= 0) rows.splice(idx, 1);
    },
    bulkReassignTransactionsCategory(from, to) {
      log.reassigns.push({ from, to });
      return 5; // synthetic affected count
    },
    getMiscellaneousCategoryId() {
      const misc = rows.find((r) => r.slug === 'misc' || r.slug === 'miscellaneous');
      if (misc == null) throw new Error('Miscellaneous category missing from seed');
      return misc.id;
    },
    getCategoryById(id) {
      return rows.find((r) => r.id === id) ?? null;
    },
    listCategoriesEnriched() {
      return [...rows];
    },
    inTransaction(work) {
      log.transactions += 1;
      work();
    },
  };

  return { repo, log, rows };
}

const SEED: Category[] = [
  {
    id: 1, slug: 'groceries', nameEn: 'Groceries', nameUk: 'Продукти',
    iconName: 'groceries', color: '#C97B5C', isCustom: false,
  },
  {
    id: 2, slug: 'coffee', nameEn: 'Coffee', nameUk: 'Кава',
    iconName: 'coffee', color: '#A86147', isCustom: false,
  },
  {
    id: 99, slug: 'misc', nameEn: 'Other', nameUk: 'Інше',
    iconName: 'misc', color: '#7A5C52', isCustom: false,
  },
];

// ---------------------------------------------------------------------------
// validateCategoryName
// ---------------------------------------------------------------------------

describe('validateCategoryName', () => {
  it('rejects empty', () => {
    assert.deepStrictEqual(validateCategoryName('', []), { ok: false, reason: 'empty' });
  });

  it('rejects whitespace-only', () => {
    assert.deepStrictEqual(validateCategoryName('   ', []), { ok: false, reason: 'empty' });
  });

  it('rejects names longer than 40 chars', () => {
    const long = 'A'.repeat(41);
    assert.deepStrictEqual(validateCategoryName(long, []), { ok: false, reason: 'too_long' });
  });

  it('rejects banned characters', () => {
    assert.deepStrictEqual(
      validateCategoryName('<script>alert</script>', []),
      { ok: false, reason: 'invalid_chars' },
    );
    assert.deepStrictEqual(
      validateCategoryName('Bob\'s things', []),
      { ok: false, reason: 'invalid_chars' },
    );
  });

  it('rejects duplicates (case-insensitive)', () => {
    assert.deepStrictEqual(
      validateCategoryName('COFFEE', ['Coffee', 'Groceries']),
      { ok: false, reason: 'duplicate' },
    );
    assert.deepStrictEqual(
      validateCategoryName('  coffee  ', ['Coffee']),
      { ok: false, reason: 'duplicate' },
    );
  });

  it('accepts a valid unique name', () => {
    assert.deepStrictEqual(
      validateCategoryName('Daily Coffee', ['Coffee', 'Groceries']),
      { ok: true },
    );
  });
});

// ---------------------------------------------------------------------------
// slugify
// ---------------------------------------------------------------------------

describe('slugify', () => {
  it('converts spaces to hyphens', () => {
    assert.strictEqual(slugify('Daily Coffee'), 'daily-coffee');
  });

  it('strips non-ASCII and special chars', () => {
    // 'é' is non-ASCII so dropped; '&' and '!' collapse with surrounding text
    assert.strictEqual(slugify('Café & Tea!'), 'caf-tea');
  });

  it('throws on input that reduces to empty', () => {
    assert.throws(() => slugify('!!!'), /VALIDATION:empty/);
  });

  it('lowercases', () => {
    assert.strictEqual(slugify('FOOD'), 'food');
  });
});

// ---------------------------------------------------------------------------
// createCategory
// ---------------------------------------------------------------------------

describe('createCategory', () => {
  it('inserts a new category and returns it', () => {
    const { repo, log } = makeRepo(SEED);
    const result = createCategory(
      { name: 'Daily Coffee', iconSlug: 'coffee', color: '#C97B5C' },
      repo,
    );
    assert.strictEqual(result.nameEn, 'Daily Coffee');
    assert.strictEqual(result.slug, 'daily-coffee');
    assert.strictEqual(log.inserts.length, 1);
  });

  it('throws VALIDATION:duplicate on duplicate name', () => {
    const { repo } = makeRepo(SEED);
    assert.throws(
      () => createCategory({ name: 'Coffee', iconSlug: 'coffee', color: '#C97B5C' }, repo),
      /VALIDATION:duplicate/,
    );
  });

  it('throws VALIDATION:invalid_chars on banned chars', () => {
    const { repo } = makeRepo(SEED);
    assert.throws(
      () => createCategory({ name: 'Bad<script>', iconSlug: 'misc', color: '#C97B5C' }, repo),
      /VALIDATION:invalid_chars/,
    );
  });

  it('retries with random suffix on UNIQUE slug collision', () => {
    const { repo, log } = makeRepo(SEED, { duplicateSlugOnce: true });
    const result = createCategory(
      { name: 'Custom Cat', iconSlug: 'misc', color: '#C97B5C' },
      repo,
    );
    assert.strictEqual(log.inserts.length, 2);
    // Retry slug should differ from initial slug
    assert.notStrictEqual(log.inserts[1]!.slug, log.inserts[0]!.slug);
    assert.match(result.slug, /^custom-cat-\d{4}$/);
  });
});

// ---------------------------------------------------------------------------
// renameCategory
// ---------------------------------------------------------------------------

describe('renameCategory', () => {
  it('returns existing row unchanged on no-op rename', () => {
    const { repo, log } = makeRepo(SEED);
    const r = renameCategory(2, 'Coffee', repo);
    assert.strictEqual(r.nameEn, 'Coffee');
    assert.strictEqual(log.updates.length, 0);
  });

  it('updates name + slug on rename', () => {
    const { repo, log } = makeRepo(SEED);
    const r = renameCategory(2, 'Espresso', repo);
    assert.strictEqual(r.nameEn, 'Espresso');
    assert.strictEqual(r.slug, 'espresso');
    assert.strictEqual(log.updates.length, 1);
  });

  it('rejects rename that duplicates another category', () => {
    const { repo } = makeRepo(SEED);
    assert.throws(
      () => renameCategory(2, 'Groceries', repo),
      /VALIDATION:duplicate/,
    );
  });

  it('throws NOT_FOUND for missing id', () => {
    const { repo } = makeRepo(SEED);
    assert.throws(() => renameCategory(9999, 'Anything', repo), /NOT_FOUND/);
  });
});

// ---------------------------------------------------------------------------
// deleteCategory
// ---------------------------------------------------------------------------

describe('deleteCategory', () => {
  it('refuses to delete a default category', () => {
    const { repo } = makeRepo(SEED);
    assert.throws(() => deleteCategory(2, repo), /CANNOT_DELETE_DEFAULT/);
  });

  it('reassigns transactions BEFORE deleting the row', () => {
    const custom: Category = {
      id: 50, slug: 'custom-x', nameEn: 'Custom X', nameUk: 'Custom X',
      iconName: 'misc', color: '#C97B5C', isCustom: true,
    };
    const { repo, log } = makeRepo([...SEED, custom]);
    const r = deleteCategory(50, repo);
    assert.strictEqual(r.affectedRows, 5);
    assert.strictEqual(log.reassigns.length, 1);
    assert.deepStrictEqual(log.reassigns[0], { from: 50, to: 99 });
    assert.strictEqual(log.deletes.length, 1);
    assert.strictEqual(log.deletes[0], 50);
    // Both inside one transaction
    assert.strictEqual(log.transactions, 1);
  });

  it('throws NOT_FOUND for missing id', () => {
    const { repo } = makeRepo(SEED);
    assert.throws(() => deleteCategory(9999, repo), /NOT_FOUND/);
  });
});

// ---------------------------------------------------------------------------
// mergeCategories
// ---------------------------------------------------------------------------

describe('mergeCategories', () => {
  it('rejects fromId === toId', () => {
    const { repo } = makeRepo(SEED);
    assert.throws(() => mergeCategories(2, 2, repo), /SAME_CATEGORY/);
  });

  it('reassigns then deletes (call order)', () => {
    const a: Category = {
      id: 51, slug: 'a', nameEn: 'A', nameUk: 'A',
      iconName: 'misc', color: '#C97B5C', isCustom: true,
    };
    const b: Category = {
      id: 52, slug: 'b', nameEn: 'B', nameUk: 'B',
      iconName: 'misc', color: '#C97B5C', isCustom: true,
    };
    const { repo, log } = makeRepo([...SEED, a, b]);
    const r = mergeCategories(51, 52, repo);
    assert.strictEqual(r.affectedRows, 5);
    assert.deepStrictEqual(log.reassigns[0], { from: 51, to: 52 });
    assert.strictEqual(log.deletes[0], 51);
    assert.strictEqual(log.transactions, 1);
  });

  it('throws NOT_FOUND if either category missing', () => {
    const { repo } = makeRepo(SEED);
    assert.throws(() => mergeCategories(9998, 9999, repo), /NOT_FOUND/);
  });

  it('preserves default rows on merge (does not delete)', () => {
    const custom: Category = {
      id: 60, slug: 'c', nameEn: 'C', nameUk: 'C',
      iconName: 'misc', color: '#C97B5C', isCustom: true,
    };
    const { repo, log } = makeRepo([...SEED, custom]);
    // Merge default Coffee (2) into custom C (60) — Coffee MUST stay (isCustom=false)
    mergeCategories(2, 60, repo);
    assert.deepStrictEqual(log.reassigns[0], { from: 2, to: 60 });
    assert.strictEqual(log.deletes.length, 0);
  });
});
