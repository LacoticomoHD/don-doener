import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useI18n } from '@/i18n/I18nProvider';
import { formatDistance, formatPrice, formatScore } from '@/lib/format';
import { hasOpeningHours, isOpenNow } from '@/lib/openingHours';
import { useTheme } from '@/theme/ThemeProvider';
import { radius, space } from '@/theme/tokens';
import { SHOP_FEATURE_ICONS, type ShopSummary } from '@/types';

import { StarRating } from './StarRating';
import { Txt } from './ui';

/** Kompakte Laden-Karte für Liste, Favoriten und Bestenliste. */
export function ShopCard({
  shop,
  distanceKm,
  rank,
  footer,
}: {
  shop: ShopSummary;
  distanceKm?: number | null;
  rank?: number;
  footer?: string;
}) {
  const { theme } = useTheme();
  const { t, lang } = useI18n();
  const c = theme.colors;
  const avg = shop.stats.avg_gesamt;
  const known = hasOpeningHours(shop.opening_hours);
  const open = known && isOpenNow(shop.opening_hours);

  return (
    <Pressable
      accessibilityRole="button"
      onPress={() => router.push({ pathname: '/laden/[id]', params: { id: shop.id } })}
      style={({ pressed }) => [
        styles.card,
        { backgroundColor: c.surface, borderColor: c.border, opacity: pressed ? 0.8 : 1 },
      ]}
    >
      {rank != null ? <Text style={styles.rank}>{['🥇', '🥈', '🥉'][rank] ?? `${rank + 1}.`}</Text> : null}
      <View style={styles.body}>
        <View style={styles.headerRow}>
          <Txt variant="heading" numberOfLines={1} style={styles.flex}>
            {shop.name}
          </Txt>
          {known ? (
            <Txt variant="caption" tone={open ? 'success' : 'danger'} style={styles.bold}>
              ● {open ? t('common.open') : t('common.closed')}
            </Txt>
          ) : null}
        </View>
        <Txt variant="caption" tone="muted" numberOfLines={1}>
          {rank != null && shop.city ? shop.city : shop.address}
        </Txt>
        <View style={styles.metaRow}>
          {avg != null ? (
            <View style={styles.rating}>
              <StarRating value={avg} size={14} />
              <Txt variant="caption" style={styles.bold}>
                {formatScore(avg, lang)}
              </Txt>
              <Txt variant="caption" tone="muted">
                ({shop.stats.rating_count})
              </Txt>
            </View>
          ) : (
            <Txt variant="caption" tone="muted">
              {t('common.noRating')}
            </Txt>
          )}
          {shop.doener_preis != null ? (
            <Txt variant="caption" tone="accent" style={styles.bold}>
              🥙 {formatPrice(shop.doener_preis, lang)}
            </Txt>
          ) : null}
          {distanceKm != null ? (
            <Txt variant="caption" tone="muted">
              📍 {formatDistance(distanceKm, lang)}
            </Txt>
          ) : null}
        </View>
        {shop.features.length > 0 ? (
          <Text style={styles.features} numberOfLines={1}>
            {shop.features.map((f) => SHOP_FEATURE_ICONS[f]).join(' ')}
          </Text>
        ) : null}
        {footer ? (
          <Txt variant="caption" tone="muted">
            {footer}
          </Txt>
        ) : null}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  body: { flex: 1, gap: 3 },
  bold: { fontWeight: '700' },
  card: {
    alignItems: 'center',
    borderRadius: radius.lg,
    borderWidth: 1,
    flexDirection: 'row',
    gap: space.md,
    padding: 14,
  },
  features: { fontSize: 14, marginTop: 2 },
  flex: { flex: 1 },
  headerRow: { alignItems: 'center', flexDirection: 'row', gap: space.sm },
  metaRow: { alignItems: 'center', flexDirection: 'row', flexWrap: 'wrap', gap: space.md, marginTop: 3 },
  rank: { fontSize: 24, textAlign: 'center', width: 34 },
  rating: { alignItems: 'center', flexDirection: 'row', gap: 5 },
});
