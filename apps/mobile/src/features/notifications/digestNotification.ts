/**
 * SOLDI daily digest notification — Phase 5 plan 05-02 (NOTIF-01).
 *
 * D-03: opt-in 09:00 daily digest carrying the ACTUAL prior-day spend.
 * Because expo-notifications local calendar triggers freeze content.body at
 * schedule time (iOS never invokes a background recompute before display), the
 * body must be rebuilt fresh on every foreground. scheduleDailyDigest() is
 * therefore called:
 *   1. From DigestToggle when the user enables the feature (in-context
 *      permission first — never at launch).
 *   2. On every app foreground via the existing AppState 'active' handler in
 *      app/_layout.tsx (05-01 extended in 05-02).
 *
 * Idempotency: ALWAYS cancel the prior digest by its stable DIGEST_NOTIFICATION_ID
 * before re-scheduling — foregrounding the app repeatedly can never stack
 * duplicate 09:00 notifications (T-05-10 mitigation).
 *
 * Security: body carries one aggregate spend total (user opted in); never
 * per-merchant/per-transaction detail (T-05-07 mitigation).
 */

import * as Notifications from 'expo-notifications';

import { SchedulableTriggerInputTypes } from 'expo-notifications';
import { sumLastNDays } from '@data/transactionsRepo';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Stable identifier used for both cancel and schedule — prevents duplicates. */
export const DIGEST_NOTIFICATION_ID = 'soldi-daily-digest';

// ---------------------------------------------------------------------------
// Permission
// ---------------------------------------------------------------------------

/**
 * Requests iOS notification permission in-context (D-03: never at launch).
 * Returns true when granted.
 */
export async function requestNotificationPermission(): Promise<boolean> {
  const { status } = await Notifications.requestPermissionsAsync();
  return status === 'granted';
}

// ---------------------------------------------------------------------------
// Body builder
// ---------------------------------------------------------------------------

/**
 * Builds the editorial EB-Garamond-voice digest body (D-07 tone).
 * Zero-spend day returns the literal per D-03 — never suppressed.
 * Uses Intl.NumberFormat EUR so the amount formats correctly for the user's
 * locale (e.g. "€83" in en-IE, "83 €" in uk-UA).
 *
 * @param yesterdayCents  Absolute spend cents from sumLastNDays(1).
 * @param locale          BCP-47 locale string (default 'en-IE').
 */
export function buildDigestBody(yesterdayCents: number, locale = 'en-IE'): string {
  if (yesterdayCents === 0) {
    // D-03: zero-spend literal — must fire, never suppressed
    return 'A quiet day — nothing spent';
  }
  const formatted = new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: 'EUR',
  }).format(yesterdayCents / 100);
  // Editorial voice matching DigestCard D-07 ("NYT Money column, not fintech")
  return `Yesterday's spending added up to ${formatted}`;
}

// ---------------------------------------------------------------------------
// Scheduler
// ---------------------------------------------------------------------------

/**
 * Idempotent 09:00 daily digest scheduler.
 *
 * Always cancels the prior digest by DIGEST_NOTIFICATION_ID first — so
 * calling this on every foreground never stacks duplicates (T-05-10).
 * When enabled=false it only cancels (cleans up on opt-out).
 *
 * @param enabled  Whether the digest feature is currently enabled.
 * @param locale   Locale passed through to buildDigestBody for EUR formatting.
 */
export async function scheduleDailyDigest(
  enabled: boolean,
  locale = 'en-IE',
): Promise<void> {
  // Always cancel first — idempotent (T-05-10: no duplicate 09:00 notifications)
  try {
    await Notifications.cancelScheduledNotificationAsync(DIGEST_NOTIFICATION_ID);
  } catch {
    // Swallow "not found" — first run or already cancelled; not an error
  }

  if (!enabled) return;

  // Build body with yesterday's ACTUAL spend (D-03 — frozen at schedule time on iOS)
  const yesterdayCents = sumLastNDays(1);
  const body = buildDigestBody(yesterdayCents, locale);

  await Notifications.scheduleNotificationAsync({
    identifier: DIGEST_NOTIFICATION_ID,
    content: {
      title: 'Soldify',
      body,
    },
    trigger: {
      type: SchedulableTriggerInputTypes.DAILY,
      hour: 9,
      minute: 0,
    },
  });
}
