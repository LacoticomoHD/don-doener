import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Switch, View } from 'react-native';

import { useI18n } from '@/i18n/I18nProvider';
import { fetchShopsInBounds, geocode, type Place, type ShopInput } from '@/lib/api';
import { confirmAction, errorMessage, showMessage } from '@/lib/dialog';
import { parsePrice, priceToInput } from '@/lib/format';
import { boundsAround, distanceKm } from '@/lib/geo';
import { normalizeTime, TIME_PATTERN } from '@/lib/openingHours';
import { useTheme } from '@/theme/ThemeProvider';
import { radius, space } from '@/theme/tokens';
import { PRICE_FIELDS, PRICE_ICONS, WEEKDAYS, type OpeningHours, type PriceField, type Shop, type Weekday } from '@/types';

import { Button, Card, Chip, TextField, Txt } from './ui';

interface DayInput {
  closed: boolean;
  open: string;
  close: string;
}

function initialDays(hours: OpeningHours | undefined): Record<Weekday, DayInput> {
  const hasAny = hours && Object.keys(hours).length > 0;
  return Object.fromEntries(
    WEEKDAYS.map((d) => {
      const entry = hours?.[d];
      if (entry) return [d, { closed: false, open: entry.open, close: entry.close }];
      // Neuer Laden: typische Zeiten vorschlagen; bestehender: fehlender Tag = Ruhetag
      return [d, { closed: !!hasAny, open: '11:00', close: '22:00' }];
    })
  ) as Record<Weekday, DayInput>;
}

/** Vergleichsform für den Duplikat-Check. */
const normalizeName = (name: string) => name.toLowerCase().replace(/[^a-z0-9äöüß]/g, '');

export function ShopForm({
  initial,
  onSubmit,
  submitLabel,
}: {
  initial?: Shop;
  onSubmit: (input: ShopInput) => Promise<void>;
  submitLabel: string;
}) {
  const { theme } = useTheme();
  const { t } = useI18n();
  const isEdit = initial != null;

  const [name, setName] = useState(initial?.name ?? '');
  const [addressQuery, setAddressQuery] = useState(initial?.address ?? '');
  const [place, setPlace] = useState<Place | null>(
    initial
      ? { label: initial.address, latitude: initial.latitude, longitude: initial.longitude, city: initial.city }
      : null
  );
  const [results, setResults] = useState<Place[]>([]);
  const [searching, setSearching] = useState(false);
  const [prices, setPrices] = useState<Record<PriceField, string>>(
    Object.fromEntries(PRICE_FIELDS.map((f) => [f, priceToInput(initial?.[f] ?? null)])) as Record<PriceField, string>
  );
  const [card, setCard] = useState<boolean | null>(initial?.kartenzahlung ?? null);
  const [days, setDays] = useState(() => initialDays(initial?.opening_hours));
  const [busy, setBusy] = useState(false);

  const setDay = (day: Weekday, patch: Partial<DayInput>) =>
    setDays((prev) => ({ ...prev, [day]: { ...prev[day], ...patch } }));

  const copyMondayToAll = () =>
    setDays((prev) => Object.fromEntries(WEEKDAYS.map((d) => [d, { ...prev.montag }])) as Record<Weekday, DayInput>);

  const searchAddress = async () => {
    if (!addressQuery.trim()) return;
    setSearching(true);
    try {
      const found = await geocode(addressQuery.trim());
      setResults(found);
      if (found.length === 1) setPlace(found[0]);
      if (found.length === 0) showMessage(t('form.addressNone'));
    } catch (e) {
      showMessage(t('common.error'), errorMessage(e));
    } finally {
      setSearching(false);
    }
  };

  /** Gibt es in 150 m Umkreis schon einen Laden mit ähnlichem Namen? */
  const findDuplicate = async (input: ShopInput) => {
    try {
      const nearby = await fetchShopsInBounds(boundsAround(input, 0.3), 100);
      const n = normalizeName(input.name);
      return nearby.find((s) => {
        const other = normalizeName(s.name);
        return distanceKm(s, input) < 0.15 && (other.includes(n) || n.includes(other));
      });
    } catch {
      return undefined; // Komfortfunktion – bei Fehlern normal weiter
    }
  };

  const submit = async () => {
    if (name.trim().length < 2) return showMessage(t('form.needName'));
    if (!place) return showMessage(t('form.needAddress'));

    const parsed: Partial<Record<PriceField, number | null>> = {};
    for (const f of PRICE_FIELDS) {
      const value = parsePrice(prices[f]);
      if (value === undefined) return showMessage(t('form.invalidPrice', { label: t(`price.${f}`) }));
      parsed[f] = value;
    }

    const opening_hours: OpeningHours = {};
    for (const day of WEEKDAYS) {
      const d = days[day];
      if (d.closed) continue;
      const open = normalizeTime(d.open);
      const close = normalizeTime(d.close);
      if (!TIME_PATTERN.test(open) || !TIME_PATTERN.test(close)) {
        return showMessage(t('form.invalidHours', { day: t(`weekday.${day}`) }));
      }
      opening_hours[day] = { open, close };
    }

    const input: ShopInput = {
      name: name.trim(),
      address: place.label,
      latitude: place.latitude,
      longitude: place.longitude,
      city: place.city,
      opening_hours,
      doener_preis: parsed.doener_preis ?? null,
      doener_gross_preis: parsed.doener_gross_preis ?? null,
      dueruem_preis: parsed.dueruem_preis ?? null,
      menue_preis: parsed.menue_preis ?? null,
      kartenzahlung: card,
    };

    setBusy(true);
    try {
      if (!isEdit) {
        const duplicate = await findDuplicate(input);
        if (duplicate) {
          const addAnyway = await confirmAction({
            title: t('form.duplicateTitle'),
            message: t('form.duplicateBody', { name: duplicate.name, address: duplicate.address }),
            confirmLabel: t('form.duplicateAnyway'),
            cancelLabel: t('form.duplicateOpen'),
          });
          if (!addAnyway) {
            router.replace({ pathname: '/laden/[id]', params: { id: duplicate.id } });
            return;
          }
        }
      }
      await onSubmit(input);
    } catch (e) {
      showMessage(t('common.error'), errorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      {isEdit ? (
        <Txt variant="caption" tone="muted">
          ℹ️ {t('form.editHint')}
        </Txt>
      ) : null}

      <TextField label={t('form.name')} value={name} onChangeText={setName} placeholder={t('form.namePlaceholder')} />

      <View style={styles.gap}>
        <TextField
          label={t('form.address')}
          value={addressQuery}
          onChangeText={(v) => {
            setAddressQuery(v);
            setResults([]);
          }}
          placeholder={t('form.addressPlaceholder')}
          onSubmitEditing={searchAddress}
          returnKeyType="search"
        />
        <Button title={t('form.addressSearch')} icon="🔍" variant="secondary" onPress={searchAddress} loading={searching} />
        {results.length > 1 ? (
          <Txt variant="caption" tone="muted">
            {t('form.addressPick')}
          </Txt>
        ) : null}
        {results.map((r) => {
          const selected = place?.label === r.label && place.latitude === r.latitude;
          return (
            <Pressable
              key={`${r.latitude},${r.longitude}`}
              onPress={() => setPlace(r)}
              style={[
                styles.result,
                {
                  backgroundColor: selected ? theme.colors.surfaceMuted : theme.colors.surface,
                  borderColor: selected ? theme.colors.primary : theme.colors.border,
                },
              ]}
            >
              <Txt>{selected ? '✓ ' : ''}{r.label}</Txt>
            </Pressable>
          );
        })}
        {place && results.length === 0 ? (
          <Txt variant="caption" tone="success">
            {t('form.addressSelected', { address: place.label })}
          </Txt>
        ) : null}
      </View>

      <Card>
        <Txt variant="heading">{t('form.prices')}</Txt>
        <View style={styles.priceGrid}>
          {PRICE_FIELDS.map((f) => (
            <TextField
              key={f}
              label={`${PRICE_ICONS[f]} ${t(`price.${f}`)}`}
              value={prices[f]}
              onChangeText={(v) => setPrices((prev) => ({ ...prev, [f]: v }))}
              keyboardType="decimal-pad"
              placeholder="€"
              containerStyle={styles.priceField}
            />
          ))}
        </View>
        <Txt variant="label" style={styles.spaced}>
          {t('form.card')}
        </Txt>
        <View style={styles.row}>
          <Chip label={`💳 ${t('form.cardYes')}`} selected={card === true} onPress={() => setCard(true)} />
          <Chip label={`💵 ${t('form.cardNo')}`} selected={card === false} onPress={() => setCard(false)} />
          <Chip label={t('form.cardUnknown')} selected={card === null} onPress={() => setCard(null)} />
        </View>
      </Card>

      <Card>
        <Txt variant="heading">{t('form.hours')}</Txt>
        <Txt variant="caption" tone="muted">
          {t('form.hoursHint')}
        </Txt>
        {WEEKDAYS.map((day) => {
          const d = days[day];
          return (
            <View key={day} style={[styles.day, { borderTopColor: theme.colors.border }]}>
              <View style={styles.dayHeader}>
                <Txt variant="label" style={styles.flex}>
                  {t(`weekday.${day}`)}
                </Txt>
                <Txt variant="caption" tone="muted">
                  {d.closed ? t('form.closed') : t('common.open')}
                </Txt>
                <Switch
                  value={!d.closed}
                  onValueChange={(v) => setDay(day, { closed: !v })}
                  trackColor={{ true: theme.colors.primary }}
                />
              </View>
              {!d.closed ? (
                <View style={styles.row}>
                  <TextField
                    value={d.open}
                    onChangeText={(v) => setDay(day, { open: v })}
                    onBlur={() => setDay(day, { open: normalizeTime(d.open) })}
                    keyboardType="numbers-and-punctuation"
                    placeholder="11:00"
                    containerStyle={styles.time}
                    style={styles.timeInput}
                  />
                  <Txt tone="muted">{t('form.until')}</Txt>
                  <TextField
                    value={d.close}
                    onChangeText={(v) => setDay(day, { close: v })}
                    onBlur={() => setDay(day, { close: normalizeTime(d.close) })}
                    keyboardType="numbers-and-punctuation"
                    placeholder="22:00"
                    containerStyle={styles.time}
                    style={styles.timeInput}
                  />
                </View>
              ) : null}
            </View>
          );
        })}
        <Button title={t('form.copyToAll')} variant="ghost" compact onPress={copyMondayToAll} />
      </Card>

      {!isEdit ? (
        <Txt variant="caption" tone="muted">
          {t('form.featuresNote')}
        </Txt>
      ) : null}

      <Button title={submitLabel} onPress={submit} loading={busy} />
    </>
  );
}

const styles = StyleSheet.create({
  day: { borderTopWidth: StyleSheet.hairlineWidth, gap: space.sm, paddingVertical: space.sm },
  dayHeader: { alignItems: 'center', flexDirection: 'row', gap: space.sm },
  flex: { flex: 1 },
  gap: { gap: space.sm },
  priceField: { flexBasis: '45%', flexGrow: 1 },
  priceGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: space.md },
  result: { borderRadius: radius.md, borderWidth: 1, padding: space.md },
  row: { alignItems: 'center', flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  spaced: { marginTop: space.sm },
  time: { width: 96 },
  timeInput: { textAlign: 'center' },
});
