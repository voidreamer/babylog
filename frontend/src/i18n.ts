/**
 * i18n configuration for HeyBub Baby Tracker
 *
 * Uses i18next with react-i18next for internationalization.
 * Supports: English (en), Spanish (es - Latin American), French (fr - Canadian)
 *
 * Language detection order: localStorage → navigator → htmlTag
 * Fallback: English
 *
 * NOTE: Date/time formatting should use date-fns locale objects in the future.
 * NOTE: Number formatting (weights, measurements) can be localized via Intl.NumberFormat later.
 */
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

// Import all translation files
import enCommon from './locales/en/common.json';
import enDashboard from './locales/en/dashboard.json';
import enOnboarding from './locales/en/onboarding.json';
import enHealth from './locales/en/health.json';
import enSettings from './locales/en/settings.json';

import esCommon from './locales/es/common.json';
import esDashboard from './locales/es/dashboard.json';
import esOnboarding from './locales/es/onboarding.json';
import esHealth from './locales/es/health.json';
import esSettings from './locales/es/settings.json';

import frCommon from './locales/fr/common.json';
import frDashboard from './locales/fr/dashboard.json';
import frOnboarding from './locales/fr/onboarding.json';
import frHealth from './locales/fr/health.json';
import frSettings from './locales/fr/settings.json';

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      en: {
        common: enCommon,
        dashboard: enDashboard,
        onboarding: enOnboarding,
        health: enHealth,
        settings: enSettings,
      },
      es: {
        common: esCommon,
        dashboard: esDashboard,
        onboarding: esOnboarding,
        health: esHealth,
        settings: esSettings,
      },
      fr: {
        common: frCommon,
        dashboard: frDashboard,
        onboarding: frOnboarding,
        health: frHealth,
        settings: frSettings,
      },
    },
    fallbackLng: 'en',
    defaultNS: 'common',
    ns: ['common', 'dashboard', 'onboarding', 'health', 'settings'],
    interpolation: {
      escapeValue: false, // React already escapes
    },
    detection: {
      order: ['localStorage', 'navigator', 'htmlTag'],
      lookupLocalStorage: 'i18nextLng',
      caches: ['localStorage'],
    },
  });

export default i18n;
