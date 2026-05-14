/**
 * SOLDI secure storage wrapper.
 *
 * Never AsyncStorage. Never log values. expo-secure-store only.
 * All persisted secrets live under a typed SecureKey union — no arbitrary strings.
 */

import * as SecureStore from 'expo-secure-store';

// ---------------------------------------------------------------------------
// Key registry — extend here when adding new persisted secrets
// ---------------------------------------------------------------------------

/**
 * All valid key names for expo-secure-store. Using a literal union ensures
 * no arbitrary string can be written to the keychain.
 *
 * 'soldi-onboarding' — Zustand persist middleware writes the serialized
 *   OnboardingState under this name via createJSONStorage.
 */
export type SecureKey =
  | 'monobank_token'
  | 'monobank_token_hash'
  | 'soldi-onboarding'
  | 'soldi-tx-filter';

// ---------------------------------------------------------------------------
// API
// ---------------------------------------------------------------------------

/**
 * Writes a value to the keychain under the given key.
 * Accessible only when the device is unlocked, this device only.
 *
 * Never AsyncStorage. Never log. expo-secure-store only.
 */
export async function secureSet(key: SecureKey, value: string): Promise<void> {
  await SecureStore.setItemAsync(key, value, {
    keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
  });
}

/**
 * Reads a value from the keychain. Returns null if not found.
 *
 * Never AsyncStorage. Never log. expo-secure-store only.
 */
export async function secureGet(key: SecureKey): Promise<string | null> {
  return SecureStore.getItemAsync(key);
}

/**
 * Deletes a value from the keychain.
 *
 * Never AsyncStorage. Never log. expo-secure-store only.
 */
export async function secureDelete(key: SecureKey): Promise<void> {
  await SecureStore.deleteItemAsync(key);
}
