/**
 * ai-query Edge Function — SOLDI chat assistant backed by Claude Sonnet 4.6.
 *
 * Stream decision (D-CD): Phase 3 ships NON-STREAMING chat. Sonnet returns
 * the full response in one shot. Streaming deferred to a future polish pass.
 *
 * FactsPack architecture (D-17 to D-20): Transactions live in local op-sqlite.
 * Mobile client builds a FactsPack (aggregate-only) and ships it with each
 * chat request. No remote Postgres transaction query in Phase 3.
 *
 * Security: Zero console.log of message body or factsPack contents (T-03-03-09).
 */

import { serve } from 'https://deno.land/std@0.220.0/http/server.ts';
import { createClient } from 'jsr:@supabase/supabase-js@2';
import Anthropic from 'npm:@anthropic-ai/sdk@0.32.1';

import {
  ChatRequest,
  ChatResponse,
  ToolInput,
  ChartPayload,
} from '../_shared/chat-schemas.ts';
import { CHAT_SYSTEM_PROMPT } from '../_shared/chat-prompts.ts';
import { QUERY_SHAPES, clampDateRange } from '../_shared/facts-runner.ts';
import { buildCorsHeaders } from '../_shared/cors.ts';

const QUERY_AGGREGATES_TOOL = {
  name: 'query_aggregates',
  description: "Read aggregate spending data from the user's FactsPack.",
  input_schema: {
    type: 'object',
    properties: {
      query_type: {
        type: 'string',
        enum: [
          'sum_by_category',
          'count_by_category',
          'sum_by_month',
          'top_merchants',
          'compare_periods',
          'last_n_transactions_aggregate',
        ],
      },
      filters: {
        type: 'object',
        properties: {
          date_from: { type: 'string', pattern: '^\\d{4}-\\d{2}-\\d{2}$' },
          date_to: { type: 'string', pattern: '^\\d{4}-\\d{2}-\\d{2}$' },
          category_slugs: { type: 'array', items: { type: 'string' }, maxItems: 10 },
          currency: { type: 'string', enum: ['EUR', 'UAH'] },
          compare_from: { type: 'string', pattern: '^\\d{4}-\\d{2}-\\d{2}$' },
          compare_to: { type: 'string', pattern: '^\\d{4}-\\d{2}-\\d{2}$' },
        },
        required: ['date_from', 'date_to'],
        additionalProperties: false,
      },
    },
    required: ['query_type', 'filters'],
    additionalProperties: false,
  },
} as const;

serve(async (req: Request): Promise<Response> => {
  const cors = buildCorsHeaders(req);
  const corsResponse = (body: string, status: number): Response =>
    new Response(body, {
      status,
      headers: { ...cors, 'Content-Type': 'application/json' },
    });

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: cors });
  }
  if (req.method !== 'POST') {
    return corsResponse(JSON.stringify({ error: 'method_not_allowed' }), 405);
  }

  const authHeader = req.headers.get('Authorization');
  if (!authHeader) {
    return corsResponse(JSON.stringify({ error: 'missing_authorization' }), 401);
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY');
  const anthropicKey = Deno.env.get('ANTHROPIC_API_KEY');

  if (!supabaseUrl || !supabaseAnonKey) {
    return corsResponse(JSON.stringify({ error: 'server_misconfigured' }), 500);
  }
  if (!anthropicKey) {
    return corsResponse(JSON.stringify({ error: 'ai_unavailable' }), 503);
  }

  let rawBody: unknown;
  try {
    rawBody = await req.json();
  } catch {
    return corsResponse(JSON.stringify({ error: 'invalid_json' }), 400);
  }

  const parseResult = ChatRequest.safeParse(rawBody);
  if (!parseResult.success) {
    return corsResponse(
      JSON.stringify({ error: 'invalid_input', detail: parseResult.error.message }),
      400,
    );
  }

  const { message, history, facts_pack } = parseResult.data;

  // D-19 user JWT client (vestigial Phase 3; for JWT-authn + Phase 4 merchant_overrides)
  const _userClient = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: authHeader } },
  });

  const anthropic = new Anthropic({ apiKey: anthropicKey });

  const today = new Date().toISOString().slice(0, 10);
  const systemPrompt = `${CHAT_SYSTEM_PROMPT}\n\nToday is ${today}. The user's data covers ${facts_pack.date_from} to ${facts_pack.date_to} in ${facts_pack.currency}.`;

  type MsgContent = string | Array<{ type: string; [key: string]: unknown }>;
  type AnthropicMsg = { role: 'user' | 'assistant'; content: MsgContent };

  const messages: AnthropicMsg[] = [
    ...history.map((h) => ({ role: h.role as 'user' | 'assistant', content: h.text })),
    { role: 'user', content: message },
  ];

  const MAX_ITERATIONS = 3;
  let finalText: string | null = null;

  try {
    for (let iter = 0; iter < MAX_ITERATIONS; iter++) {
      // deno-lint-ignore no-explicit-any
      const response = await (anthropic.messages.create as any)({
        model: 'claude-sonnet-4-6',
        max_tokens: 1024,
        system: systemPrompt,
        tools: [QUERY_AGGREGATES_TOOL],
        tool_choice: { type: 'auto' },
        messages,
      });

      if (response.stop_reason === 'end_turn') {
        const tb = response.content.find((b: { type: string }) => b.type === 'text') as
          | { type: 'text'; text: string }
          | undefined;
        finalText = tb?.text ?? null;
        break;
      }

      if (response.stop_reason === 'tool_use') {
        const toolBlocks = response.content.filter(
          (b: { type: string }) => b.type === 'tool_use',
        ) as Array<{ type: 'tool_use'; id: string; name: string; input: unknown }>;

        if (toolBlocks.length === 0) {
          const tb = response.content.find((b: { type: string }) => b.type === 'text') as
            | { type: 'text'; text: string }
            | undefined;
          finalText = tb?.text ?? null;
          break;
        }

        messages.push({ role: 'assistant', content: response.content });

        const toolResults: Array<{ type: 'tool_result'; tool_use_id: string; content: string }> = [];

        for (const tb of toolBlocks) {
          const inputParse = ToolInput.safeParse(tb.input);
          if (!inputParse.success) {
            toolResults.push({
              type: 'tool_result',
              tool_use_id: tb.id,
              content: JSON.stringify({ error: 'invalid_tool_input' }),
            });
            continue;
          }

          const { query_type, filters } = inputParse.data;
          const { date_from, date_to, clamped } = clampDateRange(filters.date_from, filters.date_to);
          const clampedFilters = { ...filters, date_from, date_to };

          const queryFn = QUERY_SHAPES[query_type];
          const queryResult = queryFn(facts_pack, clampedFilters);
          if (clamped) queryResult.clamped_date_range = true;

          toolResults.push({
            type: 'tool_result',
            tool_use_id: tb.id,
            content: JSON.stringify(queryResult),
          });
        }

        messages.push({ role: 'user', content: toolResults });
        continue;
      }

      const tb = response.content.find((b: { type: string }) => b.type === 'text') as
        | { type: 'text'; text: string }
        | undefined;
      finalText = tb?.text ?? null;
      break;
    }

    if (finalText === null) {
      finalText = "I couldn't compose a complete answer; try rephrasing.";
    }
  } catch (err) {
    const status = (err as { status?: number }).status;
    if (status != null && (status >= 500 || status === 429)) {
      return corsResponse(JSON.stringify({ error: 'ai_unavailable' }), 503);
    }
    return corsResponse(JSON.stringify({ error: 'ai_unavailable' }), 503);
  }

  let chart: ReturnType<typeof ChartPayload.parse> | undefined;
  let cleanText = finalText;

  const chartMatch = /```chart-json\s*([\s\S]+?)```/.exec(finalText);
  if (chartMatch) {
    cleanText = finalText.replace(/```chart-json\s*[\s\S]+?```/, '').trim();
    try {
      const chartJson = JSON.parse(chartMatch[1]!);
      const chartParse = ChartPayload.safeParse(chartJson);
      if (chartParse.success) chart = chartParse.data;
    } catch { /* drop chart silently */ }
  }

  if (!cleanText || cleanText.trim().length === 0) {
    cleanText = "I couldn't compose a complete answer; try rephrasing.";
  }
  if (cleanText.length > 800) cleanText = cleanText.slice(0, 797) + '...';

  const finalResponse = ChatResponse.safeParse({ text: cleanText, chart });
  if (!finalResponse.success) {
    return corsResponse(JSON.stringify({ text: cleanText }), 200);
  }

  return corsResponse(JSON.stringify(finalResponse.data), 200);
});
