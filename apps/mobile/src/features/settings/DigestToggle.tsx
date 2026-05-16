/**
 * SOLDI DigestToggle — Phase 5 plan 05-02 (NOTIF-01).
 *
 * Settings Switch that opts the user into / out of the 09:00 daily digest.
 * On enable: requests iOS notification permission in-context (D-03 — never
 * at launch). Only sets digestEnabled=true and schedules the digest when
 * permission is granted. On disable: cancels the scheduled digest immediately.
 *
 * Design: mirrors BiometricToggle (05-01) — RN primitives, tokens, TYPE,
 * 44pt min tap target, full a11y.
 * Security: no AsyncStorage (T-05-11); permission never requested at launch.
 */

import React from 'react';
import { View, Text, Switch, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';

import { COLORS, SPACING } from '@design/tokens';
import { TYPE } from '@design/typography';
import { useOnboardingStore } from '@stores/onboarding';
import {
  requestNotificationPermission,
  scheduleDailyDigest,
} from '../notifications/digestNotification';

export function DigestToggle(): React.JSX.Element {
  const { t } = useTranslation();
  const digestEnabled = useOnboardingStore((s) => s.digestEnabled);
  const setDigestEnabled = useOnboardingStore((s) => s.setDigestEnabled);

  const handleValueChange = async (value: boolean) => {
    if (value) {
      // D-03: request permission in-context on enable — never at launch (T-05-11)
      const granted = await requestNotificationPermission();
      if (!granted) {
        // Permission denied — leave toggle OFF, do not persist true
        return;
      }
      setDigestEnabled(true);
      // Fire-and-forget — schedule failure must not crash the toggle interaction
      scheduleDailyDigest(true).catch(() => {
        // Error logged inside scheduleDailyDigest; swallow here
      });
    } else {
      setDigestEnabled(false);
      // Cancel the scheduled digest (scheduleDailyDigest(false) only cancels)
      scheduleDailyDigest(false).catch(() => {
        // Swallow — digest may already be absent; not an error
      });
    }
  };

  return (
    <View
      style={styles.row}
      accessible
      accessibilityLabel={t('settings.digest_toggle_label')}
      accessibilityRole="switch"
      accessibilityState={{ checked: digestEnabled }}
    >
      <View style={styles.labelGroup}>
        <Text style={styles.label} allowFontScaling>
          {t('settings.digest_toggle_label')}
        </Text>
        <Text style={styles.description} allowFontScaling>
          {t('settings.digest_toggle_description')}
        </Text>
      </View>
      <Switch
        value={digestEnabled}
        onValueChange={(v) => {
          void handleValueChange(v);
        }}
        trackColor={{ false: COLORS.textMuted, true: COLORS.accent }}
        thumbColor={COLORS.surface}
        accessibilityLabel={t('settings.digest_toggle_label')}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 44, // CLAUDE.md: 44pt minimum tap target
    gap: SPACING.md,
  },
  labelGroup: {
    flex: 1,
    gap: 2,
  },
  label: {
    ...TYPE.uiLabel,
    color: COLORS.textPrimary,
  },
  description: {
    ...TYPE.uiMeta,
    color: COLORS.textMuted,
  },
});
