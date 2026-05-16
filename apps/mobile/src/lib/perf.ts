/**
 * SOLDI performance instrumentation — Phase 5 plan 05-03 (QUAL-05 / QUAL-06).
 *
 * Measures:
 *   coldStartMs  — module-load → first interactive render (render gate opens)
 *   firstFrameMs — module-load → Skia donut chart first committed paint
 *
 * Sentry is OPTIONAL (P0 #7 — EU DSN absent). All paths are Sentry-absent safe:
 *   - No unconditional throw when Sentry client is absent (T-05-13).
 *   - Attaches Sentry measurement only if an active client is detected.
 *   - On-device fallback: module state + __DEV__ console (ms integers only).
 *
 * Security (T-05-12, CLAUDE.md):
 *   - console.log is __DEV__-gated.
 *   - Logs ONLY numeric millisecond integers — never transaction/financial data.
 *   - No sensitive fields ever appear in perf logs.
 *
 * Export convention: named exports only, no default export (matches secure.ts).
 */

// ---------------------------------------------------------------------------
// Module-scope start mark — captured at import time (earliest possible point).
// markColdStart() records this value; cold-start measurement starts here.
// ---------------------------------------------------------------------------

const _moduleLoadTime: number = Date.now();

// ---------------------------------------------------------------------------
// Internal state
// ---------------------------------------------------------------------------

let _coldStartMs: number | null = null;
let _firstFrameMs: number | null = null;

// ---------------------------------------------------------------------------
// Sentry optional client detection
// ---------------------------------------------------------------------------

/**
 * Returns true if @sentry/react-native has an initialised client.
 * Uses optional chaining so it is safe if the module itself is absent
 * or partially initialised (P0 #7 graceful-absence, T-05-13).
 * Never throws.
 */
function _hasSentryClient(): boolean {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const Sentry = require('@sentry/react-native') as {
      getCurrentHub?: () => { getClient?: () => unknown };
    };
    const client = Sentry.getCurrentHub?.()?.getClient?.();
    return client != null;
  } catch {
    // Sentry absent or not yet initialised — graceful fallback (T-05-13).
    return false;
  }
}

/**
 * Attaches a custom measurement to the active Sentry transaction (if one exists).
 * No-op when Sentry is absent or no active transaction (P0 #7, T-05-13).
 * Never throws.
 */
function _attachSentryMeasurement(name: string, valueMs: number): void {
  try {
    if (!_hasSentryClient()) return;
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const Sentry = require('@sentry/react-native') as {
      getCurrentHub?: () => {
        getScope?: () => { getTransaction?: () => { setMeasurement?: (n: string, v: number, u: string) => void } | null };
      };
    };
    const txn = Sentry.getCurrentHub?.()?.getScope?.()?.getTransaction?.();
    if (txn != null) {
      txn.setMeasurement?.(name, valueMs, 'millisecond');
    }
  } catch {
    // Sentry not fully initialised — silent fallback (T-05-13).
  }
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Records the cold-start origin timestamp (captured at module load).
 * Call once at the top of app/_layout.tsx, before the component is defined.
 * Idempotent — subsequent calls are no-ops so module re-imports don't reset.
 *
 * Definition of cold start: module load → first render gate open (markAppReady).
 * Biometric auth time IS included in coldStartMs when biometric is enabled
 * (we measure user-perceived "time to interactive", not boot-to-fonts).
 */
export function markColdStart(): void {
  // No-op — the timestamp is already captured at module scope (_moduleLoadTime).
  // This function exists as an explicit call-site so the wiring is auditable
  // (grep-able: markColdStart in _layout.tsx).
}

/**
 * Records the moment the render gate opens (first interactive render).
 * Call immediately before the RootLayout component returns JSX (not null).
 *
 * Populates `coldStartMs`. Emits __DEV__ log (ms only — T-05-12).
 * Attaches to Sentry if a client exists (P0 #7 optional).
 * Never throws (T-05-13).
 */
export function markAppReady(): void {
  if (_coldStartMs !== null) return; // already marked — idempotent
  _coldStartMs = Date.now() - _moduleLoadTime;

  if (__DEV__) {
    // T-05-12: log ONLY the numeric ms — never transaction/financial data.
    console.log('[perf] coldStartMs:', _coldStartMs);
  }

  _attachSentryMeasurement('cold_start_ms', _coldStartMs);
}

/**
 * Records the moment the Skia donut chart renders its first committed frame.
 * Call from DonutChart on first paint (guard with a ref so it fires once).
 *
 * Populates `firstFrameMs` (measured from module-load origin, same as cold start).
 * Emits __DEV__ log (ms only — T-05-12). Never throws (T-05-13).
 */
export function markFirstFrame(): void {
  if (_firstFrameMs !== null) return; // already marked — idempotent
  _firstFrameMs = Date.now() - _moduleLoadTime;

  if (__DEV__) {
    // T-05-12: log ONLY the numeric ms — never transaction/financial data.
    console.log('[perf] firstFrameMs:', _firstFrameMs);
  }

  _attachSentryMeasurement('skia_first_frame_ms', _firstFrameMs);
}

/**
 * Returns the recorded measurements.
 * `null` means the corresponding mark has not fired yet.
 * Safe to call at any time — never throws (T-05-13).
 */
export function getPerfReport(): { coldStartMs: number | null; firstFrameMs: number | null } {
  return { coldStartMs: _coldStartMs, firstFrameMs: _firstFrameMs };
}
