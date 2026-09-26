import { Ionicons } from '@expo/vector-icons';
import BottomSheet, { BottomSheetFlatList, BottomSheetView } from '@gorhom/bottom-sheet';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Keyboard, Pressable, StyleSheet, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { FilterBar } from '@/components/FilterBar';
import { MAX_LAT_SPAN, type ShopMapHandle } from '@/components/map/mapConfig';
import { ShopMap } from '@/components/map/ShopMap';
import { RouteSheet } from '@/components/RouteSheet';
import { ShopCard } from '@/components/ShopCard';
import { ShopPreview } from '@/components/ShopPreview';
import { Button, Chip, IconButton, noWebOutline, Sticker, Txt } from '@/components/ui';
import { useI18n } from '@/i18n/I18nProvider';
import { fetchShopsInBounds, geocode, searchShops, type Place } from '@/lib/api';
import { showMessage } from '@/lib/dialog';
import { useFilters } from '@/lib/filters';
import { DEFAULT_CENTER, distanceKm } from '@/lib/geo';
import { getKnownPosition, requestPosition } from '@/lib/location';
import { useDebounced } from '@/lib/useAsync';
import { useRequireLogin } from '@/lib/useRequireLogin';
import { useTheme } from '@/theme/ThemeProvider';
import { fonts, radius, space } from '@/theme/tokens';
import type { Coords, GeoBounds, ShopSummary } from '@/types';

type Sort = 'best' | 'nearest' | 'price';

/** Höhe des eingeklappten Panels bzw. der Vorschau-Karte. */
const PEEK_HEIGHT = 128;
const PREVIEW_HEIGHT = 250;

export default function DiscoverScreen() {
  const { theme } = useTheme();
  const c = theme.colors;
  const { t } = useI18n();
  const insets = useSafeAreaInsets();
  const { matches, activeCount } = useFilters();
  const requireLogin = useRequireLogin();
  const mapRef = useRef<ShopMapHandle>(null);
  const sheetRef = useRef<BottomSheet>(null);

  const [shops, setShops] = useState<ShopSummary[]>([]);
  const [tooFar, setTooFar] = useState(false);
  const [loading, setLoading] = useState(false);
  const [position, setPosition] = useState<Coords | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [routeTarget, setRouteTarget] = useState<Coords | null>(null);
  const [sort, setSort] = useState<Sort>('best');

  // Suche (Läden und Orte)
  const [query, setQuery] = useState('');
  const [searchFocused, setSearchFocused] = useState(false);
  const [shopHits, setShopHits] = useState<ShopSummary[]>([]);
  const [placeHits, setPlaceHits] = useState<Place[]>([]);
  const [searching, setSearching] = useState(false);
  const debouncedQuery = useDebounced(query.trim(), 450);

  const lastBounds = useRef<GeoBounds | null>(null);
  const requestId = useRef(0);
  const lastShopPress = useRef(0);

  const load = useCallback(async (bounds: GeoBounds) => {
    lastBounds.current = bounds;
    if (bounds.maxLat - bounds.minLat > MAX_LAT_SPAN) {
      setTooFar(true);
      return;
    }
    setTooFar(false);
    const id = ++requestId.current;
    setLoading(true);
    try {
      const result = await fetchShopsInBounds(bounds);
      if (id === requestId.current) setShops(result);
    } catch {
      // Beim nächsten Verschieben der Karte wird es erneut versucht
    } finally {
      if (id === requestId.current) setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      if (lastBounds.current) load(lastBounds.current);
    }, [load])
  );

  useEffect(() => {
    getKnownPosition().then((pos) => {
      if (!pos) return;
      setPosition(pos);
      mapRef.current?.flyTo({ ...pos, zoom: 13.5 });
    });
  }, []);

  // Live-Suche: Läden deutschlandweit + Orte über Nominatim
  useEffect(() => {
    if (debouncedQuery.length < 2) return;
    let cancelled = false;
    Promise.allSettled([searchShops(debouncedQuery, 6), geocode(debouncedQuery)]).then(([s, p]) => {
      if (cancelled) return;
      setShopHits(s.status === 'fulfilled' ? s.value : []);
      setPlaceHits(p.status === 'fulfilled' ? p.value.slice(0, 3) : []);
      setSearching(false);
    });
    return () => {
      cancelled = true;
    };
  }, [debouncedQuery]);

  const onQueryChange = (text: string) => {
    setQuery(text);
    const ready = text.trim().length >= 2;
    setSearching(ready);
    if (!ready) {
      setShopHits([]);
      setPlaceHits([]);
    }
  };

  const closeSearch = () => {
    Keyboard.dismiss();
    setSearchFocused(false);
  };

  const rows = useMemo(() => {
    const list = shops.filter(matches).map((shop) => ({ shop, distance: position ? distanceKm(position, shop) : null }));
    const byScore = (a: (typeof list)[number], b: (typeof list)[number]) =>
      (b.shop.stats.avg_gesamt ?? -1) - (a.shop.stats.avg_gesamt ?? -1) || b.shop.stats.rating_count - a.shop.stats.rating_count;
    return list.sort((a, b) => {
      if (sort === 'nearest' && a.distance != null && b.distance != null) return a.distance - b.distance;
      if (sort === 'price') return (a.shop.doener_preis ?? 999) - (b.shop.doener_preis ?? 999) || byScore(a, b);
      return byScore(a, b);
    });
  }, [shops, matches, position, sort]);

  const selected = selectedId ? (shops.find((s) => s.id === selectedId) ?? null) : null;
  const snapPoints = useMemo(() => (selected ? [PREVIEW_HEIGHT] : [PEEK_HEIGHT, '50%', '88%']), [selected]);

  const selectShop = (id: string) => {
    lastShopPress.current = Date.now();
    setSelectedId(id);
    sheetRef.current?.snapToIndex(0);
  };

  const clearSelection = () => {
    closeSearch();
    // Auf Android meldet die Karte den Marker-Tipp zusätzlich als Karten-Tipp
    if (Date.now() - lastShopPress.current < 400) return;
    setSelectedId(null);
  };

  const locate = async () => {
    const pos = await requestPosition();
    if (!pos) {
      showMessage(t('map.myLocation'), t('map.locationDenied'));
      return;
    }
    setPosition(pos);
    mapRef.current?.flyTo({ ...pos, zoom: 14.5 });
  };

  const chooseNearest = async () => {
    if (!position) {
      const pos = await requestPosition();
      if (!pos) return showMessage(t('list.sortNearest'), t('list.locationNeeded'));
      setPosition(pos);
    }
    setSort('nearest');
  };

  const addShop = () => {
    if (requireLogin()) router.push('/laden/neu');
  };

  const showResults = searchFocused && query.trim().length >= 2;

  return (
    <View style={[styles.flex, { backgroundColor: c.background }]}>
      <ShopMap
        ref={mapRef}
        shops={shops.filter(matches)}
        initialCamera={{ ...DEFAULT_CENTER, zoom: 12 }}
        palette={c}
        dark={theme.dark}
        showUserLocation={position != null}
        selectedId={selectedId}
        onBoundsChange={load}
        onShopPress={selectShop}
        onMapPress={clearSelection}
      />

      {/* Kopfbereich: Suche, Filter, Standort */}
      <View style={[styles.top, { paddingTop: insets.top + space.sm }]} pointerEvents="box-none">
        <View style={styles.searchRow}>
          <Sticker containerStyle={styles.flex} style={styles.search} radius={radius.pill}>
            <Ionicons name="search" size={20} color={c.text} />
            <TextInput
              value={query}
              onChangeText={onQueryChange}
              onFocus={() => {
                setSearchFocused(true);
                // Liste einklappen, damit die Treffer sichtbar sind
                sheetRef.current?.snapToIndex(0);
              }}
              placeholder={t('discover.searchPlaceholder')}
              placeholderTextColor={c.textMuted}
              returnKeyType="search"
              onSubmitEditing={() => placeHits[0] && flyToPlace(placeHits[0])}
              style={[styles.searchInput, noWebOutline, { color: c.text }]}
            />
            {searching ? (
              <ActivityIndicator color={c.primary} />
            ) : query ? (
              <Pressable onPress={() => onQueryChange('')} hitSlop={10} accessibilityLabel="Suche leeren">
                <Ionicons name="close-circle" size={20} color={c.textMuted} />
              </Pressable>
            ) : null}
          </Sticker>
          <IconButton icon="locate" label={t('map.myLocation')} onPress={locate} size={50} />
        </View>

        {showResults ? (
          <Sticker style={styles.results}>
            {shopHits.length > 0 ? (
              <Txt variant="caption" tone="muted" style={styles.resultsTitle}>
                {t('discover.shops').toUpperCase()}
              </Txt>
            ) : null}
            {shopHits.map((s) => (
              <Pressable
                key={s.id}
                style={styles.result}
                onPress={() => {
                  closeSearch();
                  router.push({ pathname: '/laden/[id]', params: { id: s.id } });
                }}
              >
                <Ionicons name="restaurant" size={18} color={c.primary} />
                <View style={styles.flex}>
                  <Txt variant="label" numberOfLines={1}>
                    {s.name}
                  </Txt>
                  <Txt variant="caption" tone="muted" numberOfLines={1}>
                    {s.address}
                  </Txt>
                </View>
              </Pressable>
            ))}
            {placeHits.length > 0 ? (
              <Txt variant="caption" tone="muted" style={styles.resultsTitle}>
                {t('discover.places').toUpperCase()}
              </Txt>
            ) : null}
            {placeHits.map((p) => (
              <Pressable key={`${p.latitude},${p.longitude}`} style={styles.result} onPress={() => flyToPlace(p)}>
                <Ionicons name="location" size={18} color={c.accent} />
                <Txt variant="label" numberOfLines={1} style={styles.flex}>
                  {p.label}
                </Txt>
              </Pressable>
            ))}
            {!searching && shopHits.length === 0 && placeHits.length === 0 ? (
              <Txt tone="muted" style={styles.resultsEmpty}>
                {t('list.emptySearch')}
              </Txt>
            ) : null}
          </Sticker>
        ) : (
          <FilterBar inset={space.lg} />
        )}

        {(tooFar || loading) && !showResults ? (
          <Sticker containerStyle={styles.pillWrap} style={styles.pill} radius={radius.pill} color={c.secondary}>
            {loading ? <ActivityIndicator size="small" color={c.onSecondary} /> : <Ionicons name="search" size={15} color={c.onSecondary} />}
            {tooFar ? (
              <Txt variant="caption" tone="onSecondary">
                {t('map.zoomIn')}
              </Txt>
            ) : null}
          </Sticker>
        ) : null}
      </View>

      {/* Unteres Panel: Liste der Läden im Ausschnitt oder Vorschau */}
      <BottomSheet
        ref={sheetRef}
        index={0}
        snapPoints={snapPoints}
        enableDynamicSizing={false}
        backgroundStyle={[styles.sheetBg, { backgroundColor: c.background, borderColor: c.border }]}
        handleIndicatorStyle={{ backgroundColor: c.border, width: 48, height: 5 }}
      >
        {selected ? (
          <BottomSheetView>
            <ShopPreview
              shop={selected}
              distanceKm={position ? distanceKm(position, selected) : null}
              onClose={() => setSelectedId(null)}
              onRoute={() => setRouteTarget(selected)}
            />
          </BottomSheetView>
        ) : (
          <BottomSheetFlatList
            data={rows}
            keyExtractor={(r: (typeof rows)[number]) => r.shop.id}
            contentContainerStyle={styles.list}
            ListHeaderComponent={
              <View style={styles.sheetHeader}>
                <View style={styles.sheetTitleRow}>
                  <Txt variant="title" style={styles.flex}>
                    {tooFar
                      ? t('discover.title')
                      : rows.length === 1
                        ? t('discover.shopsHereOne')
                        : t('discover.shopsHere', { n: rows.length })}
                  </Txt>
                  <Button title={t('map.addShop')} icon="add" compact variant="secondary" onPress={addShop} />
                </View>
                <View style={styles.sortRow}>
                  <Chip label={t('list.sortBest')} icon="star" selected={sort === 'best'} onPress={() => setSort('best')} />
                  <Chip label={t('list.sortNearest')} icon="navigate" selected={sort === 'nearest'} onPress={chooseNearest} />
                  <Chip label={t('list.sortPrice')} icon="pricetag" selected={sort === 'price'} onPress={() => setSort('price')} />
                </View>
              </View>
            }
            ListEmptyComponent={
              loading ? null : (
                <Txt tone="muted" style={styles.empty}>
                  {tooFar ? t('map.zoomIn') : shops.length > 0 && activeCount > 0 ? t('list.emptyFilter') : t('list.emptyArea')}
                </Txt>
              )
            }
            renderItem={({ item }: { item: (typeof rows)[number] }) => (
              <ShopCard shop={item.shop} distanceKm={item.distance} onPress={() => focusShop(item.shop)} />
            )}
          />
        )}
      </BottomSheet>

      <RouteSheet target={routeTarget} onClose={() => setRouteTarget(null)} />
    </View>
  );

  function flyToPlace(place: Place) {
    closeSearch();
    setQuery(place.label);
    mapRef.current?.flyTo({ latitude: place.latitude, longitude: place.longitude, zoom: 13.5 });
  }

  /** Aus der Liste: Karte zum Laden bewegen und Vorschau zeigen. */
  function focusShop(shop: ShopSummary) {
    mapRef.current?.flyTo({ latitude: shop.latitude, longitude: shop.longitude, zoom: 15.5 });
    selectShop(shop.id);
  }
}

const styles = StyleSheet.create({
  empty: { paddingHorizontal: space.xl, paddingTop: space.lg, textAlign: 'center' },
  flex: { flex: 1 },
  list: { gap: space.md, paddingBottom: 40, paddingHorizontal: space.lg },
  pill: { alignItems: 'center', flexDirection: 'row', gap: space.sm, paddingHorizontal: space.md, paddingVertical: 6 },
  pillWrap: { alignSelf: 'center' },
  result: { alignItems: 'center', flexDirection: 'row', gap: space.md, paddingHorizontal: space.lg, paddingVertical: 10 },
  results: { marginHorizontal: space.lg, marginTop: space.md, paddingVertical: space.sm },
  resultsEmpty: { padding: space.lg },
  resultsTitle: { fontFamily: fonts.bold, letterSpacing: 1, paddingHorizontal: space.lg, paddingTop: space.sm },
  search: { alignItems: 'center', flexDirection: 'row', gap: space.sm, height: 50, paddingHorizontal: space.lg },
  searchInput: { flex: 1, fontFamily: fonts.medium, fontSize: 16, height: '100%' },
  searchRow: { alignItems: 'center', flexDirection: 'row', gap: space.sm, paddingHorizontal: space.lg },
  sheetBg: { borderRadius: radius.xl, borderWidth: 2 },
  sheetHeader: { gap: space.md, paddingBottom: space.xs },
  sheetTitleRow: { alignItems: 'center', flexDirection: 'row', gap: space.md },
  sortRow: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  top: { left: 0, position: 'absolute', right: 0, top: 0 },
});
