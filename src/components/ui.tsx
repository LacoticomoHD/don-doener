import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { forwardRef, useState, type ComponentProps, type ReactNode } from 'react';
import {
  ActivityIndicator,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  type ScrollViewProps,
  type StyleProp,
  type TextInputProps,
  type TextProps,
  type TextStyle,
  type ViewStyle,
} from 'react-native';

import { useTheme } from '@/theme/ThemeProvider';
import { fonts, radius, SHADOW_OFFSET, space, type Palette } from '@/theme/tokens';

export type IconName = ComponentProps<typeof Ionicons>['name'];

/** Browser-Fokusrahmen in der Web-Version ausblenden – den Fokus zeigt die Rahmenfarbe.
 *  outlineStyle 'none' fehlt in den RN-Typen, wird von react-native-web aber unterstützt. */
export const noWebOutline = (Platform.OS === 'web' ? { outlineStyle: 'none' } : {}) as TextStyle;

export function Icon({ name, size = 20, color }: { name: IconName; size?: number; color?: string }) {
  const { theme } = useTheme();
  return <Ionicons name={name} size={size} color={color ?? theme.colors.text} />;
}

export function tap() {
  if (Platform.OS !== 'web') Haptics.selectionAsync().catch(() => {});
}

// ---------------------------------------------------------------------------
// Text
// ---------------------------------------------------------------------------

type Variant = 'display' | 'title' | 'heading' | 'body' | 'label' | 'caption';
type Tone = 'default' | 'muted' | 'primary' | 'danger' | 'success' | 'accent' | 'onPrimary' | 'onSecondary';

const VARIANTS: Record<Variant, TextStyle> = {
  display: { fontFamily: fonts.display, fontSize: 34, lineHeight: 38, letterSpacing: -0.8 },
  title: { fontFamily: fonts.display, fontSize: 25, lineHeight: 30, letterSpacing: -0.4 },
  heading: { fontFamily: fonts.heading, fontSize: 19, lineHeight: 24, letterSpacing: -0.2 },
  body: { fontFamily: fonts.body, fontSize: 15.5, lineHeight: 22 },
  label: { fontFamily: fonts.bold, fontSize: 14.5, lineHeight: 19 },
  caption: { fontFamily: fonts.medium, fontSize: 13, lineHeight: 18 },
};

function toneColor(tone: Tone, c: Palette): string {
  return {
    default: c.text,
    muted: c.textMuted,
    primary: c.primary,
    danger: c.danger,
    success: c.success,
    accent: c.accent,
    onPrimary: c.onPrimary,
    onSecondary: c.onSecondary,
  }[tone];
}

export function Txt({
  variant = 'body',
  tone = 'default',
  style,
  ...rest
}: TextProps & { variant?: Variant; tone?: Tone }) {
  const { theme } = useTheme();
  return <Text {...rest} style={[VARIANTS[variant], { color: toneColor(tone, theme.colors) }, style]} />;
}

// ---------------------------------------------------------------------------
// Sticker: Fläche mit dicker Kontur und hartem, versetztem Schatten
// ---------------------------------------------------------------------------

export function Sticker({
  children,
  style,
  containerStyle,
  color,
  shadow = true,
  pressed = false,
  radius: r = radius.lg,
}: {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  /** Stil des äußeren Rahmens (z. B. flex: 1 in Zeilen) */
  containerStyle?: StyleProp<ViewStyle>;
  color?: string;
  shadow?: boolean;
  pressed?: boolean;
  radius?: number;
}) {
  const { theme } = useTheme();
  const c = theme.colors;
  // Beim Drücken rutscht die Fläche auf ihren Schatten – wie ein echter Knopf
  const shift = shadow && pressed ? SHADOW_OFFSET - 1 : 0;
  return (
    <View style={[{ marginRight: shadow ? SHADOW_OFFSET : 0, marginBottom: shadow ? SHADOW_OFFSET : 0 }, containerStyle]}>
      {shadow ? (
        <View
          style={[
            StyleSheet.absoluteFill,
            { backgroundColor: c.ink, borderRadius: r, transform: [{ translateX: SHADOW_OFFSET }, { translateY: SHADOW_OFFSET }] },
          ]}
        />
      ) : null}
      <View
        style={[
          {
            backgroundColor: color ?? c.surface,
            borderColor: c.border,
            borderRadius: r,
            borderWidth: 2,
            transform: [{ translateX: shift }, { translateY: shift }],
          },
          style,
        ]}
      >
        {children}
      </View>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Layout
// ---------------------------------------------------------------------------

export function Screen({ children, contentContainerStyle, ...rest }: ScrollViewProps & { children: ReactNode }) {
  const { theme } = useTheme();
  return (
    <ScrollView
      keyboardShouldPersistTaps="handled"
      automaticallyAdjustKeyboardInsets
      {...rest}
      style={[{ backgroundColor: theme.colors.background }, rest.style]}
      contentContainerStyle={[styles.screenContent, contentContainerStyle]}
    >
      {children}
    </ScrollView>
  );
}

export function Card({ children, style, color }: { children: ReactNode; style?: StyleProp<ViewStyle>; color?: string }) {
  return (
    <Sticker style={[styles.card, style]} color={color}>
      {children}
    </Sticker>
  );
}

export function Section({
  title,
  icon,
  right,
  children,
  color,
}: {
  title: string;
  icon?: IconName;
  right?: ReactNode;
  children: ReactNode;
  color?: string;
}) {
  return (
    <Card color={color}>
      <View style={styles.sectionHeader}>
        {icon ? <Icon name={icon} size={20} /> : null}
        <Txt variant="heading" style={styles.flex}>
          {title}
        </Txt>
        {right}
      </View>
      {children}
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Buttons
// ---------------------------------------------------------------------------

type ButtonVariant = 'primary' | 'secondary' | 'plain' | 'ghost' | 'danger';

export function Button({
  title,
  onPress,
  variant = 'primary',
  loading = false,
  disabled = false,
  icon,
  style,
  compact = false,
}: {
  title: string;
  onPress: () => void;
  variant?: ButtonVariant;
  loading?: boolean;
  disabled?: boolean;
  icon?: IconName;
  style?: StyleProp<ViewStyle>;
  compact?: boolean;
}) {
  const { theme } = useTheme();
  const c = theme.colors;
  const inactive = disabled || loading;
  const bg = { primary: c.primary, secondary: c.secondary, plain: c.surface, ghost: 'transparent', danger: c.surface }[variant];
  const fg = { primary: c.onPrimary, secondary: c.onSecondary, plain: c.text, ghost: c.primary, danger: c.danger }[variant];

  const content = loading ? (
    <ActivityIndicator color={fg} />
  ) : (
    <View style={styles.buttonRow}>
      {icon ? <Ionicons name={icon} size={compact ? 17 : 20} color={fg} /> : null}
      <Text style={[styles.buttonText, compact && styles.buttonTextCompact, { color: fg }]}>{title}</Text>
    </View>
  );

  if (variant === 'ghost') {
    return (
      <Pressable
        accessibilityRole="button"
        onPress={onPress}
        disabled={inactive}
        style={({ pressed }) => [styles.ghost, { opacity: pressed || inactive ? 0.55 : 1 }, style]}
      >
        {content}
      </Pressable>
    );
  }

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: inactive, busy: loading }}
      onPress={() => {
        tap();
        onPress();
      }}
      disabled={inactive}
      style={[{ opacity: inactive ? 0.55 : 1 }, style]}
    >
      {({ pressed }) => (
        <Sticker
          color={bg}
          pressed={pressed}
          radius={radius.pill}
          style={[styles.button, compact && styles.buttonCompact, variant === 'danger' && { borderColor: c.danger }]}
        >
          {content}
        </Sticker>
      )}
    </Pressable>
  );
}

/** Runder Icon-Knopf (Karte, Kopfzeilen). */
export function IconButton({
  icon,
  onPress,
  label,
  color,
  iconColor,
  size = 48,
}: {
  icon: IconName;
  onPress: () => void;
  label: string;
  color?: string;
  iconColor?: string;
  size?: number;
}) {
  const { theme } = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={() => {
        tap();
        onPress();
      }}
      hitSlop={6}
    >
      {({ pressed }) => (
        <Sticker
          pressed={pressed}
          radius={size / 2}
          color={color}
          style={{ alignItems: 'center', height: size, justifyContent: 'center', width: size }}
        >
          <Ionicons name={icon} size={size * 0.46} color={iconColor ?? theme.colors.text} />
        </Sticker>
      )}
    </Pressable>
  );
}

/** Auswahl-Chip, z. B. für Filter, Sortierung oder Ja/Nein-Fragen. */
export function Chip({
  label,
  selected = false,
  onPress,
  tone = 'secondary',
  icon,
  style,
}: {
  label: string;
  selected?: boolean;
  onPress?: () => void;
  tone?: 'primary' | 'secondary' | 'success' | 'danger';
  icon?: IconName;
  style?: StyleProp<ViewStyle>;
}) {
  const { theme } = useTheme();
  const c = theme.colors;
  const active = { primary: c.primary, secondary: c.secondary, success: c.success, danger: c.danger }[tone];
  const fg = selected ? (tone === 'secondary' ? c.onSecondary : c.onPrimary) : c.text;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={
        onPress
          ? () => {
              tap();
              onPress();
            }
          : undefined
      }
      disabled={!onPress}
      style={({ pressed }) => [
        styles.chip,
        {
          backgroundColor: selected ? active : c.surface,
          borderColor: c.border,
          transform: [{ scale: pressed ? 0.96 : 1 }],
        },
        style,
      ]}
    >
      {icon ? <Ionicons name={icon} size={15} color={fg} /> : null}
      <Text style={[styles.chipText, { color: fg }]}>{label}</Text>
    </Pressable>
  );
}

/** Zeile mit Pfeil, z. B. im Profil. */
export function LinkRow({
  label,
  onPress,
  icon,
  hint,
  last = false,
}: {
  label: string;
  onPress: () => void;
  icon: IconName;
  hint?: string;
  last?: boolean;
}) {
  const { theme } = useTheme();
  const c = theme.colors;
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [
        styles.linkRow,
        { borderBottomColor: c.border, borderBottomWidth: last ? 0 : StyleSheet.hairlineWidth, opacity: pressed ? 0.6 : 1 },
      ]}
    >
      <View style={[styles.linkIcon, { backgroundColor: c.surfaceMuted }]}>
        <Ionicons name={icon} size={18} color={c.text} />
      </View>
      <Txt variant="label" style={styles.flex}>
        {label}
      </Txt>
      {hint ? (
        <Txt variant="caption" tone="muted">
          {hint}
        </Txt>
      ) : null}
      <Ionicons name="chevron-forward" size={18} color={c.textMuted} />
    </Pressable>
  );
}

// ---------------------------------------------------------------------------
// Eingabe
// ---------------------------------------------------------------------------

export const TextField = forwardRef<
  TextInput,
  TextInputProps & {
    label?: string;
    hint?: string;
    secure?: boolean;
    icon?: IconName;
    containerStyle?: StyleProp<ViewStyle>;
  }
>(function TextField({ label, hint, secure, icon, containerStyle, style, ...rest }, ref) {
  const { theme } = useTheme();
  const c = theme.colors;
  const [focused, setFocused] = useState(false);
  const [visible, setVisible] = useState(false);
  return (
    <View style={[styles.field, containerStyle]}>
      {label ? (
        <Txt variant="label" style={styles.fieldLabel}>
          {label}
        </Txt>
      ) : null}
      <View
        style={[
          styles.inputWrap,
          { backgroundColor: c.surface, borderColor: focused ? c.primary : c.border },
        ]}
      >
        {icon ? <Ionicons name={icon} size={18} color={c.textMuted} /> : null}
        <TextInput
          ref={ref}
          placeholderTextColor={c.textMuted}
          secureTextEntry={secure && !visible}
          {...rest}
          onFocus={(e) => {
            setFocused(true);
            rest.onFocus?.(e);
          }}
          onBlur={(e) => {
            setFocused(false);
            rest.onBlur?.(e);
          }}
          style={[styles.input, noWebOutline, { color: c.text }, style]}
        />
        {secure ? (
          <Pressable onPress={() => setVisible((v) => !v)} hitSlop={10} accessibilityLabel="Passwort anzeigen">
            <Ionicons name={visible ? 'eye-off-outline' : 'eye-outline'} size={20} color={c.textMuted} />
          </Pressable>
        ) : null}
      </View>
      {hint ? (
        <Txt variant="caption" tone="muted" style={styles.fieldHint}>
          {hint}
        </Txt>
      ) : null}
    </View>
  );
});

// ---------------------------------------------------------------------------
// Zustände
// ---------------------------------------------------------------------------

export function LoadingView() {
  const { theme } = useTheme();
  return (
    <View style={[styles.center, { backgroundColor: theme.colors.background }]}>
      <ActivityIndicator size="large" color={theme.colors.primary} />
    </View>
  );
}

export function MessageView({
  icon,
  message,
  actionLabel,
  onAction,
}: {
  icon?: string;
  message: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  const { theme } = useTheme();
  return (
    <View style={[styles.center, styles.message, { backgroundColor: theme.colors.background }]}>
      {icon ? <Text style={styles.messageIcon}>{icon}</Text> : null}
      <Txt tone="muted" style={styles.messageText}>
        {message}
      </Txt>
      {actionLabel && onAction ? <Button title={actionLabel} onPress={onAction} variant="secondary" /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  button: { alignItems: 'center', justifyContent: 'center', minHeight: 54, paddingHorizontal: space.xl },
  buttonCompact: { minHeight: 40, paddingHorizontal: space.lg },
  buttonRow: { alignItems: 'center', flexDirection: 'row', gap: space.sm, justifyContent: 'center' },
  buttonText: { fontFamily: fonts.heading, fontSize: 17 },
  buttonTextCompact: { fontSize: 15 },
  card: { gap: space.sm, padding: space.lg },
  center: { alignItems: 'center', flex: 1, justifyContent: 'center' },
  chip: {
    alignItems: 'center',
    borderRadius: radius.pill,
    borderWidth: 2,
    flexDirection: 'row',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  chipText: { fontFamily: fonts.bold, fontSize: 14 },
  field: { gap: 6 },
  fieldHint: { marginTop: 2 },
  fieldLabel: { marginLeft: 4 },
  flex: { flex: 1 },
  ghost: { alignItems: 'center', justifyContent: 'center', paddingHorizontal: space.md, paddingVertical: space.sm },
  input: { flex: 1, fontFamily: fonts.medium, fontSize: 16, paddingVertical: 13 },
  inputWrap: {
    alignItems: 'center',
    borderRadius: radius.md,
    borderWidth: 2,
    flexDirection: 'row',
    gap: space.sm,
    paddingHorizontal: 14,
  },
  linkIcon: { alignItems: 'center', borderRadius: 10, height: 34, justifyContent: 'center', width: 34 },
  linkRow: { alignItems: 'center', flexDirection: 'row', gap: space.md, paddingVertical: 12 },
  message: { gap: space.lg, padding: space.xxl },
  messageIcon: { fontSize: 52 },
  messageText: { textAlign: 'center' },
  screenContent: { gap: space.lg, padding: space.lg, paddingBottom: 48 },
  sectionHeader: { alignItems: 'center', flexDirection: 'row', gap: space.sm, marginBottom: 4 },
});
