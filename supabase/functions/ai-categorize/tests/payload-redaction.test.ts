/**
 * GDPR safety tests for the zod-strict request + payload schemas.
 *
 * These tests prove that:
 *   - CategorizeRequest rejects a description field smuggled into a tx
 *   - CategorizeRequest rejects a notes field at the tx level
 *   - HaikuPayload constructed from a valid row has exactly the 4 known keys
 *   - HaikuPayload .strict() rejects any extra key at parse time
 */
import { assertEquals, assertThrows } from 'https://deno.land/std@0.220.0/assert/mod.ts';
import { CategorizeRequest, HaikuPayload, bucketize } from '../../_shared/schemas.ts';

Deno.test('CategorizeRequest rejects description on tx', () => {
  assertThrows(
    () => {
      CategorizeRequest.parse({
        transactions: [
          { tx_id: 1, merchant_name: 'Tesco', mcc: '5411', amount_cents: -1250, description: 'leak attempt' },
        ],
      });
    },
    Error,
  );
});

Deno.test('CategorizeRequest rejects notes on tx', () => {
  assertThrows(
    () => {
      CategorizeRequest.parse({
        transactions: [
          { tx_id: 2, merchant_name: 'Aldi', mcc: '5411', amount_cents: -3300, notes: 'hello' },
        ],
      });
    },
    Error,
  );
});

Deno.test('CategorizeRequest rejects unknown top-level keys', () => {
  assertThrows(
    () => {
      CategorizeRequest.parse({
        transactions: [{ tx_id: 1, merchant_name: 'Tesco', mcc: '5411', amount_cents: -100 }],
        secret_field: 'oops',
      });
    },
    Error,
  );
});

Deno.test('HaikuPayload constructed from row has exactly 4 keys', () => {
  const payload = HaikuPayload.parse({
    merchant_name: 'Tesco',
    mcc: '5411',
    amount_sign: 'expense',
    amount_bucket: bucketize(1250),
  });
  const keys = Object.keys(payload).sort();
  assertEquals(keys, ['amount_bucket', 'amount_sign', 'mcc', 'merchant_name']);
});

Deno.test('HaikuPayload rejects extra fields', () => {
  assertThrows(
    () => {
      HaikuPayload.parse({
        merchant_name: 'Tesco',
        mcc: '5411',
        amount_sign: 'expense',
        amount_bucket: 'small',
        description: 'extra',
      });
    },
    Error,
  );
});

Deno.test('bucketize boundaries are correct', () => {
  assertEquals(bucketize(0), 'tiny');
  assertEquals(bucketize(499), 'tiny');
  assertEquals(bucketize(500), 'small');
  assertEquals(bucketize(4999), 'small');
  assertEquals(bucketize(5000), 'medium');
  assertEquals(bucketize(19999), 'medium');
  assertEquals(bucketize(20000), 'large');
  assertEquals(bucketize(99999), 'large');
  assertEquals(bucketize(100000), 'huge');
});

Deno.test('CategorizeRequest accepts a valid minimal request', () => {
  const parsed = CategorizeRequest.parse({
    transactions: [
      { tx_id: 1, merchant_name: 'Tesco', mcc: '5411', amount_cents: -1250 },
      { tx_id: 2, merchant_name: 'Salary', mcc: null, amount_cents: 250000 },
    ],
  });
  assertEquals(parsed.transactions.length, 2);
  assertEquals(parsed.transactions[0].mcc, '5411');
  assertEquals(parsed.transactions[1].mcc, null);
});

Deno.test('CategorizeRequest enforces batch size cap (max 50)', () => {
  const tooMany = Array.from({ length: 51 }, (_, i) => ({
    tx_id: i + 1,
    merchant_name: 'Tesco',
    mcc: '5411',
    amount_cents: -100,
  }));
  assertThrows(
    () => CategorizeRequest.parse({ transactions: tooMany }),
    Error,
  );
});
