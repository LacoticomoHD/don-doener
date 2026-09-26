import type { Language } from '@/i18n/translations';

const LOCALES: Record<Language, string> = { de: 'de-DE', en: 'en-GB', tr: 'tr-TR' };

export function formatPrice(value: number, lang: Language): string {
  return new Intl.NumberFormat(LOCALES[lang], { style: 'currency', currency: 'EUR' }).format(value);
}

export function formatDistance(km: number, lang: Language): string {
  const nf = new Intl.NumberFormat(LOCALES[lang], { maximumFractionDigits: 1 });
  return km < 1 ? `${Math.round(km * 1000)} m` : `${nf.format(km)} km`;
}

export function formatScore(value: number, lang: Language): string {
  return new Intl.NumberFormat(LOCALES[lang], { minimumFractionDigits: 1, maximumFractionDigits: 1 }).format(value);
}

export function formatDate(iso: string, lang: Language): string {
  return new Date(iso).toLocaleDateString(LOCALES[lang], { day: '2-digit', month: '2-digit', year: 'numeric' });
}

/** Liest Preise wie „6,50" oder „7" ein. Leer → null; ungültig → undefined. */
export function parsePrice(text: string): number | null | undefined {
  const trimmed = text.trim();
  if (!trimmed) return null;
  const value = Number(trimmed.replace(',', '.'));
  if (!Number.isFinite(value) || value <= 0 || value >= 50) return undefined;
  return Math.round(value * 100) / 100;
}

export function priceToInput(value: number | null): string {
  return value == null ? '' : value.toFixed(2).replace('.', ',');
}
