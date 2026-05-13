/**
 * SOLDI monobank API client.
 *
 * Security guarantees:
 * - Token appears ONLY in the X-Token header — never in the URL.
 * - No console.log/warn/error anywhere in this file.
 * - httpJson already strips X-Token from error messages (HttpError.bodyText).
 * - Rate-limit (429) and auth (401/403) errors surface as translated message keys
 *   in the calling screen — raw HTTP errors are never shown to the user.
 *
 * API docs: https://api.monobank.ua/docs/
 * Rate limits:
 *   /personal/client — 1 req per 60s per token.
 *   /personal/statement/{account}/{from}/{to} — 1 req per 60s per account per token.
 *   Max statement window: 31 days + 1 second.
 */

import { httpJson, HttpError } from '@lib/http';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** ISO 4217 numeric currency code as returned by monobank. */
export type MonobankCurrencyCode = number;

export type MonobankAccount = {
  id: string;
  sendId: string;
  currencyCode: MonobankCurrencyCode;
  cashbackType: string;
  balance: number;       // minor units (cents)
  creditLimit: number;   // minor units
  maskedPan: string[];
  type: string;          // 'black' | 'white' | 'platinum' | 'iron' | 'fop' | 'yellow' | 'eaid'
  iban: string;
};

export type MonobankClient = {
  clientId: string;
  name: string;
  webHookUrl?: string;
  permissions: string;   // e.g. 'sp' for statements+personal
  accounts: MonobankAccount[];
};

export type MonobankStatementItem = {
  id: string;
  time: number;                // unix seconds
  description: string;         // merchant name / counterparty description
  mcc: number;                 // ISO 18245 MCC code
  originalMcc: number;         // original MCC from terminal
  amount: number;              // signed minor units; negative = expense
  operationAmount: number;     // amount in operation currency
  currencyCode: MonobankCurrencyCode;
  commissionRate: number;
  cashbackAmount: number;
  balance: number;             // account balance after this tx
  hold: boolean;               // pending/hold status
  receiptId?: string;          // optional Diia receipt ID
};

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const BASE_URL = 'https://api.monobank.ua';

// ---------------------------------------------------------------------------
// getMonobankClient
// ---------------------------------------------------------------------------

/**
 * Fetches the client info (name, accounts list) for the given personal token.
 *
 * Throws descriptive errors for common HTTP failure codes:
 * - 401 → 'Invalid monobank token'
 * - 403 → 'Permission denied (need sp scope)'
 * - 429 → 'Rate limited; try again in 60s'
 *
 * The token is passed ONLY via the X-Token header — never in the URL.
 */
export async function getMonobankClient(token: string): Promise<MonobankClient> {
  try {
    return await httpJson<MonobankClient>(`${BASE_URL}/personal/client`, {
      method: 'GET',
      headers: { 'X-Token': token },
      timeoutMs: 10_000,
    });
  } catch (err) {
    if (err instanceof HttpError) {
      if (err.status === 401) throw new Error('Invalid monobank token');
      if (err.status === 403) throw new Error('Permission denied (need sp scope)');
      if (err.status === 429) throw new Error('Rate limited; try again in 60s');
    }
    throw err;
  }
}

// ---------------------------------------------------------------------------
// getMonobankStatement
// ---------------------------------------------------------------------------

/**
 * Fetches statement items for a specific account within [fromSeconds, toSeconds].
 *
 * Caller is responsible for chunking the window to ≤ 31 days + 1 second
 * (monobank max window per request).
 *
 * The token is passed ONLY via the X-Token header — never in the URL.
 * The accountId is a safe opaque string returned by getMonobankClient.
 */
export async function getMonobankStatement(
  token: string,
  accountId: string,
  fromSeconds: number,
  toSeconds: number,
): Promise<MonobankStatementItem[]> {
  const path = `/personal/statement/${accountId}/${fromSeconds}/${toSeconds}`;
  try {
    return await httpJson<MonobankStatementItem[]>(`${BASE_URL}${path}`, {
      method: 'GET',
      headers: { 'X-Token': token },
      timeoutMs: 15_000,
    });
  } catch (err) {
    if (err instanceof HttpError) {
      if (err.status === 401) throw new Error('Invalid monobank token');
      if (err.status === 403) throw new Error('Permission denied (need sp scope)');
      if (err.status === 429) throw new Error('Rate limited; try again in 60s');
    }
    throw err;
  }
}
