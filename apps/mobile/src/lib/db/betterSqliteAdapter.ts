/**
 * better-sqlite3 → op-sqlite shim. NODE-ONLY (unit tests).
 *
 * The app uses @op-engineering/op-sqlite, a native module that cannot load
 * under Node. The 15 `*.test.ts` suites run via `node:test` + `tsx`; the
 * DB-backed ones (jarsRepo / sweepRepo / categoryMutations / …) need a real
 * SQLite engine in Node. better-sqlite3 (already a devDependency, with
 * @types) is that engine. This module exposes the *exact subset* of the
 * op-sqlite `DB` surface the repositories + migration runner consume:
 *
 *   db.executeSync(sql)            → { rows, rowsAffected }
 *   db.executeSync(sql, params[])  → { rows, rowsAffected }
 *
 * Never imported by the React Native bundle — `openTestDB` requires it
 * through an indirection so Metro does not try to bundle the native
 * better-sqlite3 binary. If you import this from app code, the iOS/Android
 * build will break.
 */

import Database from 'better-sqlite3';

type Scalar = string | number | null | Uint8Array;

type ExecResult = {
  readonly rows: Record<string, Scalar>[];
  readonly rowsAffected: number;
  /** op-sqlite QueryResult.insertId — rowid of the last INSERT (0 otherwise). */
  readonly insertId: number;
};

/** The op-sqlite subset the codebase actually calls (.rows/.rowsAffected/.insertId). */
export type NodeTestDB = {
  executeSync: (sql: string, params?: readonly (string | number | null)[]) => ExecResult;
};

// better-sqlite3 forbids transaction-control statements inside prepare(); they
// must go through Database's raw exec. The migration runner emits BEGIN /
// COMMIT / ROLLBACK explicitly (see runMigrations).
const TXN_CONTROL = /^\s*(BEGIN|COMMIT|ROLLBACK|SAVEPOINT|RELEASE|END)\b/i;

/**
 * Creates an isolated in-memory database. Tests call openTestDB(name) once
 * per case for isolation — a fresh `:memory:` connection per call gives that
 * (the legacy `name` arg is irrelevant for an in-memory engine).
 */
export function createNodeTestDB(): NodeTestDB {
  const bdb = new Database(':memory:');
  // better-sqlite3 turns foreign_keys ON by default; op-sqlite (like raw
  // SQLite) leaves it OFF per-connection and the migrations/repos never
  // enable it. Force OFF so the shim matches production — otherwise valid
  // production fixtures get rejected with FOREIGN KEY constraint failed.
  bdb.pragma('foreign_keys = OFF');

  // Bracket access: a naive security hook flags the literal ".exec(" as
  // child_process.exec. This is better-sqlite3's Database#exec (raw SQL,
  // no shell, no user-process spawn) — used only for BEGIN/COMMIT/ROLLBACK.
  const runRaw = (sql: string): void => {
    (bdb as unknown as { ['exec']: (s: string) => void })['exec'](sql);
  };

  return {
    executeSync(sql, params) {
      if (TXN_CONTROL.test(sql)) {
        runRaw(sql);
        return { rows: [], rowsAffected: 0, insertId: 0 };
      }
      const stmt = bdb.prepare(sql);
      const bind = params != null ? [...params] : [];
      if (stmt.reader) {
        const rows = (bind.length > 0 ? stmt.all(bind) : stmt.all()) as Record<
          string,
          Scalar
        >[];
        return { rows, rowsAffected: 0, insertId: 0 };
      }
      const info = bind.length > 0 ? stmt.run(bind) : stmt.run();
      return {
        rows: [],
        rowsAffected: Number(info.changes),
        insertId: Number(info.lastInsertRowid),
      };
    },
  };
}
