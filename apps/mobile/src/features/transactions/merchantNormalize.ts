/**
 * SOLDI merchant-name normalizer.
 *
 * Normalizes a raw merchant_name string to a deterministic key for exact-match
 * lookups in `merchant_overrides` (CONTEXT D-02).
 *
 * Algorithm:
 *   1. lowercase
 *   2. NFKD Unicode normalization (decomposes Latin diacritics into base + combining mark)
 *   3. strip combining marks (U+0300..U+036F)
 *   4. replace any character NOT in [a-z0-9, Cyrillic Ѐ-ӿ + Ԁ-ԯ, whitespace] with a single space
 *   5. collapse consecutive whitespace to a single space
 *   6. trim
 *   7. truncate to 64 chars (D-02 cap)
 *
 * Script coverage: Latin (after NFKD) + Cyrillic (Ukrainian / Russian / Belarusian)
 * survive intact. Other scripts (Arabic, Chinese, Hebrew, etc.) collapse to whitespace —
 * acceptable for v1 portfolio scope given the Irish + Ukrainian ICP. This is a
 * pseudonym-quality canonicalizer, NOT a security primitive.
 *
 * The Cyrillic range `Ѐ-ӿ` covers the main Cyrillic block; `Ԁ-ԯ` covers the
 * Cyrillic Supplement. Together they preserve every Ukrainian + Russian +
 * Belarusian merchant name verbatim.
 *
 * Idempotent: `normalizeMerchantKey(normalizeMerchantKey(x)) === normalizeMerchantKey(x)`.
 *
 * SOURCE OF TRUTH for normalization. The Edge Function copy at
 * `supabase/functions/_shared/normalize.ts` MUST mirror this byte-for-byte —
 * verified by a merge-time diff-gate (see 03-02 and 03-01 verification blocks).
 *
 * Phase / plan: 03 / 02 — extracted from Phase 1/2 substring-match overrides
 * during the schema rewrite to exact-match on a normalized key.
 */
export function normalizeMerchantKey(raw: string): string {
  return raw
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')                // strip combining diacritical marks
    .replace(/[^a-z0-9Ѐ-ӿԀ-ԯ\s]/g, ' ')  // keep Latin alnum + Cyrillic (Ѐ-ӿ + Ԁ-ԯ) + whitespace
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 64);
}
