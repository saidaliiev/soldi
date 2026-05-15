/**
 * SOLDI i18n — i18next instance, init function, and language switcher.
 *
 * Languages: English (en) and Ukrainian (uk) only in v1.
 * Default language is detected from device locale via expo-localization;
 * falls back to English if locale is neither 'uk' nor 'en'.
 */

import { createInstance } from 'i18next';
import { initReactI18next } from 'react-i18next';
import * as Localization from 'expo-localization';

import en from './en.json';
import uk from './uk.json';
// Phase 2 — namespaced dashboard strings live in src/i18n/locales/*/dashboard.json
// per the plan artifact contract. They are merged into the bundled `translation`
// namespace under the `dashboard.*` key path so existing useTranslation() calls
// (t('dashboard.empty_month')) resolve without a namespace change.
import dashboardEn from '../../i18n/locales/en/dashboard.json';
import dashboardUk from '../../i18n/locales/uk/dashboard.json';
// Phase 2 plan 02-04 — categories namespace (CategoryEditorBottomSheet + screen)
import categoriesEn from '../../i18n/locales/en/categories.json';
import categoriesUk from '../../i18n/locales/uk/categories.json';
// Phase 2 plan 02-03 — transactions namespace (list / detail / search modal)
import transactionsEn from '../../i18n/locales/en/transactions.json';
import transactionsUk from '../../i18n/locales/uk/transactions.json';
// Phase 3 plan 03-02 — chat namespace (PropagationToast + chat surfaces from 03-03).
// uk bundle currently mirrors en (TODO Phase 4 / QUAL-01..04 for real translations).
import chatEn from '../../i18n/locales/en/chat.json';
import chatUk from '../../i18n/locales/uk/chat.json';
// Phase 3 plan 03-03 — ai namespace (FAB label + hint).
import aiEn from '../../i18n/locales/en/ai.json';
import aiUk from '../../i18n/locales/uk/ai.json';

// ---------------------------------------------------------------------------
// Singleton instance — exported for use in screens via useTranslation()
// ---------------------------------------------------------------------------

export const i18n = createInstance();

// ---------------------------------------------------------------------------
// Resources
// ---------------------------------------------------------------------------

// Deep-merge the Phase 2 dashboard.* keys into the existing `dashboard` subtree.
// The existing Phase 1 keys (this_month, empty, transactions_count) are preserved;
// Phase 2 adds empty_month, empty_future, error_load, etc.
const enBundle = {
  ...en,
  dashboard: { ...(en as { dashboard?: Record<string, string> }).dashboard, ...dashboardEn },
  categories: { ...(en as { categories?: Record<string, string> }).categories, ...categoriesEn },
  transactions: { ...(en as { transactions?: Record<string, string> }).transactions, ...transactionsEn },
  chat: { ...(en as { chat?: Record<string, string> }).chat, ...chatEn },
  ai: { ...(en as { ai?: Record<string, string> }).ai, ...aiEn },
};
const ukBundle = {
  ...uk,
  dashboard: { ...(uk as { dashboard?: Record<string, string> }).dashboard, ...dashboardUk },
  categories: { ...(uk as { categories?: Record<string, string> }).categories, ...categoriesUk },
  transactions: { ...(uk as { transactions?: Record<string, string> }).transactions, ...transactionsUk },
  chat: { ...(uk as { chat?: Record<string, string> }).chat, ...chatUk },
  ai: { ...(uk as { ai?: Record<string, string> }).ai, ...aiUk },
};

const resources = {
  en: { translation: enBundle },
  uk: { translation: ukBundle },
} as const;

// ---------------------------------------------------------------------------
// initI18n — call once on app mount (in root _layout.tsx useEffect)
// ---------------------------------------------------------------------------

/**
 * Initialises the i18next instance.
 *
 * @param forcedLng  Optional override (used by onboarding store after language pick).
 *                   If omitted, detects from device locale.
 */
export async function initI18n(forcedLng?: 'en' | 'uk'): Promise<void> {
  const detectedLocale = Localization.getLocales()[0]?.languageCode;
  const lng: 'en' | 'uk' = forcedLng ?? (detectedLocale === 'uk' ? 'uk' : 'en');

  await i18n
    .use(initReactI18next)
    .init({
      resources,
      lng,
      fallbackLng: 'en',
      compatibilityJSON: 'v4',
      interpolation: {
        escapeValue: false, // React already escapes values
      },
      returnNull: false,
    });
}

// ---------------------------------------------------------------------------
// setLanguage — call after user picks a language in onboarding
// ---------------------------------------------------------------------------

/**
 * Switches the active i18next language. Wraps i18n.changeLanguage.
 */
export async function setLanguage(lng: 'en' | 'uk'): Promise<void> {
  await i18n.changeLanguage(lng);
}
