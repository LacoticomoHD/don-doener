import { useState } from 'react';
import { ActivityIndicator, FlatList, ScrollView, Share, StyleSheet, View } from 'react-native';

import { ShopCard } from '@/components/ShopCard';
import { Button, Card, Chip, MessageView, Txt } from '@/components/ui';
import { useI18n } from '@/i18n/I18nProvider';
import { fetchCityStats, fetchNationalPriceIndex, fetchTopShops, type TopMode } from '@/lib/api';
import { formatPrice, formatScore } from '@/lib/format';
import { useFocusedAsync } from '@/lib/useAsync';
import { useTheme } from '@/theme/ThemeProvider';
import { space } from '@/theme/tokens';

export default function TopScreen() {
  const { theme } = useTheme();
  const { t, lang } = useI18n();
  const [city, setCity] = useState<string | null>(null);
  const [mode, setMode] = useState<TopMode>('rating');

  const cities = useFocusedAsync(() => fetchCityStats(), []);
  const national = useFocusedAsync(() => fetchNationalPriceIndex(), []);
  const top = useFocusedAsync(() => fetchTopShops(city, mode), [city, mode]);

  const place = city ?? t('top.germany');
  const cityStats = city ? cities.data?.find((c) => c.city === city) : null;
  const index = city
    ? cityStats?.preis_schnitt != null
      ? { schnitt: cityStats.preis_schnitt, anzahl: cityStats.preis_anzahl }
      : null
    : (national.data ?? null);

  const share = () => {
    const shops = top.data ?? [];
    const lines = shops.map(
      (s, i) =>
        `${['🥇', '🥈', '🥉'][i] ?? `${i + 1}.`} ${s.name} – ${formatScore(s.stats.avg_gesamt ?? 0, lang)} ★` +
        (s.doener_preis != null ? ` (${formatPrice(s.doener_preis, lang)})` : '')
    );
    Share.share({
      message: `${t('top.shareTitle', { place })}\n\n${lines.join('\n')}\n\n${t('top.shareFooter')}`,
    }).catch(() => {});
  };

  return (
    <View style={[styles.flex, { backgroundColor: theme.colors.background }]}>
      <FlatList
        data={top.data ?? []}
        keyExtractor={(s) => s.id}
        contentContainerStyle={styles.list}
        ListHeaderComponent={
          <View style={styles.header}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
              <Chip label={`🇩🇪 ${t('top.germany')}`} selected={city === null} onPress={() => setCity(null)} />
              {(cities.data ?? []).map((c) => (
                <Chip key={c.city} label={c.city} selected={city === c.city} onPress={() => setCity(c.city)} />
              ))}
            </ScrollView>
            <View style={styles.modes}>
              <Chip label={t('top.modeRating')} selected={mode === 'rating'} onPress={() => setMode('rating')} />
              <Chip label={t('top.modeValue')} selected={mode === 'value'} onPress={() => setMode('value')} />
            </View>
            {index ? (
              <Card style={styles.index}>
                <Txt variant="label">{t('top.priceIndex', { place })}</Txt>
                <Txt variant="title" tone="accent">
                  {formatPrice(index.schnitt, lang)}
                </Txt>
                <Txt variant="caption" tone="muted">
                  {t('top.priceIndexBasis', { n: index.anzahl })}
                </Txt>
              </Card>
            ) : null}
            {top.loading && !top.data ? <ActivityIndicator color={theme.colors.primary} /> : null}
          </View>
        }
        ListEmptyComponent={
          top.loading ? null : top.error ? (
            <MessageView icon="⚠️" message={t('common.loadError')} actionLabel={t('common.retry')} onAction={top.reload} />
          ) : (
            <Txt tone="muted" style={styles.empty}>
              {mode === 'value' ? t('top.emptyValue') : t('top.emptyRating')}
            </Txt>
          )
        }
        renderItem={({ item, index: i }) => (
          <ShopCard
            shop={item}
            rank={i}
            footer={
              mode === 'value' && item.doener_preis != null && item.stats.avg_gesamt != null
                ? t('top.starsPerEuro', {
                    score: formatScore(item.stats.avg_gesamt, lang),
                    price: formatPrice(item.doener_preis, lang),
                  })
                : undefined
            }
          />
        )}
        ListFooterComponent={
          (top.data ?? []).length > 0 ? (
            <Button title={t('top.share')} icon="📤" variant="secondary" onPress={share} />
          ) : null
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  chips: { gap: space.sm },
  empty: { marginTop: 32, paddingHorizontal: space.xl, textAlign: 'center' },
  flex: { flex: 1 },
  header: { gap: space.md, marginBottom: space.xs },
  index: { alignItems: 'center', gap: 2 },
  list: { gap: 10, padding: space.lg, paddingBottom: 40 },
  modes: { flexDirection: 'row', gap: space.sm },
});
