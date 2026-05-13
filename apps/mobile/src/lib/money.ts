/**
 * SOLDI money helpers.
 *
 * All amounts in the DB are stored as signed INTEGER amount_cents:
 *   negative = expense, positive = income, 0 = neutral transfer.
 *
 * Never store floats. Use toCents() at every boundary (user input, API response).
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Canonical in-memory money value. Always use integer cents for arithmetic. */
export type Money = {
  amountCents: number;
  currency: string;
};

// ---------------------------------------------------------------------------
// Conversion helpers
// ---------------------------------------------------------------------------

/**
 * Converts a decimal amount to integer cents (rounds half-up).
 * Handles binary float drift (0.1 + 0.2 → 30, not 29.999...).
 *
 * @throws {RangeError} If amount is not a finite number.
 */
export function toCents(amount: number): number {
  if (!Number.isFinite(amount)) {
    throw new RangeError(`toCents: expected finite number, got ${amount}`);
  }
  return Math.round(amount * 100);
}

/**
 * Converts integer cents back to a decimal for display purposes only.
 * Never use the result for arithmetic — always store/pass cents.
 */
export function fromCents(cents: number): number {
  return cents / 100;
}

// ---------------------------------------------------------------------------
// Parsing
// ---------------------------------------------------------------------------

/**
 * Parses a user-entered or imported amount string to a decimal number.
 *
 * Supports both locale formats:
 *   - 1,234.56  (comma-thousands, period-decimal — en-IE default)
 *   - 1 234,56  (space-thousands, comma-decimal — UA/EU style)
 *   - €1,234.56 (leading currency symbol)
 *
 * Returns null for inputs that cannot be reliably interpreted as numbers.
 * Rejects values > 1e12 (1 trillion) as implausible.
 */
export function parseAmount(input: string): number | null {
  if (typeof input !== 'string') return null;

  // Strip currency symbols, +/- (we only parse magnitude here), and leading/trailing whitespace
  let s = input.trim().replace(/[^\d.,\s-]/g, '');

  // Detect format by examining separators
  // Format A: "1,234.56" — comma is thousands separator, period is decimal
  // Format B: "1 234,56" — space is thousands separator, comma is decimal
  // Format C: "1234.56" — no thousands separator, period is decimal
  // Format D: "1234,56" — no thousands separator, comma is decimal

  let normalised: string;

  const hasSpace = /\s/.test(s);
  const commaCount = (s.match(/,/g) ?? []).length;
  const dotCount = (s.match(/\./g) ?? []).length;

  if (hasSpace) {
    // Space thousands separator: "1 234,56" or "1 234.56"
    s = s.replace(/\s+/g, '');
    if (commaCount === 1 && dotCount === 0) {
      // "123456,78" after strip → treat comma as decimal
      normalised = s.replace(',', '.');
    } else {
      // "123456.78" after strip — already standard
      normalised = s.replace(',', '');
    }
  } else if (commaCount === 1 && dotCount === 0) {
    // Only one comma: ambiguous, but most likely "1234,56" (EU decimal)
    // Distinguish "1,234" (UK thousands) from "1,23" (EU decimal) by decimal digits
    const afterComma = s.split(',')[1] ?? '';
    if (afterComma.length === 3) {
      // Could be thousands separator (e.g. "1,234") — keep as integer
      normalised = s.replace(',', '');
    } else {
      normalised = s.replace(',', '.');
    }
  } else if (commaCount >= 1 && dotCount === 1) {
    // "1,234.56" — comma is thousands separator
    normalised = s.replace(/,/g, '');
  } else if (commaCount === 1 && dotCount === 1) {
    // Handled above; fallthrough just in case
    normalised = s.replace(',', '');
  } else {
    // Strip any remaining commas and treat as standard decimal
    normalised = s.replace(/,/g, '');
  }

  const value = parseFloat(normalised);

  if (!Number.isFinite(value)) return null;
  if (Math.abs(value) > 1e12) return null;

  return value;
}

// ---------------------------------------------------------------------------
// Formatting
// ---------------------------------------------------------------------------

/**
 * Formats a Money value for display using the Intl.NumberFormat API.
 *
 * @param m      The money value (uses amountCents internally, divides by 100 for display).
 * @param locale BCP-47 locale string. Defaults to 'en-IE'.
 */
export function formatMoney(m: Money, locale: string = 'en-IE'): string {
  const amount = fromCents(m.amountCents);
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: m.currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}
