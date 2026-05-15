/**
 * SOLDI Jar types — Phase 4 plan 04-01.
 *
 * Jars are local-only savings goals. A jar has a target amount, an SVG icon,
 * and a rule that governs automatic round-up sweeps (04-02 wires the sweep).
 *
 * All amounts are INTEGER cents (positive). Jar balance is derived via
 * jarBalanceCents() — sum of jar_contributions.amount_cents for the jar.
 */

// ---------------------------------------------------------------------------
// JarRule — the JSON blob stored in jars.rule_json
// ---------------------------------------------------------------------------

/**
 * Round-up rule: each expense transaction is rounded up to the nearest
 * unitCents and the difference is swept into the jar.
 *
 * Default: unitCents = 100 (€1 rounding per D-01).
 * D-04: unitCents values 100 | 500 | 1000 are the three user-selectable tiers.
 */
export type JarRule = {
  readonly kind: 'roundup';
  readonly unitCents: 100 | 500 | 1000;
};

// ---------------------------------------------------------------------------
// Jar — maps to the `jars` table row
// ---------------------------------------------------------------------------

export type Jar = {
  readonly id: number;
  readonly name: string;
  readonly targetCents: number;
  readonly icon: string;
  readonly ruleJson: string;
  readonly createdAt: number;
};

// ---------------------------------------------------------------------------
// JarContribution — maps to the `jar_contributions` table row
// ---------------------------------------------------------------------------

export type JarContribution = {
  readonly id: number;
  readonly jarId: number;
  readonly amountCents: number;
  readonly source: 'roundup' | 'manual';
  readonly txId: number | null;
  readonly createdAt: number;
};
