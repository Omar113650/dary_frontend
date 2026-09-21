import { createContext, useContext } from 'react';
import type { Locale, TranslationStrings } from '../utils/i18n';
import { translations, getDirection } from '../utils/i18n';

interface LocaleContextValue {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: TranslationStrings;
  direction: 'rtl' | 'ltr';
}

export const LocaleContext = createContext<LocaleContextValue>({
  locale: 'ar',
  setLocale: () => {},
  t: translations.ar,
  direction: getDirection('ar'),
});

export function useLocale() {
  return useContext(LocaleContext);
}
