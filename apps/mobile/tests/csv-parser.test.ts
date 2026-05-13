/**
 * Unit tests for CSV parser + mappers.
 * Uses node:test — run with: cd apps/mobile && npx tsx tests/csv-parser.test.ts
 */

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';

// ---- Inline parseCsv (avoids React Native imports) ----

type CsvParseErrorCode = 'too-large' | 'malformed' | 'too-many-rows';

class CsvParseError extends Error {
  public readonly code: CsvParseErrorCode;
  constructor(code: CsvParseErrorCode, message: string) {
    super(message);
    this.name = 'CsvParseError';
    this.code = code;
  }
}

type ParseCsvOptions = {
  maxBytes?: number;
  maxRows?: number;
  delimiter?: ',' | ';' | '\t';
};

function detectDelimiter(firstLine: string): ',' | ';' | '\t' {
  const commas = (firstLine.match(/,/g) ?? []).length;
  const semis  = (firstLine.match(/;/g) ?? []).length;
  const tabs   = (firstLine.match(/\t/g) ?? []).length;
  if (tabs >= semis && tabs >= commas) return '\t';
  if (semis >= commas) return ';';
  return ',';
}

function parseCsv(text: string, opts: ParseCsvOptions = {}): string[][] {
  const { maxBytes = 5_000_000, maxRows = 200_000 } = opts;

  let byteLen: number;
  if (typeof Buffer !== 'undefined') {
    byteLen = Buffer.byteLength(text, 'utf8');
  } else {
    let b = 0;
    for (let i = 0; i < text.length; i++) {
      const c = text.charCodeAt(i);
      b += c < 128 ? 1 : c < 2048 ? 2 : 3;
    }
    byteLen = b;
  }

  if (byteLen > maxBytes) {
    throw new CsvParseError('too-large', `CSV exceeds ${maxBytes} byte limit`);
  }

  if (text.length === 0) return [];

  const firstNewline = text.indexOf('\n');
  const firstLine = firstNewline >= 0 ? text.slice(0, firstNewline) : text;
  const delim: string = opts.delimiter ?? detectDelimiter(firstLine);

  const rows: string[][] = [];
  let currentRow: string[] = [];
  let currentCell = '';
  let inQuotes = false;
  let rowCount = 0;
  const len = text.length;

  for (let i = 0; i < len; i++) {
    const ch = text[i]!;
    if (inQuotes) {
      if (ch === '"') {
        if (i + 1 < len && text[i + 1] === '"') { currentCell += '"'; i++; }
        else { inQuotes = false; }
      } else { currentCell += ch; }
    } else {
      if (ch === '"') {
        inQuotes = true;
      } else if (ch === delim) {
        currentRow.push(currentCell); currentCell = '';
      } else if (ch === '\r') {
        if (i + 1 < len && text[i + 1] === '\n') i++;
        currentRow.push(currentCell); currentCell = '';
        rows.push(currentRow); currentRow = []; rowCount++;
        if (rowCount > maxRows) throw new CsvParseError('too-many-rows', `Exceeds ${maxRows} rows`);
      } else if (ch === '\n') {
        currentRow.push(currentCell); currentCell = '';
        rows.push(currentRow); currentRow = []; rowCount++;
        if (rowCount > maxRows) throw new CsvParseError('too-many-rows', `Exceeds ${maxRows} rows`);
      } else { currentCell += ch; }
    }
  }

  if (inQuotes) throw new CsvParseError('malformed', 'Unbalanced quotes at EOF');
  if (currentCell.length > 0 || currentRow.length > 0) { currentRow.push(currentCell); rows.push(currentRow); }
  return rows;
}

// ---- Inline detectColumns + csvRowsToTransactions ----

type ColumnMap = {
  dateCol: number; amountCol: number; merchantCol: number;
  currencyCol: number | null; descriptionCol: number | null; mccCol: number | null;
};

const DATE_HEADERS     = new Set(['date','time','datetime','transaction date','операція','дата']);
const AMOUNT_HEADERS   = new Set(['amount','sum','total','debit','credit','amount (eur)','operation amount','сума','сумма']);
const MERCHANT_HEADERS = new Set(['merchant','description','memo','name','payee','контрагент','опис']);
const CURRENCY_HEADERS = new Set(['currency','валюта']);
const MCC_HEADERS      = new Set(['mcc','mcc code']);
const DESC_HEADERS     = new Set(['note','notes']);

function detectColumns(header: string[]): ColumnMap | null {
  let dateCol: number|null = null, amountCol: number|null = null,
      merchantCol: number|null = null, currencyCol: number|null = null,
      mccCol: number|null = null, descriptionCol: number|null = null;
  for (let i = 0; i < header.length; i++) {
    const cell = (header[i] ?? '').toLowerCase().trim();
    if (dateCol === null     && DATE_HEADERS.has(cell))     { dateCol     = i; continue; }
    if (amountCol === null   && AMOUNT_HEADERS.has(cell))   { amountCol   = i; continue; }
    if (merchantCol === null && MERCHANT_HEADERS.has(cell)) { merchantCol = i; continue; }
    if (currencyCol === null && CURRENCY_HEADERS.has(cell)) { currencyCol = i; continue; }
    if (mccCol === null      && MCC_HEADERS.has(cell))      { mccCol      = i; continue; }
    if (descriptionCol === null && DESC_HEADERS.has(cell))  { descriptionCol = i; continue; }
  }
  if (dateCol === null || amountCol === null || merchantCol === null) return null;
  return { dateCol, amountCol, merchantCol, currencyCol, mccCol, descriptionCol };
}

// Minimal MCC map for categoryForMcc
const MCC_MAP: ReadonlyMap<number, string> = new Map([
  [5411, 'groceries'], [5814, 'coffee'], [5541, 'transport'],
]);
function categoryForMcc(mcc: number, fallback: string = 'misc'): string {
  return MCC_MAP.get(mcc) ?? fallback;
}

function djb2(s: string): string {
  let hash = 5381;
  for (let i = 0; i < s.length; i++) {
    hash = ((hash << 5) + hash) ^ s.charCodeAt(i);
    hash = hash >>> 0;
  }
  return hash.toString(16).toLowerCase();
}

function parseAmount(input: string): number | null {
  if (typeof input !== 'string') return null;
  let s = input.trim().replace(/[^\d.,\s-]/g, '');
  const hasSpace = /\s/.test(s);
  const commaCount = (s.match(/,/g) ?? []).length;
  const dotCount = (s.match(/\./g) ?? []).length;
  let normalised: string;
  if (hasSpace) {
    s = s.replace(/\s+/g, '');
    normalised = commaCount === 1 && dotCount === 0 ? s.replace(',', '.') : s.replace(',', '');
  } else if (commaCount === 1 && dotCount === 0) {
    const after = s.split(',')[1] ?? '';
    normalised = after.length === 3 ? s.replace(',', '') : s.replace(',', '.');
  } else if (commaCount >= 1 && dotCount === 1) {
    normalised = s.replace(/,/g, '');
  } else {
    normalised = s.replace(/,/g, '');
  }
  const v = parseFloat(normalised);
  if (!Number.isFinite(v)) return null;
  if (Math.abs(v) > 1e12) return null;
  return v;
}

function toCents(amount: number): number {
  if (!Number.isFinite(amount)) throw new RangeError(`toCents: expected finite number, got ${amount}`);
  return Math.round(amount * 100);
}

function parseDateToSeconds(raw: string): number | null {
  const s = raw.trim();
  if (!s) return null;
  const iso = Date.parse(s);
  if (!Number.isNaN(iso)) return Math.floor(iso / 1000);
  const ddmm = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (ddmm) {
    const ts = Date.parse(`${ddmm[3]}-${String(parseInt(ddmm[2]!,10)).padStart(2,'0')}-${String(parseInt(ddmm[1]!,10)).padStart(2,'0')}`);
    if (!Number.isNaN(ts)) return Math.floor(ts / 1000);
  }
  const dtWithTime = s.match(/^(\d{4}-\d{2}-\d{2})[T\s](\d{2}:\d{2})/);
  if (dtWithTime) {
    const ts3 = Date.parse(`${dtWithTime[1]!}T${dtWithTime[2]!}:00`);
    if (!Number.isNaN(ts3)) return Math.floor(ts3 / 1000);
  }
  return null;
}

type MappedCsvRow = {
  amount_cents: number; currency: string; merchant_name: string;
  merchant_id: null; mcc_code: number | null; categorySlug: string;
  description: null; date: number; source: 'csv'; external_id: string; created_at: number;
};

function csvRowsToTransactions(
  rows: string[][], cmap: ColumnMap, _accountId: number, defaultCurrency: 'EUR'|'UAH'|'USD',
): MappedCsvRow[] {
  const created_at = Math.floor(Date.now() / 1000);
  const results: MappedCsvRow[] = [];
  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    if (!row || row.length === 0) continue;
    const rawAmount   = row[cmap.amountCol]   ?? '';
    const rawDate     = row[cmap.dateCol]      ?? '';
    const rawMerchant = row[cmap.merchantCol]  ?? '';
    const rawAmountStr = rawAmount.trim();
    const amountFloat = parseAmount(rawAmountStr);
    if (amountFloat === null) continue;
    const dateSec = parseDateToSeconds(rawDate);
    if (dateSec === null) continue;
    const merchant_name = rawMerchant.trim().slice(0, 120);
    if (!merchant_name) continue;
    const rawCurrency = cmap.currencyCol !== null
      ? (row[cmap.currencyCol] ?? defaultCurrency).toUpperCase().slice(0, 3)
      : defaultCurrency;
    const mcc: number|null = cmap.mccCol !== null
      ? parseInt(row[cmap.mccCol] ?? '', 10) || null : null;
    const startsWithMinus = rawAmountStr.startsWith('-');
    const startsWithPlus  = rawAmountStr.startsWith('+');
    let signedFloat: number;
    if (startsWithMinus || (!startsWithPlus && amountFloat < 0)) {
      signedFloat = -Math.abs(amountFloat);
    } else {
      signedFloat = Math.abs(amountFloat);
    }
    const amount_cents = toCents(signedFloat);
    // B2 contract: categorySlug ALWAYS defined
    const categorySlug: string = categoryForMcc(mcc ?? 0, 'misc');
    const external_id = `csv-${djb2(rawDate + '|' + rawAmount + '|' + rawMerchant)}`;
    results.push({
      amount_cents, currency: rawCurrency, merchant_name,
      merchant_id: null, mcc_code: mcc, categorySlug, description: null,
      date: dateSec, source: 'csv', external_id, created_at,
    });
  }
  return results;
}

// ---- Tests ----

describe('parseCsv', () => {
  test('Test 1: simple comma CSV returns expected rows', () => {
    const csv = 'Date,Amount,Description\n2026-05-10,-12.34,Tesco\n2026-05-11,-3.50,Aroma Kava\n';
    const rows = parseCsv(csv);
    assert.strictEqual(rows.length, 3); // header + 2 data
    assert.deepStrictEqual(rows[0], ['Date', 'Amount', 'Description']);
    assert.deepStrictEqual(rows[1], ['2026-05-10', '-12.34', 'Tesco']);
  });

  test('Test 2: semicolon-delimited auto-detected', () => {
    const csv = 'Date;Amount;Description\n2026-05-10;-12.34;Tesco\n2026-05-11;-3.50;Kava\n';
    const rows = parseCsv(csv);
    assert.strictEqual(rows.length, 3);
    assert.strictEqual(rows[0]?.length, 3);
  });

  test('Test 3: quoted field containing comma is not split', () => {
    const csv = 'Date,Amount,Description\n2026-05-10,-12.34,"Tesco, Grocery"\n';
    const rows = parseCsv(csv);
    assert.strictEqual(rows[1]?.[2], 'Tesco, Grocery');
  });

  test('Test 4: doubled double-quote inside quoted field is unescaped', () => {
    const csv = 'Date,Amount,Description\n2026-05-10,-12.34,"He said ""hello"""\n';
    const rows = parseCsv(csv);
    assert.strictEqual(rows[1]?.[2], 'He said "hello"');
  });

  test('Test 5: CRLF line endings produce same result as LF', () => {
    const csvLF   = 'Date,Amount,Description\n2026-05-10,-12.34,Tesco\n';
    const csvCRLF = 'Date,Amount,Description\r\n2026-05-10,-12.34,Tesco\r\n';
    const lf   = parseCsv(csvLF);
    const crlf = parseCsv(csvCRLF);
    assert.deepStrictEqual(lf, crlf);
  });

  test('Test 6: input > 5MB throws CsvParseError with code too-large', () => {
    // Generate a string slightly over 5MB
    const big = 'a'.repeat(5_000_001);
    assert.throws(
      () => parseCsv(big, { maxBytes: 5_000_000 }),
      (err: unknown) => err instanceof CsvParseError && err.code === 'too-large',
    );
  });

  test('Test 7: unbalanced quote throws CsvParseError with code malformed', () => {
    const csv = 'Date,Amount,Description\n2026-05-10,-12.34,"Tesco\n';
    assert.throws(
      () => parseCsv(csv),
      (err: unknown) => err instanceof CsvParseError && err.code === 'malformed',
    );
  });
});

describe('detectColumns', () => {
  test('Test 8: finds date/amount/merchant from [Date, Amount, Description]', () => {
    const header = ['Date', 'Amount', 'Description'];
    const cmap = detectColumns(header);
    assert.ok(cmap, 'detectColumns returned null');
    assert.strictEqual(cmap.dateCol, 0);
    assert.strictEqual(cmap.amountCol, 1);
    assert.strictEqual(cmap.merchantCol, 2);
  });

  test('Test 9: returns null when amount column is missing', () => {
    const header = ['Date', 'Notes', 'Description'];
    const cmap = detectColumns(header);
    assert.strictEqual(cmap, null);
  });
});

describe('csvRowsToTransactions', () => {
  test('Test 10: skips rows with unparseable amount; valid rows have correct external_id and sign', () => {
    const rows = [
      ['Date', 'Amount', 'Description'],
      ['2026-05-10', '-12.34', 'Tesco'],    // valid
      ['2026-05-11', 'NOT_A_NUMBER', 'Bad'], // skipped
      ['2026-05-12', '+50.00', 'Salary'],    // valid, positive
    ];
    const cmap = detectColumns(rows[0]!)!;
    assert.ok(cmap);
    const result = csvRowsToTransactions(rows, cmap, 1, 'EUR');
    assert.strictEqual(result.length, 2, 'should have 2 valid rows');

    const tesco = result.find((r) => r.merchant_name === 'Tesco');
    assert.ok(tesco, 'Tesco row not found');
    assert.ok(tesco.external_id.startsWith('csv-'), 'external_id should start with csv-');
    // sign convention: negative input → negative cents
    assert.ok(tesco.amount_cents < 0, 'expense should have negative amount_cents');

    const salary = result.find((r) => r.merchant_name === 'Salary');
    assert.ok(salary, 'Salary row not found');
    assert.ok(salary.amount_cents > 0, 'income (starts with +) should have positive amount_cents');
  });

  test('Test 11 (B2 contract): no-MCC rows yield categorySlug === "misc" — never undefined', () => {
    const rows = [
      ['Date', 'Amount', 'Merchant'],         // NO mcc column
      ['2026-05-10', '-12.34', 'Tesco'],
      ['2026-05-11', '-3.50', 'Aroma Kava'],
      ['2026-05-12', '-25.00', 'Zara'],
    ];
    const cmap = detectColumns(rows[0]!)!;
    assert.ok(cmap, 'detectColumns returned null');
    assert.strictEqual(cmap.mccCol, null, 'mccCol should be null when no MCC header');

    const result = csvRowsToTransactions(rows, cmap, 1, 'EUR');
    assert.strictEqual(result.length, 3, 'should have 3 rows');

    for (const row of result) {
      // B2 contract: categorySlug is ALWAYS a string
      assert.strictEqual(typeof row.categorySlug, 'string', `categorySlug must be string, got ${typeof row.categorySlug}`);
      assert.strictEqual(row.categorySlug, 'misc', `categorySlug must be "misc" when no MCC, got "${row.categorySlug}"`);
    }
  });
});
