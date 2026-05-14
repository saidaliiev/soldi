/**
 * SOLDI database schema — migration 001.
 *
 * Rules (enforced by architecture):
 * - All amounts stored as INTEGER amount_cents (signed: negative=expense, positive=income).
 * - All timestamps stored as INTEGER unix seconds.
 * - No plaintext bank credentials ever stored in this DB.
 */

// ---------------------------------------------------------------------------
// SCHEMA_001: Full DDL for the initial schema
// ---------------------------------------------------------------------------

export const SCHEMA_001 = `
CREATE TABLE IF NOT EXISTS schema_meta (
  key   TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS categories (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  name_en    TEXT    NOT NULL,
  name_uk    TEXT    NOT NULL,
  icon_name  TEXT    NOT NULL,
  parent_id  INTEGER REFERENCES categories(id) ON DELETE SET NULL,
  is_custom  INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS accounts (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  name          TEXT    NOT NULL,
  balance_cents INTEGER NOT NULL DEFAULT 0,
  currency      TEXT    NOT NULL DEFAULT 'EUR',
  type          TEXT    NOT NULL CHECK (type IN ('cash','bank','card')),
  source        TEXT    NOT NULL CHECK (source IN ('synthetic','manual','monobank','csv')),
  created_at    INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS transactions (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  amount_cents  INTEGER NOT NULL,
  currency      TEXT    NOT NULL DEFAULT 'EUR',
  merchant_name TEXT    NOT NULL,
  merchant_id   TEXT,
  mcc_code      INTEGER,
  category_id   INTEGER REFERENCES categories(id) ON DELETE SET NULL,
  account_id    INTEGER REFERENCES accounts(id) ON DELETE CASCADE,
  description   TEXT,
  date          INTEGER NOT NULL,
  source        TEXT    NOT NULL CHECK (source IN ('synthetic','manual','monobank','csv')),
  external_id   TEXT,
  created_at    INTEGER NOT NULL,
  UNIQUE(source, external_id)
);

CREATE INDEX IF NOT EXISTS idx_transactions_date     ON transactions(date DESC);
CREATE INDEX IF NOT EXISTS idx_transactions_category ON transactions(category_id);
CREATE INDEX IF NOT EXISTS idx_transactions_account  ON transactions(account_id);

CREATE TABLE IF NOT EXISTS merchant_overrides (
  id               INTEGER PRIMARY KEY AUTOINCREMENT,
  merchant_pattern TEXT    NOT NULL,
  category_id      INTEGER NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
  confidence       REAL    NOT NULL DEFAULT 1.0,
  created_by_user  INTEGER NOT NULL DEFAULT 0,
  created_at       INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_merchant_overrides_pattern ON merchant_overrides(merchant_pattern)
`;

// ---------------------------------------------------------------------------
// SEED_DEFAULT_CATEGORIES: 18 default categories for migration 001
// icon_name values use Lucide icon identifiers (matched in Phase 2 icon map)
// ---------------------------------------------------------------------------

export const SEED_DEFAULT_CATEGORIES = `
INSERT INTO categories (name_en, name_uk, icon_name, parent_id, is_custom, created_at) VALUES
  ('Groceries',      'Продукти',     'shopping-cart',    NULL, 0, CAST(strftime('%s','now') AS INTEGER)),
  ('Transport',      'Транспорт',    'bus',              NULL, 0, CAST(strftime('%s','now') AS INTEGER)),
  ('Eating out',     'Заклади',      'fork-knife',       NULL, 0, CAST(strftime('%s','now') AS INTEGER)),
  ('Coffee',         'Кава',         'coffee',           NULL, 0, CAST(strftime('%s','now') AS INTEGER)),
  ('Rent',           'Оренда',       'home',             NULL, 0, CAST(strftime('%s','now') AS INTEGER)),
  ('Utilities',      'Комуналка',    'zap',              NULL, 0, CAST(strftime('%s','now') AS INTEGER)),
  ('Mobile',         'Мобільний',    'smartphone',       NULL, 0, CAST(strftime('%s','now') AS INTEGER)),
  ('Entertainment',  'Розваги',      'sparkles',         NULL, 0, CAST(strftime('%s','now') AS INTEGER)),
  ('Health',         'Здоров''я',    'heart-pulse',      NULL, 0, CAST(strftime('%s','now') AS INTEGER)),
  ('Clothing',       'Одяг',         'shirt',            NULL, 0, CAST(strftime('%s','now') AS INTEGER)),
  ('Gifts',          'Подарунки',    'gift',             NULL, 0, CAST(strftime('%s','now') AS INTEGER)),
  ('Transfers',      'Перекази',     'arrow-right-left', NULL, 0, CAST(strftime('%s','now') AS INTEGER)),
  ('Salary',         'Зарплата',     'banknote',         NULL, 0, CAST(strftime('%s','now') AS INTEGER)),
  ('Refunds',        'Повернення',   'rotate-ccw',       NULL, 0, CAST(strftime('%s','now') AS INTEGER)),
  ('Savings',        'Заощадження',  'piggy-bank',       NULL, 0, CAST(strftime('%s','now') AS INTEGER)),
  ('Kids',           'Діти',         'baby',             NULL, 0, CAST(strftime('%s','now') AS INTEGER)),
  ('Pets',           'Тварини',      'paw-print',        NULL, 0, CAST(strftime('%s','now') AS INTEGER)),
  ('Other',          'Інше',         'more-horizontal',  NULL, 0, CAST(strftime('%s','now') AS INTEGER))
`;

// ---------------------------------------------------------------------------
// SCHEMA_002: Phase 2 plan 02-04 — adds slug + color + usage_count columns
// to categories, plus backfill of slug/color for the 18 seeded rows.
// ---------------------------------------------------------------------------
//
// Why a migration: the 02-04 category editor persists user-chosen slug + color
// per category. Wave 1 (02-01) worked around the missing columns by deriving
// slug/color in the repo layer (see categoriesRepo SLUG_TO_NAME_EN + DEFAULT_
// CATEGORY_COLORS). With user-created categories now possible, we need
// persistent columns.

export const SCHEMA_002 = `
ALTER TABLE categories ADD COLUMN slug TEXT;
ALTER TABLE categories ADD COLUMN color TEXT;
ALTER TABLE categories ADD COLUMN usage_count INTEGER NOT NULL DEFAULT 0;
UPDATE categories SET slug = 'groceries',     color = '#C97B5C' WHERE name_en = 'Groceries';
UPDATE categories SET slug = 'transport',     color = '#9DA88C' WHERE name_en = 'Transport';
UPDATE categories SET slug = 'eating-out',    color = '#D9997A' WHERE name_en = 'Eating out';
UPDATE categories SET slug = 'coffee',        color = '#A86147' WHERE name_en = 'Coffee';
UPDATE categories SET slug = 'rent',          color = '#7A5C52' WHERE name_en = 'Rent';
UPDATE categories SET slug = 'utilities',     color = '#7A876A' WHERE name_en = 'Utilities';
UPDATE categories SET slug = 'mobile',        color = '#B5C0A5' WHERE name_en = 'Mobile';
UPDATE categories SET slug = 'entertainment', color = '#C97B5C' WHERE name_en = 'Entertainment';
UPDATE categories SET slug = 'health',        color = '#B85C5C' WHERE name_en = 'Health';
UPDATE categories SET slug = 'clothing',      color = '#D9997A' WHERE name_en = 'Clothing';
UPDATE categories SET slug = 'gifts',         color = '#A86147' WHERE name_en = 'Gifts';
UPDATE categories SET slug = 'transfers',     color = '#7A5C52' WHERE name_en = 'Transfers';
UPDATE categories SET slug = 'salary',        color = '#9DA88C' WHERE name_en = 'Salary';
UPDATE categories SET slug = 'refunds',       color = '#B5C0A5' WHERE name_en = 'Refunds';
UPDATE categories SET slug = 'savings',       color = '#7A876A' WHERE name_en = 'Savings';
UPDATE categories SET slug = 'kids',          color = '#C97B5C' WHERE name_en = 'Kids';
UPDATE categories SET slug = 'pets',          color = '#9DA88C' WHERE name_en = 'Pets';
UPDATE categories SET slug = 'misc',          color = '#7A5C52' WHERE name_en = 'Other';
CREATE UNIQUE INDEX IF NOT EXISTS idx_categories_slug ON categories(slug)
`;

// ---------------------------------------------------------------------------
// SCHEMA_003: Phase 3 plan 03-01 — adds AI-categorization metadata columns
// to the transactions table.
//
// Why a migration: Phase 3's ai-categorize Edge Function returns a per-row
// confidence and a needs_review flag. These columns persist that result so
// the transactions list can render the amber "needs review" dot (UI-SPEC
// §cat-feedback) and so a future bulk re-categorize pass knows when each row
// was last attempted (last_ai_attempt_at).
//
// op-sqlite has no BOOLEAN type — needs_review is INTEGER 0/1. The
// last_ai_attempt_at column is unix seconds (matches nowSeconds() helper).
//
// Columns:
//   ai_confidence       REAL    nullable     — Haiku-returned confidence 0..1
//   needs_review        INTEGER NOT NULL=0   — 1 when confidence below D-11 threshold
//   last_ai_attempt_at  INTEGER nullable     — unix seconds of last categorize attempt
// ---------------------------------------------------------------------------

export const SCHEMA_003 = `
ALTER TABLE transactions ADD COLUMN ai_confidence REAL;
ALTER TABLE transactions ADD COLUMN needs_review INTEGER NOT NULL DEFAULT 0;
ALTER TABLE transactions ADD COLUMN last_ai_attempt_at INTEGER
`;

