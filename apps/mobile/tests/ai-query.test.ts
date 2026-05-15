/**
 * ai-query.test.ts — integration-shape tests for the aiQuery service.
 *
 * Note: No jest harness in this project — see leakDetector.test.ts header.
 * Authored per plan; type-checked via `npx tsc --noEmit`.
 *
 * Analog: apps/mobile/tests/monobank-mapper.test.ts
 */

import { aiQuery } from '../src/services/aiQuery';
import { HttpError } from '../src/lib/http';

// Mock dependencies
jest.mock('../src/lib/supabase', () => ({
  getSession: jest.fn(() =>
    Promise.resolve({ access_token: 'mock-token' }),
  ),
}));

// Mock httpJson so we can inspect what gets sent and control the response
const mockHttpJson = jest.fn();
jest.mock('../src/lib/http', () => {
  const actual = jest.requireActual('../src/lib/http');
  return {
    ...actual,
    httpJson: (...args: unknown[]) => mockHttpJson(...args),
  };
});

// Minimal FactsPack fixture
const MOCK_FACTS_PACK = {
  currency: 'EUR' as const,
  date_from: '2026-04-01',
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
};

beforeEach(() => {
  jest.clearAllMocks();
  process.env.EXPO_PUBLIC_SUPABASE_URL = 'https://test.supabase.co';
});

describe('aiQuery', () => {
  it('returns ChatResponse on success with chart', async () => {
    const mockResponse = {
      text: 'You spent €247.50 on groceries in April.',
      chart: {
        kind: 'sparkline' as const,
        values: [100, 150, 247],
        kpi: 247.5,
        unit: 'EUR' as const,
      },
    };
    mockHttpJson.mockResolvedValueOnce(mockResponse);

    const result = await aiQuery({
      message: 'How much on groceries?',
      history: [],
      factsPack: MOCK_FACTS_PACK,
    });

    expect(result.text).toBe('You spent €247.50 on groceries in April.');
    expect(result.chart).toBeDefined();
    expect(result.chart!.kind).toBe('sparkline');
  });

  it('includes facts_pack in the request body', async () => {
    mockHttpJson.mockResolvedValueOnce({ text: 'Answer.' });

    await aiQuery({
      message: 'Test',
      history: [],
      factsPack: MOCK_FACTS_PACK,
    });

    expect(mockHttpJson).toHaveBeenCalledWith(
      expect.stringContaining('/functions/v1/ai-query'),
      expect.objectContaining({
        body: expect.stringContaining('facts_pack'),
      }),
    );
  });

  it('throws "Service unavailable" on HTTP 503', async () => {
    mockHttpJson.mockRejectedValueOnce(new HttpError(503, 'Service Unavailable'));

    await expect(
      aiQuery({ message: 'Test', history: [], factsPack: MOCK_FACTS_PACK }),
    ).rejects.toThrow('Service unavailable');
  });

  it('throws "Timeout" on HTTP 408', async () => {
    mockHttpJson.mockRejectedValueOnce(new HttpError(408, 'Request Timeout'));

    await expect(
      aiQuery({ message: 'Test', history: [], factsPack: MOCK_FACTS_PACK }),
    ).rejects.toThrow('Timeout');
  });

  it('throws "Daily limit reached" on HTTP 429', async () => {
    mockHttpJson.mockRejectedValueOnce(new HttpError(429, 'Too Many Requests'));

    await expect(
      aiQuery({ message: 'Test', history: [], factsPack: MOCK_FACTS_PACK }),
    ).rejects.toThrow('Daily limit reached');
  });
});
