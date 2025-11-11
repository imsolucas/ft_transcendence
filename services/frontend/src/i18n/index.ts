import i18n from 'i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import enTranslations from './locales/en.json';
import esTranslations from './locales/es.json';
import frTranslations from './locales/fr.json';

i18n
  .use(LanguageDetector)
  .init({
    resources: {
      en: {
        translation: enTranslations,
      },
      es: {
        translation: esTranslations,
      },
      fr: {
        translation: frTranslations,
      },
    },
    fallbackLng: 'en',
    debug: false,
    interpolation: {
      escapeValue: false,
    },
    detection: {
      order: ['localStorage', 'navigator'],
      caches: ['localStorage'],
    },
  });

export const t = (key: string, options?: any) => i18n.t(key, options);
export const changeLanguage = (lng: string) => i18n.changeLanguage(lng);
export const getCurrentLanguage = () => i18n.language;

export default i18n;

