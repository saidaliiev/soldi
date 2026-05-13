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

// ---------------------------------------------------------------------------
// Singleton instance — exported for use in screens via useTranslation()
// ---------------------------------------------------------------------------

export const i18n = createInstance();

// ---------------------------------------------------------------------------
// Resources
// ---------------------------------------------------------------------------

const resources = {
  en: { translation: en },
  uk: { translation: uk },
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
