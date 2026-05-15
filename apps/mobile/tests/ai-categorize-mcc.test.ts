/**
 * ai-categorize service integration-shape tests.
 *
 * Validates:
 * 1. slug → category_id resolution (happy path)
 * 2. HTTP 503 → throws 'Categorization unavailable'
 * 3. HTTP 429 → throws 'Daily AI limit reached'
 * 4. Mixed success/error rows preserved in result
 * 5. Unknown category_slug → { tx_id, error: 'unknown_category' }
 * 6. needs_review derivation — confidence < 0.75 → needs_review: true
 *
 * Network and DB are both mocked. No real HTTP calls, no op-sqlite.
 *
 * Convention mirrors apps/mobile/tests/monobank-mapper.test.ts:
 * - process.env stubs for EXPO_PUBLIC_SUPABASE_URL / ANON_KEY.
 * - jest.mock for the network layer and DB repos.
 * - Pure TypeScript, no React Native renderer.
 *
 * Run: cd apps/mobile && npx jest tests/ai-categorize-mcc.test.ts
 */

// ---- Environment stubs (must be set before any imports that read process.env) ----
process.env.EXPO_PUBLIC_SUPABASE_URL = 'https://test.supabase.co';
process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY = 'test-anon-key';

// ---- Module mocks ----

// Mock the supabase client — getSession returns a valid session
jest.mock('../src/lib/supabase', () => ({
  supabase: {},
  getSession: jest.fn().mockResolvedValue({
    access_token: 'test-jwt',
    user: { id: 'user-123' },
  }),
}));

// Mock httpJson — we control what the "Edge Function" returns
jest.mock('../src/lib/http', () => ({
  HttpError: class HttpError extends Error {
    public status: number;
    public bodyText: string;
    constructor(status: number, bodyText: string) {
      super(`HTTP ${status}: ${bodyText}`);
      this.name = 'HttpError';
      this.status = status;
      this.bodyText = bodyText;
    }
  },
  httpJson: jest.fn(),
}));

// Mock categoriesRepo — return deterministic IDs for known slugs
jest.mock('../src/data/categoriesRepo', () => ({
  getCategoryIdBySlug: (slug: string): number | null => {
    const map: Record<string, number> = {
      groceries: 1,
      'eating-out': 2,
      transport: 3,
      entertainment: 4,
      shopping: 5,
      utilities: 6,
    };
    return map[slug] ?? null;
  },
}));

// ---- Imports (after mocks) ----
import { HttpError, httpJson } from '../src/lib/http';
import { aiCategorizeBatch } from '../src/services/aiCategorize';

const mockHttpJson = httpJson as jest.MockedFunction<typeof httpJson>;

// ---- Test helpers ----
const SAMPLE_INPUT = [
  { tx_id: 1, merchant_name: 'Tesco', mcc: '5411', amount_cents: -1250 },
  { tx_id: 2, merchant_name: 'Netflix', mcc: null, amount_cents: -1299 },
];

describe('aiCategorizeBatch — slug resolution + needs_review', () => {
  beforeEach(() => {
    mockHttpJson.mockReset();
  });

  it('resolves category_slug → local category_id for a single-row success', async () => {
    mockHttpJson.mockResolvedValueOnce({
      results: [
        {
          tx_id: 1,
          category_slug: 'groceries',
          confidence: 0.9,
          needs_review: false,
          tier: 'mcc',
        },
      ],
    });

    const result = await aiCategorizeBatch([SAMPLE_INPUT[0]]);
    expect(result.results).toHaveLength(1);
    const row = result.results[0];
    expect('error' in row).toBe(false);
    if (!('error' in row)) {
      expect(row.category_id).toBe(1); // groceries → id 1 per mock
      expect(row.category_slug).toBe('groceries');
      expect(row.confidence).toBe(0.9);
      expect(row.needs_review).toBe(false);
    }
  });

  it('marks needs_review: true when confidence < 0.75 (D-11)', async () => {
    mockHttpJson.mockResolvedValueOnce({
      results: [
        {
          tx_id: 2,
          category_slug: 'eating-out',
          confidence: 0.6,
          needs_review: true,
          tier: 'llm',
        },
      ],
    });

    const result = await aiCategorizeBatch([SAMPLE_INPUT[1]]);
    const row = result.results[0];
    expect('error' in row).toBe(false);
    if (!('error' in row)) {
      expect(row.needs_review).toBe(true);
      expect(row.confidence).toBe(0.6);
    }
  });

  it('preserves needs_review: false when confidence >= 0.75', async () => {
    mockHttpJson.mockResolvedValueOnce({
      results: [
        {
          tx_id: 1,
          category_slug: 'transport',
          confidence: 0.85,
          needs_review: false,
          tier: 'mcc',
        },
      ],
    });

    const result = await aiCategorizeBatch([SAMPLE_INPUT[0]]);
    const row = result.results[0];
    if (!('error' in row)) {
      expect(row.needs_review).toBe(false);
    }
  });

  it('returns error row for unknown category_slug (T-03-01-09)', async () => {
    mockHttpJson.mockResolvedValueOnce({
      results: [
        {
          tx_id: 1,
          category_slug: 'hallucinated-category-xyz',
          confidence: 0.95,
          needs_review: false,
          tier: 'llm',
        },
      ],
    });

    const result = await aiCategorizeBatch([SAMPLE_INPUT[0]]);
    const row = result.results[0];
    expect('error' in row).toBe(true);
    if ('error' in row) {
      expect(row.error).toBe('unknown_category');
      expect(row.tx_id).toBe(1);
    }
  });

  it('preserves mixed success + error rows from the Edge Function', async () => {
    mockHttpJson.mockResolvedValueOnce({
      results: [
        {
          tx_id: 1,
          category_slug: 'groceries',
          confidence: 0.9,
          needs_review: false,
          tier: 'mcc',
        },
        { tx_id: 2, error: 'haiku_failed' },
      ],
    });

    const result = await aiCategorizeBatch(SAMPLE_INPUT);
    expect(result.results).toHaveLength(2);

    const success = result.results.find((r) => r.tx_id === 1);
    expect(success).toBeDefined();
    expect('error' in success!).toBe(false);

    const failure = result.results.find((r) => r.tx_id === 2);
    expect(failure).toBeDefined();
    expect('error' in failure!).toBe(true);
    if ('error' in failure!) {
      expect(failure.error).toBe('haiku_failed');
    }
  });
});

describe('aiCategorizeBatch — HTTP error translation', () => {
  beforeEach(() => {
    mockHttpJson.mockReset();
  });

  it('throws "Categorization unavailable" on HTTP 503', async () => {
    mockHttpJson.mockRejectedValueOnce(
      new HttpError(503, '{"error":"ai_unavailable","retry_after":60}'),
    );

    await expect(aiCategorizeBatch(SAMPLE_INPUT)).rejects.toThrow(
      'Categorization unavailable',
    );
  });

  it('throws "Daily AI limit reached" on HTTP 429', async () => {
    mockHttpJson.mockRejectedValueOnce(
      new HttpError(429, '{"error":"rate_limited"}'),
    );

    await expect(aiCategorizeBatch(SAMPLE_INPUT)).rejects.toThrow(
      'Daily AI limit reached',
    );
  });
});

describe('aiCategorizeBatch — edge cases', () => {
  it('returns empty results for empty input without any HTTP call', async () => {
    const result = await aiCategorizeBatch([]);
    expect(result.results).toHaveLength(0);
    expect(mockHttpJson).not.toHaveBeenCalled();
  });
});
