import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';

import { Button, Screen, TextField, Txt } from '@/components/ui';
import { useI18n } from '@/i18n/I18nProvider';
import { useAuth } from '@/lib/auth';
import { showMessage } from '@/lib/dialog';
import { isSupabaseConfigured } from '@/lib/supabase';
import { space } from '@/theme/tokens';

export default function LoginScreen() {
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
      <Text style={styles.logo}>🥙</Text>
      <Txt variant="title" style={styles.center}>
        {t('app.name')}
      </Txt>
      <Txt tone="muted" style={styles.center}>
        {t('auth.why')}
      </Txt>
      {!isSupabaseConfigured ? (
        <Txt variant="caption" tone="danger" style={styles.center}>
          {t('common.notConfigured')}
        </Txt>
      ) : null}

      <TextField
        label={t('auth.email')}
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
        value={password}
        onChangeText={setPassword}
        secure
        autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
        textContentType={mode === 'login' ? 'password' : 'newPassword'}
        placeholder="••••••••"
        onSubmitEditing={submit}
        returnKeyType="go"
      />

      <Button title={mode === 'login' ? t('auth.login') : t('auth.register')} onPress={submit} loading={busy} />

      <Pressable onPress={() => setMode(mode === 'login' ? 'register' : 'login')} style={styles.link}>
        <Txt variant="label" tone="primary">
          {mode === 'login' ? t('auth.toRegister') : t('auth.toLogin')}
        </Txt>
      </Pressable>
      {mode === 'login' ? (
        <Pressable onPress={forgot} style={styles.link}>
          <Txt variant="caption" tone="muted">
            {t('auth.forgot')}
          </Txt>
        </Pressable>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  center: { textAlign: 'center' },
  content: { gap: space.lg, paddingTop: space.xl },
  link: { alignSelf: 'center', padding: space.xs },
  logo: { fontSize: 56, textAlign: 'center' },
});
