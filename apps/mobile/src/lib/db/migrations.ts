/**
 * SOLDI database migration list.
 *
 * Each entry specifies a monotonic integer version and the SQL to apply
 * when upgrading from (version - 1) to version. The runMigrations() function
 * in index.ts drives this array using PRAGMA user_version as the checkpoint.
 *
 * Rules:
 * - Entries MUST be ordered by version ascending.
 * - Each version MUST appear exactly once.
 * - SQL MUST be idempotent when wrapped with CREATE TABLE IF NOT EXISTS /
 *   CREATE INDEX IF NOT EXISTS patterns (already satisfied by schema.sql.ts).
 */

import { SCHEMA_001, SCHEMA_002, SCHEMA_003, SEED_DEFAULT_CATEGORIES } from './schema.sql';

export type Migration = {
  readonly version: number;
  readonly sql: string;
};

/**
 * Ordered list of all migrations. runMigrations() iterates this array and
 * applies each entry whose version exceeds the current PRAGMA user_version.
 */
export const MIGRATIONS: readonly Migration[] = [
  {
    version: 1,
    sql: SCHEMA_001 + ';\n' + SEED_DEFAULT_CATEGORIES,
  },
  {
    // Phase 2 plan 02-04 — categories.slug / color / usage_count columns
    // + backfill of the 18 seeded rows. See SCHEMA_002 in schema.sql.ts.
    version: 2,
    sql: SCHEMA_002,
  },
  {
    // Phase 3 plan 03-01 — transactions AI columns
    // (ai_confidence, needs_review, last_ai_attempt_at). See SCHEMA_003.
    // 03-02 owns version 4 (merchant_overrides v2 rewrite); both ship in Wave 1.
    version: 3,
    sql: SCHEMA_003,
  },
] as const;
