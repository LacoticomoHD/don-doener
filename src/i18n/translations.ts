import { de } from './de';
import { en } from './en';
import { tr } from './tr';

export const LANGUAGES = ['de', 'en', 'tr'] as const;
export type Language = (typeof LANGUAGES)[number];

export const LANGUAGE_LABELS: Record<Language, string> = {
  de: '🇩🇪 Deutsch',
  en: '🇬🇧 English',
  tr: '🇹🇷 Türkçe',
};

export type TranslationKey = keyof typeof de;

export const translations: Record<Language, Record<TranslationKey, string>> = { de, en, tr };
