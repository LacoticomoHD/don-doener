import { DarkTheme, DefaultTheme, ThemeProvider as NavThemeProvider } from 'expo-router/react-navigation';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useMemo } from 'react';

import { I18nProvider, useI18n } from '@/i18n/I18nProvider';
import { AuthProvider, useAuth } from '@/lib/auth';
import { FilterProvider } from '@/lib/filters';
import { ThemeProvider, useTheme } from '@/theme/ThemeProvider';

SplashScreen.preventAutoHideAsync().catch(() => {});

export default function RootLayout() {
  return (
    <ThemeProvider>
      <I18nProvider>
        <AuthProvider>
          <FilterProvider>
            <Navigation />
          </FilterProvider>
        </AuthProvider>
      </I18nProvider>
    </ThemeProvider>
  );
}

function Navigation() {
  const { theme } = useTheme();
  const { t } = useI18n();
  const { loading } = useAuth();

  useEffect(() => {
    if (!loading) SplashScreen.hideAsync().catch(() => {});
  }, [loading]);

  const navTheme = useMemo(() => {
    const base = theme.dark ? DarkTheme : DefaultTheme;
    return {
      ...base,
      colors: {
        ...base.colors,
        background: theme.colors.background,
        card: theme.colors.surface,
        primary: theme.colors.primary,
        text: theme.colors.text,
        border: theme.colors.border,
      },
    };
  }, [theme]);

  return (
    <NavThemeProvider value={navTheme}>
      <StatusBar style={theme.dark ? 'light' : 'dark'} />
      <Stack
        screenOptions={{
          headerTintColor: theme.colors.primary,
          headerTitleStyle: { color: theme.colors.text, fontWeight: '700' },
          headerBackButtonDisplayMode: 'minimal',
        }}
      >
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="laden/[id]/index" options={{ title: '' }} />
        <Stack.Screen name="laden/[id]/bewerten" options={{ title: t('rate.title') }} />
        <Stack.Screen name="laden/[id]/bearbeiten" options={{ title: t('form.titleEdit') }} />
        <Stack.Screen name="laden/[id]/melden" options={{ title: t('report.title'), presentation: 'modal' }} />
        <Stack.Screen name="laden/neu" options={{ title: t('form.titleNew') }} />
        <Stack.Screen name="login" options={{ title: t('auth.title'), presentation: 'modal' }} />
        <Stack.Screen name="bewertungen" options={{ title: t('profile.myRatings') }} />
        <Stack.Screen name="favoriten" options={{ title: t('profile.favorites') }} />
        <Stack.Screen name="meldungen" options={{ title: t('admin.title') }} />
        <Stack.Screen name="rechtliches" options={{ title: t('legal.title') }} />
      </Stack>
    </NavThemeProvider>
  );
}
