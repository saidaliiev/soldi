/**
 * leakDetector.ts — client-side defense-in-depth for CHAT-04.
 *
 * Checks whether the assistant's prose mentions any of the FactsPack's
 * merchant_key values. merchant_key is already normalized (lowercase, no
 * diacritics, Cyrillic preserved), so the check is a case-insensitive
 * substring match after lowercasing the prose.
 *
 * False-positive risk: short or generic keys (e.g., a 2-char key) could match
 * unrelated words. Mitigation: skip keys shorter than 3 chars.
 *
 * If a leak is detected, ChatBubbleAssistant replaces the bubble text with
 * chat.error_assistant_inline and logs a P0 Sentry event (Phase 5 wires SDK).
 */

import type { FactsPack } from '@services/aiQuery';

/**
 * Returns true if the assistant prose contains any FactsPack merchant_key value.
 *
 * @param prose     The assistant's raw text response.
 * @param factsPack The FactsPack used for the current chat session.
 * @returns true if a merchant_key is found in the prose (potential PII leak).
 */
export function detectMerchantLeak(prose: string, factsPack: FactsPack): boolean {
  if (!prose || !factsPack?.top_merchants_by_month?.length) return false;

  const hay = prose.toLowerCase();

  for (const entry of factsPack.top_merchants_by_month) {
    const key = entry.merchant_key;
    // Skip short keys — too many false positives (configurable threshold: 3 chars)
    if (!key || key.length < 3) continue;
    if (hay.includes(key.toLowerCase())) return true;
  }

  return false;
}
