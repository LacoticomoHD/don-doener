import { useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useI18n } from '@/i18n/I18nProvider';
import { useFilters } from '@/lib/filters';
import { useTheme } from '@/theme/ThemeProvider';
import { radius, space } from '@/theme/tokens';
import { SHOP_FEATURE_ICONS, SHOP_FEATURES } from '@/types';

import { Button, Chip, Txt } from './ui';

/** Horizontale Schnellfilter + Knopf für alle Besonderheiten. */
export function FilterBar({ inset = space.lg }: { inset?: number }) {
  const { t } = useI18n();
  const filters = useFilters();
  const [open, setOpen] = useState(false);
  const featureCount = filters.features.length;

  return (
    <>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={[styles.bar, { paddingHorizontal: inset }]}
        keyboardShouldPersistTaps="handled"
      >
        <Chip
          icon="options"
          label={featureCount ? `${t('filter.title')} · ${featureCount}` : t('filter.title')}
          selected={featureCount > 0}
          tone="primary"
          onPress={() => setOpen(true)}
        />
        <Chip icon="time" label={t('filter.openNow')} selected={filters.openNow} onPress={() => filters.setOpenNow(!filters.openNow)} />
        <Chip icon="star" label={t('filter.rated')} selected={filters.ratedOnly} onPress={() => filters.setRatedOnly(!filters.ratedOnly)} />
        {filters.features.map((f) => (
          <Chip
            key={f}
            icon="close"
            label={`${SHOP_FEATURE_ICONS[f]} ${t(`feature.${f}`)}`}
            selected
            onPress={() => filters.toggleFeature(f)}
          />
        ))}
      </ScrollView>
      <FilterSheet visible={open} onClose={() => setOpen(false)} />
    </>
  );
}

function FilterSheet({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const { theme } = useTheme();
  const { t } = useI18n();
  const filters = useFilters();
  const insets = useSafeAreaInsets();
  const c = theme.colors;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={[styles.backdrop, { backgroundColor: c.overlay }]} onPress={onClose} />
      <View style={[styles.sheet, { backgroundColor: c.background, borderColor: c.border, paddingBottom: insets.bottom + space.lg }]}>
        <View style={[styles.handle, { backgroundColor: c.border }]} />
        <Txt variant="title">{t('filter.features')}</Txt>
        <View style={styles.wrap}>
          {SHOP_FEATURES.map((f) => (
            <Chip
              key={f}
              label={`${SHOP_FEATURE_ICONS[f]} ${t(`feature.${f}`)}`}
              selected={filters.features.includes(f)}
              onPress={() => filters.toggleFeature(f)}
            />
          ))}
        </View>
        <View style={styles.actions}>
          <Button title={t('filter.reset')} variant="plain" onPress={filters.reset} style={styles.flex} />
          <Button title={t('filter.apply')} onPress={onClose} style={styles.flex} />
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  actions: { flexDirection: 'row', gap: space.md, marginTop: space.sm },
  backdrop: { flex: 1 },
  bar: { gap: space.sm, paddingVertical: space.sm },
  flex: { flex: 1 },
  handle: { alignSelf: 'center', borderRadius: 3, height: 5, marginBottom: space.xs, width: 44 },
  sheet: {
    borderBottomWidth: 0,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    borderWidth: 2,
    gap: space.lg,
    padding: space.xl,
  },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
});
