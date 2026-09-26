import * as Haptics from 'expo-haptics';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';

import { useTheme } from '@/theme/ThemeProvider';

/** Anzeige (mit halben Sternen) oder Eingabe (1–5) von Sternen. */
export function StarRating({
  value,
  onChange,
  size = 18,
  label,
}: {
  value: number | null;
  onChange?: (value: number) => void;
  size?: number;
  /** Barrierefreiheit: Name der Kategorie */
  label?: string;
}) {
  const { theme } = useTheme();
  const v = value ?? 0;

  return (
    <View
      style={styles.row}
      accessibilityRole={onChange ? 'adjustable' : 'image'}
      accessibilityLabel={label ? `${label}: ${v} / 5` : `${v} / 5`}
    >
      {[1, 2, 3, 4, 5].map((star) => {
        // Füllgrad dieses Sterns in 0, 0.5 oder 1
        const fill = v >= star - 0.25 ? 1 : v >= star - 0.75 ? 0.5 : 0;
        const glyph = (
          <View style={{ width: size * 1.05, height: size * 1.2 }}>
            <Text style={[styles.glyph, { fontSize: size, color: theme.colors.starEmpty }]}>★</Text>
            {fill > 0 ? (
              <View style={[styles.overlay, { width: `${fill * 100}%` }]}>
                <Text style={[styles.glyph, { fontSize: size, color: theme.colors.star }]}>★</Text>
              </View>
            ) : null}
          </View>
        );
        if (!onChange) return <View key={star}>{glyph}</View>;
        return (
          <Pressable
            key={star}
            hitSlop={6}
            accessibilityRole="button"
            accessibilityLabel={`${star}`}
            onPress={() => {
              if (Platform.OS !== 'web') Haptics.selectionAsync().catch(() => {});
              onChange(star);
            }}
          >
            {glyph}
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  glyph: { includeFontPadding: false },
  overlay: { left: 0, overflow: 'hidden', position: 'absolute', top: 0 },
  row: { alignItems: 'center', flexDirection: 'row' },
});
