/**
 * Manual entry onboarding screen.
 *
 * Allows the user to add a single transaction by filling a simple form
 * (amount, merchant, date, category). Navigates to the dashboard after insert.
 *
 * Design: token-only colors, no inline hex, no emoji icons. All Pressables a11y-labelled.
 * Security: description is always null (Phase 1 — no free-text to DB).
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  SafeAreaView,
  ScrollView,
  Pressable,
  Modal,
  FlatList,
  StyleSheet,
  type PressableStateCallbackType,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { COLORS, SPACING, RADIUS, SHADOWS } from '@design/tokens';
import { TYPE } from '@design/typography';
import { useOnboardingStore } from '@stores/onboarding';
import { PressableButton } from '@components/PressableButton';
import { TextField } from '@components/TextField';

import { parseAmount, toCents } from '@lib/money';
import { nowSeconds, startOfDaySeconds } from '@lib/time';
import { insertManyTransactions } from '@data/transactionsRepo';
import { listCategories, type CategoryRow } from '@data/categoriesRepo';
import { ensureDefaultAccount } from '@data/accountsRepo';
import { upsertForMerchant } from '@data/merchantOverridesRepo';
import { djb2 } from '@lib/csv/mappers';

// ---------------------------------------------------------------------------
// Date quick-pick options
// ---------------------------------------------------------------------------

type DateOption = 'today' | 'yesterday' | '2daysago';

function getDateSeconds(option: DateOption): number {
  const now = nowSeconds();
  const dayStart = startOfDaySeconds(now);
  const offset = option === 'today' ? 0 : option === 'yesterday' ? 86400 : 2 * 86400;
  // noon of the selected day (avoids midnight edge cases)
  return dayStart - offset + 12 * 3600;
}

// ---------------------------------------------------------------------------
// ManualScreen
// ---------------------------------------------------------------------------

export default function ManualScreen(): React.JSX.Element {
  const { t } = useTranslation();
  const router = useRouter();

  // Form state
  const [amount, setAmount] = useState('');
  const [merchant, setMerchant] = useState('');
  const [dateOption, setDateOption] = useState<DateOption>('today');
  const [categoryId, setCategoryId] = useState<number | null>(null);
  const [categoryName, setCategoryName] = useState('');

  // UI state
  const [categoryModalVisible, setCategoryModalVisible] = useState(false);
  const [categories, setCategories] = useState<CategoryRow[]>([]);
  const [amountError, setAmountError] = useState<string | null>(null);
  const [merchantError, setMerchantError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Validation
  const amountFloat = parseAmount(amount);
  const isValid =
    amountFloat !== null && amountFloat !== 0 &&
    merchant.trim().length > 0 &&
    categoryId !== null;

  // Open category picker
  const openCategoryPicker = () => {
    const cats = listCategories();
    setCategories(cats);
    setCategoryModalVisible(true);
  };

  const selectCategory = (row: CategoryRow) => {
    setCategoryId(row.id);
    setCategoryName(row.name_en);
    setCategoryModalVisible(false);
  };

  const handleSubmit = () => {
    // Validate
    let valid = true;
    if (amountFloat === null || amountFloat === 0) {
      setAmountError(t('common.invalid_amount'));
      valid = false;
    } else {
      setAmountError(null);
    }
    if (merchant.trim().length === 0) {
      setMerchantError(t('common.required'));
      valid = false;
    } else {
      setMerchantError(null);
    }
    if (!valid || categoryId === null || amountFloat === null) return;

    setSubmitting(true);
    try {
      const accountId = ensureDefaultAccount('manual');
      const nowSec = nowSeconds();

      // Sign convention: positive amount (or starts with '+') = income
      // negative or unmodified = expense (manual defaults to expense)
      const rawStr = amount.trim();
      const startsWithPlus = rawStr.startsWith('+');
      let signedFloat: number;
      if (startsWithPlus) {
        signedFloat = Math.abs(amountFloat);
      } else {
        // Manual entry defaults to expense (negative)
        signedFloat = -Math.abs(amountFloat);
      }
      const amount_cents = toCents(signedFloat);

      const dateSec = getDateSeconds(dateOption);
      const trimmedMerchant = merchant.trim().slice(0, 120);
      const externalId = `manual-${nowSec}-${djb2(trimmedMerchant + amount)}`;

      const result = insertManyTransactions([
        {
          amount_cents,
          currency: 'EUR',
          merchant_name: trimmedMerchant,
          merchant_id: null,
          mcc_code: null,
          category_id: categoryId,
          account_id: accountId,
          description: null,
          date: dateSec,
          source: 'manual',
          external_id: externalId,
          created_at: nowSec,
        },
      ]);

      if (result.inserted > 0) {
        // Seed merchant override — failure is silent, not blocking.
        // Phase 3 / 03-02 rewrite: upsert through the new exact-match repo.
        // Manual entry is a user correction → source='user', confidence=1.0.
        try {
          upsertForMerchant({
            merchant_name: trimmedMerchant,
            category_id: categoryId,
            source: 'user',
            confidence: 1.0,
          });
        } catch {
          // Silent — override is best-effort
        }
        useOnboardingStore.getState().setDataSource('manual');
        useOnboardingStore.getState().setCompleted(true);
        router.replace('/(tabs)');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const dateLabels: Record<DateOption, string> = {
    today: t('onboarding.manual_today'),
    yesterday: t('onboarding.manual_yesterday'),
    '2daysago': t('onboarding.manual_2_days_ago'),
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Form card */}
        <View style={styles.card}>
          <TextField
            label={t('onboarding.manual_amount')}
            value={amount}
            onChangeText={setAmount}
            keyboardType="decimal-pad"
            placeholder="0.00"
            autoCapitalize="none"
            error={amountError}
            testID="manual-amount-input"
            accessibilityLabel={t('onboarding.manual_amount')}
          />

          <TextField
            label={t('onboarding.manual_merchant')}
            value={merchant}
            onChangeText={setMerchant}
            placeholder="Tesco"
            autoCapitalize="words"
            error={merchantError}
            testID="manual-merchant-input"
            accessibilityLabel={t('onboarding.manual_merchant')}
          />

          {/* Date quick-pick */}
          <Text style={styles.fieldLabel}>{t('onboarding.manual_date')}</Text>
          <View style={styles.dateRow}>
            {(['today', 'yesterday', '2daysago'] as DateOption[]).map((opt) => (
              <Pressable
                key={opt}
                onPress={() => setDateOption(opt)}
                accessibilityRole="button"
                accessibilityLabel={dateLabels[opt]}
                accessibilityState={{ selected: dateOption === opt }}
                style={({ pressed }: PressableStateCallbackType) => [
                  styles.datePill,
                  dateOption === opt && styles.datePillSelected,
                  pressed && styles.datePillPressed,
                ]}
              >
                <Text
                  style={[
                    styles.datePillText,
                    dateOption === opt && styles.datePillTextSelected,
                  ]}
                >
                  {dateLabels[opt]}
                </Text>
              </Pressable>
            ))}
          </View>

          {/* Category picker */}
          <Text style={styles.fieldLabel}>{t('onboarding.manual_category')}</Text>
          <Pressable
            onPress={openCategoryPicker}
            accessibilityRole="button"
            accessibilityLabel={t('onboarding.manual_category')}
            style={({ pressed }: PressableStateCallbackType) => [
              styles.categoryButton,
              pressed && styles.categoryButtonPressed,
            ]}
          >
            <Text
              style={[
                styles.categoryButtonText,
                categoryId == null && styles.categoryButtonPlaceholder,
              ]}
            >
              {categoryId != null ? categoryName : t('onboarding.manual_category')}
            </Text>
          </Pressable>
        </View>

        {/* Submit */}
        <View style={styles.actions}>
          <PressableButton
            label={t('onboarding.manual_submit')}
            onPress={handleSubmit}
            disabled={!isValid || submitting}
            accessibilityLabel={t('onboarding.manual_submit')}
            testID="manual-submit-button"
          />
        </View>
      </ScrollView>

      {/* Category modal */}
      <Modal
        visible={categoryModalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setCategoryModalVisible(false)}
        accessibilityViewIsModal
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <Text style={styles.modalTitle}>{t('onboarding.manual_category')}</Text>
            <FlatList
              data={categories}
              keyExtractor={(item) => String(item.id)}
              renderItem={({ item }) => (
                <Pressable
                  onPress={() => selectCategory(item)}
                  accessibilityRole="button"
                  accessibilityLabel={item.name_en}
                  style={({ pressed }: PressableStateCallbackType) => [
                    styles.categoryRow,
                    pressed && styles.categoryRowPressed,
                  ]}
                >
                  <Text style={styles.categoryRowText}>{item.name_en}</Text>
                </Pressable>
              )}
            />
            <PressableButton
              label={t('common.cancel')}
              onPress={() => setCategoryModalVisible(false)}
              variant="secondary"
              accessibilityLabel={t('common.cancel')}
            />
          </View>
        </View>
      </Modal>
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
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    padding: SPACING.lg,
    ...SHADOWS.card,
    marginBottom: SPACING.lg,
  },
  fieldLabel: {
    ...TYPE.uiLabel,
    color: COLORS.textSecondary,
    marginBottom: SPACING.xs,
    marginTop: SPACING.sm,
  },
  dateRow: {
    flexDirection: 'row',
    gap: SPACING.sm,
    marginBottom: SPACING.sm,
  },
  datePill: {
    flex: 1,
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.sm,
    borderRadius: RADIUS.pill,
    backgroundColor: COLORS.background,
    alignItems: 'center',
    minHeight: 44,
    justifyContent: 'center',
  },
  datePillSelected: {
    backgroundColor: COLORS.accent,
  },
  datePillPressed: {
    opacity: 0.8,
  },
  datePillText: {
    ...TYPE.uiMeta,
    color: COLORS.textSecondary,
  },
  datePillTextSelected: {
    color: COLORS.white,
  },
  categoryButton: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.md,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md,
    minHeight: 44,
    borderWidth: 1,
    borderColor: COLORS.textMuted,
    justifyContent: 'center',
  },
  categoryButtonPressed: {
    opacity: 0.8,
  },
  categoryButtonText: {
    ...TYPE.uiBody,
    color: COLORS.textPrimary,
  },
  categoryButtonPlaceholder: {
    color: COLORS.textMuted,
  },
  actions: {
    marginTop: SPACING.sm,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: COLORS.textPrimary,
    justifyContent: 'flex-end',
    opacity: 0.9,
  },
  modalSheet: {
    backgroundColor: COLORS.background,
    borderTopLeftRadius: RADIUS.xl,
    borderTopRightRadius: RADIUS.xl,
    padding: SPACING.lg,
    maxHeight: '70%',
    opacity: 1,
  },
  modalTitle: {
    ...TYPE.displayM,
    color: COLORS.textPrimary,
    marginBottom: SPACING.md,
  },
  categoryRow: {
    paddingVertical: SPACING.md,
    minHeight: 44,
    justifyContent: 'center',
    borderBottomWidth: 1,
    borderBottomColor: COLORS.background,
  },
  categoryRowPressed: {
    opacity: 0.6,
  },
  categoryRowText: {
    ...TYPE.uiBody,
    color: COLORS.textPrimary,
  },
});
