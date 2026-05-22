/**
 * CategoryEditorBottomSheet — sheet handling both create and edit modes.
 * Mode driven by useCategoryEditorStore.targetId (undefined = create).
 *
 * UI-SPEC composition: Name input -> IconPicker -> ColorSwatchPicker -> CTA.
 * Edit mode also surfaces "Delete category" destructive row.
 *
 * Drag-drop merge (D-19) lives on CategoriesScreen rows, not in this sheet.
 * MergeConfirm modal is owned by CategoriesScreen via DragMergeContext.
 */

import React from 'react';
import { View, Text, TextInput, Pressable, StyleSheet, ScrollView } from 'react-native';
import { useTranslation } from 'react-i18next';

import { COLORS, SPACING, RADIUS } from '@design/tokens';
import { TYPE } from '@design/typography';
import {
  BottomSheetPrimitive,
  type BottomSheetPrimitiveRef,
} from '@/src/components/BottomSheet/BottomSheetPrimitive';
import { ConfirmModal } from '@/src/components/BottomSheet/ConfirmModal';
import { useCategoryEditorStore } from './store';
import { IconPicker } from './IconPicker';
import { ColorSwatchPicker, SWATCHES } from './ColorSwatchPicker';
import {
  createCategory,
  renameCategory,
  deleteCategory,
} from './categoryMutations';
import { getCategoryById, localizedCategoryName } from '@data/categoriesRepo';
import type { Category } from './types';
import { type IconSlug, ICON_REGISTRY } from '@design/icons/categories/_iconRegistry';

const DEFAULT_ICON: IconSlug = 'misc';
const DEFAULT_COLOR = SWATCHES[0].color;

function validationKey(reason: 'empty' | 'too_long' | 'invalid_chars' | 'duplicate'): string {
  switch (reason) {
    case 'empty': return 'categories.validation_empty';
    case 'too_long': return 'categories.validation_too_long';
    case 'invalid_chars': return 'categories.validation_invalid_chars';
    case 'duplicate': return 'categories.validation_duplicate';
  }
}

export function CategoryEditorBottomSheet(): React.JSX.Element {
  const { t, i18n } = useTranslation();
  const open = useCategoryEditorStore((s) => s.open);
  const targetId = useCategoryEditorStore((s) => s.targetId);
  const close = useCategoryEditorStore((s) => s.close);
  const sheetRef = React.useRef<BottomSheetPrimitiveRef>(null);

  const [name, setName] = React.useState('');
  const [iconSlug, setIconSlug] = React.useState<IconSlug>(DEFAULT_ICON);
  const [color, setColor] = React.useState<string>(DEFAULT_COLOR);
  const [errorKey, setErrorKey] = React.useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = React.useState(false);
  const [current, setCurrent] = React.useState<Category | null>(null);

  const isEditMode = targetId !== undefined;

  React.useEffect(() => {
    if (open) {
      if (targetId !== undefined) {
        const c = getCategoryById(targetId);
        if (c != null) {
          setCurrent(c);
          setName(c.nameEn);
          // Preselect by canonical slug (icon_name holds legacy Lucide ids that
          // never match ICON_REGISTRY). Alias-only slugs aren't pickable, so
          // they correctly fall to DEFAULT_ICON here.
          const slug = (c.slug in ICON_REGISTRY ? c.slug : DEFAULT_ICON) as IconSlug;
          setIconSlug(slug);
          setColor(c.color);
        }
      } else {
        setCurrent(null);
        setName('');
        setIconSlug(DEFAULT_ICON);
        setColor(DEFAULT_COLOR);
      }
      setErrorKey(null);
      sheetRef.current?.open();
    } else {
      sheetRef.current?.close();
    }
  }, [open, targetId]);

  const handleSave = () => {
    try {
      if (isEditMode && current != null) {
        renameCategory(current.id, name);
      } else {
        createCategory({ name, iconSlug, color });
      }
      close();
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      const m = /^VALIDATION:(empty|too_long|invalid_chars|duplicate)$/.exec(msg);
      if (m != null) {
        setErrorKey(validationKey(m[1] as 'empty' | 'too_long' | 'invalid_chars' | 'duplicate'));
      } else {
        setErrorKey('categories.error_save');
      }
    }
  };

  const handleDeleteRequest = () => {
    if (current == null || !current.isCustom) return;
    setShowDeleteConfirm(true);
  };

  const handleDeleteConfirm = () => {
    if (current == null) return;
    try {
      deleteCategory(current.id);
      setShowDeleteConfirm(false);
      close();
    } catch {
      setErrorKey('categories.error_delete');
      setShowDeleteConfirm(false);
    }
  };

  const ctaLabel = isEditMode ? t('categories.save_changes') : t('categories.save');
  const canDelete = isEditMode && current != null && current.isCustom;

  return (
    <View>
      <BottomSheetPrimitive
        ref={sheetRef}
        snapPoints={['60%']}
        onChange={(idx) => {
          if (idx === 0 && open) close();
        }}
        accessibilityLabel={isEditMode ? t('categories.save_changes') : t('categories.cta_new')}
      >
        <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.scroll}>
          <Text style={styles.header} accessibilityRole="header" allowFontScaling>
            {isEditMode
              ? current != null
                ? localizedCategoryName(current, i18n.language)
                : ''
              : t('categories.cta_new')}
          </Text>

          <TextInput
            value={name}
            onChangeText={(v) => {
              setName(v);
              setErrorKey(null);
            }}
            placeholder={t('categories.name_placeholder')}
            placeholderTextColor={COLORS.textMuted}
            maxLength={40}
            style={styles.input}
            accessibilityLabel={t('categories.name_placeholder')}
            allowFontScaling
          />
          {errorKey != null ? (
            <Text style={styles.errorText} allowFontScaling>
              {t(errorKey)}
            </Text>
          ) : null}

          <Text style={styles.sectionLabel} allowFontScaling>
            {t('categories.section_icon')}
          </Text>
          <IconPicker
            selectedSlug={iconSlug}
            iconColor={color}
            onSelect={setIconSlug}
          />

          <Text style={styles.sectionLabel} allowFontScaling>
            {t('categories.section_color')}
          </Text>
          <ColorSwatchPicker selectedColor={color} onSelect={setColor} />

          <Pressable
            onPress={handleSave}
            accessibilityRole="button"
            accessibilityLabel={ctaLabel}
            style={({ pressed }) => [
              styles.cta,
              { backgroundColor: COLORS.accent },
              pressed && styles.pressed,
            ]}
          >
            <Text style={styles.ctaLabel} allowFontScaling>
              {ctaLabel}
            </Text>
          </Pressable>

          {canDelete === true ? (
            <Pressable
              onPress={handleDeleteRequest}
              accessibilityRole="button"
              accessibilityLabel={t('categories.delete_confirm')}
              style={({ pressed }) => [styles.deleteRow, pressed && styles.pressed]}
            >
              <Text style={styles.deleteLabel} allowFontScaling>
                {t('categories.delete_confirm')}
              </Text>
            </Pressable>
          ) : null}
        </ScrollView>
      </BottomSheetPrimitive>

      {current != null ? (
        <ConfirmModal
          visible={showDeleteConfirm}
          title={t('categories.delete_title')}
          body={t('categories.delete_body', { name: localizedCategoryName(current, i18n.language) })}
          confirmLabel={t('categories.delete_confirm')}
          cancelLabel={t('categories.cancel')}
          destructive
          onConfirm={handleDeleteConfirm}
          onCancel={() => setShowDeleteConfirm(false)}
          confirmAccessibilityLabel={`${t('categories.delete_confirm')} ${localizedCategoryName(current, i18n.language)}`}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  scroll: {
    paddingBottom: SPACING.lg,
    rowGap: SPACING.md,
  },
  header: {
    ...TYPE.displayM,
    color: COLORS.textPrimary,
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
  errorText: {
    ...TYPE.uiLabel,
    color: COLORS.error,
  },
  sectionLabel: {
    ...TYPE.uiLabel,
    color: COLORS.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  cta: {
    height: 52,
    borderRadius: RADIUS.lg,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: SPACING.sm,
  },
  ctaLabel: {
    ...TYPE.uiButton,
    color: COLORS.white,
  },
  deleteRow: {
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: SPACING.sm,
  },
  deleteLabel: {
    ...TYPE.uiBody,
    color: COLORS.error,
  },
  pressed: {
    opacity: 0.7,
  },
});
