/**
 * Synthetic data onboarding screen.
 *
 * Runs the pure generator, inserts rows into op-sqlite, then navigates to the
 * dashboard. Shows live progress feedback via accessibilityLiveRegion.
 *
 * Security: no console.log of row contents — only counts logged (T-01-03-03).
 * Idempotency: insertManyTransactions uses INSERT OR IGNORE with unique
 * (source, external_id) — re-running the screen never doubles data (T-01-03-04).
 */

import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  SafeAreaView,
  ScrollView,
  StyleSheet,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { COLORS, SPACING } from '@design/tokens';
import { TYPE } from '@design/typography';
import { useOnboardingStore } from '@stores/onboarding';
import { PressableButton } from '@components/PressableButton';

import { generateSyntheticTransactions } from '@lib/synthetic/generator';
import type { SyntheticConfig } from '@lib/synthetic/generator';
import type { CategorySlug } from '@lib/synthetic/mcc';

import { getCategoryIdBySlug } from '@data/categoriesRepo';
import { ensureDefaultAccount } from '@data/accountsRepo';
import { insertManyTransactions } from '@data/transactionsRepo';
import type { InsertableTransaction } from '@data/transactionsRepo';
import { nowSeconds } from '@lib/time';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type Phase = 'idle' | 'generating' | 'inserting' | 'done' | 'error';

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function SyntheticScreen(): React.JSX.Element {
  const { t } = useTranslation();
  const router = useRouter();

  const [phase, setPhase] = useState<Phase>('idle');
  const [count, setCount] = useState<number>(0);
  const [errMsg, setErrMsg] = useState<string | null>(null);

  function reset(): void {
    setPhase('idle');
    setCount(0);
    setErrMsg(null);
  }

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      try {
        setPhase('generating');

        // 1. Ensure account exists for synthetic source
        const accountId = ensureDefaultAccount('synthetic');

        // 2. Build category resolver — getCategoryIdBySlug does a DB round-trip;
        //    acceptable here (called once per unique slug, not per row).
        const resolver = (slug: CategorySlug): number | null =>
          getCategoryIdBySlug(slug);

        // 3. Build generator config
        const cfg: SyntheticConfig = {
          seed: Math.floor(Date.now() / 1000),
          days: 90,
          minPerDay: 3,
          maxPerDay: 6,
          nowSeconds: nowSeconds(),
          ieRatio: 0.7,
          categoryIdResolver: resolver,
        };

        // 4. Generate rows (pure fn — no DB)
        const syntheticRows = generateSyntheticTransactions(cfg);

        if (cancelled) return;
        setCount(syntheticRows.length);
        setPhase('inserting');

        // 5. Map to insertable shape (add account_id, merchant_id)
        const insertable: InsertableTransaction[] = syntheticRows.map((r) => ({
          amount_cents: r.amount_cents,
          currency: r.currency,
          merchant_name: r.merchant_name,
          merchant_id: null,
          mcc_code: r.mcc_code,
          category_id: r.category_id,
          account_id: accountId,
          description: r.description,
          date: r.date,
          source: r.source,
          external_id: r.external_id,
          created_at: r.created_at,
        }));

        // 6. Bulk insert (BEGIN/COMMIT, INSERT OR IGNORE — idempotent)
        insertManyTransactions(insertable);

        if (cancelled) return;
        setPhase('done');

        // 7. Mark onboarding complete and navigate to dashboard
        useOnboardingStore.getState().setDataSource('synthetic');
        useOnboardingStore.getState().setCompleted(true);
        router.replace('/(tabs)');
      } catch (err: unknown) {
        if (cancelled) return;
        setPhase('error');
        if (err instanceof Error) {
          setErrMsg(err.message);
        } else {
          setErrMsg(String(err));
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [router]);

  // ---------------------------------------------------------------------------
  // Status text for accessibility live region
  // ---------------------------------------------------------------------------

  const statusText = (): string => {
    switch (phase) {
      case 'generating':
        return t('onboarding.synthetic_loading_title');
      case 'inserting':
        return `Inserting ${count} transactions…`;
      case 'done':
        return `Done — ${count} transactions loaded.`;
      case 'error':
        return `Error: ${errMsg ?? 'Unknown error'}`;
      default:
        return t('onboarding.synthetic_loading_title');
    }
  };

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <SafeAreaView style={styles.safeArea} accessibilityLabel="Synthetic data loading screen">
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.title}>
          {t('onboarding.synthetic_loading_title')}
        </Text>

        <Text
          style={[styles.status, phase === 'error' && styles.statusError]}
          accessibilityLiveRegion="polite"
          accessibilityLabel={statusText()}
        >
          {statusText()}
        </Text>

        {phase === 'error' && errMsg != null && (
          <View style={styles.retryContainer}>
            <PressableButton
              label="Retry"
              onPress={reset}
              accessibilityLabel="Retry loading sample data"
            />
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  content: {
    flex: 1,
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.xxl,
    paddingBottom: SPACING.xxl,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    ...TYPE.displayM,
    color: COLORS.textPrimary,
    textAlign: 'center',
    marginBottom: SPACING.lg,
  },
  status: {
    ...TYPE.editorialBody,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginBottom: SPACING.xl,
  },
  statusError: {
    color: COLORS.error,
  },
  retryContainer: {
    marginTop: SPACING.lg,
    minWidth: 200,
  },
});
