import { router } from 'expo-router';

import { MessageView } from '@/components/ui';
import { useI18n } from '@/i18n/I18nProvider';

export default function NotFound() {
  const { t } = useI18n();
  return <MessageView icon="🥙" message={t('detail.notFound')} actionLabel={t('tab.map')} onAction={() => router.replace('/')} />;
}
