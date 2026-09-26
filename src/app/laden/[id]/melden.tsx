import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Button, Chip, MessageView, Screen, TextField, Txt } from '@/components/ui';
import { useI18n } from '@/i18n/I18nProvider';
import { createReport } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { errorMessage, showMessage } from '@/lib/dialog';
import { space } from '@/theme/tokens';
import { REPORT_REASONS, type ReportReason } from '@/types';

export default function ReportScreen() {
  const { id, name } = useLocalSearchParams<{ id: string; name?: string }>();
  const { t } = useI18n();
  const { user } = useAuth();
  const [reason, setReason] = useState<ReportReason | null>(null);
  const [details, setDetails] = useState('');
  const [busy, setBusy] = useState(false);

  if (!user) {
    return (
      <MessageView icon="🔒" message={t('auth.loginRequired')} actionLabel={t('auth.login')} onAction={() => router.replace('/login')} />
    );
  }

  const send = async () => {
    if (!reason) return showMessage(t('report.needReason'));
    setBusy(true);
    try {
      await createReport(id, user.id, reason, details);
      showMessage(t('report.sent'), undefined, () => router.back());
    } catch (e) {
      showMessage(t('common.error'), errorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen>
      <Txt variant="heading">{t('report.intro', { name: name ?? '' })}</Txt>
      <View style={styles.wrap}>
        {REPORT_REASONS.map((r) => (
          <Chip key={r} label={t(`reason.${r}`)} selected={reason === r} onPress={() => setReason(r)} />
        ))}
      </View>
      {reason === 'dauerhaft_geschlossen' ? (
        <Txt variant="caption" tone="muted">
          ℹ️ {t('report.closedHint')}
        </Txt>
      ) : null}
      <TextField
        label={t('report.details')}
        value={details}
        onChangeText={setDetails}
        placeholder={t('report.detailsPlaceholder')}
        multiline
        maxLength={500}
        style={styles.details}
      />
      <Button title={t('report.send')} onPress={send} loading={busy} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  details: { minHeight: 90, textAlignVertical: 'top' },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
});
