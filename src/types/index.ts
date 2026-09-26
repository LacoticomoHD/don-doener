/** Bewertungskategorien, je 1–5 Sterne. Fleischqualität ist optional
 *  (z. B. wenn vegetarisch bestellt wurde). */
export const RATING_CATEGORIES = [
  'geschmack',
  'fleischqualitaet',
  'sossenqualitaet',
  'freundlichkeit',
  'sauberkeit',
  'preis_leistung',
  'wartezeit',
] as const;

export type RatingCategory = (typeof RATING_CATEGORIES)[number];

export const OPTIONAL_CATEGORIES: readonly RatingCategory[] = ['fleischqualitaet'];

/** Besonderheiten eines Ladens – per Community-Abstimmung gepflegt. */
export const SHOP_FEATURES = [
  'kalb',
  'haehnchen',
  'pute',
  'lamm',
  'oktopus',
  'vegetarisch',
  'vegan',
  'halal',
  'hausgemachtes_brot',
  'joghurtsosse',
  'knoblauchsosse',
  'scharfe_sosse',
  'cocktailsosse',
  'ayran_hausgemacht',
] as const;

export type ShopFeature = (typeof SHOP_FEATURES)[number];

export const SHOP_FEATURE_ICONS: Record<ShopFeature, string> = {
  kalb: '🐄',
  haehnchen: '🐔',
  pute: '🦃',
  lamm: '🐑',
  oktopus: '🐙',
  vegetarisch: '🥗',
  vegan: '🌱',
  halal: '☪️',
  hausgemachtes_brot: '🥖',
  joghurtsosse: '🥣',
  knoblauchsosse: '🧄',
  scharfe_sosse: '🌶️',
  cocktailsosse: '🍹',
  ayran_hausgemacht: '🥛',
};

export const WEEKDAYS = [
  'montag',
  'dienstag',
  'mittwoch',
  'donnerstag',
  'freitag',
  'samstag',
  'sonntag',
] as const;

export type Weekday = (typeof WEEKDAYS)[number];

/** Öffnungszeiten je Wochentag; fehlt ein Tag, ist der Laden dann geschlossen. */
export type OpeningHours = Partial<Record<Weekday, { open: string; close: string }>>;

export const PRICE_FIELDS = ['doener_preis', 'doener_gross_preis', 'dueruem_preis', 'menue_preis'] as const;
export type PriceField = (typeof PRICE_FIELDS)[number];

export const PRICE_ICONS: Record<PriceField, string> = {
  doener_preis: '🥙',
  doener_gross_preis: '🥙＋',
  dueruem_preis: '🌯',
  menue_preis: '🍟',
};

export const REPORT_REASONS = [
  'falsche_adresse',
  'falsche_oeffnungszeiten',
  'falscher_preis',
  'dauerhaft_geschlossen',
  'duplikat',
  'sonstiges',
] as const;

export type ReportReason = (typeof REPORT_REASONS)[number];

export interface Shop {
  id: string;
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  opening_hours: OpeningHours;
  city: string | null;
  doener_preis: number | null;
  doener_gross_preis: number | null;
  dueruem_preis: number | null;
  menue_preis: number | null;
  preis_bestaetigt_am: string | null;
  /** true = Karte möglich, false = nur bar, null = unbekannt */
  kartenzahlung: boolean | null;
  created_by: string | null;
  created_at: string;
}

export interface RatingStats {
  rating_count: number;
  verified_count: number;
  avg_gesamt: number | null;
  avg_geschmack: number | null;
  avg_fleischqualitaet: number | null;
  avg_sossenqualitaet: number | null;
  avg_freundlichkeit: number | null;
  avg_sauberkeit: number | null;
  avg_preis_leistung: number | null;
  avg_wartezeit: number | null;
}

/** Laden mit Bewertungsschnitt und bestätigten Besonderheiten (Karte, Liste, Top). */
export interface ShopSummary extends Shop {
  stats: RatingStats;
  features: ShopFeature[];
  /** Sterne pro Euro Dönerpreis – für die Preis-Leistungs-Rangliste */
  value_score: number | null;
}

export interface FeatureStat {
  feature: ShopFeature;
  bestaetigt: number;
  widersprochen: number;
  score: number;
}

export interface HoursStats {
  bestaetigt: number;
  veraltet: number;
  score: number;
}

/** Alles, was die Detailseite eines Ladens braucht. */
export interface ShopDetail extends Shop {
  ausgeblendet: boolean;
  stats: RatingStats | null;
  featureStats: FeatureStat[];
  hoursStats: HoursStats | null;
}

export type RatingValues = Record<RatingCategory, number | null>;

export interface Rating extends RatingValues {
  id: string;
  shop_id: string;
  user_id: string;
  verified: boolean;
  created_at: string;
  updated_at: string;
}

export interface MyRating extends Rating {
  shop: Pick<Shop, 'id' | 'name' | 'address' | 'city'> | null;
}

export interface Report {
  id: string;
  shop_id: string;
  reason: ReportReason;
  details: string | null;
  status: 'offen' | 'erledigt';
  created_at: string;
  shop: Pick<Shop, 'id' | 'name' | 'address'> | null;
}

export interface PricePoint {
  preis: number;
  recorded_at: string;
}

export interface CityStats {
  city: string;
  laeden: number;
  preis_schnitt: number | null;
  preis_anzahl: number;
}

export interface GeoBounds {
  minLat: number;
  maxLat: number;
  minLon: number;
  maxLon: number;
}

export interface Coords {
  latitude: number;
  longitude: number;
}
