/**
 * dateGrouping — pure transforms for the transactions FlashList.
 *
 * Input is the array returned by `transactionsRepo.listByFilter` (already
 * sorted by `date` DESC). Output is a flat `FeedItem[]` with a header before
 * each new YYYY-MM-DD bucket carrying the daily expense subtotal.
 *
 * No React imports — all functions are deterministic and runnable under
 * node:test + tsx.
 */

import type { Transaction, FeedItem, FeedHeader } from './types';

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/**
 * Returns the UTC YYYY-MM-DD bucket for a unix-seconds timestamp.
 *
 * We use UTC (not the device timezone) because the dashboard month math also
 * works in UTC; mixing zones would mean a row could appear under different
 * dates in different views.
 */
function bucketKey(dateSec: number): string {
  const d = new Date(dateSec * 1000);
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(d.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${dd}`;
}

function dayDiffUTC(a: Date, b: Date): number {
  const aMs = Date.UTC(a.getUTCFullYear(), a.getUTCMonth(), a.getUTCDate());
  const bMs = Date.UTC(b.getUTCFullYear(), b.getUTCMonth(), b.getUTCDate());
  return Math.round((aMs - bMs) / 86_400_000);
}

// ---------------------------------------------------------------------------
// groupByDate
// ---------------------------------------------------------------------------

/**
 * Walks the (descending-date-ordered) transaction array and emits a header
 * before each new YYYY-MM-DD bucket, carrying that day's expense subtotal
 * (absolute value of summed negative `amountCents`; income excluded).
 */
export function groupByDate(transactions: readonly Transaction[]): readonly FeedItem[] {
  if (transactions.length === 0) return [];

  // First pass: subtotal per bucket. We can't emit the header upfront in a
  // single pass because the header (with its subtotal) precedes the rows.
  const subtotalByBucket = new Map<string, number>();
  for (const tx of transactions) {
    if (tx.amountCents < 0) {
      const k = bucketKey(tx.dateSec);
      subtotalByBucket.set(k, (subtotalByBucket.get(k) ?? 0) + Math.abs(tx.amountCents));
    }
  }

  const feed: FeedItem[] = [];
  let lastBucket: string | null = null;

  for (const tx of transactions) {
    const k = bucketKey(tx.dateSec);
    if (k !== lastBucket) {
      const header: FeedHeader = {
        kind: 'header',
        date: k,
        subtotalCents: subtotalByBucket.get(k) ?? 0,
      };
      feed.push(header);
      lastBucket = k;
    }
    feed.push({ kind: 'row', tx });
  }

  return feed;
}

// ---------------------------------------------------------------------------
// computeStickyIndices
// ---------------------------------------------------------------------------

/**
 * Returns the indices of header items in the flat feed — passed to
 * FlashList's `stickyHeaderIndices` prop.
 */
export function computeStickyIndices(feed: readonly FeedItem[]): readonly number[] {
  const out: number[] = [];
  for (let i = 0; i < feed.length; i++) {
    if (feed[i]!.kind === 'header') out.push(i);
  }
  return out;
}

// ---------------------------------------------------------------------------
// formatDateHeader
// ---------------------------------------------------------------------------

/**
 * Renders a YYYY-MM-DD bucket label.
 *
 *   - `today` → "Today"
 *   - `today - 1` → "Yesterday"
 *   - otherwise → Intl short weekday + day + month for the supplied locale.
 *
 * The Today/Yesterday strings are returned as English literals here. The
 * caller (DateHeader.tsx) is responsible for swapping them out for the i18n
 * translations (`t('transactions.header_today')` etc.) — this function stays
 * pure and i18n-free for testability.
 */
export function formatDateHeader(
  date: string,
  today: Date,
  locale: string,
): string {
  const [y, m, d] = date.split('-').map(Number);
  if (y == null || m == null || d == null) return date;
  const target = new Date(Date.UTC(y, m - 1, d));
  const diff = dayDiffUTC(today, target);

  if (diff === 0) return 'Today';
  if (diff === 1) return 'Yesterday';

  return new Intl.DateTimeFormat(locale, {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    timeZone: 'UTC',
  }).format(target);
}
