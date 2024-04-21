import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
// @ts-ignore
import English from './translations/en.json';
// @ts-ignore
import Romanian from './translations/ro.json';
// @ts-ignore
import Greek from './translations/el.json';

const resources = {
  English,
  Romanian,
  Greek,
};

export const availableLanguages = Object.keys(resources);

i18n
  .use(initReactI18next)
  .use(LanguageDetector)
  .init({
    resources,
    defaultNS: 'common',
    fallbackLng: 'English',
  });

export default i18n;
