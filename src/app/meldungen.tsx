import { router } from 'expo-router';
import { FlatList, StyleSheet, View } from 'react-native';

import { Button, Card, LoadingView, MessageView, Txt } from '@/components/ui';
import { useI18n } from '@/i18n/I18nProvider';
import { fetchReports, setReportStatus } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { errorMessage, showMessage } from '@/lib/dialog';
import { formatDate } from '@/lib/format';
import { useFocusedAsync } from '@/lib/useAsync';
import { useTheme } from '@/theme/ThemeProvider';
import { space } from '@/theme/tokens';

/** Admin-Postfach: Meldungen sichten und abhaken (per RLS nur für Admins lesbar). */
export default function ReportsScreen() {
  const { theme } = useTheme();
  const { t, lang } = useI18n();
  const { isAdmin } = useAuth();
  const reports = useFocusedAsync(() => (isAdmin ? fetchReports() : Promise.resolve([])), [isAdmin]);

  if (!isAdmin) return <MessageView icon="🔒" message={t('auth.loginRequired')} />;
  if (reports.loading && !reports.data) return <LoadingView />;

  const toggle = async (id: string, done: boolean) => {
    try {
      await setReportStatus(id, done ? 'offen' : 'erledigt');
      reports.reload();
    } catch (e) {
      showMessage(t('common.error'), errorMessage(e));
    }
  };

  return (
    <FlatList
      style={{ backgroundColor: theme.colors.background }}
      contentContainerStyle={styles.list}
      data={reports.data ?? []}
      keyExtractor={(r) => r.id}
      ListEmptyComponent={<MessageView icon="📭" message={t('admin.empty')} />}
      renderItem={({ item }) => {
        const done = item.status === 'erledigt';
        return (
          <Card style={done && styles.done}>
            <View style={styles.row}>
              <Txt variant="caption" tone={done ? 'muted' : 'danger'} style={styles.bold}>
                {done ? `✓ ${t('admin.done')}` : `● ${t('admin.open')}`}
              </Txt>
              <Txt variant="caption" tone="muted">
                {formatDate(item.created_at, lang)}
              </Txt>
            </View>
            <Txt variant="heading">{item.shop?.name ?? '–'}</Txt>
            <Txt variant="caption" tone="muted">
              {item.shop?.address}
            </Txt>
            <Txt variant="label">🚩 {t(`reason.${item.reason}`)}</Txt>
            {item.details ? <Txt>„{item.details}“</Txt> : null}
            <View style={styles.row}>
              <Button
                title={t('admin.toShop')}
                variant="secondary"
                compact
                onPress={() => router.push({ pathname: '/laden/[id]', params: { id: item.shop_id } })}
              />
              <Button
                title={done ? t('admin.reopen') : t('admin.markDone')}
                variant={done ? 'ghost' : 'primary'}
                compact
                onPress={() => toggle(item.id, done)}
              />
            </View>
          </Card>
        );
      }}
    />
  );
}

const styles = StyleSheet.create({
  bold: { fontWeight: '700' },
  done: { opacity: 0.65 },
  list: { flexGrow: 1, gap: space.md, padding: space.lg },
  row: { alignItems: 'center', flexDirection: 'row', flexWrap: 'wrap', gap: space.sm, justifyContent: 'space-between' },
});
