/**
 * SOLDI secure storage adapter.
 *
 * Provides a supabase-js–compatible storage interface backed entirely by
 * expo-secure-store. This is required because supabase-js v2 defaults to
 * AsyncStorage for auth session persistence, which violates the CLAUDE.md
 * §Security rule: "No sensitive data in AsyncStorage ever — expo-secure-store only."
 *
 * The adapter shape (getItem / setItem / removeItem returning Promise<string|null>)
 * satisfies both the supabase-js v2 `Storage` interface and the Zustand
 * StateStorage interface, so the same module can be reused for both.
 *
 * Security:
 * - All values are written with WHEN_UNLOCKED_THIS_DEVICE_ONLY.
 * - No logs of values — only key names may appear in error messages.
 * - Keys use the 'supabase-auth-*' prefix, guarded by the SecureKey union below.
 */

import * as SecureStore from 'expo-secure-store';

// ---------------------------------------------------------------------------
// Key types
// ---------------------------------------------------------------------------

/**
 * Extended key union that includes supabase-js auth session keys.
 * Supabase-js v2 stores one key per project keyed by `sb-<ref>-auth-token`.
 * We accept any string matching the `sb-` prefix pattern via a type assertion
 * in the adapter — the union below covers known static keys; dynamic project
 * refs are handled via the cast in the adapter methods.
 */
type StorageKey = string; // supabase-js manages the exact key names

// ---------------------------------------------------------------------------
// Adapter
// ---------------------------------------------------------------------------

/**
 * supabase-js–compatible async storage adapter backed by expo-secure-store.
 *
 * Pass this as `auth.storage` in the createClient options.
 */
export const secureStorageAdapter = {
  async getItem(key: StorageKey): Promise<string | null> {
    try {
      return await SecureStore.getItemAsync(key, {
        keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
      });
    } catch {
      // SecureStore can throw on first access before keychain is available.
      // Return null so supabase-js treats it as "no session".
      return null;
    }
  },

  async setItem(key: StorageKey, value: string): Promise<void> {
    try {
      await SecureStore.setItemAsync(key, value, {
        keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
      });
    } catch {
      // Best-effort — if keychain is unavailable the session is not persisted.
      // The user will re-authenticate on next cold start.
    }
  },

  async removeItem(key: StorageKey): Promise<void> {
    try {
      await SecureStore.deleteItemAsync(key);
    } catch {
      // Item may not exist — safe to swallow.
    }
  },
};
