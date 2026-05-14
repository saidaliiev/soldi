/**
 * SearchFilterModal — full-screen modal route for transactions search +
 * filter composition (UI-SPEC §SearchFilterModal).
 *
 * Behavior contract (D-13..D-16):
 *   - Search input: 48pt, autoFocus, debounced 150ms via useRef timer
 *     (no lodash). Live updates filterStore.setSearch. Stays committed
 *     even if user dismisses without Apply (search is live, per D-15).
 *   - Four accordion sections (Category multi-select, Amount range,
 *     Sign segmented, Date range).
 *   - Apply CTA commits accordion-local state to the store + closes route.
 *   - "Clear all" header button resets store + locals.
 *
 * NOTE: Native @react-native-community/datetimepicker is NOT in package.json
 * from Phase 1. The date range section uses two TextInput rows accepting
 * "YYYY-MM-DD" strings; the modal validates parse-back on Apply. This is
 * the documented T-02-03-08 fallback. A date picker upgrade lands in
 * Phase 5 polish when a dev-client build replaces Expo Go.
 *
 * Security: search input is bound via the filterCompose unit-tested SQL
 * builder — no string interpolation.
 */

import React from 'react';
import {
  SafeAreaView,
  View,
  Text,
  TextInput,
  Pressable,
  ScrollView,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { router, Stack } from 'expo-router';

import { COLORS, SPACING, RADIUS } from '@design/tokens';
import { TYPE } from '@design/typography';
import { listCategoriesEnriched } from '@data/categoriesRepo';
import { parseAmount, toCents } from '@lib/money';
import { CategoryChip } from '@/src/features/transactions/CategoryChip';
import { useFilterStore } from '@/src/features/transactions/filterStore';
import { isEmptyFilter } from '@/src/features/transactions/filterCompose';
import type { Category } from '@data/categoriesRepo';
import type { FilterSign } from '@/src/features/transactions/types';

const SEARCH_DEBOUNCE_MS = 150;

type AccordionKey = 'category' | 'amount' | 'sign' | 'date';

function isValidIsoDate(s: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  const t = new Date(`${s}T00:00:00.000Z`).getTime();
  return Number.isFinite(t);
}

export default function SearchFilterModal(): React.JSX.Element {
  const { t } = useTranslation();
  const storeSearch = useFilterStore((s) => s.search);
  const storeCategoryIds = useFilterStore((s) => s.categoryIds);
  const storeMinCents = useFilterStore((s) => s.minCents);
  const storeMaxCents = useFilterStore((s) => s.maxCents);
  const storeSign = useFilterStore((s) => s.sign);
  const storeDateFrom = useFilterStore((s) => s.dateFromISO);
  const storeDateTo = useFilterStore((s) => s.dateToISO);
  const setSearch = useFilterStore((s) => s.setSearch);
  const setCategoryIds = useFilterStore((s) => s.setCategoryIds);
  const setMinCents = useFilterStore((s) => s.setMinCents);
  const setMaxCents = useFilterStore((s) => s.setMaxCents);
  const setSign = useFilterStore((s) => s.setSign);
  const setDateRange = useFilterStore((s) => s.setDateRange);
  const clearAll = useFilterStore((s) => s.clearAll);

  // --- Local form state (committed to store only on Apply) ----------------
  const [searchInput, setSearchInput] = React.useState<string>(storeSearch);
  const [localCategoryIds, setLocalCategoryIds] = React.useState<number[]>([
    ...storeCategoryIds,
  ]);
  const [localMin, setLocalMin] = React.useState<string>(
    storeMinCents !== null ? (storeMinCents / 100).toFixed(2) : '',
  );
  const [localMax, setLocalMax] = React.useState<string>(
    storeMaxCents !== null ? (storeMaxCents / 100).toFixed(2) : '',
  );
  const [localSign, setLocalSign] = React.useState<FilterSign>(storeSign);
  const [localDateFrom, setLocalDateFrom] = React.useState<string>(
    storeDateFrom !== null ? storeDateFrom.slice(0, 10) : '',
  );
  const [localDateTo, setLocalDateTo] = React.useState<string>(
    storeDateTo !== null ? storeDateTo.slice(0, 10) : '',
  );
  const [expanded, setExpanded] = React.useState<Record<AccordionKey, boolean>>({
    category: false,
    amount: false,
    sign: false,
    date: false,
  });

  const [categories, setCategories] = React.useState<readonly Category[]>([]);

  React.useEffect(() => {
    try {
      setCategories(listCategoriesEnriched());
    } catch {
      setCategories([]);
    }
  }, []);

  // --- Debounced live-search dispatch -------------------------------------
  const debounceRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const handleSearchChange = React.useCallback(
    (next: string) => {
      setSearchInput(next);
      if (debounceRef.current !== null) {
        clearTimeout(debounceRef.current);
      }
      debounceRef.current = setTimeout(() => {
        setSearch(next);
      }, SEARCH_DEBOUNCE_MS);
    },
    [setSearch],
  );

  React.useEffect(() => {
    return () => {
      if (debounceRef.current !== null) clearTimeout(debounceRef.current);
    };
  }, []);

  const toggleCategoryId = React.useCallback((id: number) => {
    setLocalCategoryIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  }, []);

  const toggleSection = React.useCallback((key: AccordionKey) => {
    setExpanded((prev) => ({ ...prev, [key]: !prev[key] }));
  }, []);

  // --- Apply CTA -----------------------------------------------------------
  const handleApply = React.useCallback(() => {
    setCategoryIds(localCategoryIds);
    const minParsed = parseAmount(localMin);
    setMinCents(minParsed != null ? toCents(minParsed) : null);
    const maxParsed = parseAmount(localMax);
    setMaxCents(maxParsed != null ? toCents(maxParsed) : null);
    setSign(localSign);

    const fromISO = isValidIsoDate(localDateFrom)
      ? new Date(`${localDateFrom}T00:00:00.000Z`).toISOString()
      : null;
    const toISO = isValidIsoDate(localDateTo)
      ? new Date(`${localDateTo}T23:59:59.999Z`).toISOString()
      : null;
    setDateRange(fromISO, toISO);

    router.back();
  }, [
    localCategoryIds,
    localMin,
    localMax,
    localSign,
    localDateFrom,
    localDateTo,
    setCategoryIds,
    setMinCents,
    setMaxCents,
    setSign,
    setDateRange,
  ]);

  const handleClearAll = React.useCallback(() => {
    clearAll();
    setSearchInput('');
    setLocalCategoryIds([]);
    setLocalMin('');
    setLocalMax('');
    setLocalSign('both');
    setLocalDateFrom('');
    setLocalDateTo('');
  }, [clearAll]);

  const anyAxisActive = !isEmptyFilter({
    search: searchInput,
    categoryIds: localCategoryIds,
    minCents: localMin.length > 0 ? 0 : null,
    maxCents: localMax.length > 0 ? 0 : null,
    sign: localSign,
    dateFromISO: localDateFrom.length > 0 ? localDateFrom : null,
    dateToISO: localDateTo.length > 0 ? localDateTo : null,
  });

  return (
    <SafeAreaView style={styles.safe} accessibilityLabel="Search and filter">
      <Stack.Screen options={{ headerShown: false, presentation: 'modal' }} />

      <View style={styles.header}>
        <Pressable
          onPress={() => router.back()}
          accessibilityRole="button"
          accessibilityLabel="Close"
          hitSlop={12}
          style={styles.headerSide}
        >
          <Text style={styles.headerClose} allowFontScaling>
            ✕
          </Text>
        </Pressable>
        <Text style={styles.headerTitle} allowFontScaling>
          {t('transactions.search_placeholder')}
        </Text>
        {anyAxisActive ? (
          <Pressable
            onPress={handleClearAll}
            accessibilityRole="button"
            accessibilityLabel={t('transactions.clear_all')}
            hitSlop={12}
            style={styles.headerSide}
          >
            <Text style={styles.headerClear} allowFontScaling>
              {t('transactions.clear_all')}
            </Text>
          </Pressable>
        ) : (
          <View style={styles.headerSide} />
        )}
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.flex}
      >
        <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
          {/* --- Search input ----------------------------------------- */}
          <TextInput
            value={searchInput}
            onChangeText={handleSearchChange}
            placeholder={t('transactions.search_placeholder')}
            placeholderTextColor={COLORS.textMuted}
            autoFocus
            style={styles.searchInput}
            accessibilityLabel={t('transactions.search_placeholder')}
          />

          {/* --- Category section ------------------------------------- */}
          <SectionHeader
            label={t('transactions.filter_section_category')}
            expanded={expanded.category}
            onToggle={() => toggleSection('category')}
          />
          {expanded.category && (
            <View style={styles.sectionBody}>
              {categories.map((cat) => {
                const selected = localCategoryIds.includes(cat.id);
                return (
                  <Pressable
                    key={`cat-${cat.id}`}
                    onPress={() => toggleCategoryId(cat.id)}
                    accessibilityRole="checkbox"
                    accessibilityState={{ checked: selected }}
                    accessibilityLabel={cat.nameEn}
                    style={styles.checkRow}
                  >
                    <View style={styles.checkbox}>
                      {selected && (
                        <Text style={styles.checkboxMark} allowFontScaling>
                          ✓
                        </Text>
                      )}
                    </View>
                    <CategoryChip
                      slug={cat.slug}
                      name={cat.nameEn}
                      color={cat.color}
                      size="md"
                    />
                  </Pressable>
                );
              })}
            </View>
          )}

          {/* --- Amount range section --------------------------------- */}
          <SectionHeader
            label={t('transactions.filter_section_amount')}
            expanded={expanded.amount}
            onToggle={() => toggleSection('amount')}
          />
          {expanded.amount && (
            <View style={styles.sectionBody}>
              <View style={styles.rangeRow}>
                <View style={styles.rangeField}>
                  <Text style={styles.label} allowFontScaling>
                    {t('transactions.amount_from')}
                  </Text>
                  <TextInput
                    value={localMin}
                    onChangeText={setLocalMin}
                    keyboardType="decimal-pad"
                    style={styles.input}
                    accessibilityLabel={t('transactions.amount_from')}
                    placeholderTextColor={COLORS.textMuted}
                  />
                </View>
                <View style={styles.rangeField}>
                  <Text style={styles.label} allowFontScaling>
                    {t('transactions.amount_to')}
                  </Text>
                  <TextInput
                    value={localMax}
                    onChangeText={setLocalMax}
                    keyboardType="decimal-pad"
                    style={styles.input}
                    accessibilityLabel={t('transactions.amount_to')}
                    placeholderTextColor={COLORS.textMuted}
                  />
                </View>
              </View>
            </View>
          )}

          {/* --- Sign segmented section ------------------------------- */}
          <SectionHeader
            label={t('transactions.filter_section_sign')}
            expanded={expanded.sign}
            onToggle={() => toggleSection('sign')}
          />
          {expanded.sign && (
            <View style={styles.sectionBody}>
              <View style={styles.segRow}>
                {(['expense', 'income', 'both'] as const).map((opt) => {
                  const isOn = localSign === opt;
                  return (
                    <Pressable
                      key={opt}
                      onPress={() => setLocalSign(opt)}
                      accessibilityRole="radio"
                      accessibilityState={{ selected: isOn }}
                      accessibilityLabel={t(`transactions.sign_${opt}`)}
                      style={[styles.segOption, isOn && styles.segOptionOn]}
                    >
                      <Text
                        style={[styles.segLabel, isOn && styles.segLabelOn]}
                        allowFontScaling
                      >
                        {t(`transactions.sign_${opt}`)}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          )}

          {/* --- Date range section ----------------------------------- */}
          <SectionHeader
            label={t('transactions.filter_section_date')}
            expanded={expanded.date}
            onToggle={() => toggleSection('date')}
          />
          {expanded.date && (
            <View style={styles.sectionBody}>
              <View style={styles.rangeRow}>
                <View style={styles.rangeField}>
                  <Text style={styles.label} allowFontScaling>
                    {t('transactions.date_from')}
                  </Text>
                  <TextInput
                    value={localDateFrom}
                    onChangeText={setLocalDateFrom}
                    placeholder="YYYY-MM-DD"
                    placeholderTextColor={COLORS.textMuted}
                    autoCapitalize="none"
                    style={styles.input}
                    accessibilityLabel={t('transactions.date_from')}
                  />
                </View>
                <View style={styles.rangeField}>
                  <Text style={styles.label} allowFontScaling>
                    {t('transactions.date_to')}
                  </Text>
                  <TextInput
                    value={localDateTo}
                    onChangeText={setLocalDateTo}
                    placeholder="YYYY-MM-DD"
                    placeholderTextColor={COLORS.textMuted}
                    autoCapitalize="none"
                    style={styles.input}
                    accessibilityLabel={t('transactions.date_to')}
                  />
                </View>
              </View>
            </View>
          )}
        </ScrollView>

        <View style={styles.footer}>
          <Pressable
            onPress={handleApply}
            accessibilityRole="button"
            accessibilityLabel={t('transactions.apply_filters')}
            style={({ pressed }) => [styles.applyCta, pressed && styles.applyCtaPressed]}
          >
            <Text style={styles.applyLabel} allowFontScaling>
              {t('transactions.apply_filters')}
            </Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// ---------------------------------------------------------------------------
// SectionHeader — accordion toggle row
// ---------------------------------------------------------------------------

function SectionHeader({
  label,
  expanded,
  onToggle,
}: {
  readonly label: string;
  readonly expanded: boolean;
  readonly onToggle: () => void;
}): React.JSX.Element {
  return (
    <Pressable
      onPress={onToggle}
      accessibilityRole="button"
      accessibilityState={{ expanded }}
      accessibilityLabel={label}
      style={styles.sectionHeader}
      hitSlop={6}
    >
      <Text style={styles.sectionLabel} allowFontScaling>
        {label}
      </Text>
      <Text style={styles.chevron} allowFontScaling>
        {expanded ? '−' : '+'}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  flex: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderBottomWidth: 1,
    borderBottomColor: `${COLORS.textMuted}33`,
  },
  headerSide: {
    minWidth: 64,
    minHeight: 44,
    justifyContent: 'center',
  },
  headerClose: {
    ...TYPE.uiButton,
    color: COLORS.textPrimary,
    fontSize: 20,
  },
  headerTitle: {
    ...TYPE.uiBody,
    color: COLORS.textPrimary,
    flex: 1,
    textAlign: 'center',
  },
  headerClear: {
    ...TYPE.uiLabel,
    color: COLORS.accent,
    textAlign: 'right',
  },
  body: {
    padding: SPACING.lg,
    rowGap: SPACING.md,
  },
  searchInput: {
    ...TYPE.uiBody,
    color: COLORS.textPrimary,
    height: 48,
    paddingHorizontal: SPACING.md,
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: `${COLORS.textMuted}4D`,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: `${COLORS.textMuted}1A`,
    minHeight: 44,
  },
  sectionLabel: {
    ...TYPE.uiBody,
    color: COLORS.textPrimary,
  },
  chevron: {
    ...TYPE.displayM,
    fontSize: 22,
    color: COLORS.textSecondary,
  },
  sectionBody: {
    rowGap: SPACING.sm,
    paddingVertical: SPACING.sm,
  },
  checkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    columnGap: SPACING.md,
    minHeight: 44,
    paddingVertical: SPACING.xs,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: RADIUS.sm,
    borderWidth: 1.5,
    borderColor: COLORS.textMuted,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxMark: {
    ...TYPE.uiButton,
    color: COLORS.accent,
    fontSize: 14,
    lineHeight: 14,
  },
  rangeRow: {
    flexDirection: 'row',
    columnGap: SPACING.md,
  },
  rangeField: {
    flex: 1,
    rowGap: SPACING.xs,
  },
  label: {
    ...TYPE.uiMeta,
    color: COLORS.textMuted,
    textTransform: 'uppercase',
  },
  input: {
    ...TYPE.uiBody,
    color: COLORS.textPrimary,
    height: 44,
    paddingHorizontal: SPACING.md,
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: `${COLORS.textMuted}33`,
  },
  segRow: {
    flexDirection: 'row',
    columnGap: SPACING.sm,
  },
  segOption: {
    flex: 1,
    height: 44,
    borderRadius: RADIUS.pill,
    backgroundColor: COLORS.surface,
    justifyContent: 'center',
    alignItems: 'center',
    minWidth: 44,
  },
  segOptionOn: {
    backgroundColor: COLORS.accent,
  },
  segLabel: {
    ...TYPE.uiLabel,
    color: COLORS.textSecondary,
  },
  segLabelOn: {
    color: COLORS.white,
  },
  footer: {
    padding: SPACING.lg,
  },
  applyCta: {
    height: 52,
    borderRadius: RADIUS.lg,
    backgroundColor: COLORS.accent,
    justifyContent: 'center',
    alignItems: 'center',
  },
  applyCtaPressed: {
    backgroundColor: COLORS.accentDeep,
  },
  applyLabel: {
    ...TYPE.uiButton,
    color: COLORS.white,
  },
});
