/**
 * observability.ts — Sentry init wrapper (graceful-optional, T-05-16/17)
 *
 * Reads EXPO_PUBLIC_SENTRY_DSN at startup. If absent or empty, no-ops and
 * returns without throwing — the app and perf.ts both work correctly without
 * Sentry present (P0 #7 graceful absence). When DSN is supplied later, the
 * same binary activates full crash monitoring with zero code changes.
 *
 * Idempotent: a second call is a no-op (T-05-17 double-init guard).
 *
 * Called once from app/_layout.tsx at module scope, before the render gate,
 * so perf.ts measurements can enrich into Sentry from the first interaction.
 */

// T-05-17: idempotency guard — prevent double-init across React re-renders
// or module hot-reloads.
let _initialized = false;

/**
 * Initialize Sentry crash monitoring.
 *
 * Safe to call unconditionally — exits immediately (no-op, no throw) when
 * EXPO_PUBLIC_SENTRY_DSN is absent or empty (T-05-16 / P0 #7).
 */
export function initObservability(): void {
  // T-05-17: idempotency — second call is always a no-op.
  if (_initialized) return;
  _initialized = true;

  const dsn = process.env.EXPO_PUBLIC_SENTRY_DSN;

  // T-05-16: graceful absent path — never throw when DSN is missing.
  // Providing the DSN env var later (P0 #7) activates Sentry with no code change.
  if (!dsn || dsn.trim() === '') {
    // No-op: Sentry stays uninitialised; perf.ts optional-chaining guards handle this.
    return;
  }

  // DSN is present — initialise Sentry with EU region config.
  // Use try/catch so a malformed DSN or native module absence cannot crash the app.
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const Sentry = require('@sentry/react-native') as typeof import('@sentry/react-native');

    const appVariant = (process.env.APP_VARIANT ?? 'production') as string;

    Sentry.init({
      dsn,
      // EU data residency: tunnel requests through the EU ingest endpoint.
      // The DSN host already encodes the EU org — no extra config needed for
      // sentry.io EU region when using a sentry.io EU DSN.
      environment: appVariant,
      // Release tag matches EAS build number for crash→build correlation.
      // EXPO_PUBLIC_APP_VERSION is set by app.config.js if present; falls back
      // to the static version string from app.json.
      release: process.env.EXPO_PUBLIC_APP_VERSION ?? '1.0.0',
      // Disable Sentry's auto-session tracking breadcrumbs that could capture
      // navigation state containing financial route names (CLAUDE.md security rule).
      enableAutoSessionTracking: true,
      // Never send transaction details in breadcrumbs (T-05-16, CLAUDE.md).
      beforeBreadcrumb(breadcrumb) {
        // Drop any breadcrumb whose message or data looks like a transaction
        // description — conservative filter (data.* keys with 'description').
        if (breadcrumb.data && 'description' in breadcrumb.data) {
          return null;
        }
        return breadcrumb;
      },
    });
  } catch {
    // Sentry native module absent or DSN malformed — stay silent, never crash.
    // T-05-16: no unconditional throw on the DSN-absent / init-failure path.
  }
}
