/**
 * Normalizes a raw merchant_name string to a deterministic key for exact-match lookups
 * in merchant_overrides (CONTEXT D-02).
 *
 * Algorithm:
 *   1. lowercase
 *   2. NFKD Unicode normalization (decomposes Latin diacritics into base + combining mark)
 *   3. strip combining marks (U+0300..U+036F)
 *   4. replace any character NOT in [a-z0-9, Cyrillic Ѐ-ӿ Ԁ-ԯ, whitespace] with a single space
 *   5. collapse consecutive whitespace to single space
 *   6. trim
 *   7. truncate to 64 chars (D-02 cap)
 *
 * Script coverage: Latin (after NFKD) + Cyrillic (Ukrainian/Russian) survive intact.
 * Other scripts (Arabic, Chinese, Hebrew, etc.) collapse to whitespace — acceptable
 * for v1 portfolio scope given Irish + Ukrainian ICP. Pseudonym-quality only — this
 * is not a security primitive.
 *
 * SOURCE OF TRUTH lives at apps/mobile/src/features/transactions/merchantNormalize.ts
 * (shipped by 03-02 in Wave 1). This Edge Function copy MUST stay byte-identical to
 * that mobile source — enforced by the 03-02 verification diff-gate.
 *
 * Idempotent: normalizeMerchantKey(normalizeMerchantKey(x)) === normalizeMerchantKey(x).
 */
export function normalizeMerchantKey(raw: string): string {
  return raw
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')                  // strip combining diacritical marks
    .replace(/[^a-z0-9Ѐ-ӿԀ-ԯ\s]/g, ' ')  // keep Latin alnum + Cyrillic + Cyrillic Supplement + whitespace; everything else → space
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 64);
}
