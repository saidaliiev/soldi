/**
 * Anthropic SDK factory for the ai-categorize Edge Function.
 *
 * Reads ANTHROPIC_API_KEY from Deno.env (Supabase project secret only — NEVER
 * bundled into the mobile app per CLAUDE.md §Security).
 *
 * No retries, no caching inside the wrapper — caller decides (per Phase 3 D-21:
 * per-row Promise.allSettled, no whole-batch retry).
 *
 * Fail-fast: throws on first call when the env var is absent so misconfigured
 * deployments fail at the request boundary, not silently mid-batch.
 */
import Anthropic from 'npm:@anthropic-ai/sdk@0.32.1';

export function getAnthropic(): Anthropic {
  const key = Deno.env.get('ANTHROPIC_API_KEY');
  if (!key) throw new Error('ANTHROPIC_API_KEY missing');
  return new Anthropic({ apiKey: key });
}
