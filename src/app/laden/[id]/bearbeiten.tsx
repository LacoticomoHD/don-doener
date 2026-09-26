import { router, useLocalSearchParams } from 'expo-router';

import { ShopForm } from '@/components/ShopForm';
import { LoadingView, MessageView, Screen } from '@/components/ui';
import { useI18n } from '@/i18n/I18nProvider';
import { fetchShopDetail, updateShop } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { showMessage } from '@/lib/dialog';
import { useFocusedAsync } from '@/lib/useAsync';

export default function EditShopScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t } = useI18n();
  const { user } = useAuth();
  const shop = useFocusedAsync(() => fetchShopDetail(id), [id]);

  if (!user) {
    return (
      <MessageView icon="🔒" message={t('auth.loginRequired')} actionLabel={t('auth.login')} onAction={() => router.replace('/login')} />
    );
  }
  if (shop.loading && !shop.data) return <LoadingView />;
  if (!shop.data) return <MessageView icon="⚠️" message={shop.error ? t('common.loadError') : t('detail.notFound')} />;

  return (
    <Screen>
      <ShopForm
        initial={shop.data}
        submitLabel={t('form.save')}
        onSubmit={async (input) => {
          await updateShop(id, input);
          showMessage(t('form.updated'), undefined, () => router.back());
        }}
      />
    </Screen>
  );
}
