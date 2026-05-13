/**
 * SOLDI time helpers — UNIX seconds ↔ Date conversions.
 *
 * SQLite stores all timestamps as INTEGER unix seconds.
 * JavaScript Date objects are only created at UI/API boundaries.
 *
 * Device local timezone is used for display-side helpers (startOfDay, formatDateISODay).
 */

// ---------------------------------------------------------------------------
// Core conversions
// ---------------------------------------------------------------------------

/**
 * Current time as UNIX seconds (floor of Date.now() / 1000).
 */
export function nowSeconds(): number {
  return Math.floor(Date.now() / 1000);
}

/**
 * Converts a Date object to UNIX seconds (floor).
 */
export function toSeconds(d: Date): number {
  return Math.floor(d.getTime() / 1000);
}

/**
 * Converts UNIX seconds back to a JavaScript Date object.
 */
export function fromSeconds(s: number): Date {
  return new Date(s * 1000);
}

// ---------------------------------------------------------------------------
// Day boundary helpers
// ---------------------------------------------------------------------------

/**
 * Returns the UNIX seconds timestamp for the start of the day containing `s`,
 * in the device's local timezone (or an explicit UTC-offset timezone if
 * tzOffsetMinutes is provided).
 *
 * @param s               UNIX seconds.
 * @param tzOffsetMinutes UTC offset in minutes (e.g. 120 for UTC+2). Defaults
 *                        to the device's current timezone offset.
 */
export function startOfDaySeconds(s: number, tzOffsetMinutes?: number): number {
  const d = fromSeconds(s);

  // Use provided offset or device local TZ offset (getTimezoneOffset returns
  // the *negative* of the UTC offset, so we negate it)
  const offsetMinutes = tzOffsetMinutes ?? -d.getTimezoneOffset();

  // Shift to the target timezone to find the calendar day boundary
  const localMs = d.getTime() + offsetMinutes * 60_000;
  const startOfDayLocal = Math.floor(localMs / 86_400_000) * 86_400_000;

  // Shift back to UTC-based unix seconds
  const startOfDayUtcMs = startOfDayLocal - offsetMinutes * 60_000;
  return Math.floor(startOfDayUtcMs / 1000);
}

// ---------------------------------------------------------------------------
// Formatting
// ---------------------------------------------------------------------------

/**
 * Formats UNIX seconds as an ISO day string 'YYYY-MM-DD' in the device's
 * local timezone. Uses Date's local methods for correct DST handling.
 */
export function formatDateISODay(s: number): string {
  const d = fromSeconds(s);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}
