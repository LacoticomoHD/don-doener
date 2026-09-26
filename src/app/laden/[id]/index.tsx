import { LinearGradient } from 'expo-linear-gradient';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Pressable, Share, StyleSheet, Text, View } from 'react-native';

import { OpeningHoursTable } from '@/components/OpeningHoursTable';
import { Button, Chip, LoadingView, MessageView, Screen, Section, Txt } from '@/components/ui';
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
import { openDirections, TRAVEL_MODES } from '@/lib/directions';
import { formatDate, formatPrice, formatScore } from '@/lib/format';
import { hasOpeningHours, isOpenNow } from '@/lib/openingHours';
import { useFocusedAsync } from '@/lib/useAsync';
import { useRequireLogin } from '@/lib/useRequireLogin';
import { useTheme } from '@/theme/ThemeProvider';
import { GLUT_GRADIENT, radius, scoreColor, space } from '@/theme/tokens';
import { PRICE_FIELDS, PRICE_ICONS, RATING_CATEGORIES, SHOP_FEATURE_ICONS } from '@/types';

export default function ShopDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { theme } = useTheme();
  const c = theme.colors;
  const { t, lang } = useI18n();
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
  const [showRoutes, setShowRoutes] = useState(false);
  const favorite = favoriteOverride ?? mine.data?.favorite ?? false;
  const hoursVote = hoursVoteOverride ?? mine.data?.hoursVote ?? 0;

  if (detail.loading && !detail.data) return <LoadingView />;
  if (detail.error && !detail.data) {
    return (
      <MessageView icon="⚠️" message={t('common.loadError')} actionLabel={t('common.retry')} onAction={detail.reload} />
    );
  }
  const shop = detail.data?.shop;
  if (!shop) return <MessageView icon="🤷" message={t('detail.notFound')} />;

  const prices = detail.data?.prices ?? [];
  const stats = shop.stats;
  const avg = stats?.avg_gesamt ?? null;
  const knownHours = hasOpeningHours(shop.opening_hours);
  const open = knownHours && isOpenNow(shop.opening_hours);
  const confirmedFeatures = shop.featureStats.filter((f) => f.score > 0);
  const hoursOutdated = (shop.hoursStats?.score ?? 0) <= -2;
  const canDelete = !!user && (isAdmin || shop.created_by === user.id);
  const knownPrices = PRICE_FIELDS.filter((f) => shop[f] != null);

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
      router.back();
    } catch (e) {
      showMessage(t('common.error'), errorMessage(e));
    }
  };

  const actions = [
    { icon: '⭐', label: mine.data?.hasRating ? t('detail.rateAgain') : t('detail.rate'), onPress: rate },
    { icon: '🧭', label: t('detail.route'), onPress: () => setShowRoutes((v) => !v), active: showRoutes },
    { icon: favorite ? '❤️' : '🤍', label: favorite ? t('detail.saved') : t('detail.save'), onPress: toggleFavorite },
    { icon: '📤', label: t('detail.share'), onPress: share },
  ];

  return (
    <>
      <Stack.Screen options={{ title: shop.name }} />
      <Screen contentContainerStyle={styles.content}>
        <LinearGradient colors={GLUT_GRADIENT} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.hero}>
          {shop.city ? <Text style={styles.heroCity}>{shop.city.toUpperCase()}</Text> : null}
          <Text style={styles.heroName}>{shop.name}</Text>
          <Text style={styles.heroAddress}>📍 {shop.address}</Text>
          <View style={styles.heroRow}>
            <View style={styles.scoreBadge}>
              <Text style={styles.scoreValue}>{avg != null ? formatScore(avg, lang) : '–'}</Text>
              <Text style={styles.scoreMax}>/ 5</Text>
            </View>
            {shop.doener_preis != null ? (
              <HeroPill label={`🥙 ${formatPrice(shop.doener_preis, lang)}`} />
            ) : null}
            {knownHours ? (
              <HeroPill label={`● ${open ? t('common.open') : t('common.closed')}`} color={open ? '#B9F6CA' : '#FFCDD2'} />
            ) : null}
            {shop.kartenzahlung != null ? (
              <HeroPill label={shop.kartenzahlung ? '💳' : '💵'} />
            ) : null}
          </View>
          {stats && stats.verified_count > 0 ? (
            <Text style={styles.heroNote}>
              📍 {t('detail.verified', { v: stats.verified_count, n: stats.rating_count })}
            </Text>
          ) : null}
        </LinearGradient>

        <View style={styles.body}>
          {shop.ausgeblendet ? (
            <Txt variant="caption" tone="danger">
              {t('detail.hidden')}
            </Txt>
          ) : null}

          <View style={styles.actions}>
            {actions.map((a) => (
              <Pressable
                key={a.icon}
                accessibilityRole="button"
                onPress={a.onPress}
                style={({ pressed }) => [
                  styles.action,
                  {
                    backgroundColor: a.active ? c.surfaceMuted : c.surface,
                    borderColor: c.border,
                    opacity: pressed ? 0.7 : 1,
                  },
                ]}
              >
                <Text style={styles.actionIcon}>{a.icon}</Text>
                <Txt variant="caption" style={styles.actionLabel} numberOfLines={1}>
                  {a.label}
                </Txt>
              </Pressable>
            ))}
          </View>

          {showRoutes ? (
            <View style={styles.actions}>
              {TRAVEL_MODES.map((m) => (
                <Chip
                  key={m.key}
                  label={`${m.icon} ${t(`route.${m.key}`)}`}
                  onPress={() => openDirections(shop, m.key)}
                  style={styles.routeChip}
                />
              ))}
            </View>
          ) : null}

          <Section
            title={t('detail.ratingTitle')}
            right={
              stats ? (
                <Txt variant="caption" tone="muted">
                  {stats.rating_count === 1
                    ? t('common.ratingsCountOne')
                    : t('common.ratingsCount', { n: stats.rating_count })}
                </Txt>
              ) : null
            }
          >
            {stats ? (
              RATING_CATEGORIES.map((cat) => {
                const value = stats[`avg_${cat}`];
                if (value == null) return null;
                return (
                  <View key={cat} style={styles.barRow}>
                    <Txt variant="caption" style={styles.barLabel}>
                      {t(`category.${cat}`)}
                    </Txt>
                    <View style={[styles.barTrack, { backgroundColor: c.surfaceMuted }]}>
                      <View
                        style={[styles.barFill, { width: `${(value / 5) * 100}%`, backgroundColor: scoreColor(value, c) }]}
                      />
                    </View>
                    <Txt variant="caption" style={styles.barValue}>
                      {formatScore(value, lang)}
                    </Txt>
                  </View>
                );
              })
            ) : (
              <Txt tone="muted">{t('detail.noRatings')}</Txt>
            )}
            <Button
              title={mine.data?.hasRating ? t('detail.rateAgain') : t('detail.rate')}
              icon="⭐"
              onPress={rate}
              style={styles.cta}
            />
          </Section>

          <Section title={t('detail.prices')}>
            {knownPrices.length > 0 ? (
              <View style={styles.priceGrid}>
                {knownPrices.map((f) => (
                  <View key={f} style={[styles.priceTile, { backgroundColor: c.surfaceMuted }]}>
                    <Txt variant="caption" tone="muted">
                      {PRICE_ICONS[f]} {t(`price.${f}`)}
                    </Txt>
                    <Txt variant="heading" tone="accent">
                      {formatPrice(shop[f] as number, lang)}
                    </Txt>
                  </View>
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
                📈 {t('detail.priceHistory')}: {prices.map((p) => formatPrice(p.preis, lang)).join(' → ')}
              </Txt>
            ) : null}
            <Txt variant="caption" tone="muted">
              {shop.kartenzahlung == null
                ? t('detail.cardUnknown')
                : shop.kartenzahlung
                  ? `💳 ${t('detail.cardYes')}`
                  : `💵 ${t('detail.cardNo')}`}
            </Txt>
          </Section>

          <Section title={t('detail.features')}>
            {confirmedFeatures.length > 0 ? (
              <View style={styles.wrap}>
                {confirmedFeatures.map((f) => (
                  <View key={f.feature} style={[styles.badge, { backgroundColor: c.surfaceMuted, borderColor: c.border }]}>
                    <Txt variant="caption">
                      {SHOP_FEATURE_ICONS[f.feature]} {t(`feature.${f.feature}`)}
                      <Txt variant="caption" tone="muted">
                        {'  '}✓{f.bestaetigt}
                      </Txt>
                    </Txt>
                  </View>
                ))}
              </View>
            ) : (
              <Txt tone="muted">{t('detail.noFeatures')}</Txt>
            )}
            <Txt variant="caption" tone="muted">
              {t('detail.featuresHint')}
            </Txt>
          </Section>

          <Section title={t('detail.hours')}>
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
                <Chip
                  label={`👍 ${shop.hoursStats?.bestaetigt ?? 0}`}
                  selected={hoursVote === 1}
                  tone="success"
                  onPress={() => voteHours(1)}
                />
                <Chip
                  label={`👎 ${shop.hoursStats?.veraltet ?? 0}`}
                  selected={hoursVote === -1}
                  tone="danger"
                  onPress={() => voteHours(-1)}
                />
              </View>
            ) : null}
          </Section>

          <View style={styles.links}>
            <Button
              title={t('detail.edit')}
              icon="✏️"
              variant="ghost"
              compact
              onPress={() => requireLogin() && router.push({ pathname: '/laden/[id]/bearbeiten', params: { id: shop.id } })}
            />
            <Button
              title={t('detail.report')}
              icon="🚩"
              variant="ghost"
              compact
              onPress={() =>
                requireLogin() &&
                router.push({ pathname: '/laden/[id]/melden', params: { id: shop.id, name: shop.name } })
              }
            />
            {canDelete ? <Button title={t('detail.delete')} variant="danger" compact onPress={remove} /> : null}
          </View>
        </View>
      </Screen>
    </>
  );
}

function HeroPill({ label, color = '#FFFFFF' }: { label: string; color?: string }) {
  return (
    <View style={styles.heroPill}>
      <Text style={[styles.heroPillText, { color }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  action: {
    alignItems: 'center',
    borderRadius: radius.md,
    borderWidth: 1,
    flex: 1,
    gap: 2,
    paddingHorizontal: 4,
    paddingVertical: 10,
  },
  actionIcon: { fontSize: 19 },
  actionLabel: { fontWeight: '700' },
  actions: { flexDirection: 'row', gap: space.sm },
  badge: { borderRadius: radius.pill, borderWidth: 1, paddingHorizontal: 10, paddingVertical: 5 },
  barFill: { borderRadius: 4, height: '100%' },
  barLabel: { width: 112 },
  barRow: { alignItems: 'center', flexDirection: 'row', gap: 10, paddingVertical: 3 },
  barTrack: { borderRadius: 4, flex: 1, height: 8, overflow: 'hidden' },
  barValue: { fontVariant: ['tabular-nums'], fontWeight: '800', textAlign: 'right', width: 30 },
  body: { gap: space.md, padding: space.lg },
  content: { gap: 0, padding: 0 },
  cta: { marginTop: space.sm },
  flex: { flex: 1 },
  hero: {
    borderBottomLeftRadius: 26,
    borderBottomRightRadius: 26,
    gap: 4,
    paddingBottom: 20,
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  heroAddress: { color: 'rgba(255,255,255,0.88)', fontSize: 13, marginBottom: 10 },
  heroCity: { color: 'rgba(255,255,255,0.8)', fontSize: 11, fontWeight: '800', letterSpacing: 1.2 },
  heroName: { color: '#FFFFFF', fontSize: 26, fontWeight: '800', letterSpacing: -0.3 },
  heroNote: { color: 'rgba(255,255,255,0.92)', fontSize: 12, marginTop: 8 },
  heroPill: {
    backgroundColor: 'rgba(255,255,255,0.16)',
    borderColor: 'rgba(255,255,255,0.35)',
    borderRadius: radius.pill,
    borderWidth: 1,
    paddingHorizontal: 11,
    paddingVertical: 6,
  },
  heroPillText: { fontSize: 13, fontWeight: '700' },
  heroRow: { alignItems: 'center', flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  links: { alignItems: 'center', gap: 2, marginTop: space.xs },
  priceGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  priceTile: { borderRadius: radius.md, flexGrow: 1, minWidth: 120, padding: space.md },
  routeChip: { alignItems: 'center', flex: 1, paddingHorizontal: 4 },
  scoreBadge: {
    alignItems: 'baseline',
    backgroundColor: '#FFFFFF',
    borderRadius: radius.md,
    flexDirection: 'row',
    gap: 3,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  scoreMax: { color: '#8B7E6C', fontSize: 11, fontWeight: '700' },
  scoreValue: { color: '#C0392B', fontSize: 21, fontWeight: '800' },
  voteRow: {
    alignItems: 'center',
    borderTopWidth: 1,
    flexDirection: 'row',
    gap: space.sm,
    marginTop: space.sm,
    paddingTop: space.md,
  },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
});
