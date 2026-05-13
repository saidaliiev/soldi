/**
 * monobank onboarding screen.
 *
 * Token paste + sync flow with state machine:
 * 'paste' → 'validating' → 'fetching-client' → 'fetching-statement' → 'inserting' → 'done' | 'error'
 *
 * Security guarantees:
 * - Token appears ONLY as X-Token header (never logged, never in URL, never re-displayed).
 * - Token is saved to expo-secure-store AFTER all API calls succeed.
 * - Error messages use i18n keys — HttpError.bodyText (already redacted) is never shown to user.
 * - No console.log/warn/error anywhere in this file.
 * - monobank Phase 1: primary account only (client.accounts[0]) — multi-account deferred.
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  SafeAreaView,
  ScrollView,
  StyleSheet,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { COLORS, SPACING, RADIUS, SHADOWS } from '@design/tokens';
import { TYPE } from '@design/typography';
import { useOnboardingStore } from '@stores/onboarding';
import { PressableButton } from '@components/PressableButton';
import { TextField } from '@components/TextField';

import { getMonobankClient, getMonobankStatement } from '@api/monobank';
import { mapMonobankItems } from '@lib/monobank/mapper';
import { secureSet } from '@lib/secure';
import { nowSeconds } from '@lib/time';
import { insertManyTransactions } from '@data/transactionsRepo';
import { getCategoryIdBySlug } from '@data/categoriesRepo';
import { ensureDefaultAccount } from '@data/accountsRepo';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type Phase =
  | 'paste'
  | 'validating'
  | 'fetching-client'
  | 'fetching-statement'
  | 'inserting'
  | 'done'
  | 'error';

// ---------------------------------------------------------------------------
// MonobankScreen
// ---------------------------------------------------------------------------

export default function MonobankScreen(): React.JSX.Element {
  const { t } = useTranslation();
  const router = useRouter();

  const [token, setToken] = useState('');
  const [phase, setPhase] = useState<Phase>('paste');
  const [errMsg, setErrMsg] = useState('');

  const isConnecting = phase !== 'paste' && phase !== 'error' && phase !== 'done';

  const phaseLabel: Record<Phase, string> = {
    paste: '',
    validating: t('onboarding.monobank_phase_validating'),
    'fetching-client': t('onboarding.monobank_phase_fetching_client'),
    'fetching-statement': t('onboarding.monobank_phase_fetching_statement'),
    inserting: t('onboarding.monobank_phase_inserting'),
    done: t('onboarding.monobank_phase_done'),
    error: '',
  };

  const handleConnect = async () => {
    const trimmedToken = token.trim();

    // Step 1: Validate token shape
    setPhase('validating');
    if (trimmedToken.length !== 44) {
      setErrMsg(t('onboarding.monobank_invalid_token'));
      setPhase('error');
      return;
    }

    // Step 2: Fetch client info
    setPhase('fetching-client');
    let client;
    try {
      client = await getMonobankClient(trimmedToken);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes('Rate limited')) {
        setErrMsg(t('onboarding.monobank_rate_limited'));
      } else if (msg.includes('Invalid monobank token') || msg.includes('rejected')) {
        setErrMsg(t('onboarding.monobank_token_rejected'));
      } else {
        setErrMsg(t('onboarding.monobank_token_rejected'));
      }
      setPhase('error');
      return;
    }

    // Step 3: Use primary account only (B3 — multi-account deferred to Phase 5)
    const primaryAccount = client.accounts[0];
    if (primaryAccount === undefined) {
      setErrMsg(t('onboarding.monobank_token_rejected'));
      setPhase('error');
      return;
    }

    const accountId = primaryAccount.id;

    // Step 4: Fetch 31 days of statement
    setPhase('fetching-statement');
    const toSec = nowSeconds();
    const fromSec = toSec - 31 * 86400 + 60; // 31 days - 1 min (API max window)
    let items;
    try {
      items = await getMonobankStatement(trimmedToken, accountId, fromSec, toSec);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes('Rate limited')) {
        setErrMsg(t('onboarding.monobank_rate_limited'));
      } else {
        setErrMsg(t('onboarding.monobank_token_rejected'));
      }
      setPhase('error');
      return;
    }

    // Step 5: Map and insert
    setPhase('inserting');
    const nowSec = nowSeconds();
    const dbAccount = ensureDefaultAccount('monobank');
    const mapped = mapMonobankItems(items, nowSec);

    const rows = mapped
      .map((r) => ({
        amount_cents: r.amount_cents,
        currency: r.currency,
        merchant_name: r.merchant_name,
        merchant_id: r.merchant_id,
        mcc_code: r.mcc_code,
        category_id: getCategoryIdBySlug(r.categorySlug),
        account_id: dbAccount,
        description: r.description,
        date: r.date,
        source: r.source,
        external_id: r.external_id,
        created_at: r.created_at,
      }))
      .filter((r) => r.category_id !== null);

    insertManyTransactions(
      rows as Parameters<typeof insertManyTransactions>[0][number][],
    );

    // Step 6: Persist token AFTER successful sync (never before)
    await secureSet('monobank_token', trimmedToken);

    useOnboardingStore.getState().setDataSource('monobank');
    useOnboardingStore.getState().setCompleted(true);
    setPhase('done');
    router.replace('/(tabs)');
  };

  const handleRetry = () => {
    setErrMsg('');
    setPhase('paste');
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Explainer */}
        <Text style={styles.explainer}>
          {t('onboarding.monobank_explainer')}
        </Text>

        {/* Token field — shown on paste and error phases */}
        {(phase === 'paste' || phase === 'error') && (
          <View style={styles.card}>
            <TextField
              label={t('onboarding.monobank_token_label')}
              value={token}
              onChangeText={setToken}
              multiline
              autoCapitalize="none"
              secureTextEntry
              testID="monobank-token-input"
              accessibilityLabel={t('onboarding.monobank_token_label')}
            />
          </View>
        )}

        {/* Progress indicator — shown during async phases */}
        {isConnecting && (
          <Text
            style={styles.progressText}
            accessibilityLiveRegion="polite"
            accessibilityLabel={phaseLabel[phase]}
          >
            {phaseLabel[phase]}
          </Text>
        )}

        {/* Error message */}
        {phase === 'error' && errMsg.length > 0 && (
          <View style={styles.errorCard}>
            <Text style={styles.errorText}>{errMsg}</Text>
          </View>
        )}

        {/* Actions */}
        <View style={styles.actions}>
          {phase === 'paste' && (
            <PressableButton
              label={t('onboarding.monobank_connect')}
              onPress={() => { void handleConnect(); }}
              disabled={token.trim().length !== 44}
              accessibilityLabel={t('onboarding.monobank_connect')}
              testID="monobank-connect-button"
            />
          )}
          {phase === 'error' && (
            <PressableButton
              label={t('onboarding.monobank_try_again')}
              onPress={handleRetry}
              variant="secondary"
              accessibilityLabel={t('onboarding.monobank_try_again')}
              testID="monobank-retry-button"
            />
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

// ---------------------------------------------------------------------------
// Styles — token-only, no inline hex
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  content: {
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.xl,
    paddingBottom: SPACING.xxl,
  },
  explainer: {
    ...TYPE.editorialBody,
    color: COLORS.textSecondary,
    marginBottom: SPACING.lg,
  },
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    padding: SPACING.lg,
    ...SHADOWS.card,
    marginBottom: SPACING.lg,
  },
  progressText: {
    ...TYPE.editorialBody,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginVertical: SPACING.xl,
  },
  errorCard: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    marginBottom: SPACING.md,
    borderLeftWidth: 3,
    borderLeftColor: COLORS.error,
  },
  errorText: {
    ...TYPE.uiBody,
    color: COLORS.error,
  },
  actions: {
    marginTop: SPACING.sm,
  },
});
