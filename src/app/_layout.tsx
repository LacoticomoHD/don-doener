import {
  BricolageGrotesque_700Bold,
  BricolageGrotesque_800ExtraBold,
} from '@expo-google-fonts/bricolage-grotesque';
import { DMSans_400Regular, DMSans_500Medium, DMSans_700Bold } from '@expo-google-fonts/dm-sans';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import { DarkTheme, DefaultTheme, ThemeProvider as NavThemeProvider } from 'expo-router/react-navigation';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useMemo } from 'react';
import { StyleSheet } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { I18nProvider, useI18n } from '@/i18n/I18nProvider';
import { AuthProvider, useAuth } from '@/lib/auth';
import { FilterProvider } from '@/lib/filters';
import { ThemeProvider, useTheme } from '@/theme/ThemeProvider';
import { fonts } from '@/theme/tokens';

SplashScreen.preventAutoHideAsync().catch(() => {});

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    BricolageGrotesque_700Bold,
    BricolageGrotesque_800ExtraBold,
    DMSans_400Regular,
    DMSans_500Medium,
    DMSans_700Bold,
  });

  return (
    <GestureHandlerRootView style={styles.flex}>
      <ThemeProvider>
        <I18nProvider>
          <AuthProvider>
            <FilterProvider>
              <Navigation ready={fontsLoaded || !!fontError} />
            </FilterProvider>
          </AuthProvider>
        </I18nProvider>
      </ThemeProvider>
    </GestureHandlerRootView>
  );
}

function Navigation({ ready }: { ready: boolean }) {
  const { theme } = useTheme();
  const { t } = useI18n();
  const { loading } = useAuth();
  const c = theme.colors;

  useEffect(() => {
    if (ready && !loading) SplashScreen.hideAsync().catch(() => {});
  }, [ready, loading]);

  const navTheme = useMemo(() => {
    const base = theme.dark ? DarkTheme : DefaultTheme;
    return {
      ...base,
      colors: { ...base.colors, background: c.background, card: c.background, primary: c.primary, text: c.text, border: c.border },
    };
  }, [theme.dark, c]);

  if (!ready) return null;

  return (
    <NavThemeProvider value={navTheme}>
      <StatusBar style={theme.dark ? 'light' : 'dark'} />
      <Stack
        screenOptions={{
          headerTintColor: c.text,
          headerStyle: { backgroundColor: c.background },
          headerShadowVisible: false,
          headerTitleStyle: { color: c.text, fontFamily: fonts.heading, fontSize: 19 },
          headerBackButtonDisplayMode: 'minimal',
          contentStyle: { backgroundColor: c.background },
        }}
      >
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="laden/[id]/index" options={{ headerShown: false }} />
        <Stack.Screen name="laden/[id]/bewerten" options={{ headerShown: false, presentation: 'fullScreenModal' }} />
        <Stack.Screen name="laden/[id]/bearbeiten" options={{ title: t('form.titleEdit') }} />
        <Stack.Screen name="laden/[id]/melden" options={{ title: t('report.title'), presentation: 'modal' }} />
        <Stack.Screen name="laden/neu" options={{ title: t('form.titleNew') }} />
        <Stack.Screen name="login" options={{ title: '', presentation: 'modal' }} />
        <Stack.Screen name="bewertungen" options={{ title: t('profile.myRatings') }} />
        <Stack.Screen name="favoriten" options={{ title: t('profile.favorites') }} />
        <Stack.Screen name="meldungen" options={{ title: t('admin.title') }} />
        <Stack.Screen name="rechtliches" options={{ title: t('legal.title') }} />
      </Stack>
    </NavThemeProvider>
  );
}

const styles = StyleSheet.create({ flex: { flex: 1 } });
