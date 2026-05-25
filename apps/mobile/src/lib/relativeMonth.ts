/**
 * Relative-month helpers — Sprint E5.
 *
 * Locale-correct month labels for chat suggestion pills (and any other
 * surface that needs "this month" / "last month" rendered as a real name).
 * Canned prompts that hard-code "May" go stale on June 1 — these helpers
 * resolve at render-time against `new Date()` and the user's i18n locale,
 * so the pills stay current forever.
 *
 * Pure — no React, no DB, no Intl side effects. The companion DB lookup
 * (top-spending category for the current month) lives in the chat feature
 * so this module stays storage-agnostic and unit-testable.
 */

export type MonthOffset = number;

/**
 * Returns the month name `offset` months from today, formatted per `locale`.
 *
 * Examples (today = 2026-05-25, locale='en-IE'):
 *   getRelativeMonthLabel(0,  'en-IE') → 'May'
 *   getRelativeMonthLabel(-1, 'en-IE') → 'April'
 *   getRelativeMonthLabel(-1, 'uk-UA') → 'квітень'
 *
 * `today` is parameterised for tests; production callers pass nothing.
 */
export function getRelativeMonthLabel(
  offset: MonthOffset,
  locale: string,
  today: Date = new Date(),
): string {
  // Use day=1 + setMonth to avoid month-skew on 31st (e.g. May 31 -1mo ≠ Apr 31).
  const d = new Date(today.getFullYear(), today.getMonth() + offset, 1);
  return new Intl.DateTimeFormat(locale, { month: 'long' }).format(d);
}
