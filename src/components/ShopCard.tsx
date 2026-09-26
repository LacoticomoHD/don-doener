import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useI18n } from '@/i18n/I18nProvider';
import { formatDistance, formatPrice, formatScore } from '@/lib/format';
import { hasOpeningHours, isOpenNow } from '@/lib/openingHours';
import { useTheme } from '@/theme/ThemeProvider';
import { fonts, radius, space } from '@/theme/tokens';
import { SHOP_FEATURE_ICONS, type ShopSummary } from '@/types';

import { Sticker, Txt } from './ui';

/** Bewertungs-Badge im Sticker-Stil: gelbes Quadrat mit großer Zahl. */
export function ScoreBadge({ value, size = 54, tilt = true }: { value: number | null; size?: number; tilt?: boolean }) {
  const { theme } = useTheme();
  const { lang } = useI18n();
  const c = theme.colors;
  const rated = value != null;
  return (
    <View
      style={[
        styles.badge,
        {
          backgroundColor: rated ? c.secondary : c.surfaceMuted,
          borderColor: c.border,
          height: size,
          width: size,
          transform: [{ rotate: tilt ? '-4deg' : '0deg' }],
        },
      ]}
    >
      {rated ? (
        <>
          <Text style={[styles.badgeValue, { color: c.onSecondary, fontSize: size * 0.4 }]}>{formatScore(value, lang)}</Text>
          <Ionicons name="star" size={size * 0.2} color={c.onSecondary} />
        </>
      ) : (
        <Ionicons name="help" size={size * 0.42} color={c.textMuted} />
      )}
    </View>
  );
}

/** Kleine Status-Pille „Geöffnet" / „Geschlossen". */
export function OpenPill({ shop }: { shop: Pick<ShopSummary, 'opening_hours'> }) {
  const { theme } = useTheme();
  const { t } = useI18n();
  if (!hasOpeningHours(shop.opening_hours)) return null;
  const open = isOpenNow(shop.opening_hours);
  const color = open ? theme.colors.success : theme.colors.danger;
  return (
    <View style={[styles.pill, { borderColor: color }]}>
      <View style={[styles.dot, { backgroundColor: color }]} />
      <Text style={[styles.pillText, { color }]}>{open ? t('common.open') : t('common.closed')}</Text>
    </View>
  );
}

/** Laden-Karte für Liste, Favoriten und Bestenliste. */
export function ShopCard({
  shop,
  distanceKm,
  rank,
  footer,
  onPress,
}: {
  shop: ShopSummary;
  distanceKm?: number | null;
  rank?: number;
  footer?: string;
  onPress?: () => void;
}) {
  const { theme } = useTheme();
  const { lang } = useI18n();
  const c = theme.colors;

  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress ?? (() => router.push({ pathname: '/laden/[id]', params: { id: shop.id } }))}
    >
      {({ pressed }) => (
        <Sticker pressed={pressed} style={styles.card}>
          {rank != null ? (
            <Text style={[styles.rank, { color: rank < 3 ? c.primary : c.textMuted }]}>{rank + 1}</Text>
          ) : null}
          <ScoreBadge value={shop.stats.avg_gesamt} />
          <View style={styles.body}>
            <Txt variant="heading" numberOfLines={1}>
              {shop.name}
            </Txt>
            <Txt variant="caption" tone="muted" numberOfLines={1}>
              {shop.city && rank != null ? shop.city : shop.address}
            </Txt>
            <View style={styles.meta}>
              <OpenPill shop={shop} />
              {shop.doener_preis != null ? (
                <View style={styles.metaItem}>
                  <Ionicons name="pricetag" size={13} color={c.accent} />
                  <Txt variant="caption" tone="accent" style={styles.bold}>
                    {formatPrice(shop.doener_preis, lang)}
                  </Txt>
                </View>
              ) : null}
              {distanceKm != null ? (
                <View style={styles.metaItem}>
                  <Ionicons name="navigate" size={13} color={c.textMuted} />
                  <Txt variant="caption" tone="muted">
                    {formatDistance(distanceKm, lang)}
                  </Txt>
                </View>
              ) : null}
              {shop.stats.rating_count > 0 ? (
                <View style={styles.metaItem}>
                  <Ionicons name="people" size={13} color={c.textMuted} />
                  <Txt variant="caption" tone="muted">
                    {shop.stats.rating_count}
                  </Txt>
                </View>
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
          <Ionicons name="chevron-forward" size={20} color={c.textMuted} />
        </Sticker>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  badge: { alignItems: 'center', borderRadius: radius.md, borderWidth: 2, justifyContent: 'center' },
  badgeValue: { fontFamily: fonts.display, lineHeight: undefined, marginBottom: -2 },
  body: { flex: 1, gap: 2 },
  bold: { fontFamily: fonts.bold },
  card: { alignItems: 'center', flexDirection: 'row', gap: space.md, padding: space.md },
  dot: { borderRadius: 4, height: 7, width: 7 },
  features: { fontSize: 14, marginTop: 3 },
  meta: { alignItems: 'center', flexDirection: 'row', flexWrap: 'wrap', gap: space.sm, marginTop: 4 },
  metaItem: { alignItems: 'center', flexDirection: 'row', gap: 3 },
  pill: {
    alignItems: 'center',
    borderRadius: radius.pill,
    borderWidth: 1.5,
    flexDirection: 'row',
    gap: 4,
    paddingHorizontal: 7,
    paddingVertical: 1,
  },
  pillText: { fontFamily: fonts.bold, fontSize: 11.5 },
  rank: { fontFamily: fonts.display, fontSize: 30, textAlign: 'center', width: 30 },
});
