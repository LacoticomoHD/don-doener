import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { ScrollView, Share, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { OpeningHoursTable } from '@/components/OpeningHoursTable';
import { RouteSheet } from '@/components/RouteSheet';
import { ScoreBadge } from '@/components/ShopCard';
import { Button, Chip, IconButton, LinkRow, LoadingView, MessageView, Section, Sticker, Txt } from '@/components/ui';
import { useI18n } from '@/i18n/I18nProvider';
import {
  deleteShop,
  fetchFavoriteIds,
  fetchMyHoursVote,
  fetchMyRating,
  fetchPriceHistory,
  fetchShopDetail,
  setFavorite,
  setHoursVote,
  type Vote,
} from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { confirmAction, errorMessage, showMessage } from '@/lib/dialog';
import { formatDate, formatPrice, formatScore } from '@/lib/format';
import { hasOpeningHours, isOpenNow } from '@/lib/openingHours';
import { useFocusedAsync } from '@/lib/useAsync';
import { useRequireLogin } from '@/lib/useRequireLogin';
import { useTheme } from '@/theme/ThemeProvider';
import { fonts, radius, scoreColor, space } from '@/theme/tokens';
import { PRICE_FIELDS, RATING_CATEGORIES, SHOP_FEATURE_ICONS } from '@/types';

export default function ShopDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { theme } = useTheme();
  const c = theme.colors;
  const { t, lang } = useI18n();
  const insets = useSafeAreaInsets();
  const { user, isAdmin } = useAuth();
  const requireLogin = useRequireLogin();

  const detail = useFocusedAsync(
    async () => {
      const [shop, prices] = await Promise.all([fetchShopDetail(id), fetchPriceHistory(id)]);
      return { shop, prices };
    },
    [id]
  );
  const mine = useFocusedAsync(
    async () => {
      if (!user) return { favorite: false, hoursVote: 0 as Vote, hasRating: false };
      const [favorites, hoursVote, rating] = await Promise.all([
        fetchFavoriteIds(user.id),
        fetchMyHoursVote(id, user.id),
        fetchMyRating(id, user.id),
      ]);
      return { favorite: favorites.has(id), hoursVote, hasRating: rating != null };
    },
    [id, user?.id]
  );

  // Lokale Änderungen überlagern den geladenen Stand sofort (optimistisches UI)
  const [favoriteOverride, setFavoriteState] = useState<boolean | null>(null);
  const [hoursVoteOverride, setHoursVoteState] = useState<Vote | null>(null);
  const [routeOpen, setRouteOpen] = useState(false);
  const favorite = favoriteOverride ?? mine.data?.favorite ?? false;
  const hoursVote = hoursVoteOverride ?? mine.data?.hoursVote ?? 0;

  const back = () => (router.canGoBack() ? router.back() : router.replace('/'));

  if (detail.loading && !detail.data) return <LoadingView />;
  if (detail.error && !detail.data) {
    return <MessageView icon="⚠️" message={t('common.loadError')} actionLabel={t('common.retry')} onAction={detail.reload} />;
  }
  const shop = detail.data?.shop;
  if (!shop) return <MessageView icon="🤷" message={t('detail.notFound')} actionLabel={t('common.back')} onAction={back} />;

  const prices = detail.data?.prices ?? [];
  const stats = shop.stats;
  const avg = stats?.avg_gesamt ?? null;
  const knownHours = hasOpeningHours(shop.opening_hours);
  const open = knownHours && isOpenNow(shop.opening_hours);
  const confirmedFeatures = shop.featureStats.filter((f) => f.score > 0);
  const hoursOutdated = (shop.hoursStats?.score ?? 0) <= -2;
  const canDelete = !!user && (isAdmin || shop.created_by === user.id);
  const knownPrices = PRICE_FIELDS.filter((f) => shop[f] != null);
  const hasRating = mine.data?.hasRating ?? false;

  const toggleFavorite = async () => {
    const userId = requireLogin();
    if (!userId) return;
    const next = !favorite;
    setFavoriteState(next);
    try {
      await setFavorite(userId, shop.id, next);
    } catch (e) {
      setFavoriteState(!next);
      showMessage(t('common.error'), errorMessage(e));
    }
  };

  const voteHours = async (vote: 1 | -1) => {
    const userId = requireLogin();
    if (!userId) return;
    const previous = hoursVote;
    const next: Vote = hoursVote === vote ? 0 : vote;
    setHoursVoteState(next);
    try {
      await setHoursVote(shop.id, userId, next);
      detail.reload();
    } catch (e) {
      setHoursVoteState(previous);
      showMessage(t('common.error'), errorMessage(e));
    }
  };

  const rate = () => {
    if (requireLogin()) router.push({ pathname: '/laden/[id]/bewerten', params: { id: shop.id } });
  };

  const share = () => {
    Share.share({
      message: t('detail.shareText', {
        name: shop.name,
        score: avg != null ? formatScore(avg, lang) : '–',
        address: shop.address,
      }),
    }).catch(() => {});
  };

  const remove = async () => {
    const ok = await confirmAction({
      title: t('detail.delete'),
      message: t('detail.deleteConfirm', { name: shop.name }),
      confirmLabel: t('common.delete'),
      cancelLabel: t('common.cancel'),
      destructive: true,
    });
    if (!ok) return;
    try {
      await deleteShop(shop.id);
      back();
    } catch (e) {
      showMessage(t('common.error'), errorMessage(e));
    }
  };

  return (
    <View style={[styles.flex, { backgroundColor: c.background }]}>
      <ScrollView contentContainerStyle={{ paddingBottom: 110 + insets.bottom }}>
        {/* Kopf in Markenfarbe */}
        <View style={[styles.hero, { backgroundColor: c.primary, borderColor: c.border, paddingTop: insets.top + space.sm }]}>
          <View style={styles.heroBar}>
            <IconButton icon="arrow-back" label={t('common.back')} onPress={back} size={44} />
            <View style={styles.flex} />
            <IconButton icon="share-social" label={t('detail.share')} onPress={share} size={44} />
            <IconButton
              icon={favorite ? 'heart' : 'heart-outline'}
              iconColor={favorite ? c.primary : undefined}
              label={favorite ? t('detail.saved') : t('detail.save')}
              onPress={toggleFavorite}
              size={44}
            />
          </View>

          {shop.city ? <Text style={styles.heroCity}>{shop.city.toUpperCase()}</Text> : null}
          <Text style={styles.heroName}>{shop.name}</Text>
          <View style={styles.heroAddress}>
            <Ionicons name="location" size={15} color="rgba(255,255,255,0.9)" />
            <Text style={styles.heroAddressText}>{shop.address}</Text>
          </View>

          <View style={styles.heroStats}>
            <ScoreBadge value={avg} size={78} />
            <View style={styles.heroStatText}>
              <Text style={styles.heroStrong}>
                {stats == null
                  ? t('common.noRating')
                  : stats.rating_count === 1
                    ? t('common.ratingsCountOne')
                    : t('common.ratingsCount', { n: stats.rating_count })}
              </Text>
              {stats && stats.verified_count > 0 ? (
                <Text style={styles.heroSoft}>✓ {t('detail.verified', { v: stats.verified_count, n: stats.rating_count })}</Text>
              ) : null}
              <View style={styles.heroPills}>
                {knownHours ? (
                  <View style={[styles.heroPill, { backgroundColor: open ? '#1E9E5A' : '#1C1410' }]}>
                    <Text style={styles.heroPillText}>{open ? t('common.open') : t('common.closed')}</Text>
                  </View>
                ) : null}
                {shop.kartenzahlung != null ? (
                  <View style={[styles.heroPill, { backgroundColor: '#1C1410' }]}>
                    <Ionicons name={shop.kartenzahlung ? 'card' : 'cash'} size={13} color="#FFFFFF" />
                    <Text style={styles.heroPillText}>{shop.kartenzahlung ? t('detail.cardShort') : t('detail.cashShort')}</Text>
                  </View>
                ) : null}
              </View>
            </View>
          </View>
        </View>

        <View style={styles.body}>
          {shop.ausgeblendet ? (
            <Sticker color={c.surfaceMuted} style={styles.notice}>
              <Ionicons name="eye-off" size={18} color={c.danger} />
              <Txt variant="caption" tone="danger" style={styles.flex}>
                {t('detail.hidden')}
              </Txt>
            </Sticker>
          ) : null}

          <Section title={t('detail.ratingTitle')} icon="star">
            {stats ? (
              RATING_CATEGORIES.map((cat) => {
                const value = stats[`avg_${cat}`];
                if (value == null) return null;
                return (
                  <View key={cat} style={styles.barRow}>
                    <Txt variant="caption" style={styles.barLabel}>
                      {t(`category.${cat}`)}
                    </Txt>
                    <View style={[styles.barTrack, { backgroundColor: c.surfaceMuted, borderColor: c.border }]}>
                      <View style={[styles.barFill, { width: `${(value / 5) * 100}%`, backgroundColor: scoreColor(value, c) }]} />
                    </View>
                    <Txt variant="label" style={styles.barValue}>
                      {formatScore(value, lang)}
                    </Txt>
                  </View>
                );
              })
            ) : (
              <Txt tone="muted">{t('detail.noRatings')}</Txt>
            )}
          </Section>

          <Section title={t('detail.prices')} icon="pricetag">
            {knownPrices.length > 0 ? (
              <View style={styles.priceGrid}>
                {knownPrices.map((f) => (
                  <Sticker key={f} containerStyle={styles.priceCell} style={styles.priceTile} color={c.secondary} shadow={false}>
                    <Txt variant="caption" tone="onSecondary">
                      {t(`price.${f}`)}
                    </Txt>
                    <Txt variant="title" tone="onSecondary">
                      {formatPrice(shop[f] as number, lang)}
                    </Txt>
                  </Sticker>
                ))}
              </View>
            ) : (
              <Txt tone="muted">{t('detail.noPrices')}</Txt>
            )}
            {shop.preis_bestaetigt_am ? (
              <Txt variant="caption" tone="success">
                ✓ {t('detail.priceConfirmed', { date: formatDate(shop.preis_bestaetigt_am, lang) })}
              </Txt>
            ) : null}
            {prices.length >= 2 ? (
              <Txt variant="caption" tone="muted">
                {t('detail.priceHistory')}: {prices.map((p) => formatPrice(p.preis, lang)).join(' → ')}
              </Txt>
            ) : null}
          </Section>

          <Section title={t('detail.features')} icon="sparkles">
            {confirmedFeatures.length > 0 ? (
              <View style={styles.wrap}>
                {confirmedFeatures.map((f) => (
                  <Chip key={f.feature} label={`${SHOP_FEATURE_ICONS[f.feature]} ${t(`feature.${f.feature}`)} · ${f.bestaetigt}`} />
                ))}
              </View>
            ) : (
              <Txt tone="muted">{t('detail.noFeatures')}</Txt>
            )}
            <Txt variant="caption" tone="muted">
              {t('detail.featuresHint')}
            </Txt>
          </Section>

          <Section title={t('detail.hours')} icon="time">
            {hoursOutdated ? (
              <Txt variant="caption" tone="danger">
                {t('detail.hoursOutdated')}
              </Txt>
            ) : null}
            {knownHours ? <OpeningHoursTable hours={shop.opening_hours} /> : <Txt tone="muted">{t('detail.hoursUnknown')}</Txt>}
            {knownHours ? (
              <View style={[styles.voteRow, { borderTopColor: c.border }]}>
                <Txt variant="caption" tone="muted" style={styles.flex}>
                  {t('detail.hoursQuestion')}
                </Txt>
                <Chip icon="thumbs-up" label={`${shop.hoursStats?.bestaetigt ?? 0}`} selected={hoursVote === 1} tone="success" onPress={() => voteHours(1)} />
                <Chip icon="thumbs-down" label={`${shop.hoursStats?.veraltet ?? 0}`} selected={hoursVote === -1} tone="danger" onPress={() => voteHours(-1)} />
              </View>
            ) : null}
          </Section>

          <Section title={t('detail.more')} icon="ellipsis-horizontal-circle">
            <LinkRow
              icon="create"
              label={t('detail.edit')}
              onPress={() => requireLogin() && router.push({ pathname: '/laden/[id]/bearbeiten', params: { id: shop.id } })}
            />
            <LinkRow
              icon="flag"
              label={t('detail.report')}
              last={!canDelete}
              onPress={() => requireLogin() && router.push({ pathname: '/laden/[id]/melden', params: { id: shop.id, name: shop.name } })}
            />
            {canDelete ? <LinkRow icon="trash" label={t('detail.delete')} onPress={remove} last /> : null}
          </Section>
        </View>
      </ScrollView>

      {/* Feste Aktionsleiste */}
      <View style={[styles.actionBar, { backgroundColor: c.surface, borderColor: c.border, paddingBottom: insets.bottom + space.md }]}>
        <Button title={t('detail.route')} icon="navigate" variant="plain" onPress={() => setRouteOpen(true)} style={styles.flex} />
        <Button title={hasRating ? t('detail.rateAgain') : t('detail.rate')} icon="star" onPress={rate} style={styles.grow} />
      </View>

      <RouteSheet target={routeOpen ? shop : null} onClose={() => setRouteOpen(false)} />
    </View>
  );
}

const styles = StyleSheet.create({
  actionBar: {
    borderTopWidth: 2,
    bottom: 0,
    flexDirection: 'row',
    gap: space.md,
    left: 0,
    paddingHorizontal: space.lg,
    paddingTop: space.md,
    position: 'absolute',
    right: 0,
  },
  barFill: { borderRadius: 6, height: '100%' },
  barLabel: { width: 110 },
  barRow: { alignItems: 'center', flexDirection: 'row', gap: 10, paddingVertical: 4 },
  barTrack: { borderRadius: 8, borderWidth: 2, flex: 1, height: 16, overflow: 'hidden' },
  barValue: { textAlign: 'right', width: 32 },
  body: { gap: space.lg, padding: space.lg },
  flex: { flex: 1 },
  grow: { flex: 1.6 },
  hero: {
    borderBottomLeftRadius: radius.xl,
    borderBottomRightRadius: radius.xl,
    borderBottomWidth: 2,
    borderLeftWidth: 2,
    borderRightWidth: 2,
    gap: 6,
    paddingBottom: space.xl,
    paddingHorizontal: space.lg,
  },
  heroAddress: { alignItems: 'flex-start', flexDirection: 'row', gap: 5 },
  heroAddressText: { color: 'rgba(255,255,255,0.92)', flex: 1, fontFamily: fonts.medium, fontSize: 14 },
  heroBar: { alignItems: 'center', flexDirection: 'row', gap: space.sm, marginBottom: space.md },
  heroCity: { color: '#FFC93C', fontFamily: fonts.bold, fontSize: 13, letterSpacing: 1.5 },
  heroName: { color: '#FFFFFF', fontFamily: fonts.display, fontSize: 38, letterSpacing: -1, lineHeight: 42 },
  heroPill: {
    alignItems: 'center',
    borderRadius: radius.pill,
    flexDirection: 'row',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  heroPillText: { color: '#FFFFFF', fontFamily: fonts.bold, fontSize: 12.5 },
  heroPills: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 4 },
  heroSoft: { color: 'rgba(255,255,255,0.9)', fontFamily: fonts.medium, fontSize: 13 },
  heroStatText: { flex: 1, gap: 2 },
  heroStats: { alignItems: 'center', flexDirection: 'row', gap: space.lg, marginTop: space.md },
  heroStrong: { color: '#FFFFFF', fontFamily: fonts.heading, fontSize: 18 },
  notice: { alignItems: 'center', flexDirection: 'row', gap: space.sm, padding: space.md },
  priceCell: { flexBasis: '45%', flexGrow: 1 },
  priceGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  priceTile: { gap: 2, padding: space.md },
  voteRow: {
    alignItems: 'center',
    borderTopWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    gap: space.sm,
    marginTop: space.sm,
    paddingTop: space.md,
  },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
});
