import { getLocales } from 'expo-localization';
import { createContext, useContext, useMemo, useState, type ReactNode } from 'react';

import { readSetting, writeSetting } from '@/lib/storage';

import { LANGUAGES, translations, type Language, type TranslationKey } from './translations';

const STORAGE_KEY = 'dondoener.language';

type Vars = Record<string, string | number>;

interface I18nContextValue {
  lang: Language;
  setLang: (lang: Language) => void;
  t: (key: TranslationKey, vars?: Vars) => string;
}

const I18nContext = createContext<I18nContextValue | null>(null);

function initialLanguage(): Language {
  const stored = readSetting(STORAGE_KEY);
  if (stored && (LANGUAGES as readonly string[]).includes(stored)) return stored as Language;
  const device = getLocales()[0]?.languageCode ?? 'de';
  return (LANGUAGES as readonly string[]).includes(device) ? (device as Language) : 'de';
}

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Language>(initialLanguage);

  const value = useMemo<I18nContextValue>(
    () => ({
      lang,
      setLang: (next) => {
        setLangState(next);
        writeSetting(STORAGE_KEY, next);
      },
      t: (key, vars) => {
        let text = translations[lang][key] || translations.de[key];
        if (vars) {
          for (const [k, v] of Object.entries(vars)) text = text.replaceAll(`{${k}}`, String(v));
        }
        return text;
      },
    }),
    [lang]
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error('useI18n außerhalb von I18nProvider');
  return ctx;
}
