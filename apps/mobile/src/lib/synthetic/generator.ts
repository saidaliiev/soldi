/**
 * SOLDI synthetic transaction generator.
 *
 * Pure function — no DB access, no side effects, no imports from @lib/db.
 * Takes a SyntheticConfig and returns a SyntheticTxRow array deterministically.
 *
 * Money sign convention (locked in 01-SKELETON):
 *   amount_cents negative = expense
 *   amount_cents positive = income (salary)
 *
 * IE:UA ratio: controlled by cfg.ieRatio (default 0.7 = 70% IE).
 * Days: cfg.days (90 by default).
 * Per-day count: uniform in [minPerDay, maxPerDay].
 * Date jitter: each transaction within a day gets randInt(0, 86399) offset.
 */

import { mulberry32, pick, randInt } from './rng';
import { categoryForMcc } from './mcc';
import { IE_MERCHANTS, UA_MERCHANTS } from './merchants';
import { toCents } from '@lib/money';
import { startOfDaySeconds } from '@lib/time';
import type { CategorySlug } from './mcc';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type SyntheticConfig = {
  /** Seed for the mulberry32 PRNG. Same seed = same output. */
  seed: number;
  /** Number of days to generate (counting back from now). */
  days: number;
  /** Minimum transactions per day. */
  minPerDay: number;
  /** Maximum transactions per day. */
  maxPerDay: number;
  /** Reference "now" in Unix seconds. Transactions are placed before this. */
  nowSeconds: number;
  /** Fraction of transactions from Irish merchants (0-1, e.g. 0.7 = 70% IE). */
  ieRatio: number;
  /**
   * Resolves a CategorySlug to its DB primary key.
   * Returns null if the slug is not in the database (e.g. categories not seeded).
   * Generator will throw if null is returned after fallback to 'misc'.
   */
  categoryIdResolver: (slug: CategorySlug) => number | null;
};

/**
 * A synthetic transaction row ready for DB insertion.
 * Mirrors the transactions table columns minus `id` (auto-increment).
 * description is always null — Phase 3 AI infers descriptions from category+merchant.
 */
export type SyntheticTxRow = {
  amount_cents: number;      // negative = expense, positive = income
  currency: 'EUR' | 'UAH';
  merchant_name: string;
  mcc_code: number;
  category_id: number;
  description: null;
  date: number;              // unix seconds
  source: 'synthetic';
  external_id: string;       // 'synthetic-{seed}-{day}-{txIndex}' — stable for idempotency
  created_at: number;
};

// ---------------------------------------------------------------------------
// Salary constants
// ---------------------------------------------------------------------------

const SALARY_MCC = 6011;
const SALARY_IE_MIN_CENTS = toCents(1800);
const SALARY_IE_MAX_CENTS = toCents(2400);
const SALARY_UA_MIN_CENTS = toCents(25000);   // UAH
const SALARY_UA_MAX_CENTS = toCents(45000);   // UAH

// ---------------------------------------------------------------------------
// Generator
// ---------------------------------------------------------------------------

/**
 * Generates a deterministic array of synthetic transactions.
 *
 * @param cfg - Configuration object including seed, days, ratios, resolver.
 * @returns Flat array of SyntheticTxRow in reverse-chronological order
 *          (most recent first). Deterministic for any given seed.
 *
 * @throws If categories are not seeded (resolver returns null for 'misc').
 */
export function generateSyntheticTransactions(cfg: SyntheticConfig): SyntheticTxRow[] {
  const {
    seed,
    days,
    minPerDay,
    maxPerDay,
    nowSeconds,
    ieRatio,
    categoryIdResolver,
  } = cfg;

  const rng = mulberry32(seed);
  const todayStart = startOfDaySeconds(nowSeconds);
  const createdAt = nowSeconds;

  /** Resolves slug → DB id, with fallback chain to 'misc'. Throws if 'misc' also missing. */
  function resolveCategoryId(slug: CategorySlug): number {
    const id = categoryIdResolver(slug);
    if (id !== null) return id;

    // Fallback to 'misc'
    const fallbackId = categoryIdResolver('misc');
    if (fallbackId !== null) return fallbackId;

    throw new Error(
      `Categories not seeded: slug '${slug}' and fallback 'misc' both returned null. ` +
        'Run runMigrations() before calling generateSyntheticTransactions().'
    );
  }

  const rows: SyntheticTxRow[] = [];

  // One salary per 30-day window; insert on day 1 and day 31 (if days >= 31)
  const salaryDays = new Set<number>();
  salaryDays.add(1);
  if (days >= 31) salaryDays.add(31);
  if (days >= 61) salaryDays.add(61);

  for (let d = 0; d < days; d++) {
    // Start of the day (d=0 = today, d=1 = yesterday, …)
    const dayStart = todayStart - d * 86400;

    // Insert salary on designated days first
    if (salaryDays.has(d)) {
      const isIE = rng() < ieRatio;
      const salaryMinCents = isIE ? SALARY_IE_MIN_CENTS : SALARY_UA_MIN_CENTS;
      const salaryMaxCents = isIE ? SALARY_IE_MAX_CENTS : SALARY_UA_MAX_CENTS;
      const salaryCents = randInt(rng, salaryMinCents, salaryMaxCents);
      const salaryCurrency: 'EUR' | 'UAH' = isIE ? 'EUR' : 'UAH';
      const salaryDate = dayStart + randInt(rng, 0, 86399);
      const salaryCategoryId = resolveCategoryId('salary');

      rows.push({
        amount_cents: salaryCents,          // positive = income
        currency: salaryCurrency,
        merchant_name: isIE ? 'Direct Deposit' : 'Банківський переказ',
        mcc_code: SALARY_MCC,
        category_id: salaryCategoryId,
        description: null,
        date: salaryDate,
        source: 'synthetic',
        external_id: `synthetic-${seed}-${d}-salary`,
        created_at: createdAt,
      });
    }

    // Regular expense transactions
    const count = randInt(rng, minPerDay, maxPerDay);

    for (let i = 0; i < count; i++) {
      const isIE = rng() < ieRatio;
      const merchantList = isIE ? IE_MERCHANTS : UA_MERCHANTS;
      const merchant = pick(rng, merchantList);

      // Amount: uniform float in [merchant.min, merchant.max], converted to cents
      const amountFloat = merchant.min + rng() * (merchant.max - merchant.min);
      const amountCents = toCents(parseFloat(amountFloat.toFixed(2)));

      const slug = categoryForMcc(merchant.mcc);
      const categoryId = resolveCategoryId(slug);

      const txDate = dayStart + randInt(rng, 0, 86399);

      rows.push({
        amount_cents: -Math.abs(amountCents),  // negative = expense (sign convention)
        currency: merchant.currency,
        merchant_name: merchant.name,
        mcc_code: merchant.mcc,
        category_id: categoryId,
        description: null,
        date: txDate,
        source: 'synthetic',
        external_id: `synthetic-${seed}-${d}-${i}`,
        created_at: createdAt,
      });
    }
  }

  return rows;
}
