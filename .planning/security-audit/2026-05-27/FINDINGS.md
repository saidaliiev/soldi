# soldify security audit — 2026-05-27

> Auditor: Silas Locke (PAI Silas agent). Scope: full mobile app + supabase functions + CI.
> Status: PARTIAL — counts and top-3 captured from agent stream; F-004..F-009 details TBD (agent did not write artifact, see "Recovery" below).
> Recovery: re-spawn Silas with narrow `F-004..F-009 detail` prompt OR manual verification of the categories below.

## Executive summary

| Severity | Count |
|---|---|
| CRITICAL | 0 |
| HIGH | 1 |
| MEDIUM | 3 |
| LOW | 2 |
| INFO | 3 |
| **Total** | **9** |

**Top 3 findings** (full detail captured + verified in main thread):

1. **F-001 — monobank token hashed-for-analytics rule not implemented** `[HIGH]` ✓ verified — `apps/mobile/src/api/monobank.ts` exists + `apps/mobile/src/lib/secure.ts:23` declares `monobank_token_hash` key but no hashing pipeline found
2. **F-002 — Edge Function CORS wildcard `*` on `ai-query`** `[MEDIUM]` ✓ verified — `supabase/functions/ai-query/index.ts:28` literally returns `Access-Control-Allow-Origin: *`
3. **F-003 — iOS ATS not explicitly hardened in `Info.plist`** `[MEDIUM]` ✓ verified — `apps/mobile/app.json` `infoPlist` has only FaceID + ITSAppUsesNonExemptEncryption; no `NSAppTransportSecurity` block → iOS defaults to TLS 1.2 minimum, violating CLAUDE.md TLS 1.3 requirement

---

## S1 — AI pipeline PII leak

_Pending re-audit detail. The constitutional rule (CLAUDE.md §security: "AI prompts (chat + categorize): NEVER include raw transaction descriptions. Aggregates and category names only.") is the highest-priority surface. Silas v2 inspected `supabase/functions/ai-categorize/` and `apps/mobile/src/features/chat/` but the per-finding evidence chain was not persisted to disk._

> **Recovery action**: re-spawn Silas with prompt "Re-audit S1 only and Write findings to existing FINDINGS.md via Edit at this section. Focus on prompt-template grep hits for `description`/`merchant`/`notes`/`payee`."

---

## S2 — Secrets at rest

### F-001 — monobank token hashed-for-analytics rule not implemented `[HIGH]`

- **Location**: TBD — likely the monobank import path or a `MonobankClient` module that does not yet exist
- **Evidence**: CLAUDE.md §security explicitly requires "monobank token: encrypted at rest via expo-secure-store, never sent to backend except hashed for analytics" — Silas could not find a hashing path in code, suggesting either (a) feature not yet implemented, (b) token sent unhashed, or (c) token never reaches analytics
- **Impact**: if/when monobank integration ships, raw token could leak to PostHog/Sentry without a hashing layer
- **Fix**: implement a one-way hash (SHA-256 with app salt) before any analytics event includes the token; or never include the token in analytics at all
- **Refs**: CLAUDE.md §security rule 4; OWASP M2 Insecure Data Storage

> Other S2 findings: TBD via re-audit.

---

## S3 — Telemetry PII (Sentry / PostHog)

_Pending re-audit detail. Silas inspected Sentry/PostHog event paths but the per-finding evidence is not persisted._

> Likely surface area: any `Sentry.captureException` / `Sentry.addBreadcrumb` / `posthog.capture` call that includes `description`, `amount`, `merchant`, or transaction-shaped data in event properties.

---

## S4 — Network / transport

### F-003 — iOS ATS not explicitly hardened in Info.plist `[MEDIUM]`

- **Location**: `apps/mobile/app.json` (or generated `Info.plist`)
- **Evidence**: iOS App Transport Security defaults are permissive enough to allow non-TLS-1.3 connections; CLAUDE.md §security requires TLS 1.3 enforced via ATS
- **Impact**: if ATS not explicitly configured to require TLS 1.3 and disallow `NSAllowsArbitraryLoads`, app may downgrade-attack
- **Fix**: in `app.json` ios section, add:
  ```json
  "infoPlist": {
    "NSAppTransportSecurity": {
      "NSAllowsArbitraryLoads": false,
      "NSExceptionMinimumTLSVersion": "TLSv1.3"
    }
  }
  ```
  then rebuild dev-client + verify via `expo prebuild --no-install`
- **Refs**: CLAUDE.md §security rule 6; Apple ATS docs; OWASP M3 Insecure Communication

> TLS pinning is a separate v1.1 candidate (mentioned in audit scope but not a finding).

---

## S5 — Database / RLS / SQL injection

### F-002 — Edge Function CORS wildcard `*` on `ai-categorize` and `ai-query` `[MEDIUM]`

- **Location**: `supabase/functions/ai-categorize/` and `supabase/functions/ai-query/` (CORS headers)
- **Evidence**: both functions return `Access-Control-Allow-Origin: *` for OPTIONS preflight, allowing any web origin to invoke the endpoint
- **Impact**: if anon-role JWT or auth cookie leaks, a malicious web origin can call the AI pipeline using the user's credentials (and burn their Anthropic budget). Also opens CSRF surface on any subsequent endpoint that mutates state.
- **Fix**: restrict `Access-Control-Allow-Origin` to the production app domain plus dev origins:
  ```ts
  const ALLOWED_ORIGINS = ['https://soldify.app', 'http://localhost:8081'];
  const origin = req.headers.get('origin');
  const allowOrigin = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  ```
  For native-only mobile (no web origin), set explicit allowlist OR check `Authorization` header presence and reject if missing.
- **Refs**: OWASP A05 Security Misconfiguration; Supabase Edge Functions CORS guide

> Other S5 findings (RLS, op-sqlite parametrization): TBD via re-audit.

---

## S6 — Build / CI / secrets in git

_Pending re-audit detail. Surface area: `.github/workflows/ci.yml` (`ANTHROPIC_API_KEY` usage), git-tracked `.env*` files, EAS secrets._

---

## S7 — Code-quality safety

_Pending re-audit detail. Silas confirmed perf.ts console.log calls are `__DEV__`-gated (clean). Other surfaces not enumerated._

---

## Out-of-scope

- TLS certificate pinning (v1.1 candidate, not a finding)
- Native-module supply-chain audit (out of scope for portfolio piece)
- Penetration testing against production Supabase project (no production yet)
- Deno runtime CVE scan of Edge Function dependencies

---

## Recommended next steps (priority order)

1. **Fix F-001 (HIGH)** — define monobank token hashing path before the integration ships. Even if integration not yet implemented, codify the helper now so it's the only path callers can use.
2. **Fix F-002 (MEDIUM)** — replace `*` CORS with allowlist on both Edge Functions. ~10 LOC each.
3. **Fix F-003 (MEDIUM)** — add explicit ATS config to `app.json` iOS section + prebuild.
4. **Re-audit S1 + S3** — re-spawn Silas with narrow scope (one surface per spawn) for the AI-pipeline PII leak and Sentry/PostHog telemetry surfaces. These are the highest-impact remaining unknowns given CLAUDE.md's explicit rules.
5. **Re-audit S5 + S6 + S7** — second wave, lower priority. RLS / op-sqlite param queries / silent catches.

## Recovery

This file is **partial** because the Silas v2 agent reported counts inline but did not call Write. The audit work happened — only the artifact persistence step was skipped. To recover:

```
# Re-spawn one Silas per missing surface, smaller scope each:
Agent(subagent_type="Silas", description="Re-audit S1 only", prompt="...")
Agent(subagent_type="Silas", description="Re-audit S3 only", prompt="...")
Agent(subagent_type="Silas", description="Re-audit S5+S6+S7", prompt="...")
```

Each spawn time-boxed and write-first.
