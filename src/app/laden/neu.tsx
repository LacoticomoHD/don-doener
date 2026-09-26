import { router } from 'expo-router';

import { ShopForm } from '@/components/ShopForm';
import { MessageView, Screen } from '@/components/ui';
import { useI18n } from '@/i18n/I18nProvider';
import { createShop } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { showMessage } from '@/lib/dialog';

export default function NewShopScreen() {
  const { t } = useI18n();
  const { user } = useAuth();

  if (!user) {
    return (
      <MessageView icon="🔒" message={t('auth.loginRequired')} actionLabel={t('auth.login')} onAction={() => router.replace('/login')} />
    );
  }

  return (
    <Screen>
      <ShopForm
        submitLabel={t('form.create')}
        onSubmit={async (input) => {
          const id = await createShop(input, user.id);
          showMessage(t('form.created'), undefined, () =>
            router.replace({ pathname: '/laden/[id]', params: { id } })
          );
        }}
      />
    </Screen>
  );
}
