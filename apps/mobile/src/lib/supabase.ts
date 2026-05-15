/**
 * SOLDI Supabase client singleton.
 *
 * Exposes a single `supabase` client instance configured with:
 * - expo-secure-store as the auth session storage backend (never AsyncStorage —
 *   CLAUDE.md §Security rule: "No sensitive data in AsyncStorage ever").
 * - autoRefreshToken and persistSession enabled.
 * - detectSessionInUrl: false (no web OAuth redirects in a RN app).
 *
 * Fail-fast on import: if EXPO_PUBLIC_SUPABASE_URL or EXPO_PUBLIC_SUPABASE_ANON_KEY
 * are missing the module throws immediately, matching the lib/http.ts discipline
 * of zero silent failures. This is also the contract asserted by
 * apps/mobile/tests/ai-categorize-service.test.ts.
 *
 * Supabase project scope:
 * Auth-only project. Remote Postgres holds merchant_overrides + (Phase 4)
 * chat_session_logs. Transaction rows stay local (op-sqlite) per CONTEXT.md
 * D-17′..D-20′ FactsPack architecture.
 */

import { createClient } from '@supabase/supabase-js';
import { secureStorageAdapter } from './secureStorage';

// ---------------------------------------------------------------------------
// Environment validation (fail-fast on import)
// ---------------------------------------------------------------------------

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || SUPABASE_URL.trim() === '') {
  throw new Error(
    '[supabase] EXPO_PUBLIC_SUPABASE_URL is not set. ' +
    'Add it to your .env.local file (Supabase Dashboard → Project Settings → API → Project URL).',
  );
}

if (!SUPABASE_ANON_KEY || SUPABASE_ANON_KEY.trim() === '') {
  throw new Error(
    '[supabase] EXPO_PUBLIC_SUPABASE_ANON_KEY is not set. ' +
    'Add it to your .env.local file (Supabase Dashboard → Project Settings → API → anon public key).',
  );
}

// ---------------------------------------------------------------------------
// Client singleton
// ---------------------------------------------------------------------------

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: secureStorageAdapter,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false, // RN apps do not use URL-based OAuth callbacks
  },
});

// ---------------------------------------------------------------------------
// Session helper
// ---------------------------------------------------------------------------

/**
 * Returns the current Supabase session, or null if the user is not signed in.
 *
 * Usage: `const session = await getSession();`
 * Throws if Supabase auth layer fails (network error, keychain locked).
 */
export async function getSession() {
  const { data, error } = await supabase.auth.getSession();
  if (error) {
    throw new Error(`[supabase] getSession failed: ${error.message}`);
  }
  return data.session;
}
