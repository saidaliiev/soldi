/**
 * SOLDI dashboard feature — shared types.
 *
 * Consumed by:
 * - apps/mobile/src/data/dashboardRepo.ts (return types)
 * - apps/mobile/src/features/dashboard/donutArcs.ts (input)
 * - apps/mobile/src/features/dashboard/MonthSwiper.tsx (MonthKey)
 * - downstream plans 02-02 / 02-03 / 02-04
 *
 * Money sign convention (locked, 01-SKELETON):
 *   negative amount_cents = expense, positive = income.
 *
 * CategorySlice.amountCents stores ABSOLUTE positive cents — the absolute
 * spend in that category for the selected month. Donut + breakdown rows
 * never display a sign because the donut is by construction an expense view.
 */

export type CategorySlice = {
  readonly categoryId: number;
  readonly slug: string; // canonical English-derived slug (e.g. "eating-out", "other")
  readonly nameEn: string; // canonical identifier — slug derivation, never display-localized
  readonly nameUk: string; // Ukrainian display name (falls back to nameEn for the synthetic "Other")
  readonly color: string; // hex from D-22 swatch set; "Other" uses COLORS.textMuted
  /**
   * Single-grapheme emoji rendered next to the slice label
   * (2026-05-26 emoji-category refactor — replaces the SVG icon registry).
   * Joined from categories.emoji; synthetic "Other" slice uses the misc 📌 pin.
   */
  readonly emoji: string;
  readonly amountCents: number; // absolute, positive
  readonly percentage: number; // 0..1 of monthly expense total
};

export type MonthKey = {
  readonly year: number;
  readonly month: number; // 1..12
};

export type CategoryBreakdown = {
  readonly top: readonly CategorySlice[]; // up to 5 slices, descending by amountCents
  readonly other: CategorySlice | null; // aggregated remainder (sum of 6..N), null if no remainder
  readonly totalExpenseCents: number; // matches getMonthlyExpenseTotal()
};
