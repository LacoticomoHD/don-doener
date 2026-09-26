import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, RefreshControl, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { FilterBar } from '@/components/FilterBar';
import { ShopCard } from '@/components/ShopCard';
import { Chip, MessageView, TextField, Txt } from '@/components/ui';
import { useI18n } from '@/i18n/I18nProvider';
import { fetchShopsInBounds, searchShops } from '@/lib/api';
import { showMessage } from '@/lib/dialog';
import { useFilters } from '@/lib/filters';
import { boundsAround, DEFAULT_CENTER, distanceKm } from '@/lib/geo';
import { getKnownPosition, requestPosition } from '@/lib/location';
import { useDebounced, useFocusedAsync } from '@/lib/useAsync';
import { useTheme } from '@/theme/ThemeProvider';
import { space } from '@/theme/tokens';
import type { Coords } from '@/types';

type Sort = 'best' | 'nearest' | 'price';

/** Umkreis der Liste ohne Suche (halbe Kantenlänge in km). */
const NEARBY_KM = 20;

export default function ListScreen() {
  const { theme } = useTheme();
  const { t } = useI18n();
  const insets = useSafeAreaInsets();
  const { matches } = useFilters();
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState<Sort>('best');
  const [position, setPosition] = useState<Coords | null>(null);
  const debounced = useDebounced(query.trim(), 350);

  useEffect(() => {
    getKnownPosition().then((pos) => pos && setPosition(pos));
  }, []);

  const searching = debounced.length >= 2;
  const { data, error, loading, reload } = useFocusedAsync(
    () => (searching ? searchShops(debounced) : fetchShopsInBounds(boundsAround(position ?? DEFAULT_CENTER, NEARBY_KM))),
    [debounced, searching, position]
  );

  const rows = useMemo(() => {
    const withDistance = (data ?? []).filter(matches).map((shop) => ({
      shop,
      distance: position ? distanceKm(position, shop) : null,
    }));
    const byScore = (a: (typeof withDistance)[number], b: (typeof withDistance)[number]) =>
      (b.shop.stats.avg_gesamt ?? -1) - (a.shop.stats.avg_gesamt ?? -1) ||
      b.shop.stats.rating_count - a.shop.stats.rating_count ||
      (a.distance ?? 0) - (b.distance ?? 0);
    return withDistance.sort((a, b) => {
      if (sort === 'nearest' && a.distance != null && b.distance != null) return a.distance - b.distance;
      if (sort === 'price') return (a.shop.doener_preis ?? 999) - (b.shop.doener_preis ?? 999) || byScore(a, b);
      return byScore(a, b);
    });
  }, [data, matches, position, sort]);

  const chooseNearest = async () => {
    if (!position) {
      const pos = await requestPosition();
      if (!pos) {
        showMessage(t('list.sortNearest'), t('list.locationNeeded'));
        return;
      }
      setPosition(pos);
    }
    setSort('nearest');
  };

  const emptyText =
    (data ?? []).length === 0 ? (searching ? t('list.emptySearch') : t('list.emptyArea')) : t('list.emptyFilter');

  return (
    <View style={[styles.flex, { backgroundColor: theme.colors.background, paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TextField
          value={query}
          onChangeText={setQuery}
          placeholder={t('list.searchPlaceholder')}
          returnKeyType="search"
          clearButtonMode="while-editing"
          autoCorrect={false}
        />
      </View>
      <FilterBar />
      <View style={styles.sortRow}>
        <Chip label={`⭐ ${t('list.sortBest')}`} selected={sort === 'best'} onPress={() => setSort('best')} />
        <Chip label={`📍 ${t('list.sortNearest')}`} selected={sort === 'nearest'} onPress={chooseNearest} />
        <Chip label={`💶 ${t('list.sortPrice')}`} selected={sort === 'price'} onPress={() => setSort('price')} />
        {loading ? <ActivityIndicator color={theme.colors.primary} /> : null}
      </View>

      {error && !data ? (
        <MessageView icon="⚠️" message={t('common.loadError')} actionLabel={t('common.retry')} onAction={reload} />
      ) : (
        <FlatList
          data={rows}
          keyExtractor={(r) => r.shop.id}
          contentContainerStyle={styles.list}
          keyboardShouldPersistTaps="handled"
          refreshControl={<RefreshControl refreshing={false} onRefresh={reload} tintColor={theme.colors.primary} />}
          ListHeaderComponent={
            !searching ? (
              <Txt variant="caption" tone="muted" style={styles.hint}>
                {position ? `📍 ${t('list.nearby')}` : t('list.nearKarlsruhe')}
              </Txt>
            ) : null
          }
          ListEmptyComponent={
            loading ? null : (
              <Txt tone="muted" style={styles.empty}>
                {emptyText}
              </Txt>
            )
          }
          renderItem={({ item }) => <ShopCard shop={item.shop} distanceKm={item.distance} />}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  empty: { marginTop: 48, paddingHorizontal: space.xl, textAlign: 'center' },
  flex: { flex: 1 },
  header: { paddingHorizontal: space.lg, paddingTop: space.sm },
  hint: { marginBottom: space.xs },
  list: { gap: 10, paddingBottom: 32, paddingHorizontal: space.lg },
  sortRow: {
    alignItems: 'center',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: space.sm,
    paddingBottom: space.sm,
    paddingHorizontal: space.lg,
  },
});
