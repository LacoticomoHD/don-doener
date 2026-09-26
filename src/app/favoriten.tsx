import { FlatList, StyleSheet } from 'react-native';

import { ShopCard } from '@/components/ShopCard';
import { LoadingView, MessageView } from '@/components/ui';
import { useI18n } from '@/i18n/I18nProvider';
import { fetchFavoriteShops } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { useFocusedAsync } from '@/lib/useAsync';
import { useTheme } from '@/theme/ThemeProvider';
import { space } from '@/theme/tokens';

export default function FavoritesScreen() {
  const { theme } = useTheme();
  const { t } = useI18n();
  const { user } = useAuth();
  const favorites = useFocusedAsync(async () => (user ? fetchFavoriteShops(user.id) : []), [user?.id]);

  if (favorites.loading && !favorites.data) return <LoadingView />;
  if (favorites.error) {
    return <MessageView icon="⚠️" message={t('common.loadError')} actionLabel={t('common.retry')} onAction={favorites.reload} />;
  }

  return (
    <FlatList
      style={{ backgroundColor: theme.colors.background }}
      contentContainerStyle={styles.list}
      data={favorites.data ?? []}
      keyExtractor={(s) => s.id}
      ListEmptyComponent={<MessageView icon="❤️" message={t('favorites.empty')} />}
      renderItem={({ item }) => <ShopCard shop={item} />}
    />
  );
}

const styles = StyleSheet.create({
  list: { flexGrow: 1, gap: 10, padding: space.lg },
});
