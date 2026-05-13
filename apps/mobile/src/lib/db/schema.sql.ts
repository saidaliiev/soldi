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
