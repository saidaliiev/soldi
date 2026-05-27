/**
 * CORS helper for Supabase Edge Functions.
 *
 * Replaces the previous `Access-Control-Allow-Origin: *` wildcard
 * (audit finding F-002, 2026-05-27 — see
 * `.planning/security-audit/2026-05-27/FINDINGS.md`) with an explicit
 * allowlist.
 *
 * Native-mobile fetches send no `Origin` header — for those requests this
 * helper omits the `Access-Control-Allow-Origin` header entirely (browsers
 * reject the response, native HTTP clients ignore CORS). Browser origins are
 * accepted only when they appear in `ALLOWED_ORIGINS`.
 *
 * `https://soldify.app` is a placeholder until soldify ships a production web
 * client; dev origins cover Metro / Expo CLI launch ports.
 *
 * Each function may pass additional comma-separated `Access-Control-Allow-Headers`
 * via the optional `extraAllowHeaders` argument — `ai-categorize` for instance
 * forwards a custom `x-daily-spend-cents` header.
 */

const ALLOWED_ORIGINS: ReadonlySet<string> = new Set([
  'https://soldify.app',
  'http://localhost:8081',
  'http://localhost:19000',
  'http://localhost:19006',
]);

const DEFAULT_ALLOW_HEADERS =
  'authorization, x-client-info, apikey, content-type';

export function buildCorsHeaders(
  req: Request,
  extraAllowHeaders?: string,
): Record<string, string> {
  const origin = req.headers.get('origin');
  const headers: Record<string, string> = {
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': extraAllowHeaders
      ? `${DEFAULT_ALLOW_HEADERS}, ${extraAllowHeaders}`
      : DEFAULT_ALLOW_HEADERS,
    Vary: 'Origin',
  };
  if (origin != null && ALLOWED_ORIGINS.has(origin)) {
    headers['Access-Control-Allow-Origin'] = origin;
  }
  return headers;
}
