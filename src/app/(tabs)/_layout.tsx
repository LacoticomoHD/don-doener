import { Tabs } from 'expo-router';
import { Text } from 'react-native';

import { useI18n } from '@/i18n/I18nProvider';
import { useTheme } from '@/theme/ThemeProvider';

function TabIcon({ icon, focused }: { icon: string; focused: boolean }) {
  return <Text style={{ fontSize: 21, opacity: focused ? 1 : 0.5 }}>{icon}</Text>;
}

export default function TabLayout() {
  const { theme } = useTheme();
  const { t } = useI18n();
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: theme.colors.primary,
        tabBarInactiveTintColor: theme.colors.textMuted,
        headerTitleStyle: { fontWeight: '800' },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: t('tab.map'),
          headerShown: false,
          tabBarIcon: ({ focused }) => <TabIcon icon="🗺️" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="liste"
        options={{
          title: t('tab.list'),
          headerShown: false,
          tabBarIcon: ({ focused }) => <TabIcon icon="📋" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="top"
        options={{
          title: t('tab.top'),
          tabBarIcon: ({ focused }) => <TabIcon icon="🏆" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="profil"
        options={{
          title: t('tab.profile'),
          tabBarIcon: ({ focused }) => <TabIcon icon="👤" focused={focused} />,
        }}
      />
    </Tabs>
  );
}
