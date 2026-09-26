import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Switch, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { StarRating } from '@/components/StarRating';
import { Button, Chip, IconButton, LoadingView, MessageView, Sticker, TextField, Txt } from '@/components/ui';
import { useI18n } from '@/i18n/I18nProvider';
import type { TranslationKey } from '@/i18n/translations';
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
import { radius, space } from '@/theme/tokens';
import {
  SHOP_FEATURE_ICONS,
  SHOP_FEATURES,
  type RatingCategory,
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

const STEPS: { key: 'food' | 'shop' | 'features' | 'price'; title: TranslationKey; emoji: string }[] = [
  { key: 'food', title: 'rate.stepFood', emoji: '🥙' },
  { key: 'shop', title: 'rate.stepShop', emoji: '🏪' },
  { key: 'features', title: 'rate.stepFeatures', emoji: '🌶️' },
  { key: 'price', title: 'rate.stepPrice', emoji: '💶' },
];

const FOOD: RatingCategory[] = ['geschmack', 'fleischqualitaet', 'sossenqualitaet'];
const SHOP: RatingCategory[] = ['freundlichkeit', 'sauberkeit', 'preis_leistung', 'wartezeit'];

type PriceAnswer = 'yes' | 'no' | null;

export default function RateScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { theme } = useTheme();
  const c = theme.colors;
  const { t, lang } = useI18n();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();

  const [shop, setShop] = useState<ShopDetail | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [step, setStep] = useState(0);
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

  const close = () => (router.canGoBack() ? router.back() : router.replace('/'));

  if (!user) {
    return <MessageView icon="🔒" message={t('auth.loginRequired')} actionLabel={t('auth.login')} onAction={() => router.replace('/login')} />;
  }
  if (loadError) return <MessageView icon="⚠️" message={t('common.loadError')} actionLabel={t('common.back')} onAction={close} />;
  if (!shop) return <LoadingView />;

  const food = FOOD.filter((cat) => !(noMeat && cat === 'fleischqualitaet'));
  const stepComplete =
    STEPS[step].key === 'food'
      ? food.every((cat) => values[cat] != null)
      : STEPS[step].key === 'shop'
        ? SHOP.every((cat) => values[cat] != null)
        : true;
  const isLast = step === STEPS.length - 1;

  /** Tippen: keine Angabe → gibt es → gibt es nicht → keine Angabe */
  const cycleVote = (f: ShopFeature) =>
    setVotes((prev) => {
      const cur = prev[f] ?? 0;
      return { ...prev, [f]: cur === 0 ? 1 : cur === 1 ? -1 : 0 };
    });

  const submit = async () => {
    let price: number | null = null;
    const wantsNewPrice = priceAnswer === 'no' || (shop.doener_preis == null && newPrice.trim() !== '');
    if (wantsNewPrice) {
      const parsed = parsePrice(newPrice);
      if (parsed == null) return showMessage(t('rate.priceInvalid'));
      price = parsed;
    }

    setBusy(true);
    try {
      const pos = alreadyVerified ? null : await requestPosition();
      const verified = alreadyVerified || (pos != null && distanceKm(pos, shop) <= ON_SITE_KM);
      // Zuerst die Bewertung: Sie berechtigt zur Abstimmung über Besonderheiten
      await saveRating(shop.id, user.id, { ...values, fleischqualitaet: noMeat ? null : values.fleischqualitaet }, verified);
      await saveFeatureVotes(shop.id, user.id, votes);
      // Preis und Kartenzahlung sind Zusatzinfos – Fehler blockieren die Bewertung nicht
      try {
        if (price != null) await patchShop(shop.id, { doener_preis: price, preis_bestaetigt_am: new Date().toISOString() });
        else if (priceAnswer === 'yes') await confirmPrice(shop.id);
        if (card !== shop.kartenzahlung) await patchShop(shop.id, { kartenzahlung: card });
      } catch {
        // ignorieren
      }
      showMessage(verified ? t('rate.thanksVerified') : t('rate.thanks'), undefined, close);
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
      close();
    } catch (e) {
      showMessage(t('common.error'), errorMessage(e));
    }
  };

  const renderCategory = (cat: RatingCategory) => {
    const value = values[cat];
    return (
      <Sticker key={cat} style={styles.category}>
        <View style={styles.categoryHead}>
          <Txt variant="heading" style={styles.flex}>
            {t(`category.${cat}`)}
          </Txt>
          <Txt variant="label" tone={value ? 'primary' : 'muted'}>
            {value ? t(`stars.${value}` as TranslationKey) : '–'}
          </Txt>
        </View>
        <StarRating value={value} onChange={(v) => setValues((prev) => ({ ...prev, [cat]: v }))} size={44} label={t(`category.${cat}`)} />
      </Sticker>
    );
  };

  return (
    <KeyboardAvoidingView style={[styles.flex, { backgroundColor: c.background }]} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      {/* Kopf mit Fortschritt */}
      <View style={[styles.header, { paddingTop: insets.top + space.sm }]}>
        <View style={styles.headerRow}>
          <IconButton icon="close" label={t('common.cancel')} onPress={close} size={42} />
          <View style={styles.flex}>
            <Txt variant="caption" tone="muted" numberOfLines={1}>
              {shop.name}
            </Txt>
            <Txt variant="label">{t('rate.step', { n: step + 1, total: STEPS.length })}</Txt>
          </View>
        </View>
        <View style={[styles.progress, { backgroundColor: c.surface, borderColor: c.border }]}>
          <View style={[styles.progressFill, { backgroundColor: c.primary, width: `${((step + 1) / STEPS.length) * 100}%` }]} />
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Txt style={styles.stepEmoji}>{STEPS[step].emoji}</Txt>
        <Txt variant="display">{t(STEPS[step].title)}</Txt>

        {STEPS[step].key === 'food' ? (
          <>
            {step === 0 ? (
              <Txt variant="caption" tone={alreadyVerified ? 'success' : 'muted'}>
                {alreadyVerified ? t('rate.verifiedAlready') : t('rate.verifyHint')}
              </Txt>
            ) : null}
            {food.map(renderCategory)}
            <View style={styles.switchRow}>
              <Txt variant="label" style={styles.flex}>
                🥗 {t('rate.noMeat')}
              </Txt>
              <Switch value={noMeat} onValueChange={setNoMeat} trackColor={{ true: c.primary }} />
            </View>
          </>
        ) : null}

        {STEPS[step].key === 'shop' ? SHOP.map(renderCategory) : null}

        {STEPS[step].key === 'features' ? (
          <>
            <Txt tone="muted">{t('rate.featuresHint')}</Txt>
            <View style={styles.wrap}>
              {SHOP_FEATURES.map((f) => {
                const vote = votes[f] ?? 0;
                return (
                  <Chip
                    key={f}
                    icon={vote === 1 ? 'checkmark' : vote === -1 ? 'close' : undefined}
                    label={`${SHOP_FEATURE_ICONS[f]} ${t(`feature.${f}`)}`}
                    selected={vote !== 0}
                    tone={vote === -1 ? 'danger' : 'success'}
                    onPress={() => cycleVote(f)}
                  />
                );
              })}
            </View>
          </>
        ) : null}

        {STEPS[step].key === 'price' ? (
          <>
            <Sticker style={styles.category}>
              {shop.doener_preis != null ? (
                <>
                  <Txt variant="heading">{t('rate.priceStill', { price: formatPrice(shop.doener_preis, lang) })}</Txt>
                  <View style={styles.wrap}>
                    <Chip label={t('rate.priceYes')} icon="checkmark" tone="success" selected={priceAnswer === 'yes'} onPress={() => setPriceAnswer(priceAnswer === 'yes' ? null : 'yes')} />
                    <Chip label={t('rate.priceNo')} icon="swap-horizontal" tone="danger" selected={priceAnswer === 'no'} onPress={() => setPriceAnswer(priceAnswer === 'no' ? null : 'no')} />
                  </View>
                  {priceAnswer === 'no' ? (
                    <TextField label={t('rate.priceNew')} value={newPrice} onChangeText={setNewPrice} keyboardType="decimal-pad" placeholder="7,50" icon="pricetag" />
                  ) : null}
                </>
              ) : (
                <TextField label={t('rate.priceUnknown')} value={newPrice} onChangeText={setNewPrice} keyboardType="decimal-pad" placeholder="7,50" icon="pricetag" />
              )}
            </Sticker>
            <Sticker style={styles.category}>
              <Txt variant="heading">{t('rate.cardTitle')}</Txt>
              <View style={styles.wrap}>
                <Chip icon="card" label={t('form.cardYes')} selected={card === true} onPress={() => setCard(true)} />
                <Chip icon="cash" label={t('form.cardNo')} selected={card === false} onPress={() => setCard(false)} />
                <Chip label={t('form.cardUnknown')} selected={card === null} onPress={() => setCard(null)} />
              </View>
            </Sticker>
            {existing ? <Button title={t('rate.deleteRating')} icon="trash" variant="ghost" onPress={remove} /> : null}
          </>
        ) : null}
      </ScrollView>

      {/* Navigation zwischen den Schritten */}
      <View style={[styles.footer, { backgroundColor: c.surface, borderColor: c.border, paddingBottom: insets.bottom + space.md }]}>
        {step > 0 ? (
          <Button title={t('rate.back')} icon="arrow-back" variant="plain" onPress={() => setStep(step - 1)} style={styles.flex} />
        ) : null}
        <Button
          title={isLast ? (existing ? t('rate.submitEdit') : t('rate.submitNew')) : t('rate.next')}
          icon={isLast ? 'checkmark-circle' : 'arrow-forward'}
          disabled={!stepComplete}
          loading={busy}
          onPress={() => (isLast ? submit() : setStep(step + 1))}
          style={styles.grow}
        />
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  category: { gap: space.md, padding: space.lg },
  categoryHead: { alignItems: 'center', flexDirection: 'row', gap: space.sm },
  content: { gap: space.lg, padding: space.lg, paddingBottom: 40 },
  flex: { flex: 1 },
  footer: { borderTopWidth: 2, flexDirection: 'row', gap: space.md, paddingHorizontal: space.lg, paddingTop: space.md },
  grow: { flex: 2 },
  header: { gap: space.md, paddingHorizontal: space.lg, paddingBottom: space.sm },
  headerRow: { alignItems: 'center', flexDirection: 'row', gap: space.md },
  progress: { borderRadius: radius.pill, borderWidth: 2, height: 14, overflow: 'hidden' },
  progressFill: { height: '100%' },
  stepEmoji: { fontSize: 44, lineHeight: 52 },
  switchRow: { alignItems: 'center', flexDirection: 'row', paddingHorizontal: space.xs },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
});
