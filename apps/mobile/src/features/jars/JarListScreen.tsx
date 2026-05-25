/**
 * JarListScreen — Wave 5: featured-hero card + hairline-separated list.
 *
 * Layout (HTML §6 lines 357-385): Oswald title + create pill. Below: a
 * featured-jar card carrying the 184pt JarRing with Oswald hero amount,
 * Garamond 21pt jar name, Manrope sub-meta ("€X to go"). Below that:
 * a hairline-separated list of JarRows for the remaining jars. The
 * featured jar = first jar by `listJars()` insertion order (createdAt
 * ASC) — no model change, no reorder UI, per spec §6 risk mitigation.
 *
 * Data: listJars() + jarBalanceCents() per row, re-queried on focus
 * and after a jar is created (via jarStore.openCreate(onRefresh) callback).
 *
 * A11y: create button has accessibilityRole + accessibilityLabel; 44pt tap target.
 * Tokens only — no hardcoded hex, no BANNED_COLORS.
 */

import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  Pressable,
  ScrollView,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { COLORS, SPACING, RADIUS, SHADOWS } from '@design/tokens';
import { TYPE } from '@design/typography';
import { formatMoney } from '@/src/lib/money';
import { listJars, jarBalanceCents } from './jarsRepo';
import { useJarCreateStore } from './jarStore';
import { JarRow } from './JarRow';
import { JarRing } from './JarRing';
import type { Jar } from './types';

type JarWithBalance = {
  readonly jar: Jar;
  readonly balance: number;
};

export function JarListScreen(): React.JSX.Element {
  const { t } = useTranslation();
  const openCreate = useJarCreateStore((s) => s.openCreate);
  const [jarsWithBalance, setJarsWithBalance] = useState<readonly JarWithBalance[]>([]);

  const loadJars = useCallback(() => {
    const rows = listJars();
    const enriched: JarWithBalance[] = rows.map((jar) => ({
      jar,
      balance: jarBalanceCents(jar.id),
    }));
    setJarsWithBalance(enriched);
  }, []);

  // Re-query on every screen focus (matches dashboard useFocusEffect pattern)
  useFocusEffect(
    useCallback(() => {
      loadJars();
    }, [loadJars]),
  );

  const handleCreate = () => {
    openCreate(loadJars);
  };

  const isEmpty = jarsWithBalance.length === 0;
  const featured = jarsWithBalance[0];
  const rest = jarsWithBalance.slice(1);

  const remainingCents = featured != null
    ? Math.max(0, featured.jar.targetCents - featured.balance)
    : 0;
  const remainingStr = formatMoney({ amountCents: remainingCents, currency: 'EUR' });

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <Text style={styles.title} accessibilityRole="header" allowFontScaling>
          {t('jars.title')}
        </Text>
        <Pressable
          onPress={handleCreate}
          accessibilityRole="button"
          accessibilityLabel={t('jars.create_cta')}
          style={({ pressed }) => [styles.createBtn, pressed && styles.pressed]}
        >
          <Text style={styles.createBtnLabel} allowFontScaling>
            {t('jars.create_cta')}
          </Text>
        </Pressable>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.listContent, isEmpty && styles.centerContent]}
        showsVerticalScrollIndicator={false}
      >
        {isEmpty ? (
          <View style={styles.emptyWrap}>
            <Text style={styles.emptyTitle} allowFontScaling>
              {t('jars.empty_state')}
            </Text>
            <Text style={styles.emptySub} allowFontScaling>
              {t('jars.empty_state_sub')}
            </Text>
            <Pressable
              onPress={handleCreate}
              accessibilityRole="button"
              accessibilityLabel={t('jars.create_cta')}
              style={({ pressed }) => [styles.emptyCta, pressed && styles.pressed]}
            >
              <Text style={styles.emptyCtaLabel} allowFontScaling>
                {t('jars.create_cta')}
              </Text>
            </Pressable>
          </View>
        ) : (
          <>
            {featured != null && (
              <View style={styles.featuredCard}>
                <JarRing
                  balanceCents={featured.balance}
                  targetCents={featured.jar.targetCents}
                  size={184}
                  strokeWidth={14}
                  palette="sage"
                  showCenterLabel
                />
                <Text style={styles.featuredName} numberOfLines={1} allowFontScaling>
                  {featured.jar.name}
                </Text>
                <Text style={styles.featuredSub} numberOfLines={1} allowFontScaling>
                  {remainingStr} {t('jars.to_go_label')}
                </Text>
              </View>
            )}
            {rest.map(({ jar, balance }) => (
              <JarRow key={jar.id} jar={jar} balanceCents={balance} />
            ))}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.md,
    paddingTop: SPACING.md,
    paddingBottom: SPACING.sm,
  },
  title: {
    ...TYPE.displayM,
    color: COLORS.textPrimary,
  },
  createBtn: {
    height: 42,
    paddingHorizontal: SPACING.md,
    borderRadius: RADIUS.pill,
    backgroundColor: COLORS.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  createBtnLabel: {
    ...TYPE.uiButton,
    color: COLORS.white,
  },
  scroll: {
    flex: 1,
  },
  listContent: {
    paddingHorizontal: SPACING.md,
    paddingBottom: SPACING.xl,
  },
  centerContent: {
    flex: 1,
    justifyContent: 'center',
  },
  emptyWrap: {
    alignItems: 'center',
    paddingVertical: SPACING.xxl,
    rowGap: SPACING.sm,
  },
  emptyTitle: {
    ...TYPE.displayM,
    color: COLORS.textPrimary,
    textAlign: 'center',
  },
  emptySub: {
    ...TYPE.editorialBody,
    color: COLORS.textSecondary,
    textAlign: 'center',
    maxWidth: 260,
  },
  emptyCta: {
    marginTop: SPACING.md,
    height: 52,
    paddingHorizontal: SPACING.lg,
    borderRadius: RADIUS.lg,
    backgroundColor: COLORS.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyCtaLabel: {
    ...TYPE.uiButton,
    color: COLORS.white,
  },
  featuredCard: {
    alignItems: 'center',
    paddingVertical: SPACING.lg,
    paddingHorizontal: SPACING.md,
    borderRadius: RADIUS.lg,
    backgroundColor: COLORS.surface,
    ...SHADOWS.card,
    marginVertical: SPACING.md,
  },
  featuredName: {
    ...TYPE.editorialLead,
    fontSize: 21,
    lineHeight: 26,
    color: COLORS.textPrimary,
    marginTop: SPACING.md,
  },
  featuredSub: {
    ...TYPE.uiBody,
    color: COLORS.textMuted,
    marginTop: 4,
  },
  pressed: {
    opacity: 0.7,
  },
});
