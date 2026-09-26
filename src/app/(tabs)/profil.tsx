import Constants from 'expo-constants';
import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button, Card, Chip, LinkRow, Sticker, Txt } from '@/components/ui';
import { useI18n } from '@/i18n/I18nProvider';
import { LANGUAGE_LABELS, LANGUAGES, type TranslationKey } from '@/i18n/translations';
import { deleteOwnAccount, fetchMyRatings } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { confirmAction, errorMessage, showMessage } from '@/lib/dialog';
import { useFocusedAsync } from '@/lib/useAsync';
import { useTheme, type ThemeMode } from '@/theme/ThemeProvider';
import { fonts, radius, space } from '@/theme/tokens';

/** Döner-Pass: Abzeichen nach Anzahl bewerteter Läden. */
const BADGES: { min: number; key: TranslationKey; emoji: string }[] = [
  { min: 5, key: 'profile.badgeBronze', emoji: '🥉' },
  { min: 25, key: 'profile.badgeSilver', emoji: '🥈' },
  { min: 100, key: 'profile.badgeGold', emoji: '🥇' },
];

export default function ProfileScreen() {
  const { theme, mode, setMode } = useTheme();
  const c = theme.colors;
  const { t, lang, setLang } = useI18n();
  const insets = useSafeAreaInsets();
  const { user, isAdmin, signOut } = useAuth();
  const [deleting, setDeleting] = useState(false);

  const ratings = useFocusedAsync(async () => (user ? fetchMyRatings(user.id) : []), [user?.id]);
  const count = ratings.data?.length ?? 0;
  const cities = new Set((ratings.data ?? []).map((r) => r.shop?.city).filter(Boolean)).size;
  const verified = (ratings.data ?? []).filter((r) => r.verified).length;
  const current = [...BADGES].reverse().find((b) => count >= b.min);
  const next = BADGES.find((b) => count < b.min);
  const initial = (user?.email ?? '?').charAt(0).toUpperCase();

  const logout = async () => {
    const ok = await confirmAction({
      title: t('profile.logout'),
      message: t('profile.logoutConfirm'),
      confirmLabel: t('profile.logout'),
      cancelLabel: t('common.cancel'),
    });
    if (ok) await signOut();
  };

  const deleteAccount = async () => {
    const ok = await confirmAction({
      title: t('profile.deleteAccount'),
      message: t('profile.deleteConfirm'),
      confirmLabel: t('common.delete'),
      cancelLabel: t('common.cancel'),
      destructive: true,
    });
    if (!ok) return;
    setDeleting(true);
    try {
      await deleteOwnAccount();
      await signOut();
      showMessage(t('profile.deleted'));
    } catch (e) {
      showMessage(t('common.error'), errorMessage(e));
    } finally {
      setDeleting(false);
    }
  };

  const themes: { key: ThemeMode; label: TranslationKey }[] = [
    { key: 'system', label: 'profile.themeSystem' },
    { key: 'light', label: 'profile.themeLight' },
    { key: 'dark', label: 'profile.themeDark' },
  ];

  return (
    <ScrollView style={{ backgroundColor: c.background }} contentContainerStyle={[styles.content, { paddingTop: insets.top + space.lg }]}>
      {user ? (
        <>
          <View style={styles.hello}>
            <View style={[styles.avatar, { backgroundColor: c.primary, borderColor: c.border }]}>
              <Text style={[styles.avatarText, { color: c.onPrimary }]}>{initial}</Text>
            </View>
            <View style={styles.flex}>
              <Txt variant="title">{t('profile.hello')}</Txt>
              <Txt variant="caption" tone="muted" numberOfLines={1}>
                {user.email}
              </Txt>
            </View>
          </View>

          {/* Döner-Pass */}
          <Sticker color={c.primary} style={styles.pass}>
            <View style={styles.passHead}>
              <Txt variant="heading" tone="onPrimary" style={styles.flex}>
                {t('profile.pass')}
              </Txt>
              <Text style={styles.passEmoji}>{current?.emoji ?? '🥙'}</Text>
            </View>
            <View style={styles.stats}>
              {[
                { n: count, label: t('profile.passShops') },
                { n: cities, label: t('profile.passCities') },
                { n: verified, label: t('profile.passVerified') },
              ].map((s) => (
                <View key={s.label} style={[styles.stat, { backgroundColor: c.surface, borderColor: c.border }]}>
                  <Txt variant="title">{s.n}</Txt>
                  <Txt variant="caption" tone="muted" style={styles.center} numberOfLines={1}>
                    {s.label}
                  </Txt>
                </View>
              ))}
            </View>
            <Txt variant="label" tone="onPrimary">
              {current ? t(current.key) : t('profile.badgeNone')}
            </Txt>
            {next ? (
              <>
                <View style={[styles.track, { backgroundColor: 'rgba(255,255,255,0.3)', borderColor: c.border }]}>
                  <View style={[styles.fill, { backgroundColor: c.secondary, width: `${Math.min(100, (count / next.min) * 100)}%` }]} />
                </View>
                <Txt variant="caption" tone="onPrimary">
                  {t('profile.badgeNext', { n: next.min - count, badge: t(next.key) })}
                </Txt>
              </>
            ) : (
              <Txt variant="caption" tone="onPrimary">
                {t('profile.badgeMax')}
              </Txt>
            )}
          </Sticker>

          <Card>
            <LinkRow icon="star" label={t('profile.myRatings')} hint={count ? String(count) : undefined} onPress={() => router.push('/bewertungen')} />
            <LinkRow icon="heart" label={t('profile.favorites')} onPress={() => router.push('/favoriten')} last={!isAdmin} />
            {isAdmin ? <LinkRow icon="shield-checkmark" label={t('profile.reports')} onPress={() => router.push('/meldungen')} last /> : null}
          </Card>
        </>
      ) : (
        <Sticker color={c.secondary} style={styles.guest}>
          <Text style={styles.guestEmoji}>🥙</Text>
          <Txt variant="title" tone="onSecondary" style={styles.center}>
            {t('profile.guest')}
          </Txt>
          <Txt tone="onSecondary" style={styles.center}>
            {t('profile.guestHint')}
          </Txt>
          <Button title={t('profile.loginCta')} icon="log-in" onPress={() => router.push('/login')} style={styles.stretch} />
        </Sticker>
      )}

      <Card>
        <Txt variant="heading">{t('profile.language')}</Txt>
        <View style={styles.chips}>
          {LANGUAGES.map((l) => (
            <Chip key={l} label={LANGUAGE_LABELS[l]} selected={lang === l} onPress={() => setLang(l)} />
          ))}
        </View>
        <Txt variant="heading" style={styles.spaced}>
          {t('profile.appearance')}
        </Txt>
        <View style={styles.chips}>
          {themes.map((m) => (
            <Chip
              key={m.key}
              icon={m.key === 'system' ? 'phone-portrait' : m.key === 'light' ? 'sunny' : 'moon'}
              label={t(m.label)}
              selected={mode === m.key}
              onPress={() => setMode(m.key)}
            />
          ))}
        </View>
      </Card>

      <Card>
        <LinkRow icon="document-text" label={t('profile.legal')} onPress={() => router.push('/rechtliches')} last={!user} />
        {user ? <LinkRow icon="log-out" label={t('profile.logout')} onPress={logout} last /> : null}
      </Card>

      {user ? (
        <Pressable onPress={deleteAccount} disabled={deleting} style={styles.deleteLink}>
          <Txt variant="caption" tone="danger">
            {deleting ? '…' : t('profile.deleteAccount')}
          </Txt>
        </Pressable>
      ) : null}

      <Txt variant="caption" tone="muted" style={styles.center}>
        {t('app.name')} · {t('profile.version', { v: Constants.expoConfig?.version ?? '' })}
      </Txt>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  avatar: { alignItems: 'center', borderRadius: 30, borderWidth: 2, height: 60, justifyContent: 'center', width: 60 },
  avatarText: { fontFamily: fonts.display, fontSize: 28 },
  center: { textAlign: 'center' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  content: { gap: space.lg, padding: space.lg, paddingBottom: 48 },
  deleteLink: { alignSelf: 'center', padding: space.sm },
  fill: { borderRadius: 6, height: '100%' },
  flex: { flex: 1 },
  guest: { alignItems: 'center', gap: space.md, padding: space.xl },
  guestEmoji: { fontSize: 60, lineHeight: 70 },
  hello: { alignItems: 'center', flexDirection: 'row', gap: space.md },
  pass: { gap: space.md, padding: space.lg },
  passEmoji: { fontSize: 34, lineHeight: 40 },
  passHead: { alignItems: 'center', flexDirection: 'row' },
  spaced: { marginTop: space.sm },
  stat: { alignItems: 'center', borderRadius: radius.md, borderWidth: 2, flex: 1, paddingVertical: space.md },
  stats: { flexDirection: 'row', gap: space.sm },
  stretch: { alignSelf: 'stretch' },
  track: { borderRadius: 8, borderWidth: 2, height: 14, overflow: 'hidden' },
});
