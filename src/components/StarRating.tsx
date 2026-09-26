import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, View } from 'react-native';

import { useTheme } from '@/theme/ThemeProvider';

import { tap } from './ui';

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
  const interactive = !!onChange;

  return (
    <View
      style={[styles.row, interactive && styles.spread]}
      accessibilityRole={interactive ? 'adjustable' : 'image'}
      accessibilityLabel={label ? `${label}: ${v} / 5` : `${v} / 5`}
    >
      {[1, 2, 3, 4, 5].map((star) => {
        const name = v >= star - 0.25 ? 'star' : v >= star - 0.75 ? 'star-half' : interactive ? 'star' : 'star-outline';
        const filled = v >= star - 0.75;
        const icon = (
          <Ionicons name={name} size={size} color={filled ? theme.colors.star : theme.colors.starEmpty} />
        );
        if (!interactive) return <View key={star}>{icon}</View>;
        return (
          <Pressable
            key={star}
            hitSlop={6}
            accessibilityRole="button"
            accessibilityLabel={`${star}`}
            onPress={() => {
              tap();
              onChange(star);
            }}
            style={({ pressed }) => ({ transform: [{ scale: pressed ? 0.85 : v === star ? 1.12 : 1 }] })}
          >
            {icon}
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { alignItems: 'center', flexDirection: 'row', gap: 1 },
  spread: { justifyContent: 'space-between' },
});
