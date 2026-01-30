import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

// EN
import enCommon from './locales/en/common.json';
import enSettings from './locales/en/settings.json';
import enTracking from './locales/en/tracking.json';
import enInsights from './locales/en/insights.json';
import enLearn from './locales/en/learn.json';

// ES-CO
import esCommon from './locales/es-CO/common.json';
import esSettings from './locales/es-CO/settings.json';
import esTracking from './locales/es-CO/tracking.json';
import esInsights from './locales/es-CO/insights.json';
import esLearn from './locales/es-CO/learn.json';

// FR-CA
import frCommon from './locales/fr-CA/common.json';
import frSettings from './locales/fr-CA/settings.json';
import frTracking from './locales/fr-CA/tracking.json';
import frInsights from './locales/fr-CA/insights.json';
import frLearn from './locales/fr-CA/learn.json';

const resources = {
  en: {
    common: enCommon,
    settings: enSettings,
    tracking: enTracking,
    insights: enInsights,
    learn: enLearn,
  },
  'es-CO': {
    common: esCommon,
    settings: esSettings,
    tracking: esTracking,
    insights: esInsights,
    learn: esLearn,
  },
  'fr-CA': {
    common: frCommon,
    settings: frSettings,
    tracking: frTracking,
    insights: frInsights,
    learn: frLearn,
  },
};

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: 'en',
    defaultNS: 'common',
    ns: ['common', 'settings', 'tracking', 'insights', 'learn'],
    interpolation: {
      escapeValue: false,
    },
    react: {
      useSuspense: false, // CRITICAL: prevents blank white page
    },
    detection: {
      order: ['localStorage', 'navigator'],
      caches: ['localStorage'],
      lookupLocalStorage: 'i18nextLng',
    },
  });

export default i18n;
