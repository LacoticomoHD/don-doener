import {
  SHOP_FEATURES,
  type CityStats,
  type FeatureStat,
  type GeoBounds,
  type HoursStats,
  type MyRating,
  type OpeningHours,
  type PriceField,
  type PricePoint,
  type Rating,
  type RatingStats,
  type RatingValues,
  type Report,
  type ReportReason,
  type Shop,
  type ShopDetail,
  type ShopFeature,
  type ShopSummary,
} from '@/types';

import { supabase } from './supabase';

/** Wirft Supabase-Fehler als normale Errors, damit die UI sie einheitlich anzeigt. */
function unwrap<T>(result: { data: T; error: { message: string } | null }): T {
  if (result.error) throw new Error(result.error.message);
  return result.data;
}

const isFeature = (f: string): f is ShopFeature => (SHOP_FEATURES as readonly string[]).includes(f);

// ---------------------------------------------------------------------------
// Übersicht (View shops_overview – enthält keine ausgeblendeten Läden)
// ---------------------------------------------------------------------------

const OVERVIEW_COLUMNS =
  'id, name, address, latitude, longitude, opening_hours, city, doener_preis, doener_gross_preis, ' +
  'dueruem_preis, menue_preis, preis_bestaetigt_am, kartenzahlung, created_by, created_at, ' +
  'rating_count, verifiziert_count, avg_gesamt, avg_geschmack, avg_fleischqualitaet, ' +
  'avg_sossenqualitaet, avg_freundlichkeit, avg_sauberkeit, avg_preis_leistung, avg_wartezeit, ' +
  'value_score, features_confirmed';

interface OverviewRow extends Shop {
  rating_count: number;
  verifiziert_count: number;
  avg_gesamt: number | null;
  avg_geschmack: number | null;
  avg_fleischqualitaet: number | null;
  avg_sossenqualitaet: number | null;
  avg_freundlichkeit: number | null;
  avg_sauberkeit: number | null;
  avg_preis_leistung: number | null;
  avg_wartezeit: number | null;
  value_score: number | null;
  features_confirmed: string[] | null;
}

function toSummary(row: OverviewRow): ShopSummary {
  return {
    id: row.id,
    name: row.name,
    address: row.address,
    latitude: row.latitude,
    longitude: row.longitude,
    opening_hours: (row.opening_hours ?? {}) as OpeningHours,
    city: row.city,
    doener_preis: row.doener_preis,
    doener_gross_preis: row.doener_gross_preis,
    dueruem_preis: row.dueruem_preis,
    menue_preis: row.menue_preis,
    preis_bestaetigt_am: row.preis_bestaetigt_am,
    kartenzahlung: row.kartenzahlung,
    created_by: row.created_by,
    created_at: row.created_at,
    value_score: row.value_score,
    features: (row.features_confirmed ?? []).filter(isFeature),
    stats: {
      rating_count: row.rating_count,
      verified_count: row.verifiziert_count,
      avg_gesamt: row.avg_gesamt,
      avg_geschmack: row.avg_geschmack,
      avg_fleischqualitaet: row.avg_fleischqualitaet,
      avg_sossenqualitaet: row.avg_sossenqualitaet,
      avg_freundlichkeit: row.avg_freundlichkeit,
      avg_sauberkeit: row.avg_sauberkeit,
      avg_preis_leistung: row.avg_preis_leistung,
      avg_wartezeit: row.avg_wartezeit,
    },
  };
}

function overview() {
  return supabase.from('shops_overview').select(OVERVIEW_COLUMNS);
}

/** Läden in einem Kartenausschnitt – nie ganz Deutschland auf einmal. */
export async function fetchShopsInBounds(bounds: GeoBounds, limit = 500): Promise<ShopSummary[]> {
  const rows = unwrap(
    await overview()
      .gte('latitude', bounds.minLat)
      .lte('latitude', bounds.maxLat)
      .gte('longitude', bounds.minLon)
      .lte('longitude', bounds.maxLon)
      // Bewertete Läden zuerst, damit sie bei vielen Treffern nicht wegfallen
      .order('rating_count', { ascending: false })
      .limit(limit)
  );
  return (rows as unknown as OverviewRow[]).map(toSummary);
}

/** Suche nach Name, Adresse oder Stadt in ganz Deutschland. */
export async function searchShops(query: string, limit = 60): Promise<ShopSummary[]> {
  // Zeichen, die in PostgREST-Filtern eine Bedeutung haben, entfernen
  const term = query.replace(/[%_,()*\\]/g, ' ').trim();
  if (!term) return [];
  const rows = unwrap(
    await overview()
      .or(`name.ilike.%${term}%,address.ilike.%${term}%,city.ilike.%${term}%`)
      .order('rating_count', { ascending: false })
      .limit(limit)
  );
  return (rows as unknown as OverviewRow[]).map(toSummary);
}

export type TopMode = 'rating' | 'value';

export async function fetchTopShops(city: string | null, mode: TopMode, limit = 10): Promise<ShopSummary[]> {
  let q = overview().gt('rating_count', 0);
  q =
    mode === 'value'
      ? q.not('value_score', 'is', null).order('value_score', { ascending: false })
      : q.order('avg_gesamt', { ascending: false });
  q = q.order('rating_count', { ascending: false });
  if (city) q = q.eq('city', city);
  const rows = unwrap(await q.limit(limit));
  return (rows as unknown as OverviewRow[]).map(toSummary);
}

/** Städte mit den meisten Läden inkl. Dönerpreis-Schnitt. */
export async function fetchCityStats(limit = 15): Promise<CityStats[]> {
  const rows = unwrap(
    await supabase
      .from('city_stats')
      .select('city, laeden, preis_schnitt, preis_anzahl')
      .order('laeden', { ascending: false })
      .limit(limit)
  );
  return rows as CityStats[];
}

/** Deutschlandweiter Dönerpreis-Schnitt über alle Läden mit Preis. */
export async function fetchNationalPriceIndex(): Promise<{ schnitt: number; anzahl: number } | null> {
  const rows = unwrap(
    await supabase.from('shops').select('doener_preis').not('doener_preis', 'is', null).limit(5000)
  ) as { doener_preis: number }[];
  if (rows.length === 0) return null;
  const sum = rows.reduce((acc, r) => acc + Number(r.doener_preis), 0);
  return { schnitt: Math.round((sum / rows.length) * 100) / 100, anzahl: rows.length };
}

// ---------------------------------------------------------------------------
// Laden-Details
// ---------------------------------------------------------------------------

export async function fetchShopDetail(shopId: string): Promise<ShopDetail | null> {
  const row = unwrap(
    await supabase
      .from('shops')
      .select(
        '*, shop_stats(*), shop_hours_stats(bestaetigt, veraltet, score), ' +
          'shop_feature_stats(feature, bestaetigt, widersprochen, score)'
      )
      .eq('id', shopId)
      .maybeSingle()
  ) as
    | (Shop & {
        ausgeblendet: boolean;
        shop_stats: RatingStats | null;
        shop_hours_stats: HoursStats | null;
        shop_feature_stats: { feature: string; bestaetigt: number; widersprochen: number; score: number }[];
      })
    | null;
  if (!row) return null;
  const { shop_stats, shop_hours_stats, shop_feature_stats, ...shop } = row;
  return {
    ...shop,
    opening_hours: (shop.opening_hours ?? {}) as OpeningHours,
    stats: shop_stats,
    hoursStats: shop_hours_stats,
    featureStats: shop_feature_stats
      .filter((f): f is FeatureStat => isFeature(f.feature))
      .sort((a, b) => b.score - a.score),
  };
}

export async function fetchPriceHistory(shopId: string): Promise<PricePoint[]> {
  const rows = unwrap(
    await supabase
      .from('price_history')
      .select('preis, recorded_at')
      .eq('shop_id', shopId)
      .order('recorded_at', { ascending: true })
  );
  return (rows as PricePoint[]).map((r) => ({ ...r, preis: Number(r.preis) }));
}

// ---------------------------------------------------------------------------
// Läden anlegen und bearbeiten (Wiki-Prinzip, Änderungen werden protokolliert)
// ---------------------------------------------------------------------------

export interface ShopInput {
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  city: string | null;
  opening_hours: OpeningHours;
  doener_preis: number | null;
  doener_gross_preis: number | null;
  dueruem_preis: number | null;
  menue_preis: number | null;
  kartenzahlung: boolean | null;
}

export async function createShop(input: ShopInput, userId: string): Promise<string> {
  const row = unwrap(
    await supabase
      .from('shops')
      .insert({ ...input, created_by: userId })
      .select('id')
      .single()
  );
  return (row as { id: string }).id;
}

export async function updateShop(shopId: string, input: ShopInput): Promise<void> {
  unwrap(await supabase.from('shops').update(input).eq('id', shopId));
}

export async function deleteShop(shopId: string): Promise<void> {
  unwrap(await supabase.from('shops').delete().eq('id', shopId));
}

/** Nur einzelne Felder ändern (Preis-Check, Kartenzahlung aus dem Bewerten-Dialog). */
export async function patchShop(
  shopId: string,
  patch: Partial<Record<PriceField, number | null>> & {
    kartenzahlung?: boolean | null;
    preis_bestaetigt_am?: string;
  }
): Promise<void> {
  unwrap(await supabase.from('shops').update(patch).eq('id', shopId));
}

export async function confirmPrice(shopId: string): Promise<void> {
  await patchShop(shopId, { preis_bestaetigt_am: new Date().toISOString() });
}

// ---------------------------------------------------------------------------
// Bewertungen
// ---------------------------------------------------------------------------

export async function fetchMyRating(shopId: string, userId: string): Promise<Rating | null> {
  const row = unwrap(
    await supabase.from('ratings').select('*').eq('shop_id', shopId).eq('user_id', userId).maybeSingle()
  );
  return row as Rating | null;
}

export async function fetchMyRatings(userId: string): Promise<MyRating[]> {
  const rows = unwrap(
    await supabase
      .from('ratings')
      .select('*, shop:shops(id, name, address, city)')
      .eq('user_id', userId)
      .order('updated_at', { ascending: false })
  );
  return rows as unknown as MyRating[];
}

/** Eine Bewertung pro Nutzer und Laden – vorhandene wird überschrieben. */
export async function saveRating(
  shopId: string,
  userId: string,
  values: RatingValues,
  verified: boolean
): Promise<void> {
  unwrap(
    await supabase.from('ratings').upsert(
      {
        shop_id: shopId,
        user_id: userId,
        geschmack: values.geschmack,
        fleischqualitaet: values.fleischqualitaet,
        sossenqualitaet: values.sossenqualitaet,
        freundlichkeit: values.freundlichkeit,
        sauberkeit: values.sauberkeit,
        preis_leistung: values.preis_leistung,
        wartezeit: values.wartezeit,
        verified,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'shop_id,user_id' }
    )
  );
}

export async function deleteRating(shopId: string, userId: string): Promise<void> {
  unwrap(await supabase.from('ratings').delete().eq('shop_id', shopId).eq('user_id', userId));
}

// ---------------------------------------------------------------------------
// Besonderheiten-Abstimmung (nur wer bewertet oder den Laden angelegt hat)
// ---------------------------------------------------------------------------

export type Vote = 1 | -1 | 0;

export async function fetchMyFeatureVotes(shopId: string, userId: string): Promise<Partial<Record<ShopFeature, Vote>>> {
  const rows = unwrap(
    await supabase.from('shop_feature_votes').select('feature, vote').eq('shop_id', shopId).eq('user_id', userId)
  ) as { feature: string; vote: number }[];
  const result: Partial<Record<ShopFeature, Vote>> = {};
  for (const r of rows) if (isFeature(r.feature)) result[r.feature] = r.vote as Vote;
  return result;
}

export async function saveFeatureVotes(
  shopId: string,
  userId: string,
  votes: Partial<Record<ShopFeature, Vote>>
): Promise<void> {
  const entries = Object.entries(votes) as [ShopFeature, Vote][];
  const upserts = entries
    .filter(([, v]) => v !== 0)
    .map(([feature, vote]) => ({
      shop_id: shopId,
      user_id: userId,
      feature,
      vote,
      updated_at: new Date().toISOString(),
    }));
  const removals = entries.filter(([, v]) => v === 0).map(([f]) => f);
  if (upserts.length > 0) {
    unwrap(await supabase.from('shop_feature_votes').upsert(upserts, { onConflict: 'shop_id,user_id,feature' }));
  }
  if (removals.length > 0) {
    unwrap(
      await supabase
        .from('shop_feature_votes')
        .delete()
        .eq('shop_id', shopId)
        .eq('user_id', userId)
        .in('feature', removals)
    );
  }
}

// ---------------------------------------------------------------------------
// Öffnungszeiten-Feedback („Stimmen die Zeiten noch?")
// ---------------------------------------------------------------------------

export async function fetchMyHoursVote(shopId: string, userId: string): Promise<Vote> {
  const row = unwrap(
    await supabase.from('hours_votes').select('vote').eq('shop_id', shopId).eq('user_id', userId).maybeSingle()
  ) as { vote: number } | null;
  return (row?.vote as Vote | undefined) ?? 0;
}

export async function setHoursVote(shopId: string, userId: string, vote: Vote): Promise<void> {
  if (vote === 0) {
    unwrap(await supabase.from('hours_votes').delete().eq('shop_id', shopId).eq('user_id', userId));
    return;
  }
  unwrap(
    await supabase
      .from('hours_votes')
      .upsert({ shop_id: shopId, user_id: userId, vote }, { onConflict: 'shop_id,user_id' })
  );
}

// ---------------------------------------------------------------------------
// Favoriten
// ---------------------------------------------------------------------------

export async function fetchFavoriteIds(userId: string): Promise<Set<string>> {
  const rows = unwrap(await supabase.from('favorites').select('shop_id').eq('user_id', userId)) as {
    shop_id: string;
  }[];
  return new Set(rows.map((r) => r.shop_id));
}

export async function setFavorite(userId: string, shopId: string, favorite: boolean): Promise<void> {
  if (favorite) {
    unwrap(await supabase.from('favorites').upsert({ user_id: userId, shop_id: shopId }));
  } else {
    unwrap(await supabase.from('favorites').delete().eq('user_id', userId).eq('shop_id', shopId));
  }
}

export async function fetchFavoriteShops(userId: string): Promise<ShopSummary[]> {
  const ids = await fetchFavoriteIds(userId);
  if (ids.size === 0) return [];
  const rows = unwrap(await overview().in('id', [...ids]));
  return (rows as unknown as OverviewRow[]).map(toSummary);
}

// ---------------------------------------------------------------------------
// Meldungen und Admin
// ---------------------------------------------------------------------------

export async function createReport(shopId: string, userId: string, reason: ReportReason, details: string) {
  unwrap(
    await supabase.from('reports').insert({
      shop_id: shopId,
      user_id: userId,
      reason,
      details: details.trim() || null,
    })
  );
}

export async function fetchIsAdmin(): Promise<boolean> {
  const { data, error } = await supabase.rpc('is_admin');
  return !error && data === true;
}

export async function fetchReports(): Promise<Report[]> {
  const rows = unwrap(
    await supabase
      .from('reports')
      .select('id, shop_id, reason, details, status, created_at, shop:shops(id, name, address)')
      .order('status', { ascending: false })
      .order('created_at', { ascending: false })
  );
  return rows as unknown as Report[];
}

export async function setReportStatus(reportId: string, status: 'offen' | 'erledigt') {
  unwrap(await supabase.from('reports').update({ status }).eq('id', reportId));
}

export async function deleteOwnAccount(): Promise<void> {
  unwrap(await supabase.rpc('delete_own_account'));
}

// ---------------------------------------------------------------------------
// Geokodierung über Nominatim (OpenStreetMap) – max. 1 Anfrage pro Sekunde
// ---------------------------------------------------------------------------

export interface Place {
  label: string;
  latitude: number;
  longitude: number;
  city: string | null;
}

interface NominatimResult {
  display_name: string;
  lat: string;
  lon: string;
  address?: {
    road?: string;
    house_number?: string;
    postcode?: string;
    city?: string;
    town?: string;
    village?: string;
    municipality?: string;
  };
}

let lastNominatimCall = 0;

export async function geocode(query: string): Promise<Place[]> {
  const wait = lastNominatimCall + 1100 - Date.now();
  if (wait > 0) await new Promise((r) => setTimeout(r, wait));
  lastNominatimCall = Date.now();

  const url =
    'https://nominatim.openstreetmap.org/search?format=jsonv2&limit=5&addressdetails=1' +
    `&countrycodes=de,at,ch&q=${encodeURIComponent(query)}`;
  const res = await fetch(url, { headers: { 'User-Agent': 'DonDoener/2.0 (Doener-Bewertungs-App)' } });
  if (!res.ok) throw new Error(`Adresssuche fehlgeschlagen (${res.status})`);
  const results = (await res.json()) as NominatimResult[];
  return results.map((r) => {
    const a = r.address ?? {};
    const city = a.city ?? a.town ?? a.village ?? a.municipality ?? null;
    // Kurze, lesbare Adresse „Straße Nr, PLZ Stadt" statt des langen OSM-Namens
    const street = [a.road, a.house_number].filter(Boolean).join(' ');
    const place = [a.postcode, city].filter(Boolean).join(' ');
    const label = street && place ? `${street}, ${place}` : r.display_name;
    return { label, latitude: parseFloat(r.lat), longitude: parseFloat(r.lon), city };
  });
}
