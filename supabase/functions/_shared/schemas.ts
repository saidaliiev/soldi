/**
 * zod schemas for the ai-categorize Edge Function.
 *
 * All object schemas use `.strict()` to reject unknown fields at parse time —
 * this is the GDPR safety gate (T-03-01-01). Even if the client smuggles a
 * `description` or `notes` field, zod rejects the request before any LLM call.
 *
 * The HaikuPayload schema is the contract between the Edge Function and
 * Anthropic: only merchant_name + mcc + amount_sign + amount_bucket cross
 * that boundary. Raw transaction descriptions never leave the device per
 * CLAUDE.md §Security and CHAT-04.
 */
import { z } from 'npm:zod@3.23.8';

// ---------------------------------------------------------------------------
// Amount bucket helper — coarse-grained anonymized size hint for Haiku.
// ---------------------------------------------------------------------------
// Buckets are intentionally coarse so the LLM cannot infer exact spending.
// Thresholds in cents (EUR-equivalent; currency-agnostic in v1):
//   tiny   : < 5_00
//   small  : 5_00..49_99
//   medium : 50_00..199_99
//   large  : 200_00..999_99
//   huge   : >= 1000_00
export type AmountBucket = 'tiny' | 'small' | 'medium' | 'large' | 'huge';

export function bucketize(absCents: number): AmountBucket {
  if (absCents < 5_00) return 'tiny';
  if (absCents < 50_00) return 'small';
  if (absCents < 200_00) return 'medium';
  if (absCents < 1000_00) return 'large';
  return 'huge';
}

// ---------------------------------------------------------------------------
// Request shape — what the mobile client POSTs to /functions/v1/ai-categorize
// ---------------------------------------------------------------------------
// Per-tx metadata travels in the request body because the Edge Function does
// NOT have access to local op-sqlite transactions (D-17′..D-20′ FactsPack
// architecture). Description is explicitly absent from the per-tx schema and
// rejected by .strict() if smuggled in.

export const CategorizeRequestTx = z.object({
  tx_id: z.number().int().positive(),
  merchant_name: z.string().min(1).max(120),
  mcc: z.string().regex(/^\d{4}$/).nullable(),
  amount_cents: z.number().int(),
}).strict();

export const CategorizeRequest = z.object({
  transactions: z.array(CategorizeRequestTx).min(1).max(50),
}).strict();

export type CategorizeRequest = z.infer<typeof CategorizeRequest>;
export type CategorizeRequestTx = z.infer<typeof CategorizeRequestTx>;

// ---------------------------------------------------------------------------
// Haiku payload — what crosses the wire to Anthropic per row
// ---------------------------------------------------------------------------
// .strict() means any extra field (e.g. description, notes, raw_data) is
// rejected during parse. Defense in depth alongside the explicit field
// selection at construction time.

export const HaikuPayload = z.object({
  merchant_name: z.string().min(1).max(120),
  mcc: z.string().regex(/^\d{4}$/).nullable(),
  amount_sign: z.enum(['expense', 'income']),
  amount_bucket: z.enum(['tiny', 'small', 'medium', 'large', 'huge']),
}).strict();

export type HaikuPayload = z.infer<typeof HaikuPayload>;

// ---------------------------------------------------------------------------
// Haiku response — what Anthropic returns per row (tool-use forced)
// ---------------------------------------------------------------------------

export const HaikuResponse = z.object({
  category_slug: z.string().min(1).max(64),
  confidence: z.number().min(0).max(1),
  rationale: z.string().max(200).optional(),
}).strict();

export type HaikuResponse = z.infer<typeof HaikuResponse>;

// ---------------------------------------------------------------------------
// Edge Function response shape (returned to the mobile client)
// ---------------------------------------------------------------------------
// category_slug travels (not category_id) because the Edge Function does not
// have access to the local op-sqlite categories table. The client-side
// aiCategorize.ts resolves slug → id via categoriesRepo.getCategoryIdBySlug.

export type AiCategorizeBatchResult = {
  results: Array<
    | {
        tx_id: number;
        category_slug: string;
        confidence: number;
        needs_review: boolean;
        tier: 'override' | 'mcc' | 'llm';
      }
    | { tx_id: number; error: string }
  >;
};
