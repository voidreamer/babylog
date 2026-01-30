import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import commonEn from '../../public/locales/en/common.json';
import dashboardEn from '../../public/locales/en/dashboard.json';
import healthEn from '../../public/locales/en/health.json';
import settingsEn from '../../public/locales/en/settings.json';
import authEn from '../../public/locales/en/auth.json';

import commonEs from '../../public/locales/es-CO/common.json';
import dashboardEs from '../../public/locales/es-CO/dashboard.json';
import healthEs from '../../public/locales/es-CO/health.json';
import settingsEs from '../../public/locales/es-CO/settings.json';
import authEs from '../../public/locales/es-CO/auth.json';

import commonFr from '../../public/locales/fr-CA/common.json';
import dashboardFr from '../../public/locales/fr-CA/dashboard.json';
import healthFr from '../../public/locales/fr-CA/health.json';
import settingsFr from '../../public/locales/fr-CA/settings.json';
import authFr from '../../public/locales/fr-CA/auth.json';

const savedLanguage = localStorage.getItem('language') || 'en';

i18n
  .use(initReactI18next)
  .init({
    resources: {
      en: {
        common: commonEn,
        dashboard: dashboardEn,
        health: healthEn,
        settings: settingsEn,
        auth: authEn,
      },
      'es-CO': {
        common: commonEs,
        dashboard: dashboardEs,
        health: healthEs,
        settings: settingsEs,
        auth: authEs,
      },
      'fr-CA': {
        common: commonFr,
        dashboard: dashboardFr,
        health: healthFr,
        settings: settingsFr,
        auth: authFr,
      },
    },
    lng: savedLanguage,
    fallbackLng: 'en',
    ns: ['common', 'dashboard', 'health', 'settings', 'auth'],
    defaultNS: 'common',
    interpolation: {
      escapeValue: false,
    },
    react: {
      useSuspense: false,
    },
  });

i18n.on('languageChanged', (lng) => {
  localStorage.setItem('language', lng);
});

export default i18n;
