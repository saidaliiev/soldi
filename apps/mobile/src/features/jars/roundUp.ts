/**
 * SOLDI round-up engine — Phase 4 plan 04-02.
 *
 * Pure module: no React, no DB, no side effects.
 * node:test compatible (no RN/Skia imports).
 *
 * Design decisions honored:
 *   D-01 — configurable round-up unit: €1 / €5 / €10 (100 | 500 | 1000 cents)
 *   D-03 — EUR expenses ONLY; UAH/income never contribute
 */

// ---------------------------------------------------------------------------
// roundUpCents
// ---------------------------------------------------------------------------

/**
 * Returns the round-up contribution for a single expense transaction.
 *
 * @param amountCents  Transaction amount in integer cents (negative = expense).
 * @param unitCents    Round-up unit: 100 (€1) | 500 (€5) | 1000 (€10).
 * @returns            Cents to contribute (0 if income/transfer or already on boundary).
 *
 * D-03: income (amountCents >= 0) always returns 0 — never contributes.
 */
export function roundUpCents(
  amountCents: number,
  unitCents: 100 | 500 | 1000,
): number {
  // D-03: income/transfer (positive or zero) — never rounds up
  if (amountCents >= 0) return 0;

  const abs = Math.abs(amountCents);
  const remainder = abs % unitCents;
  return remainder === 0 ? 0 : unitCents - remainder;
}

// ---------------------------------------------------------------------------
// pendingContributionCents
// ---------------------------------------------------------------------------

/**
 * Sums the round-up contributions over a list of expense rows.
 *
 * D-03: only rows with currency === 'EUR' AND amountCents < 0 are counted.
 * UAH rows and income rows are silently excluded.
 *
 * @param expenses    Array of expense rows (from sweepRepo's DB query).
 * @param unitCents   Round-up unit: 100 | 500 | 1000.
 * @returns           Total pending contribution in integer cents.
 */
export function pendingContributionCents(
  expenses: readonly { amountCents: number; currency: string }[],
  unitCents: 100 | 500 | 1000,
): number {
  let total = 0;
  for (const row of expenses) {
    // D-03: EUR expenses only; UAH and income excluded
    if (row.currency === 'EUR' && row.amountCents < 0) {
      total += roundUpCents(row.amountCents, unitCents);
    }
  }
  return total;
}
