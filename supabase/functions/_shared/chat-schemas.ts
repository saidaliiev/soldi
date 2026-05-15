/**
 * zod schemas for the ai-query Edge Function (chat surface).
 *
 * All object schemas use `.strict()` to reject unknown fields at parse time —
 * this is the GDPR / CHAT-04 safety gate. Even if the client smuggles a
 * `transactions` or `description` field, zod rejects the request before
 * any LLM call reaches Anthropic.
 *
 * merchant_key in FactsPack is the normalized form (normalizeMerchantKey output),
 * not raw merchant strings. This reduces re-identification risk.
 */
import { z } from 'npm:zod@3.23.8';

// ---------------------------------------------------------------------------
// FactsPack — client-computed aggregate dataset (D-17′, D-18′, D-19′)
// ---------------------------------------------------------------------------
// Transactions live in local op-sqlite; this payload is the ONLY data that
// crosses the mobile→Edge Function boundary in Phase 3. No raw descriptions,
// no row-level transaction data, no merchant display names.

export const FactsPack = z.object({
  currency: z.enum(['EUR', 'UAH']),
  date_from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  date_to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  monthly_category_sums: z.array(z.object({
    month: z.string().regex(/^\d{4}-\d{2}$/),
    category_slug: z.string().max(64),
    sum_cents: z.number().int(),
  }).strict()).max(2000),
  top_merchants_by_month: z.array(z.object({
    month: z.string().regex(/^\d{4}-\d{2}$/),
    merchant_key: z.string().max(64),
    category_slug: z.string().max(64),
    total_cents: z.number().int(),
    count: z.number().int(),
  }).strict()).max(2000),
}).strict();

export type FactsPackType = z.infer<typeof FactsPack>;

// ---------------------------------------------------------------------------
// ChatRequest
// ---------------------------------------------------------------------------

export const ChatRequest = z.object({
  message: z.string().min(1).max(500),
  history: z.array(z.object({
    role: z.enum(['user', 'assistant']),
    text: z.string().max(2000),
  })).max(20).default([]),
  facts_pack: FactsPack,
}).strict();

export type ChatRequestType = z.infer<typeof ChatRequest>;

// ---------------------------------------------------------------------------
// Tool input — closed enum of query types (D-17′ closed SQL registry)
// ---------------------------------------------------------------------------

export const QueryType = z.enum([
  'sum_by_category',
  'count_by_category',
  'sum_by_month',
  'top_merchants',
  'compare_periods',
  'last_n_transactions_aggregate',
]);

export type QueryTypeType = z.infer<typeof QueryType>;

export const ToolInput = z.object({
  query_type: QueryType,
  filters: z.object({
    date_from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    date_to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    category_slugs: z.array(z.string()).max(10).optional(),
    currency: z.enum(['EUR', 'UAH']).optional(),
    // compare_periods variant — second date window
    compare_from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
    compare_to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  }).strict(),
}).strict();

export type ToolInputType = z.infer<typeof ToolInput>;

// ---------------------------------------------------------------------------
// QueryResult — returned by facts-runner to be fed back as tool_result
// ---------------------------------------------------------------------------

export const QueryResult = z.object({
  query_type: QueryType,
  filters_applied: ToolInput.shape.filters,
  rows: z.array(z.record(z.string(), z.union([z.string(), z.number(), z.null()]))).max(50),
  clamped_date_range: z.boolean(),
}).strict();

export type QueryResultType = z.infer<typeof QueryResult>;

// ---------------------------------------------------------------------------
// ChartPayload — Sonnet emits this in a fenced ```chart-json``` block
// ---------------------------------------------------------------------------
// color must be a token-name enum — raw hex fails parse (T-03-03-04).
// The UI-side CHART_COLOR_RESOLVER maps these to COLORS.* values.

export const ChartPayload = z.discriminatedUnion('kind', [
  z.object({
    kind: z.literal('sparkline'),
    values: z.array(z.number()).min(2).max(60),
    kpi: z.number().optional(),
    unit: z.literal('EUR').optional(),
  }).strict(),
  z.object({
    kind: z.literal('donut'),
    slices: z.array(z.object({
      label: z.string().max(40),
      value: z.number(),
      color: z.enum(['accent', 'sage', 'accentSoft', 'textMuted']),
    }).strict()).min(1).max(8),
    kpi: z.number().optional(),
    unit: z.literal('EUR').optional(),
  }).strict(),
  z.object({
    kind: z.literal('bar'),
    bars: z.array(z.object({
      label: z.string().max(40),
      value: z.number(),
    }).strict()).min(1).max(5),
    kpi: z.number().optional(),
    unit: z.literal('EUR').optional(),
  }).strict(),
]);

export type ChartPayloadType = z.infer<typeof ChartPayload>;

// ---------------------------------------------------------------------------
// ChatResponse — returned to the mobile client
// ---------------------------------------------------------------------------

export const ChatResponse = z.object({
  text: z.string().min(1).max(800),
  chart: ChartPayload.optional(),
}).strict();

export type ChatResponseType = z.infer<typeof ChatResponse>;
