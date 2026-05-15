/**
 * JarListScreen — shows all jars + empty state + create entry.
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
  SafeAreaView,
} from 'react-native';
import { useFocusEffect } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { COLORS, SPACING, RADIUS } from '@design/tokens';
import { TYPE } from '@design/typography';
import { listJars, jarBalanceCents } from './jarsRepo';
import { useJarCreateStore } from './jarStore';
import { JarRow } from './JarRow';
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
          jarsWithBalance.map(({ jar, balance }) => (
            <JarRow key={jar.id} jar={jar} balanceCents={balance} />
          ))
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
    height: 44,
    paddingHorizontal: SPACING.md,
    borderRadius: RADIUS.lg,
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
  pressed: {
    opacity: 0.7,
  },
});
