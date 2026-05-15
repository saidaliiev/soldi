/**
 * JarCreateBottomSheet — create-only jar form.
 *
 * Mounted from JarListScreen (NOT from app/_layout.tsx) to avoid root-layout
 * ownership conflict with plan 04-03.
 *
 * Form: name TextInput + numeric target TextInput + 6-icon SVG picker.
 * On save: createJar() → close sheet → fire onRefresh so JarListScreen re-queries.
 *
 * Security: catch blocks log error.name only (T-04-01-02 / CLAUDE.md rule).
 * A11y: every interactive element has accessibilityLabel + accessibilityRole;
 *       min tap target 44×44pt.
 */

import React from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  ScrollView,
} from 'react-native';
import { useTranslation } from 'react-i18next';

import { COLORS, SPACING, RADIUS } from '@design/tokens';
import { TYPE } from '@design/typography';
import {
  BottomSheetPrimitive,
  type BottomSheetPrimitiveRef,
} from '@/src/components/BottomSheet/BottomSheetPrimitive';
import { useJarCreateStore } from './jarStore';
import { createJar } from './jarsRepo';
import { toCents } from '@/src/lib/money';
import { JarIcon, JAR_ICON_SLUGS, type JarIconSlug } from '@design/icons/jars';

const DEFAULT_ICON: JarIconSlug = 'jar-piggy';

export function JarCreateBottomSheet(): React.JSX.Element {
  const { t } = useTranslation();
  const open = useJarCreateStore((s) => s.open);
  const onRefresh = useJarCreateStore((s) => s.onRefresh);
  const close = useJarCreateStore((s) => s.close);
  const sheetRef = React.useRef<BottomSheetPrimitiveRef>(null);

  const [name, setName] = React.useState('');
  const [targetRaw, setTargetRaw] = React.useState('');
  const [iconSlug, setIconSlug] = React.useState<JarIconSlug>(DEFAULT_ICON);
  const [errorKey, setErrorKey] = React.useState<string | null>(null);

  // Sync sheet open/close state
  React.useEffect(() => {
    if (open) {
      setName('');
      setTargetRaw('');
      setIconSlug(DEFAULT_ICON);
      setErrorKey(null);
      sheetRef.current?.open();
    } else {
      sheetRef.current?.close();
    }
  }, [open]);

  const handleSave = () => {
    const trimmedName = name.trim();
    if (trimmedName.length === 0) {
      setErrorKey('jars.validation_name_empty');
      return;
    }

    const targetFloat = parseFloat(targetRaw.replace(',', '.'));
    if (isNaN(targetFloat) || targetFloat <= 0) {
      setErrorKey('jars.validation_target_invalid');
      return;
    }

    const targetCents = toCents(targetFloat);

    try {
      createJar({
        name: trimmedName,
        targetCents,
        icon: iconSlug,
        ruleJson: JSON.stringify({ kind: 'roundup', unitCents: 100 }),
      });
      onRefresh?.();
      close();
    } catch (err) {
      // CR-02: renamed from `name` to `errName` — `name` is the jar-name state
      // variable in outer scope; shadowing it risked future devs logging PII.
      // Log only error.name — never log jar name or amount (T-04-01-02).
      const errName = err instanceof Error ? err.name : 'UnknownError';
      console.error('[JarCreateBottomSheet] save failed:', errName);
      setErrorKey('jars.error_save');
    }
  };

  return (
    <BottomSheetPrimitive
      ref={sheetRef}
      snapPoints={['65%']}
      onChange={(idx) => {
        if (idx === 0 && open) close();
      }}
      accessibilityLabel={t('jars.create_title')}
    >
      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={styles.scroll}
      >
        <Text style={styles.header} accessibilityRole="header" allowFontScaling>
          {t('jars.create_title')}
        </Text>

        {/* Name input */}
        <Text style={styles.fieldLabel} allowFontScaling>
          {t('jars.name_label')}
        </Text>
        <TextInput
          value={name}
          onChangeText={(v) => {
            setName(v);
            setErrorKey(null);
          }}
          placeholder={t('jars.name_placeholder')}
          placeholderTextColor={COLORS.textMuted}
          maxLength={60}
          style={styles.input}
          accessibilityLabel={t('jars.name_label')}
          allowFontScaling
          returnKeyType="next"
        />

        {/* Target amount input */}
        <Text style={styles.fieldLabel} allowFontScaling>
          {t('jars.target_label')}
        </Text>
        <TextInput
          value={targetRaw}
          onChangeText={(v) => {
            setTargetRaw(v);
            setErrorKey(null);
          }}
          placeholder={t('jars.target_placeholder')}
          placeholderTextColor={COLORS.textMuted}
          keyboardType="decimal-pad"
          style={[styles.input, styles.targetInput]}
          accessibilityLabel={t('jars.target_label')}
          allowFontScaling
          returnKeyType="done"
        />

        {errorKey != null ? (
          <Text style={styles.errorText} allowFontScaling>
            {t(errorKey)}
          </Text>
        ) : null}

        {/* Icon picker */}
        <Text style={styles.fieldLabel} allowFontScaling>
          {t('jars.icon_label')}
        </Text>
        <View style={styles.iconRow}>
          {JAR_ICON_SLUGS.map((slug) => {
            const selected = slug === iconSlug;
            return (
              <Pressable
                key={slug}
                onPress={() => setIconSlug(slug)}
                accessibilityRole="button"
                accessibilityLabel={slug}
                accessibilityState={{ selected }}
                style={({ pressed }) => [
                  styles.iconTile,
                  selected && styles.iconTileSelected,
                  pressed && styles.pressed,
                ]}
              >
                <JarIcon
                  slug={slug}
                  color={selected ? COLORS.accent : COLORS.textMuted}
                  size={28}
                />
              </Pressable>
            );
          })}
        </View>

        {/* Actions */}
        <Pressable
          onPress={handleSave}
          accessibilityRole="button"
          accessibilityLabel={t('jars.save')}
          style={({ pressed }) => [
            styles.cta,
            { backgroundColor: COLORS.accent },
            pressed && styles.pressed,
          ]}
        >
          <Text style={styles.ctaLabel} allowFontScaling>
            {t('jars.save')}
          </Text>
        </Pressable>

        <Pressable
          onPress={close}
          accessibilityRole="button"
          accessibilityLabel={t('jars.cancel')}
          style={({ pressed }) => [styles.cancelRow, pressed && styles.pressed]}
        >
          <Text style={styles.cancelLabel} allowFontScaling>
            {t('jars.cancel')}
          </Text>
        </Pressable>
      </ScrollView>
    </BottomSheetPrimitive>
  );
}

const styles = StyleSheet.create({
  scroll: {
    paddingBottom: SPACING.xl,
    rowGap: SPACING.sm,
  },
  header: {
    ...TYPE.displayM,
    color: COLORS.textPrimary,
    marginBottom: SPACING.sm,
  },
  fieldLabel: {
    ...TYPE.uiLabel,
    color: COLORS.textMuted,
    marginTop: SPACING.sm,
  },
  input: {
    height: 48,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: `${COLORS.textMuted}4D`,
    paddingHorizontal: SPACING.md,
    ...TYPE.uiBody,
    color: COLORS.textPrimary,
    backgroundColor: COLORS.background,
  },
  targetInput: {
    ...TYPE.tabular,
    color: COLORS.textPrimary,
  },
  errorText: {
    ...TYPE.uiLabel,
    color: COLORS.error,
  },
  iconRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
    marginTop: SPACING.xs,
  },
  iconTile: {
    width: 52,
    height: 52,
    borderRadius: RADIUS.md,
    borderWidth: 1.5,
    borderColor: `${COLORS.textMuted}4D`,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.background,
  },
  iconTileSelected: {
    borderColor: COLORS.accent,
    backgroundColor: `${COLORS.accent}1A`,
  },
  cta: {
    height: 52,
    borderRadius: RADIUS.lg,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: SPACING.md,
  },
  ctaLabel: {
    ...TYPE.uiButton,
    color: COLORS.white,
  },
  cancelRow: {
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelLabel: {
    ...TYPE.uiBody,
    color: COLORS.textMuted,
  },
  pressed: {
    opacity: 0.7,
  },
});
