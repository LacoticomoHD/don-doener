import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Button, Screen, Sticker, TextField, Txt } from '@/components/ui';
import { useI18n } from '@/i18n/I18nProvider';
import { useAuth } from '@/lib/auth';
import { showMessage } from '@/lib/dialog';
import { isSupabaseConfigured } from '@/lib/supabase';
import { useTheme } from '@/theme/ThemeProvider';
import { fonts, radius, space } from '@/theme/tokens';

export default function LoginScreen() {
  const { theme } = useTheme();
  const c = theme.colors;
  const { t } = useI18n();
  const { signIn, signUp, resetPassword } = useAuth();
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);

  const close = () => (router.canGoBack() ? router.back() : router.replace('/'));

  const submit = async () => {
    const mail = email.trim();
    if (!mail || !password) return showMessage(t('common.error'), t('auth.fillBoth'));
    if (mode === 'register' && password.length < 8) return showMessage(t('common.error'), t('auth.passwordShort'));
    setBusy(true);
    const error = mode === 'login' ? await signIn(mail, password) : await signUp(mail, password);
    setBusy(false);
    if (error) return showMessage(t('common.error'), error);
    if (mode === 'register') showMessage(t('auth.register'), t('auth.registered'), close);
    else close();
  };

  const forgot = async () => {
    const mail = email.trim();
    if (!mail) return showMessage(t('common.error'), t('auth.enterEmail'));
    const error = await resetPassword(mail);
    showMessage(error ? t('common.error') : t('auth.forgot'), error ?? t('auth.resetSent'));
  };

  return (
    <Screen contentContainerStyle={styles.content}>
      <Sticker color={c.primary} style={styles.hero}>
        <Text style={styles.logo}>🥙</Text>
        <Text style={styles.wordmark}>DON DÖNER</Text>
        <Txt tone="onPrimary" style={styles.center}>
          {t('auth.why')}
        </Txt>
      </Sticker>

      {!isSupabaseConfigured ? (
        <Txt variant="caption" tone="danger" style={styles.center}>
          {t('common.notConfigured')}
        </Txt>
      ) : null}

      {/* Umschalter Login / Registrieren */}
      <View style={[styles.segment, { backgroundColor: c.surface, borderColor: c.border }]}>
        {(['login', 'register'] as const).map((m) => (
          <Pressable
            key={m}
            onPress={() => setMode(m)}
            style={[styles.segmentItem, mode === m && { backgroundColor: c.secondary, borderColor: c.border }]}
          >
            <Txt variant="label" tone={mode === m ? 'onSecondary' : 'muted'}>
              {m === 'login' ? t('auth.login') : t('auth.register')}
            </Txt>
          </Pressable>
        ))}
      </View>

      <TextField
        label={t('auth.email')}
        icon="mail"
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        autoComplete="email"
        keyboardType="email-address"
        textContentType="emailAddress"
        placeholder="du@beispiel.de"
      />
      <TextField
        label={t('auth.password')}
        icon="lock-closed"
        value={password}
        onChangeText={setPassword}
        secure
        autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
        textContentType={mode === 'login' ? 'password' : 'newPassword'}
        placeholder="••••••••"
        hint={mode === 'register' ? t('auth.passwordShort') : undefined}
        onSubmitEditing={submit}
        returnKeyType="go"
      />

      <Button
        title={mode === 'login' ? t('auth.login') : t('auth.register')}
        icon={mode === 'login' ? 'log-in' : 'person-add'}
        onPress={submit}
        loading={busy}
      />
      {mode === 'login' ? <Button title={t('auth.forgot')} variant="ghost" onPress={forgot} /> : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  center: { textAlign: 'center' },
  content: { gap: space.lg, paddingTop: space.md },
  hero: { alignItems: 'center', gap: space.sm, padding: space.xl },
  logo: { fontSize: 56, lineHeight: 64, transform: [{ rotate: '-10deg' }] },
  segment: { borderRadius: radius.pill, borderWidth: 2, flexDirection: 'row', padding: 4 },
  segmentItem: {
    alignItems: 'center',
    borderColor: 'transparent',
    borderRadius: radius.pill,
    borderWidth: 2,
    flex: 1,
    paddingVertical: 10,
  },
  wordmark: { color: '#FFFFFF', fontFamily: fonts.display, fontSize: 40, letterSpacing: -1 },
});
