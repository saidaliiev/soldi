/**
 * ai-categorize service tests — supabase client bootstrap + env-var guard.
 *
 * Uses jest.isolateModules so each test case gets a fresh module registry
 * (the supabase singleton throws on import when env vars are absent).
 *
 * Convention mirrors apps/mobile/tests/monobank-mapper.test.ts:
 * - Pure TypeScript, no React Native renderer.
 * - process.env stubs for env var control.
 * - jest.mock for network isolation.
 *
 * Run: cd apps/mobile && npx jest tests/ai-categorize-service.test.ts
 */

describe('supabase client bootstrap', () => {
  const ORIGINAL_ENV = process.env;

  beforeEach(() => {
    // Clone env so we can mutate without polluting other tests
    process.env = { ...ORIGINAL_ENV };
    jest.resetModules();
  });

  afterEach(() => {
    process.env = ORIGINAL_ENV;
    jest.resetModules();
  });

  it('throws on import when EXPO_PUBLIC_SUPABASE_URL is missing', () => {
    delete process.env.EXPO_PUBLIC_SUPABASE_URL;
    process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY = 'test-anon-key';

    expect(() => {
      jest.isolateModules(() => {
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        require('../src/lib/supabase');
      });
    }).toThrow('EXPO_PUBLIC_SUPABASE_URL');
  });

  it('throws on import when EXPO_PUBLIC_SUPABASE_ANON_KEY is missing', () => {
    process.env.EXPO_PUBLIC_SUPABASE_URL = 'https://test.supabase.co';
    delete process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

    expect(() => {
      jest.isolateModules(() => {
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        require('../src/lib/supabase');
      });
    }).toThrow('EXPO_PUBLIC_SUPABASE_ANON_KEY');
  });

  it('exports supabase client when both env vars are set', () => {
    process.env.EXPO_PUBLIC_SUPABASE_URL = 'https://test.supabase.co';
    process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY = 'test-anon-key';

    let supabaseModule: { supabase: unknown } | undefined;
    expect(() => {
      jest.isolateModules(() => {
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        supabaseModule = require('../src/lib/supabase') as { supabase: unknown };
      });
    }).not.toThrow();

    expect(supabaseModule).toBeDefined();
    expect(supabaseModule?.supabase).toBeDefined();
  });
});
