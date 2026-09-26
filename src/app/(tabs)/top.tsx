import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, ScrollView, Share, StyleSheet, View } from 'react-native';

import { ShopCard } from '@/components/ShopCard';
import { Button, Chip, MessageView, Sticker, Txt } from '@/components/ui';
import { useI18n } from '@/i18n/I18nProvider';
import { fetchCityStats, fetchNationalPriceIndex, fetchTopShops, type TopMode } from '@/lib/api';
import { formatPrice, formatScore } from '@/lib/format';
import { useFocusedAsync } from '@/lib/useAsync';
import { useTheme } from '@/theme/ThemeProvider';
import { fonts, radius, space } from '@/theme/tokens';

export default function TopScreen() {
  const { theme } = useTheme();
  const c = theme.colors;
  const { t, lang } = useI18n();
  const [city, setCity] = useState<string | null>(null);
  const [mode, setMode] = useState<TopMode>('rating');

  const cities = useFocusedAsync(() => fetchCityStats(), []);
  const national = useFocusedAsync(() => fetchNationalPriceIndex(), []);
  const top = useFocusedAsync(() => fetchTopShops(city, mode), [city, mode]);

  const place = city ?? t('top.germany');
  const cityStats = city ? cities.data?.find((x) => x.city === city) : null;
  const index = city
    ? cityStats?.preis_schnitt != null
      ? { schnitt: cityStats.preis_schnitt, anzahl: cityStats.preis_anzahl }
      : null
    : (national.data ?? null);

  const share = () => {
    const lines = (top.data ?? []).map(
      (s, i) =>
        `${['🥇', '🥈', '🥉'][i] ?? `${i + 1}.`} ${s.name} – ${formatScore(s.stats.avg_gesamt ?? 0, lang)} ★` +
        (s.doener_preis != null ? ` (${formatPrice(s.doener_preis, lang)})` : '')
    );
    Share.share({ message: `${t('top.shareTitle', { place })}\n\n${lines.join('\n')}\n\n${t('top.shareFooter')}` }).catch(() => {});
  };

  const modes: { key: TopMode; label: string }[] = [
    { key: 'rating', label: t('top.modeRating') },
    { key: 'value', label: t('top.modeValue') },
  ];

  return (
    <FlatList
      style={{ backgroundColor: c.background }}
      data={top.data ?? []}
      keyExtractor={(s) => s.id}
      contentContainerStyle={styles.list}
      ListHeaderComponent={
        <View style={styles.header}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips} style={styles.bleed}>
            <Chip label={t('top.germany')} icon="flag" selected={city === null} tone="primary" onPress={() => setCity(null)} />
            {(cities.data ?? []).map((x) => (
              <Chip key={x.city} label={x.city} selected={city === x.city} tone="primary" onPress={() => setCity(x.city)} />
            ))}
          </ScrollView>

          {/* Umschalter Bewertung / Preis-Leistung */}
          <View style={[styles.segment, { backgroundColor: c.surface, borderColor: c.border }]}>
            {modes.map((m) => (
              <Pressable
                key={m.key}
                onPress={() => setMode(m.key)}
                style={[styles.segmentItem, mode === m.key && { backgroundColor: c.secondary, borderColor: c.border }]}
              >
                <Txt variant="label" tone={mode === m.key ? 'onSecondary' : 'muted'}>
                  {m.label}
                </Txt>
              </Pressable>
            ))}
          </View>

          {index ? (
            <Sticker color={c.secondary} style={styles.index}>
              <View style={styles.flex}>
                <Txt variant="caption" tone="onSecondary" style={styles.upper}>
                  {t('top.priceIndex', { place })}
                </Txt>
                <Txt variant="display" tone="onSecondary">
                  {formatPrice(index.schnitt, lang)}
                </Txt>
                <Txt variant="caption" tone="onSecondary">
                  {t('top.priceIndexBasis', { n: index.anzahl })}
                </Txt>
              </View>
              <Txt style={styles.indexEmoji}>🥙</Txt>
            </Sticker>
          ) : null}
          {top.loading && !top.data ? <ActivityIndicator color={c.primary} /> : null}
        </View>
      }
      ListEmptyComponent={
        top.loading ? null : top.error ? (
          <MessageView icon="⚠️" message={t('common.loadError')} actionLabel={t('common.retry')} onAction={top.reload} />
        ) : (
          <MessageView icon="🏆" message={mode === 'value' ? t('top.emptyValue') : t('top.emptyRating')} />
        )
      }
      renderItem={({ item, index: i }) => (
        <ShopCard
          shop={item}
          rank={i}
          footer={
            mode === 'value' && item.doener_preis != null && item.stats.avg_gesamt != null
              ? t('top.starsPerEuro', { score: formatScore(item.stats.avg_gesamt, lang), price: formatPrice(item.doener_preis, lang) })
              : undefined
          }
        />
      )}
      ListFooterComponent={
        (top.data ?? []).length > 0 ? (
          <View style={styles.footer}>
            <Button title={t('top.share')} icon="share-social" variant="secondary" onPress={share} />
            <View style={styles.hint}>
              <Ionicons name="information-circle" size={16} color={c.textMuted} />
              <Txt variant="caption" tone="muted" style={styles.flex}>
                {t('top.hint')}
              </Txt>
            </View>
          </View>
        ) : null
      }
    />
  );
}

const styles = StyleSheet.create({
  bleed: { marginHorizontal: -space.lg },
  chips: { gap: space.sm, paddingHorizontal: space.lg },
  flex: { flex: 1 },
  footer: { gap: space.md, marginTop: space.sm },
  header: { gap: space.lg, marginBottom: space.xs },
  hint: { flexDirection: 'row', gap: 6 },
  index: { alignItems: 'center', flexDirection: 'row', padding: space.lg },
  indexEmoji: { fontSize: 54, lineHeight: 62, transform: [{ rotate: '12deg' }] },
  list: { gap: space.md, padding: space.lg, paddingBottom: 40 },
  segment: { borderRadius: radius.pill, borderWidth: 2, flexDirection: 'row', padding: 4 },
  segmentItem: {
    alignItems: 'center',
    borderColor: 'transparent',
    borderRadius: radius.pill,
    borderWidth: 2,
    flex: 1,
    paddingVertical: 9,
  },
  upper: { fontFamily: fonts.bold, letterSpacing: 0.8 },
});
