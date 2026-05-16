/**
 * NODE-ONLY test database seam. Imported exclusively by `*.test.ts` files,
 * NEVER by application code.
 *
 * Why a separate module: the app uses @op-engineering/op-sqlite (native, no
 * Node binding). Unit tests need a real SQLite engine in Node, provided by
 * better-sqlite3 via ./betterSqliteAdapter. If `openTestDB` lived in
 * ./index.ts (which the app imports for getDB), Metro would follow the
 * better-sqlite3 import and fail the iOS/Android bundle (`Unable to resolve
 * module fs`). Keeping the seam in its own module that nothing in the
 * expo-router entry graph imports is what keeps the RN bundle clean.
 *
 * Pair with ./index.ts for runMigrations / getSchemaVersion (those are
 * pure and safe to import from app + test code alike).
 */

import type { DB } from '@op-engineering/op-sqlite';

import { createNodeTestDB } from './betterSqliteAdapter';

/**
 * Opens a fresh isolated in-memory database. The legacy `name` argument is
 * accepted for call-site compatibility but ignored — each call returns a
 * brand-new `:memory:` connection, which is the isolation tests want.
 *
 * The returned object implements only the op-sqlite `executeSync` subset the
 * repositories + migration runner use; the `as unknown as DB` cast bridges to
 * the op-sqlite type without claiming full API parity (test-only).
 */
export function openTestDB(_name: string): DB {
  return createNodeTestDB() as unknown as DB;
}
