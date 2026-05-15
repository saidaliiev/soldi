/**
 * JarDetailScreen — shows jar name, target, and current balance.
 *
 * Hero balance: Oswald displayL (TYPE.displayL) per typography rules.
 * The animated Skia ring + Sweep action are deferred to plan 04-02.
 * A placeholder area is rendered with testID="jar-ring-slot".
 *
 * A11y: header role on name, all amounts in accessible labels.
 * Tokens only — no hardcoded hex, no BANNED_COLORS.
 */

import React, { useCallback, useState } from 'react';
import { View, Text, Pressable, StyleSheet, SafeAreaView, ScrollView } from 'react-native';
import { Stack, useLocalSearchParams, router, useFocusEffect } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { COLORS, SPACING, RADIUS } from '@design/tokens';
import { TYPE } from '@design/typography';
import { getJar, jarBalanceCents } from './jarsRepo';
import { formatMoney } from '@/src/lib/money';
import { JarIcon, type JarIconSlug } from '@design/icons/jars';
import type { Jar } from './types';

export function JarDetailScreen(): React.JSX.Element {
  const { t } = useTranslation();
  const params = useLocalSearchParams<{ id: string }>();
  const jarId = parseInt(params.id ?? '0', 10);

  const [jar, setJar] = useState<Jar | null>(null);
  const [balance, setBalance] = useState(0);

  const load = useCallback(() => {
    if (isNaN(jarId) || jarId <= 0) return;
    const found = getJar(jarId);
    if (found == null) return;
    setJar(found);
    setBalance(jarBalanceCents(jarId));
  }, [jarId]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  if (jar == null) {
    return (
      <SafeAreaView style={styles.safe}>
        <Stack.Screen options={{ title: t('jars.title'), headerShown: false }} />
        <View style={styles.notFound}>
          <Text style={styles.notFoundText} allowFontScaling>
            {t('jars.empty_state')}
          </Text>
          <Pressable
            onPress={() => router.back()}
            accessibilityRole="button"
            accessibilityLabel={t('jars.back')}
            style={({ pressed }) => [styles.backBtn, pressed && styles.pressed]}
          >
            <Text style={styles.backBtnLabel} allowFontScaling>
              {t('jars.back')}
            </Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  const balanceStr = formatMoney({ amountCents: balance, currency: 'EUR' });
  const targetStr = formatMoney({ amountCents: jar.targetCents, currency: 'EUR' });
  const isFunded = balance >= jar.targetCents;
  const iconSlug = jar.icon as JarIconSlug;

  return (
    <SafeAreaView style={styles.safe}>
      {/* Screen-local title via expo-router Stack.Screen — no root layout edit needed */}
      <Stack.Screen
        options={{
          title: jar.name,
          headerShown: false,
        }}
      />

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Back button */}
        <Pressable
          onPress={() => router.back()}
          accessibilityRole="button"
          accessibilityLabel={t('jars.back')}
          style={({ pressed }) => [styles.backRow, pressed && styles.pressed]}
        >
          <Text style={styles.backLabel} allowFontScaling>
            ← {t('jars.back')}
          </Text>
        </Pressable>

        {/* Jar header */}
        <View style={styles.jarHeader}>
          <View style={styles.iconWrap}>
            <JarIcon slug={iconSlug} color={COLORS.sage} size={36} />
          </View>
          <Text style={styles.jarName} accessibilityRole="header" allowFontScaling>
            {jar.name}
          </Text>
        </View>

        {/* 04-02 ring slot placeholder — JarRing + Sweep wired in plan 04-02 */}
        <View testID="jar-ring-slot" style={styles.ringSlot}>
          {/* 04-02 wires JarRing + Sweep here */}
          <View style={styles.ringPlaceholder} />
        </View>

        {/* Hero balance — Oswald displayL per typography rules */}
        <Text style={styles.heroBalance} allowFontScaling accessibilityLabel={`${t('jars.balance_label')}: ${balanceStr}`}>
          {balanceStr}
        </Text>
        <Text style={styles.heroLabel} allowFontScaling>
          {isFunded ? t('jars.over_funded') : t('jars.balance_label')}
        </Text>

        {/* Target */}
        <View style={styles.targetRow}>
          <Text style={styles.targetLabel} allowFontScaling>
            {t('jars.target_display_label')}
          </Text>
          <Text style={styles.targetValue} allowFontScaling>
            {targetStr}
          </Text>
        </View>

        {/* Progress bar */}
        <View style={styles.progressBar}>
          <View
            style={[
              styles.progressFill,
              { flex: jar.targetCents > 0 ? Math.min(balance / jar.targetCents, 1) : 0 },
            ]}
          />
          <View
            style={[
              styles.progressRemainder,
              { flex: jar.targetCents > 0 ? Math.max(1 - balance / jar.targetCents, 0) : 1 },
            ]}
          />
        </View>

        {/* Sweep CTA — deferred to 04-02 (disabled placeholder) */}
        <Pressable
          disabled
          accessibilityRole="button"
          accessibilityLabel={t('jars.sweep_cta')}
          style={[styles.sweepBtn, styles.sweepBtnDisabled]}
        >
          <Text style={styles.sweepBtnLabel} allowFontScaling>
            {t('jars.sweep_cta')}
          </Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  content: {
    paddingHorizontal: SPACING.md,
    paddingBottom: SPACING.xxl,
  },
  backRow: {
    paddingVertical: SPACING.md,
    alignSelf: 'flex-start',
    minHeight: 44,
    justifyContent: 'center',
  },
  backLabel: {
    ...TYPE.uiBody,
    color: COLORS.accent,
  },
  jarHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    columnGap: SPACING.md,
    marginBottom: SPACING.lg,
  },
  iconWrap: {
    width: 56,
    height: 56,
    borderRadius: RADIUS.lg,
    backgroundColor: `${COLORS.sage}1A`,
    alignItems: 'center',
    justifyContent: 'center',
  },
  jarName: {
    ...TYPE.displayM,
    color: COLORS.textPrimary,
    flex: 1,
  },
  ringSlot: {
    alignItems: 'center',
    marginVertical: SPACING.lg,
    height: 160,
    justifyContent: 'center',
  },
  ringPlaceholder: {
    width: 140,
    height: 140,
    borderRadius: 70,
    borderWidth: 8,
    borderColor: `${COLORS.sageSoft}66`,
  },
  heroBalance: {
    ...TYPE.displayL,
    color: COLORS.textPrimary,
    textAlign: 'center',
    marginBottom: SPACING.xs,
  },
  heroLabel: {
    ...TYPE.uiLabel,
    color: COLORS.textMuted,
    textAlign: 'center',
    marginBottom: SPACING.lg,
  },
  targetRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  targetLabel: {
    ...TYPE.uiLabel,
    color: COLORS.textMuted,
  },
  targetValue: {
    ...TYPE.tabular,
    color: COLORS.textSecondary,
  },
  progressBar: {
    flexDirection: 'row',
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
    backgroundColor: `${COLORS.sage}33`,
    marginBottom: SPACING.xl,
  },
  progressFill: {
    backgroundColor: COLORS.sage,
    borderRadius: 3,
  },
  progressRemainder: {
    backgroundColor: 'transparent',
  },
  sweepBtn: {
    height: 52,
    borderRadius: RADIUS.lg,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.sageSoft,
  },
  sweepBtnDisabled: {
    opacity: 0.4,
  },
  sweepBtnLabel: {
    ...TYPE.uiButton,
    color: COLORS.white,
  },
  notFound: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: SPACING.lg,
    rowGap: SPACING.md,
  },
  notFoundText: {
    ...TYPE.editorialBody,
    color: COLORS.textMuted,
    textAlign: 'center',
  },
  backBtn: {
    height: 48,
    paddingHorizontal: SPACING.lg,
    borderRadius: RADIUS.lg,
    backgroundColor: COLORS.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backBtnLabel: {
    ...TYPE.uiButton,
    color: COLORS.white,
  },
  pressed: {
    opacity: 0.7,
  },
});
