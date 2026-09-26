import { WEEKDAYS, type OpeningHours, type Weekday } from '@/types';

export const TIME_PATTERN = /^([01]?\d|2[0-3]):[0-5]\d$/;

/** Wochentag-Schlüssel für ein Datum (JS: 0 = Sonntag). */
export function weekdayKey(date: Date): Weekday {
  return WEEKDAYS[(date.getDay() + 6) % 7];
}

function toMinutes(time: string): number {
  const [h, m] = time.split(':').map(Number);
  return h * 60 + (m || 0);
}

/** Geöffnet zum Zeitpunkt `now`? Unterstützt Zeiten über Mitternacht (18:00–02:00). */
export function isOpenNow(hours: OpeningHours, now: Date = new Date()): boolean {
  const minutes = now.getHours() * 60 + now.getMinutes();

  const today = hours[weekdayKey(now)];
  if (today) {
    const open = toMinutes(today.open);
    const close = toMinutes(today.close);
    if (close > open ? minutes >= open && minutes < close : minutes >= open) return true;
  }

  // Gestern bis nach Mitternacht geöffnet?
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  const prev = hours[weekdayKey(yesterday)];
  if (prev) {
    const open = toMinutes(prev.open);
    const close = toMinutes(prev.close);
    if (close <= open && minutes < close) return true;
  }
  return false;
}

export function hasOpeningHours(hours: OpeningHours): boolean {
  return Object.keys(hours).length > 0;
}

/** Normalisiert Eingaben wie „9" oder „9.30" zu „09:00" bzw. „09:30". */
export function normalizeTime(input: string): string {
  const cleaned = input.trim().replace('.', ':');
  if (/^\d{1,2}$/.test(cleaned)) return `${cleaned.padStart(2, '0')}:00`;
  const match = cleaned.match(/^(\d{1,2}):(\d{2})$/);
  if (match) return `${match[1].padStart(2, '0')}:${match[2]}`;
  return cleaned;
}
