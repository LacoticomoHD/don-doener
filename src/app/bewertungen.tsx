import { router } from 'expo-router';
import { FlatList, Pressable, StyleSheet, View } from 'react-native';

import { StarRating } from '@/components/StarRating';
import { LoadingView, MessageView, Sticker, Txt } from '@/components/ui';
import { useI18n } from '@/i18n/I18nProvider';
import { fetchMyRatings } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { formatDate, formatScore } from '@/lib/format';
import { useFocusedAsync } from '@/lib/useAsync';
import { useTheme } from '@/theme/ThemeProvider';
import { fonts, space } from '@/theme/tokens';
import { RATING_CATEGORIES, type MyRating } from '@/types';

function average(r: MyRating): number {
  const values = RATING_CATEGORIES.map((c) => r[c]).filter((v): v is number => v != null);
  return values.reduce((a, b) => a + b, 0) / values.length;
}

export default function MyRatingsScreen() {
  const { theme } = useTheme();
  const { t, lang } = useI18n();
  const { user } = useAuth();
  const ratings = useFocusedAsync(async () => (user ? fetchMyRatings(user.id) : []), [user?.id]);

  if (ratings.loading && !ratings.data) return <LoadingView />;
  if (ratings.error) return <MessageView icon="⚠️" message={t('common.loadError')} actionLabel={t('common.retry')} onAction={ratings.reload} />;

  return (
    <FlatList
      style={{ backgroundColor: theme.colors.background }}
      contentContainerStyle={styles.list}
      data={ratings.data ?? []}
      keyExtractor={(r) => r.id}
      ListEmptyComponent={<MessageView icon="⭐" message={t('myRatings.empty')} />}
      renderItem={({ item }) => {
        const avg = average(item);
        return (
          <Pressable
            onPress={() => item.shop && router.push({ pathname: '/laden/[id]/bewerten', params: { id: item.shop.id } })}
          >
            {({ pressed }) => (
            <Sticker pressed={pressed} style={styles.card}>
            <View style={styles.header}>
              <Txt variant="heading" numberOfLines={1} style={styles.flex}>
                {item.shop?.name ?? '–'}
              </Txt>
              {item.verified ? <Txt variant="caption" tone="success">📍</Txt> : null}
            </View>
            <Txt variant="caption" tone="muted" numberOfLines={1}>
              {item.shop?.city ?? item.shop?.address}
            </Txt>
            <View style={styles.header}>
              <StarRating value={avg} size={15} />
              <Txt variant="caption" style={styles.bold}>
                {formatScore(avg, lang)}
              </Txt>
              <Txt variant="caption" tone="muted" style={styles.right}>
                {formatDate(item.updated_at, lang)} ›
              </Txt>
            </View>
            </Sticker>
            )}
          </Pressable>
        );
      }}
    />
  );
}

const styles = StyleSheet.create({
  bold: { fontFamily: fonts.bold },
  card: { gap: 4, padding: 14 },
  flex: { flex: 1 },
  header: { alignItems: 'center', flexDirection: 'row', gap: space.sm },
  list: { flexGrow: 1, gap: space.md, padding: space.lg },
  right: { flex: 1, textAlign: 'right' },
});
