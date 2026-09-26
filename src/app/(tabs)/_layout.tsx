import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import { Platform, type ColorValue } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import type { IconName } from '@/components/ui';
import { useI18n } from '@/i18n/I18nProvider';
import { useTheme } from '@/theme/ThemeProvider';
import { fonts } from '@/theme/tokens';

function tabIcon(active: IconName, inactive: IconName) {
  function TabIcon({ focused, color }: { focused: boolean; color: ColorValue }) {
    return <Ionicons name={focused ? active : inactive} size={25} color={color as string} />;
  }
  return TabIcon;
}

export default function TabLayout() {
  const { theme } = useTheme();
  const { t } = useI18n();
  const insets = useSafeAreaInsets();
  const c = theme.colors;
  // Im Web gibt es keinen Safe-Area-Rand, auf Geräten mit Gestenleiste schon
  const bottomInset = Platform.OS === 'web' ? 0 : insets.bottom;
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: c.primary,
        tabBarInactiveTintColor: c.textMuted,
        tabBarLabelStyle: { fontFamily: fonts.bold, fontSize: 12 },
        tabBarStyle: {
          backgroundColor: c.surface,
          borderTopColor: c.border,
          borderTopWidth: 2,
          height: 68 + bottomInset,
          paddingTop: 8,
          paddingBottom: bottomInset + 6,
        },
        headerStyle: { backgroundColor: c.background },
        headerShadowVisible: false,
        headerTitleStyle: { fontFamily: fonts.display, fontSize: 24, color: c.text },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{ title: t('tab.discover'), headerShown: false, tabBarIcon: tabIcon('compass', 'compass-outline') }}
      />
      <Tabs.Screen name="top" options={{ title: t('tab.top'), tabBarIcon: tabIcon('trophy', 'trophy-outline') }} />
      <Tabs.Screen
        name="profil"
        options={{ title: t('tab.profile'), headerShown: false, tabBarIcon: tabIcon('person-circle', 'person-circle-outline') }}
      />
    </Tabs>
  );
}
