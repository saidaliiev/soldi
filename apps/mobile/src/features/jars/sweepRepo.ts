/**
 * SOLDI sweepRepo — Phase 4 plan 04-02.
 *
 * Transactional round-up sweep writer.
 *
 * Design decisions honored:
 *   D-01 — unitCents read from jar.rule_json (default 100 = €1)
 *   D-02 — manual sweep only (no scheduler or auto-hook)
 *   D-03 — EUR expenses ONLY (amount_cents < 0 AND currency = 'EUR')
 *
 * Security (threat model T-04-02-01, T-04-02-02):
 *   - All queries use `?` parameter binding — no string-concatenated input.
 *   - Sweep query selects ONLY amount_cents, currency, created_at from transactions.
 *     merchant_name and description are NEVER read or logged (PII contract).
 *   - Production amounts are never console.log'd (use __DEV__ guard if needed).
 *
 * T-04-02-03 (repudiation mitigation): every sweep writes an auditable
 *   jar_contributions row with source='roundup' and created_at timestamp.
 *
 * T-04-02-04 (double-sweep): lastSweepAt cutoff advances after each sweep so
 *   a repeated tap contributes 0 (idempotent within the same window).
 *
 * All functions accept an optional `db` for test injection (mirrors jarsRepo idiom).
 */

import type { DB } from '@op-engineering/op-sqlite';

import { getDB } from '@/src/lib/db';
import { getJar, insertContribution, jarBalanceCents } from './jarsRepo';
import { pendingContributionCents } from './roundUp';
import type { JarRule } from './types';

// ---------------------------------------------------------------------------
// lastSweepAt
// ---------------------------------------------------------------------------

/**
 * Returns the Unix timestamp (seconds) of the last round-up sweep for the given jar.
 * Returns 0 if no round-up contributions exist yet — first sweep considers all history.
 *
 * Unit: Unix seconds — matches transactions.created_at convention (jarsRepo line 36:
 * Math.floor(Date.now() / 1000)). Do NOT store ms here or the cutoff filter
 * `transactions.created_at > ?` will never match after the first sweep.
 *
 * T-04-02-03: reads only created_at (not merchant/description).
 */
export function lastSweepAt(jarId: number, db: DB = getDB()): number {
  const result = db.executeSync(
    'SELECT MAX(created_at) AS last_at FROM jar_contributions WHERE jar_id = ? AND source = ?',
    [jarId, 'roundup'],
  );
  const row = (result.rows ?? [])[0];
  if (row == null) return 0;
  const val = row['last_at'];
  return typeof val === 'number' ? val : 0;
}

// ---------------------------------------------------------------------------
// sweepToJar
// ---------------------------------------------------------------------------

/**
 * Reads pending EUR round-up expenses since the last sweep and contributes
 * them to the jar as a single aggregate jar_contributions row.
 *
 * @param jarId  ID of the target jar.
 * @param now    Optional timestamp override (ms) — defaults to Date.now(). Used in tests.
 * @param db     Optional DB injection for tests.
 * @returns      { contributedCents, newBalanceCents }
 *               contributedCents = 0 when no pending contributions (no-op, no row inserted).
 *
 * D-02: manual invocation only — caller (JarDetailScreen) drives this on Sweep tap.
 * D-03: query filters amount_cents < 0 AND currency = 'EUR' AND created_at > cutoff.
 * T-04-02-01: all query params are bound (? placeholders, never concatenated).
 * T-04-02-02: SELECT is limited to amount_cents, currency, created_at — no PII columns.
 */
export function sweepToJar(
  jarId: number,
  now: number = Date.now(),
  db: DB = getDB(),
): { contributedCents: number; newBalanceCents: number } {
  // 1. Resolve the jar + parse rule_json for unitCents (D-01)
  const jar = getJar(jarId, db);
  if (jar == null) {
    return { contributedCents: 0, newBalanceCents: 0 };
  }

  let rule: JarRule;
  try {
    rule = JSON.parse(jar.ruleJson) as JarRule;
  } catch {
    // Malformed rule_json — fall back to €1 default (D-01)
    rule = { kind: 'roundup', unitCents: 100 };
  }
  const unitCents: 100 | 500 | 1000 =
    rule.unitCents === 500 ? 500 : rule.unitCents === 1000 ? 1000 : 100;

  // 2. Find the cutoff — last sweep timestamp for this jar (D-02 manual sweep idempotency)
  const cutoff = lastSweepAt(jarId, db);

  // 3. Query EUR expense transactions since cutoff (D-03)
  //    T-04-02-02: SELECT only amount_cents, currency, created_at — no merchant/description.
  //    T-04-02-01: cutoff bound with ? placeholder.
  const txResult = db.executeSync(
    'SELECT amount_cents, currency, created_at FROM transactions WHERE amount_cents < 0 AND currency = ? AND created_at > ?',
    ['EUR', cutoff],
  );

  const rows = (txResult.rows ?? []).map((row) => ({
    amountCents: Number(row['amount_cents'] ?? 0),
    currency: String(row['currency'] ?? ''),
  }));

  // 4. Compute pending contribution (D-03 EUR filter also enforced in pendingContributionCents)
  const contributedCents = pendingContributionCents(rows, unitCents);

  // 5. If no pending contribution, skip insert (T-04-02-04 idempotent no-op)
  if (contributedCents <= 0) {
    const newBalanceCents = jarBalanceCents(jarId, db);
    return { contributedCents: 0, newBalanceCents };
  }

  // 6. Insert ONE aggregate contribution row (T-04-02-03 auditable ledger row)
  // CR-01: store created_at as Unix seconds (Math.floor(now/1000)) to match
  // transactions.created_at convention. Storing ms caused lastSweepAt() to
  // return ~1.7e12 which is greater than every transaction's Unix-second
  // created_at (~1.7e9), making the cutoff filter match nothing on all
  // subsequent sweeps.
  insertContribution(
    {
      jarId,
      amountCents: contributedCents,
      source: 'roundup',
      txId: null, // aggregates many tx — no single tx reference
      createdAt: Math.floor(now / 1000),
    },
    db,
  );

  // 7. Return contributed + updated balance
  const newBalanceCents = jarBalanceCents(jarId, db);
  return { contributedCents, newBalanceCents };
}
