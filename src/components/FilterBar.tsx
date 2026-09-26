import { useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useI18n } from '@/i18n/I18nProvider';
import { useFilters } from '@/lib/filters';
import { useTheme } from '@/theme/ThemeProvider';
import { radius, space } from '@/theme/tokens';
import { SHOP_FEATURE_ICONS, SHOP_FEATURES } from '@/types';

import { Button, Chip, Txt } from './ui';

/** Horizontale Schnellfilter + Knopf für alle Besonderheiten (Bottom-Sheet). */
export function FilterBar({ floating = false }: { floating?: boolean }) {
  const { t } = useI18n();
  const filters = useFilters();
  const [open, setOpen] = useState(false);
  const featureCount = filters.features.length;

  return (
    <>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.bar}
        keyboardShouldPersistTaps="handled"
      >
        <Chip
          label={`⚙️ ${t('filter.title')}${featureCount ? ` (${featureCount})` : ''}`}
          selected={featureCount > 0}
          onPress={() => setOpen(true)}
          style={floating && styles.shadow}
        />
        <Chip
          label={`🕒 ${t('filter.openNow')}`}
          selected={filters.openNow}
          onPress={() => filters.setOpenNow(!filters.openNow)}
          style={floating && styles.shadow}
        />
        <Chip
          label={`⭐ ${t('filter.rated')}`}
          selected={filters.ratedOnly}
          onPress={() => filters.setRatedOnly(!filters.ratedOnly)}
          style={floating && styles.shadow}
        />
        {filters.features.map((f) => (
          <Chip
            key={f}
            label={`${SHOP_FEATURE_ICONS[f]} ${t(`feature.${f}`)} ✕`}
            selected
            onPress={() => filters.toggleFeature(f)}
            style={floating && styles.shadow}
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

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={[styles.backdrop, { backgroundColor: theme.colors.overlay }]} onPress={onClose} />
      <View
        style={[
          styles.sheet,
          { backgroundColor: theme.colors.background, paddingBottom: insets.bottom + space.lg },
        ]}
      >
        <View style={[styles.handle, { backgroundColor: theme.colors.border }]} />
        <Txt variant="heading">{t('filter.features')}</Txt>
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
          <Button title={t('filter.reset')} variant="secondary" onPress={filters.reset} style={styles.flex} />
          <Button title={t('filter.apply')} onPress={onClose} style={styles.flex} />
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  actions: { flexDirection: 'row', gap: space.md, marginTop: space.sm },
  backdrop: { flex: 1 },
  bar: { gap: space.sm, paddingHorizontal: space.lg, paddingVertical: space.sm },
  flex: { flex: 1 },
  handle: { alignSelf: 'center', borderRadius: 3, height: 5, marginBottom: space.sm, width: 44 },
  shadow: {
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.18,
    shadowRadius: 3,
  },
  sheet: {
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    gap: space.md,
    padding: space.lg,
  },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
});
