import { Ionicons } from '@expo/vector-icons';
import { Modal, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useI18n } from '@/i18n/I18nProvider';
import { openDirections, TRAVEL_MODES } from '@/lib/directions';
import { useTheme } from '@/theme/ThemeProvider';
import { radius, space } from '@/theme/tokens';
import type { Coords } from '@/types';

import { Button, Sticker, Txt, type IconName } from './ui';

const MODE_ICONS: Record<(typeof TRAVEL_MODES)[number]['key'], IconName> = {
  walking: 'walk',
  bicycling: 'bicycle',
  transit: 'bus',
  driving: 'car',
};

/** Auswahl des Verkehrsmittels für die Navigation. */
export function RouteSheet({ target, onClose }: { target: Coords | null; onClose: () => void }) {
  const { theme } = useTheme();
  const { t } = useI18n();
  const insets = useSafeAreaInsets();
  const c = theme.colors;

  return (
    <Modal visible={target != null} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={[styles.backdrop, { backgroundColor: c.overlay }]} onPress={onClose} />
      <View style={[styles.sheet, { backgroundColor: c.background, borderColor: c.border, paddingBottom: insets.bottom + space.lg }]}>
        <Txt variant="title">{t('detail.route')}</Txt>
        <View style={styles.grid}>
          {TRAVEL_MODES.map((m) => (
            <Pressable
              key={m.key}
              style={styles.cell}
              onPress={() => {
                if (target) openDirections(target, m.key);
                onClose();
              }}
            >
              {({ pressed }) => (
                <Sticker pressed={pressed} style={styles.mode} color={c.surface}>
                  <Ionicons name={MODE_ICONS[m.key]} size={30} color={c.primary} />
                  <Txt variant="label">{t(`route.${m.key}`)}</Txt>
                </Sticker>
              )}
            </Pressable>
          ))}
        </View>
        <Button title={t('common.cancel')} variant="ghost" onPress={onClose} />
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1 },
  cell: { flexBasis: '46%', flexGrow: 1 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: space.md },
  mode: { alignItems: 'center', gap: space.sm, paddingVertical: space.lg },
  sheet: {
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    borderWidth: 2,
    borderBottomWidth: 0,
    gap: space.lg,
    padding: space.xl,
  },
});
