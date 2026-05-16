/**
 * node:test preload (loaded via `node --import ./scripts/test-setup.ts`).
 *
 * Defines the React-Native-only `__DEV__` global so any expo/RN module that
 * sneaks into a test's import graph does not throw
 * `ReferenceError: __DEV__ is not defined`. The primary fix is the deferred
 * op-sqlite import in src/lib/db/index.ts; this is defense-in-depth and
 * mirrors what jest-expo's preset would otherwise provide.
 */

(globalThis as { __DEV__?: boolean }).__DEV__ = false;
