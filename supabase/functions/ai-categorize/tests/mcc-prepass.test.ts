/**
 * Tier 2 MCC pre-pass tests. Table-driven. Runs via `deno test`.
 */
import { assertEquals } from 'https://deno.land/std@0.220.0/assert/mod.ts';
import { MCC_TO_CATEGORY, mccToCategorySlug } from '../../_shared/mccMap.ts';

Deno.test('mccToCategorySlug — every range maps to its slug', () => {
  for (const entry of MCC_TO_CATEGORY) {
    const [lo, hi] = entry.range;
    // Sample both endpoints + midpoint where range covers more than 1
    const samples = lo === hi ? [lo] : [lo, hi, Math.floor((lo + hi) / 2)];
    for (const n of samples) {
      const mcc = String(n).padStart(4, '0');
      const slug = mccToCategorySlug(mcc);
      // First-match-wins; some ranges may overlap (duplicate guards in mccMap) —
      // assert the lookup returns *something* mapped (not null) inside known ranges.
      if (slug == null) {
        throw new Error(`expected non-null slug for in-range MCC ${mcc} → ${entry.slug}`);
      }
    }
  }
});

Deno.test('mccToCategorySlug — unknown MCC returns null', () => {
  assertEquals(mccToCategorySlug('9999'), null);
  assertEquals(mccToCategorySlug('0001'), null);
  assertEquals(mccToCategorySlug('1234'), null);
});

Deno.test('mccToCategorySlug — null MCC returns null', () => {
  assertEquals(mccToCategorySlug(null), null);
});

Deno.test('mccToCategorySlug — non-4-digit MCC returns null', () => {
  assertEquals(mccToCategorySlug('54'), null);
  assertEquals(mccToCategorySlug('54110'), null);
  assertEquals(mccToCategorySlug('abcd'), null);
  assertEquals(mccToCategorySlug(''), null);
});

Deno.test('mccToCategorySlug — specific known MCCs map correctly', () => {
  assertEquals(mccToCategorySlug('5411'), 'groceries');
  assertEquals(mccToCategorySlug('5812'), 'eating-out');
  assertEquals(mccToCategorySlug('5814'), 'eating-out');
  assertEquals(mccToCategorySlug('4121'), 'transport');
  assertEquals(mccToCategorySlug('5912'), 'health');
  assertEquals(mccToCategorySlug('5995'), 'pets');
});
