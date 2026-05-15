/**
 * chat-payload-redaction.test.ts
 *
 * Asserts that zod strict schemas reject attempts to smuggle raw transaction
 * data across the chat boundary (CHAT-04 / T-03-03-01).
 */

import { assert, assertFalse } from 'https://deno.land/std@0.220.0/assert/mod.ts';
import { ChatRequest, FactsPack, ChartPayload } from '../../_shared/chat-schemas.ts';

// Test 1: ChatRequest with extra transactions field
Deno.test('ChatRequest strict() rejects smuggled transactions field', () => {
  const malicious = {
    message: 'How much on groceries?',
    history: [],
    facts_pack: {
      currency: 'EUR',
      date_from: '2026-01-01',
      date_to: '2026-04-30',
      monthly_category_sums: [],
      top_merchants_by_month: [],
    },
    transactions: [{ id: 1, merchant_name: 'Tesco', amount_cents: -5000 }],
  };
  const result = ChatRequest.safeParse(malicious);
  assertFalse(result.success);
});

// Test 2: FactsPack merchant entry with description field
Deno.test('FactsPack strict() rejects description field in merchant entry', () => {
  const maliciousFP = {
    currency: 'EUR',
    date_from: '2026-01-01',
    date_to: '2026-04-30',
    monthly_category_sums: [],
    top_merchants_by_month: [
      {
        month: '2026-04',
        merchant_key: 'tesco express',
        category_slug: 'groceries',
        total_cents: -12000,
        count: 8,
        description: 'raw PII',
      },
    ],
  };
  const result = FactsPack.safeParse(maliciousFP);
  assertFalse(result.success);
});

// Test 3: ChartPayload donut slice with raw hex color
Deno.test('ChartPayload donut rejects raw hex color', () => {
  const withHex = {
    kind: 'donut',
    slices: [{ label: 'groceries', value: 24750, color: '#FF0000' }],
  };
  const result = ChartPayload.safeParse(withHex);
  assertFalse(result.success);
});

// Test 4: ChartPayload with valid token color
Deno.test('ChartPayload donut accepts token color "accent"', () => {
  const valid = {
    kind: 'donut',
    slices: [{ label: 'groceries', value: 24750, color: 'accent' }],
    kpi: 247.50,
    unit: 'EUR',
  };
  const result = ChartPayload.safeParse(valid);
  assert(result.success);
});

// Test 5: Sparkline with unexpected extra field rejected by strict()
Deno.test('Regex + safeParse drops sparkline with extra color field', () => {
  const sonnetOutput = "Your spend was 247.\n\`\`\`chart-json\n{\"kind\":\"sparkline\",\"values\":[100,200,300],\"color\":\"#667EEA\"}\n\`\`\`";
  const chartMatch = /```chart-json\s*([\s\S]+?)```/.exec(sonnetOutput);
  assert(chartMatch != null);
  const chartJson = JSON.parse(chartMatch![1]!);
  const parse = ChartPayload.safeParse(chartJson);
  assertFalse(parse.success);
});

// Test 6: Valid ChatRequest accepted
Deno.test('Valid ChatRequest accepted', () => {
  const valid = {
    message: 'How much on groceries last month?',
    history: [
      { role: 'user', text: 'Hello' },
      { role: 'assistant', text: 'Hi!' },
    ],
    facts_pack: {
      currency: 'EUR',
      date_from: '2026-01-01',
      date_to: '2026-04-30',
      monthly_category_sums: [
        { month: '2026-04', category_slug: 'groceries', sum_cents: -24750 },
      ],
      top_merchants_by_month: [
        {
          month: '2026-04',
          merchant_key: 'tesco express',
          category_slug: 'groceries',
          total_cents: -12000,
          count: 8,
        },
      ],
    },
  };
  const result = ChatRequest.safeParse(valid);
  assert(result.success);
});
