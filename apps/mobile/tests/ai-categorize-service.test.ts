/**
 * ai-categorize service tests — supabase LAZY client contract.
 *
 * Contract (changed after crash incident 6485AB3B — TestFlight build 4):
 * `@lib/supabase` must NEVER throw at import. expo-router eagerly evaluates
 * the static import graph at cold start; an import-time throw aborts the app
 * (SIGABRT) before any try/catch can run. Env validation is deferred to first
 * use via getSupabase()/getSession(), where every caller is guarded.
 *
 * Convention mirrors apps/mobile/tests/monobank-mapper.test.ts:
 * - Pure TypeScript, no React Native renderer.
 * - process.env stubs for env var control.
 *
 * Run: cd apps/mobile && npx jest tests/ai-categorize-service.test.ts
 */

describe('supabase lazy client contract', () => {
  const ORIGINAL_ENV = process.env;

  beforeEach(() => {
    process.env = { ...ORIGINAL_ENV };
    jest.resetModules();
  });

  afterEach(() => {
    process.env = ORIGINAL_ENV;
    jest.resetModules();
  });

  it('does NOT throw on import when env vars are missing (cold-start crash regression guard)', () => {
    delete process.env.EXPO_PUBLIC_SUPABASE_URL;
    delete process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

    expect(() => {
      jest.isolateModules(() => {
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        require('../src/lib/supabase');
      });
    }).not.toThrow();
  });

  it('isSupabaseConfigured() reflects env presence', () => {
    jest.isolateModules(() => {
      delete process.env.EXPO_PUBLIC_SUPABASE_URL;
      delete process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const m = require('../src/lib/supabase') as {
        isSupabaseConfigured: () => boolean;
      };
      expect(m.isSupabaseConfigured()).toBe(false);

      process.env.EXPO_PUBLIC_SUPABASE_URL = 'https://test.supabase.co';
      process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY = 'test-anon-key';
      expect(m.isSupabaseConfigured()).toBe(true);
    });
  });

  it('getSupabase() throws at CALL time when EXPO_PUBLIC_SUPABASE_URL is missing', () => {
    delete process.env.EXPO_PUBLIC_SUPABASE_URL;
    process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY = 'test-anon-key';

    jest.isolateModules(() => {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const m = require('../src/lib/supabase') as {
        getSupabase: () => unknown;
      };
      expect(() => m.getSupabase()).toThrow('EXPO_PUBLIC_SUPABASE_URL');
    });
  });

  it('getSupabase() throws at CALL time when EXPO_PUBLIC_SUPABASE_ANON_KEY is missing', () => {
    process.env.EXPO_PUBLIC_SUPABASE_URL = 'https://test.supabase.co';
    delete process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

    jest.isolateModules(() => {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const m = require('../src/lib/supabase') as {
        getSupabase: () => unknown;
      };
      expect(() => m.getSupabase()).toThrow('EXPO_PUBLIC_SUPABASE_ANON_KEY');
    });
  });

  it('getSupabase() returns a cached client when both env vars are set', () => {
    process.env.EXPO_PUBLIC_SUPABASE_URL = 'https://test.supabase.co';
    process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY = 'test-anon-key';

    jest.isolateModules(() => {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const m = require('../src/lib/supabase') as {
        getSupabase: () => unknown;
      };
      const a = m.getSupabase();
      const b = m.getSupabase();
      expect(a).toBeDefined();
      expect(a).toBe(b); // cached singleton
    });
  });
});
