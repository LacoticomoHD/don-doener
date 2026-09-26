import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Switch, View } from 'react-native';

import { StarRating } from '@/components/StarRating';
import { Button, Card, Chip, LoadingView, MessageView, Screen, TextField, Txt } from '@/components/ui';
import { useI18n } from '@/i18n/I18nProvider';
import {
  confirmPrice,
  deleteRating,
  fetchMyFeatureVotes,
  fetchMyRating,
  fetchShopDetail,
  patchShop,
  saveFeatureVotes,
  saveRating,
  type Vote,
} from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { confirmAction, errorMessage, showMessage } from '@/lib/dialog';
import { formatPrice, parsePrice } from '@/lib/format';
import { distanceKm } from '@/lib/geo';
import { requestPosition } from '@/lib/location';
import { useTheme } from '@/theme/ThemeProvider';
import { space } from '@/theme/tokens';
import {
  OPTIONAL_CATEGORIES,
  RATING_CATEGORIES,
  SHOP_FEATURE_ICONS,
  SHOP_FEATURES,
  type RatingValues,
  type ShopDetail,
  type ShopFeature,
} from '@/types';

/** „Vor Ort" heißt: höchstens 150 m vom Laden entfernt. */
const ON_SITE_KM = 0.15;

const EMPTY: RatingValues = {
  geschmack: null,
  fleischqualitaet: null,
  sossenqualitaet: null,
  freundlichkeit: null,
  sauberkeit: null,
  preis_leistung: null,
  wartezeit: null,
};

type PriceAnswer = 'yes' | 'no' | null;

export default function RateScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { theme } = useTheme();
  const { t, lang } = useI18n();
  const { user } = useAuth();

  const [shop, setShop] = useState<ShopDetail | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [values, setValues] = useState<RatingValues>(EMPTY);
  const [noMeat, setNoMeat] = useState(false);
  const [votes, setVotes] = useState<Partial<Record<ShopFeature, Vote>>>({});
  const [existing, setExisting] = useState(false);
  const [alreadyVerified, setAlreadyVerified] = useState(false);
  const [priceAnswer, setPriceAnswer] = useState<PriceAnswer>(null);
  const [newPrice, setNewPrice] = useState('');
  const [card, setCard] = useState<boolean | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!user) return;
    Promise.all([fetchShopDetail(id), fetchMyRating(id, user.id), fetchMyFeatureVotes(id, user.id)])
      .then(([s, rating, myVotes]) => {
        setShop(s);
        setCard(s?.kartenzahlung ?? null);
        setVotes(myVotes);
        if (rating) {
          setExisting(true);
          setAlreadyVerified(rating.verified);
          setNoMeat(rating.fleischqualitaet == null);
          setValues({
            geschmack: rating.geschmack,
            fleischqualitaet: rating.fleischqualitaet,
            sossenqualitaet: rating.sossenqualitaet,
            freundlichkeit: rating.freundlichkeit,
            sauberkeit: rating.sauberkeit,
            preis_leistung: rating.preis_leistung,
            wartezeit: rating.wartezeit,
          });
        }
      })
      .catch(() => setLoadError(true));
  }, [id, user]);

  if (!user) return <MessageView icon="🔒" message={t('auth.loginRequired')} actionLabel={t('auth.login')} onAction={() => router.replace('/login')} />;
  if (loadError) return <MessageView icon="⚠️" message={t('common.loadError')} />;
  if (!shop) return <LoadingView />;

  const categories = RATING_CATEGORIES.filter((c) => !(noMeat && c === 'fleischqualitaet'));

  /** Tippen: keine Angabe → gibt es → gibt es nicht → keine Angabe */
  const cycleVote = (f: ShopFeature) =>
    setVotes((prev) => {
      const cur = prev[f] ?? 0;
      return { ...prev, [f]: cur === 0 ? 1 : cur === 1 ? -1 : 0 };
    });

  const checkOnSite = async () => {
    const pos = await requestPosition();
    return pos != null && distanceKm(pos, shop) <= ON_SITE_KM;
  };

  const submit = async () => {
    if (categories.some((c) => values[c] == null)) {
      showMessage(t('rate.incomplete'));
      return;
    }
    let price: number | null = null;
    const wantsNewPrice = priceAnswer === 'no' || (shop.doener_preis == null && newPrice.trim() !== '');
    if (wantsNewPrice) {
      const parsed = parsePrice(newPrice);
      if (parsed == null) {
        showMessage(t('rate.priceInvalid'));
        return;
      }
      price = parsed;
    }

    setBusy(true);
    try {
      const verified = alreadyVerified || (await checkOnSite());
      const finalValues = { ...values, fleischqualitaet: noMeat ? null : values.fleischqualitaet };
      // Zuerst die Bewertung: Sie berechtigt zur Abstimmung über Besonderheiten
      await saveRating(shop.id, user.id, finalValues, verified);
      await saveFeatureVotes(shop.id, user.id, votes);
      // Preis und Kartenzahlung sind Zusatzinfos – Fehler blockieren die Bewertung nicht
      try {
        if (price != null) await patchShop(shop.id, { doener_preis: price, preis_bestaetigt_am: new Date().toISOString() });
        else if (priceAnswer === 'yes') await confirmPrice(shop.id);
        if (card !== shop.kartenzahlung) await patchShop(shop.id, { kartenzahlung: card });
      } catch {
        // ignorieren
      }
      showMessage(verified ? t('rate.thanksVerified') : t('rate.thanks'), undefined, () => router.back());
    } catch (e) {
      showMessage(t('common.error'), errorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    const ok = await confirmAction({
      title: t('rate.deleteRating'),
      message: t('rate.deleteConfirm'),
      confirmLabel: t('common.delete'),
      cancelLabel: t('common.cancel'),
      destructive: true,
    });
    if (!ok) return;
    try {
      await deleteRating(shop.id, user.id);
      router.back();
    } catch (e) {
      showMessage(t('common.error'), errorMessage(e));
    }
  };

  return (
    <Screen>
      <Txt variant="title">{shop.name}</Txt>
      <Txt tone="muted">{existing ? t('rate.introEdit') : t('rate.introNew')}</Txt>
      <Card style={{ backgroundColor: theme.colors.surfaceMuted }}>
        <Txt variant="caption" tone={alreadyVerified ? 'success' : 'muted'}>
          {alreadyVerified ? t('rate.verifiedAlready') : t('rate.verifyHint')}
        </Txt>
      </Card>

      {categories.map((cat) => (
        <Card key={cat} style={styles.category}>
          <View style={styles.categoryHeader}>
            <Txt variant="label">{t(`category.${cat}`)}</Txt>
          </View>
          <StarRating
            value={values[cat]}
            onChange={(v) => setValues((prev) => ({ ...prev, [cat]: v }))}
            size={34}
            label={t(`category.${cat}`)}
          />
        </Card>
      ))}
      {OPTIONAL_CATEGORIES.includes('fleischqualitaet') ? (
        <Pressable style={styles.switchRow} onPress={() => setNoMeat((v) => !v)}>
          <Txt style={styles.flex}>🥗 {t('rate.noMeat')}</Txt>
          <Switch value={noMeat} onValueChange={setNoMeat} trackColor={{ true: theme.colors.primary }} />
        </Pressable>
      ) : null}

      <Txt variant="heading" style={styles.sectionTitle}>
        {t('rate.featuresTitle')}
      </Txt>
      <Txt variant="caption" tone="muted">
        {t('rate.featuresHint')}
      </Txt>
      <View style={styles.wrap}>
        {SHOP_FEATURES.map((f) => {
          const vote = votes[f] ?? 0;
          return (
            <Chip
              key={f}
              label={`${vote === 1 ? '✓ ' : vote === -1 ? '✗ ' : ''}${SHOP_FEATURE_ICONS[f]} ${t(`feature.${f}`)}`}
              selected={vote !== 0}
              tone={vote === -1 ? 'danger' : 'success'}
              onPress={() => cycleVote(f)}
            />
          );
        })}
      </View>

      <Txt variant="heading" style={styles.sectionTitle}>
        {t('rate.priceTitle')}
      </Txt>
      {shop.doener_preis != null ? (
        <>
          <Txt tone="muted">{t('rate.priceStill', { price: formatPrice(shop.doener_preis, lang) })}</Txt>
          <View style={styles.row}>
            <Chip
              label={t('rate.priceYes')}
              tone="success"
              selected={priceAnswer === 'yes'}
              onPress={() => setPriceAnswer(priceAnswer === 'yes' ? null : 'yes')}
            />
            <Chip
              label={t('rate.priceNo')}
              tone="danger"
              selected={priceAnswer === 'no'}
              onPress={() => setPriceAnswer(priceAnswer === 'no' ? null : 'no')}
            />
          </View>
          {priceAnswer === 'no' ? (
            <TextField label={t('rate.priceNew')} value={newPrice} onChangeText={setNewPrice} keyboardType="decimal-pad" placeholder="7,50" />
          ) : null}
        </>
      ) : (
        <TextField label={t('rate.priceUnknown')} value={newPrice} onChangeText={setNewPrice} keyboardType="decimal-pad" placeholder="7,50" />
      )}

      <Txt variant="heading" style={styles.sectionTitle}>
        {t('rate.cardTitle')}
      </Txt>
      <View style={styles.row}>
        <Chip label={`💳 ${t('form.cardYes')}`} selected={card === true} onPress={() => setCard(true)} />
        <Chip label={`💵 ${t('form.cardNo')}`} selected={card === false} onPress={() => setCard(false)} />
        <Chip label={t('form.cardUnknown')} selected={card === null} onPress={() => setCard(null)} />
      </View>

      <Button
        title={existing ? t('rate.submitEdit') : t('rate.submitNew')}
        onPress={submit}
        loading={busy}
        style={styles.submit}
      />
      {existing ? <Button title={t('rate.deleteRating')} variant="danger" compact onPress={remove} /> : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  category: { alignItems: 'center', gap: space.sm },
  categoryHeader: { alignSelf: 'stretch' },
  flex: { flex: 1 },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  sectionTitle: { marginTop: space.md },
  submit: { marginTop: space.lg },
  switchRow: { alignItems: 'center', flexDirection: 'row', paddingHorizontal: space.xs },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
});
