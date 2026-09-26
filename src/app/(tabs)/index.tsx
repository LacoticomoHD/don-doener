import { router, useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { FilterBar } from '@/components/FilterBar';
import { MAX_LAT_SPAN, type ShopMapHandle } from '@/components/map/mapConfig';
import { ShopMap } from '@/components/map/ShopMap';
import { Txt } from '@/components/ui';
import { useI18n } from '@/i18n/I18nProvider';
import { fetchShopsInBounds, geocode } from '@/lib/api';
import { errorMessage, showMessage } from '@/lib/dialog';
import { useFilters } from '@/lib/filters';
import { DEFAULT_CENTER } from '@/lib/geo';
import { getKnownPosition, requestPosition } from '@/lib/location';
import { useRequireLogin } from '@/lib/useRequireLogin';
import { useTheme } from '@/theme/ThemeProvider';
import { radius, space } from '@/theme/tokens';
import type { GeoBounds, ShopSummary } from '@/types';

export default function MapScreen() {
  const { theme } = useTheme();
  const c = theme.colors;
  const { t } = useI18n();
  const insets = useSafeAreaInsets();
  const { matches } = useFilters();
  const requireLogin = useRequireLogin();
  const mapRef = useRef<ShopMapHandle>(null);

  const [shops, setShops] = useState<ShopSummary[]>([]);
  const [tooFar, setTooFar] = useState(false);
  const [loading, setLoading] = useState(false);
  const [hasLocation, setHasLocation] = useState(false);
  const [query, setQuery] = useState('');
  const [searching, setSearching] = useState(false);

  const lastBounds = useRef<GeoBounds | null>(null);
  const requestId = useRef(0);

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

  // Nach Rückkehr (z. B. neuer Laden oder Bewertung) den Ausschnitt neu laden
  useFocusEffect(
    useCallback(() => {
      if (lastBounds.current) load(lastBounds.current);
    }, [load])
  );

  // Beim Start zur eigenen Position, falls die Freigabe schon besteht
  useEffect(() => {
    getKnownPosition().then((pos) => {
      if (!pos) return;
      setHasLocation(true);
      mapRef.current?.flyTo({ ...pos, zoom: 13 });
    });
  }, []);

  const visibleShops = useMemo(() => shops.filter(matches), [shops, matches]);

  const locate = async () => {
    const pos = await requestPosition();
    if (!pos) {
      showMessage(t('map.myLocation'), t('map.locationDenied'));
      return;
    }
    setHasLocation(true);
    mapRef.current?.flyTo({ ...pos, zoom: 14 });
  };

  const search = async () => {
    const q = query.trim();
    if (!q || searching) return;
    setSearching(true);
    try {
      const [first] = await geocode(q);
      if (!first) showMessage(t('common.search'), t('map.notFound'));
      else mapRef.current?.flyTo({ latitude: first.latitude, longitude: first.longitude, zoom: 13 });
    } catch (e) {
      showMessage(t('common.error'), errorMessage(e));
    } finally {
      setSearching(false);
    }
  };

  const addShop = () => {
    if (requireLogin()) router.push('/laden/neu');
  };

  return (
    <View style={styles.flex}>
      <ShopMap
        ref={mapRef}
        shops={visibleShops}
        initialCamera={{ ...DEFAULT_CENTER, zoom: 12 }}
        palette={c}
        dark={theme.dark}
        showUserLocation={hasLocation}
        onBoundsChange={load}
        onShopPress={(id) => router.push({ pathname: '/laden/[id]', params: { id } })}
      />

      <View style={[styles.top, { paddingTop: insets.top + space.sm }]} pointerEvents="box-none">
        <View style={[styles.search, styles.shadow, { backgroundColor: c.surface, borderColor: c.border }]}>
          <Text style={styles.searchIcon}>🔍</Text>
          <TextInput
            value={query}
            onChangeText={setQuery}
            onSubmitEditing={search}
            placeholder={t('map.searchPlaceholder')}
            placeholderTextColor={c.textMuted}
            returnKeyType="search"
            style={[styles.searchInput, { color: c.text }]}
          />
          {searching ? (
            <ActivityIndicator color={c.primary} />
          ) : query ? (
            <Pressable onPress={() => setQuery('')} hitSlop={10} accessibilityLabel="Suche leeren">
              <Txt tone="muted">✕</Txt>
            </Pressable>
          ) : null}
        </View>
        <FilterBar floating />
        {tooFar || loading ? (
          <View style={[styles.pill, styles.shadow, { backgroundColor: c.surface }]}>
            {loading ? <ActivityIndicator size="small" color={c.primary} /> : null}
            {tooFar ? <Txt variant="caption">🔎 {t('map.zoomIn')}</Txt> : null}
          </View>
        ) : null}
      </View>

      <View style={[styles.fabs, { bottom: space.lg + (Platform.OS === 'web' ? 40 : 24) }]}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('map.myLocation')}
          onPress={locate}
          style={[styles.fab, styles.shadow, { backgroundColor: c.surface }]}
        >
          <Text style={styles.fabIcon}>📍</Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('map.addShop')}
          onPress={addShop}
          style={[styles.fab, styles.shadow, { backgroundColor: c.primary }]}
        >
          <Text style={[styles.fabPlus, { color: c.onPrimary }]}>＋</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  fab: { alignItems: 'center', borderRadius: 28, height: 56, justifyContent: 'center', width: 56 },
  fabIcon: { fontSize: 22 },
  fabPlus: { fontSize: 30, lineHeight: 34 },
  fabs: { gap: space.md, position: 'absolute', right: space.lg },
  flex: { flex: 1 },
  pill: {
    alignItems: 'center',
    alignSelf: 'center',
    borderRadius: radius.pill,
    flexDirection: 'row',
    gap: space.sm,
    paddingHorizontal: space.md,
    paddingVertical: 7,
  },
  search: {
    alignItems: 'center',
    borderRadius: radius.md,
    borderWidth: 1,
    flexDirection: 'row',
    gap: space.sm,
    marginHorizontal: space.lg,
    paddingHorizontal: space.md,
  },
  searchIcon: { fontSize: 15 },
  searchInput: { flex: 1, fontSize: 16, paddingVertical: 12 },
  shadow: {
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  top: { left: 0, position: 'absolute', right: 0, top: 0 },
});
