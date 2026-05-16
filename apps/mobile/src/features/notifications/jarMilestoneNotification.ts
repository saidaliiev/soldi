/**
 * SOLDI jar-milestone notification — Phase 5 plan 05-02 (NOTIF-02).
 *
 * Fires exactly once per threshold crossing at 25 / 50 / 100% of jar target.
 * Called after insertContribution commits (fire-and-graceful — a notification
 * failure must never roll back or block the contribution).
 *
 * Security: body is "<pct>% of the way there" + jar name only — never the
 * absolute balance or target amount (T-05-08 mitigation).
 * Catch logs err.name only — never jar name + amount together (T-05-09 / CLAUDE.md).
 */

import * as Notifications from 'expo-notifications';

import { jarBalanceCents, getJar } from '../jars/jarsRepo';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** NOTIF-02 / ROADMAP SC#4: 25 / 50 / 100% only — do NOT add 75%. */
const MILESTONE_THRESHOLDS = [0.25, 0.5, 1.0] as const;

// ---------------------------------------------------------------------------
// checkAndFireMilestone
// ---------------------------------------------------------------------------

/**
 * Checks whether a jar contribution crossed a milestone threshold and fires
 * a single notification if so.
 *
 * @param jarId             The jar that received the contribution.
 * @param prevBalanceCents  Balance BEFORE the contribution was inserted
 *                          (captured by the caller before insertContribution).
 */
export async function checkAndFireMilestone(
  jarId: number,
  prevBalanceCents: number,
): Promise<void> {
  try {
    const jar = getJar(jarId);
    // Skip jars with no target or that no longer exist
    if (jar == null || jar.targetCents === 0) return;

    const newBalance = jarBalanceCents(jarId);
    const prevRatio = prevBalanceCents / jar.targetCents;
    const newRatio = newBalance / jar.targetCents;

    for (const threshold of MILESTONE_THRESHOLDS) {
      if (prevRatio < threshold && newRatio >= threshold) {
        const pct = Math.round(threshold * 100);
        await Notifications.scheduleNotificationAsync({
          content: {
            title: jar.name,
            // T-05-08: percentage only — never absolute balance or target amount
            body: `${pct}% of the way there`,
          },
          trigger: null, // immediate delivery
        });
        // Only one notification per contribution (first crossed threshold)
        break;
      }
    }
  } catch (err) {
    // T-05-09: log err.name only — never jar name + amount together (CLAUDE.md)
    const name = err instanceof Error ? err.name : 'UnknownError';
    if (__DEV__) console.error('jarMilestoneNotification failed:', name);
    // Never crash — contribution already committed; this is fire-and-graceful
  }
}
