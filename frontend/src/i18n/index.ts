import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import HttpBackend from 'i18next-http-backend';
import { DEFAULT_LANGUAGE, NAMESPACES } from './languages';

const savedLanguage = localStorage.getItem('language') || DEFAULT_LANGUAGE;

i18n
  .use(HttpBackend)
  .use(initReactI18next)
  .init({
    lng: savedLanguage,
    fallbackLng: DEFAULT_LANGUAGE,
    ns: [...NAMESPACES],
    defaultNS: 'common',
    backend: {
      loadPath: '/locales/{{lng}}/{{ns}}.json',
    },
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
