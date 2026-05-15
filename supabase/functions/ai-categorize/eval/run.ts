/**
 * Eval harness for the ai-categorize 3-tier resolver.
 *
 * Phase 3 success criterion #1 — Haiku accuracy ≥ 85% on the curated
 * 100-tx fixture set lives or dies on this script.
 *
 * Runs each fixture through the same logical pipeline as the Edge Function:
 *   Tier 1 (skipped — no overrides in eval scope)
 *   Tier 2 — mccToCategorySlug pre-pass
 *   Tier 3 — single-row Anthropic Haiku call with tool-use forced
 * Compares slug to expected_category_slug. Accumulates accuracy + a
 * confusion table. Exits non-zero if accuracy < 0.85.
 *
 * Cost: Anthropic Haiku is billable. Gate this behind workflow_dispatch in
 * CI (do NOT run on every PR). Local dev runs are at developer discretion.
 *
 * Run:
 *   ANTHROPIC_API_KEY=sk-ant-... deno run --allow-env --allow-net \
 *     supabase/functions/ai-categorize/eval/run.ts
 */

import Anthropic from 'npm:@anthropic-ai/sdk@0.32.1';
import { HaikuPayload, bucketize } from '../../_shared/schemas.ts';
import { mccToCategorySlug } from '../../_shared/mccMap.ts';
import { CATEGORIZE_SYSTEM_PROMPT, CATEGORY_SLUGS, categorizeUserMessage } from '../../_shared/prompts.ts';

type Fixture = {
  merchant_name: string;
  mcc: string | null;
  amount_cents: number;
  expected_category_slug: string;
};

const MODEL_ID = 'claude-haiku-4-5';
const CONCURRENCY = 5;
const ACCURACY_GATE = 0.85;

async function main() {
  const apiKey = Deno.env.get('ANTHROPIC_API_KEY');
  if (!apiKey) {
    console.error('ANTHROPIC_API_KEY missing — eval is API-bound and cannot proceed.');
    Deno.exit(2);
  }

  const fixturesUrl = new URL('./fixtures.json', import.meta.url);
  const fixturesText = await Deno.readTextFile(fixturesUrl);
  const fixtures: Fixture[] = JSON.parse(fixturesText);
  console.log(`Loaded ${fixtures.length} fixtures.`);

  const anthropic = new Anthropic({ apiKey });

  let correct = 0;
  let tier2Count = 0;
  let tier3Count = 0;
  const confusion: Record<string, Record<string, number>> = {};
  const wrong: Array<{ fixture: Fixture; actual: string }> = [];

  // Pre-resolve Tier 2 hits (synchronous), then send the rest to Tier 3.
  const tier3Queue: Array<{ idx: number; fixture: Fixture; payload: HaikuPayload }> = [];
  const results: Array<{ idx: number; actual: string }> = new Array(fixtures.length);

  for (let i = 0; i < fixtures.length; i++) {
    const f = fixtures[i];
    const t2 = mccToCategorySlug(f.mcc);
    if (t2 != null) {
      tier2Count++;
      results[i] = { idx: i, actual: t2 };
    } else {
      const payload = HaikuPayload.parse({
        merchant_name: f.merchant_name,
        mcc: f.mcc,
        amount_sign: f.amount_cents < 0 ? 'expense' : 'income',
        amount_bucket: bucketize(Math.abs(f.amount_cents)),
      });
      tier3Queue.push({ idx: i, fixture: f, payload });
    }
  }

  console.log(`Tier 2 (MCC pre-pass) resolved ${tier2Count} fixtures.`);
  console.log(`Tier 3 (Haiku) will resolve ${tier3Queue.length} fixtures with concurrency=${CONCURRENCY}.`);

  const TOOL = {
    name: 'assign_category',
    description: 'Assign a single category slug + confidence to the transaction.',
    input_schema: {
      type: 'object' as const,
      properties: {
        category_slug: { type: 'string' as const, enum: [...CATEGORY_SLUGS] },
        confidence: { type: 'number' as const, minimum: 0, maximum: 1 },
        rationale: { type: 'string' as const, maxLength: 200 },
      },
      required: ['category_slug', 'confidence'],
      additionalProperties: false,
    },
  };

  for (let i = 0; i < tier3Queue.length; i += CONCURRENCY) {
    const chunk = tier3Queue.slice(i, i + CONCURRENCY);
    const settled = await Promise.allSettled(
      chunk.map(async (q) => {
        const userMsg = categorizeUserMessage([q.payload]);
        const resp = await anthropic.messages.create({
          model: MODEL_ID,
          max_tokens: 256,
          system: CATEGORIZE_SYSTEM_PROMPT,
          tools: [TOOL],
          tool_choice: { type: 'tool', name: 'assign_category' },
          messages: [{ role: 'user', content: userMsg }],
        });
        let slug: string | null = null;
        for (const block of resp.content) {
          if (block.type === 'tool_use' && block.name === 'assign_category') {
            const input = block.input as { category_slug?: unknown };
            if (typeof input.category_slug === 'string') slug = input.category_slug;
            break;
          }
        }
        if (slug == null) throw new Error('haiku_no_slug');
        return { idx: q.idx, actual: slug };
      }),
    );

    for (let j = 0; j < settled.length; j++) {
      const r = settled[j];
      const q = chunk[j];
      if (r.status === 'fulfilled') {
        tier3Count++;
        results[q.idx] = r.value;
      } else {
        results[q.idx] = { idx: q.idx, actual: 'misc' }; // fallback so accuracy reflects reality
        console.error(`Haiku failed for fixture ${q.idx} (${q.fixture.merchant_name}):`, r.reason);
      }
    }
  }

  // Score
  for (let i = 0; i < fixtures.length; i++) {
    const f = fixtures[i];
    const actual = results[i].actual;
    confusion[f.expected_category_slug] = confusion[f.expected_category_slug] ?? {};
    confusion[f.expected_category_slug][actual] = (confusion[f.expected_category_slug][actual] ?? 0) + 1;
    if (actual === f.expected_category_slug) {
      correct++;
    } else {
      wrong.push({ fixture: f, actual });
    }
  }

  const accuracy = correct / fixtures.length;
  console.log('\n=== Confusion Table (expected → actual : count) ===');
  for (const expected of Object.keys(confusion).sort()) {
    for (const actual of Object.keys(confusion[expected]).sort()) {
      const tag = actual === expected ? '✓' : '✗';
      console.log(`  ${tag} ${expected.padEnd(15)} → ${actual.padEnd(15)} ${confusion[expected][actual]}`);
    }
  }

  if (wrong.length > 0) {
    console.log('\n=== Misclassifications ===');
    for (const w of wrong) {
      console.log(`  ${w.fixture.merchant_name} (mcc=${w.fixture.mcc}) expected=${w.fixture.expected_category_slug} got=${w.actual}`);
    }
  }

  console.log('\n=== Summary ===');
  console.log(`Total fixtures:    ${fixtures.length}`);
  console.log(`Tier 2 hits:       ${tier2Count}`);
  console.log(`Tier 3 hits:       ${tier3Count}`);
  console.log(`Correct:           ${correct}`);
  console.log(`Accuracy:          ${(accuracy * 100).toFixed(2)}%`);
  console.log(`Gate (>= ${(ACCURACY_GATE * 100).toFixed(0)}%): ${accuracy >= ACCURACY_GATE ? 'PASS' : 'FAIL'}`);

  if (accuracy < ACCURACY_GATE) {
    Deno.exit(1);
  }
}

main().catch((err) => {
  console.error('eval harness crashed:', err);
  Deno.exit(2);
});
