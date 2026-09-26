import Constants from 'expo-constants';
import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { Button, Card, Chip, LinkRow, Screen, Txt } from '@/components/ui';
import { useI18n } from '@/i18n/I18nProvider';
import { LANGUAGE_LABELS, LANGUAGES, type TranslationKey } from '@/i18n/translations';
import { deleteOwnAccount, fetchMyRatings } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { confirmAction, errorMessage, showMessage } from '@/lib/dialog';
import { useFocusedAsync } from '@/lib/useAsync';
import { useTheme, type ThemeMode } from '@/theme/ThemeProvider';
import { space } from '@/theme/tokens';

/** Döner-Pass: Abzeichen nach Anzahl bewerteter Läden. */
const BADGES: { min: number; key: TranslationKey }[] = [
  { min: 5, key: 'profile.badgeBronze' },
  { min: 25, key: 'profile.badgeSilver' },
  { min: 100, key: 'profile.badgeGold' },
];

export default function ProfileScreen() {
  const { theme, mode, setMode } = useTheme();
  const { t, lang, setLang } = useI18n();
  const { user, isAdmin, signOut } = useAuth();
  const [deleting, setDeleting] = useState(false);

  const ratings = useFocusedAsync(async () => (user ? fetchMyRatings(user.id) : []), [user?.id]);
  const count = ratings.data?.length ?? 0;
  const cities = new Set((ratings.data ?? []).map((r) => r.shop?.city).filter(Boolean)).size;
  const current = [...BADGES].reverse().find((b) => count >= b.min);
  const next = BADGES.find((b) => count < b.min);

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
    <Screen>
      {user ? (
        <>
          <Card>
            <Txt variant="caption" tone="muted">
              {t('profile.loggedInAs')}
            </Txt>
            <Txt variant="label">{user.email}</Txt>
          </Card>

          <Card>
            <Txt variant="heading">🥙 {t('profile.pass')}</Txt>
            <View style={styles.stats}>
              <View style={styles.stat}>
                <Txt variant="title" tone="primary">
                  {count}
                </Txt>
                <Txt variant="caption" tone="muted">
                  {t('profile.passShops')}
                </Txt>
              </View>
              <View style={styles.stat}>
                <Txt variant="title" tone="primary">
                  {cities}
                </Txt>
                <Txt variant="caption" tone="muted">
                  {t('profile.passCities')}
                </Txt>
              </View>
            </View>
            <Txt variant="label">{current ? t(current.key) : t('profile.badgeNone')}</Txt>
            {current ? (
              <Txt variant="caption" tone="muted">
                {next ? t('profile.badgeNext', { n: next.min - count, badge: t(next.key) }) : t('profile.badgeMax')}
              </Txt>
            ) : null}
            {next ? (
              <View style={[styles.track, { backgroundColor: theme.colors.surfaceMuted }]}>
                <View
                  style={[
                    styles.fill,
                    { backgroundColor: theme.colors.primary, width: `${Math.min(100, (count / next.min) * 100)}%` },
                  ]}
                />
              </View>
            ) : null}
          </Card>

          <LinkRow icon="⭐" label={t('profile.myRatings')} onPress={() => router.push('/bewertungen')} />
          <LinkRow icon="❤️" label={t('profile.favorites')} onPress={() => router.push('/favoriten')} />
          {isAdmin ? <LinkRow icon="🛠️" label={t('profile.reports')} onPress={() => router.push('/meldungen')} /> : null}
        </>
      ) : (
        <Card style={styles.guest}>
          <Txt style={styles.guestIcon}>🥙</Txt>
          <Txt variant="heading">{t('profile.guest')}</Txt>
          <Txt tone="muted" style={styles.center}>
            {t('profile.guestHint')}
          </Txt>
          <Button title={t('profile.loginCta')} onPress={() => router.push('/login')} style={styles.stretch} />
        </Card>
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
            <Chip key={m.key} label={t(m.label)} selected={mode === m.key} onPress={() => setMode(m.key)} />
          ))}
        </View>
      </Card>

      <LinkRow icon="⚖️" label={t('profile.legal')} onPress={() => router.push('/rechtliches')} />

      {user ? (
        <>
          <Button title={t('profile.logout')} variant="secondary" onPress={logout} />
          <Pressable onPress={deleteAccount} disabled={deleting} style={styles.deleteLink}>
            <Txt variant="caption" tone="danger">
              {deleting ? '…' : t('profile.deleteAccount')}
            </Txt>
          </Pressable>
        </>
      ) : null}

      <Txt variant="caption" tone="muted" style={styles.center}>
        {t('profile.version', { v: Constants.expoConfig?.version ?? '' })}
      </Txt>
    </Screen>
  );
}

const styles = StyleSheet.create({
  center: { textAlign: 'center' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  deleteLink: { alignSelf: 'center', padding: space.sm },
  fill: { borderRadius: 4, height: '100%' },
  guest: { alignItems: 'center', gap: space.md },
  guestIcon: { fontSize: 44, lineHeight: 52 },
  spaced: { marginTop: space.sm },
  stat: { alignItems: 'center', flex: 1 },
  stats: { flexDirection: 'row', marginVertical: space.xs },
  stretch: { alignSelf: 'stretch' },
  track: { borderRadius: 4, height: 8, marginTop: space.xs, overflow: 'hidden' },
});
