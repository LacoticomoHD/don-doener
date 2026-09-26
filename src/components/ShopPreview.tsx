import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { useI18n } from '@/i18n/I18nProvider';
import { formatDistance, formatPrice } from '@/lib/format';
import { useTheme } from '@/theme/ThemeProvider';
import { fonts, space } from '@/theme/tokens';
import { SHOP_FEATURE_ICONS, type ShopSummary } from '@/types';

import { OpenPill, ScoreBadge } from './ShopCard';
import { Button, IconButton, Txt } from './ui';

/** Vorschau eines auf der Karte angetippten Ladens (im unteren Panel). */
export function ShopPreview({
  shop,
  distanceKm,
  onClose,
  onRoute,
}: {
  shop: ShopSummary;
  distanceKm: number | null;
  onClose: () => void;
  onRoute: () => void;
}) {
  const { theme } = useTheme();
  const { t, lang } = useI18n();
  const count = shop.stats.rating_count;

  return (
    <View style={styles.wrap}>
      <View style={styles.header}>
        <ScoreBadge value={shop.stats.avg_gesamt} size={60} />
        <View style={styles.flex}>
          <Txt variant="title" numberOfLines={2}>
            {shop.name}
          </Txt>
          <Txt variant="caption" tone="muted" numberOfLines={1}>
            {shop.address}
          </Txt>
        </View>
        <IconButton icon="close" label={t('common.back')} onPress={onClose} size={38} color={theme.colors.surfaceMuted} />
      </View>
      <View style={styles.meta}>
        <OpenPill shop={shop} />
        <Txt variant="caption" tone="muted">
          {count === 0 ? t('common.noRating') : count === 1 ? t('common.ratingsCountOne') : t('common.ratingsCount', { n: count })}
        </Txt>
        {shop.doener_preis != null ? (
          <Txt variant="caption" tone="accent" style={styles.bold}>
            🥙 {formatPrice(shop.doener_preis, lang)}
          </Txt>
        ) : null}
        {distanceKm != null ? (
          <Txt variant="caption" tone="muted">
            {formatDistance(distanceKm, lang)}
          </Txt>
        ) : null}
        {shop.features.length > 0 ? (
          <Txt variant="caption">{shop.features.slice(0, 6).map((f) => SHOP_FEATURE_ICONS[f]).join(' ')}</Txt>
        ) : null}
      </View>
      <View style={styles.actions}>
        <Button title={t('detail.route')} icon="navigate" variant="plain" compact onPress={onRoute} style={styles.flex} />
        <Button
          title={t('preview.details')}
          icon="arrow-forward"
          compact
          onPress={() => router.push({ pathname: '/laden/[id]', params: { id: shop.id } })}
          style={styles.flex}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  actions: { flexDirection: 'row', gap: space.md, marginTop: space.xs },
  bold: { fontFamily: fonts.bold },
  flex: { flex: 1 },
  header: { alignItems: 'center', flexDirection: 'row', gap: space.md },
  meta: { alignItems: 'center', flexDirection: 'row', flexWrap: 'wrap', gap: space.md },
  wrap: { gap: space.md, paddingHorizontal: space.lg, paddingBottom: space.md },
});
