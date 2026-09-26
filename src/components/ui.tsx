import { forwardRef, useState, type ReactNode } from 'react';
import {
  ActivityIndicator,
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
import { radius, space, type Palette } from '@/theme/tokens';

// ---------------------------------------------------------------------------
// Text
// ---------------------------------------------------------------------------

type Variant = 'title' | 'heading' | 'body' | 'label' | 'caption';
type Tone = 'default' | 'muted' | 'primary' | 'danger' | 'success' | 'accent' | 'onPrimary';

const VARIANTS: Record<Variant, TextStyle> = {
  title: { fontSize: 24, fontWeight: '800', letterSpacing: -0.3 },
  heading: { fontSize: 17, fontWeight: '700' },
  body: { fontSize: 15, lineHeight: 21 },
  label: { fontSize: 14, fontWeight: '600' },
  caption: { fontSize: 12.5, lineHeight: 17 },
};

function toneColor(tone: Tone, c: Palette): string {
  switch (tone) {
    case 'muted':
      return c.textMuted;
    case 'primary':
      return c.primary;
    case 'danger':
      return c.danger;
    case 'success':
      return c.success;
    case 'accent':
      return c.accent;
    case 'onPrimary':
      return c.onPrimary;
    default:
      return c.text;
  }
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

export function Card({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  const { theme } = useTheme();
  return (
    <View style={[styles.card, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }, style]}>
      {children}
    </View>
  );
}

export function Section({ title, right, children }: { title: string; right?: ReactNode; children: ReactNode }) {
  return (
    <Card>
      <View style={styles.sectionHeader}>
        <Txt variant="heading" style={styles.flex}>
          {title}
        </Txt>
        {right}
      </View>
      {children}
    </Card>
  );
}

export function Row({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  return <View style={[styles.row, style]}>{children}</View>;
}

// ---------------------------------------------------------------------------
// Buttons
// ---------------------------------------------------------------------------

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';

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
  icon?: string;
  style?: StyleProp<ViewStyle>;
  compact?: boolean;
}) {
  const { theme } = useTheme();
  const c = theme.colors;
  const bg: Record<ButtonVariant, string> = {
    primary: c.primary,
    secondary: c.surfaceMuted,
    ghost: 'transparent',
    danger: 'transparent',
  };
  const fg: Record<ButtonVariant, string> = {
    primary: c.onPrimary,
    secondary: c.text,
    ghost: c.primary,
    danger: c.danger,
  };
  const inactive = disabled || loading;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: inactive, busy: loading }}
      onPress={onPress}
      disabled={inactive}
      style={({ pressed }) => [
        styles.button,
        compact && styles.buttonCompact,
        {
          backgroundColor: variant === 'primary' && pressed ? c.primaryPressed : bg[variant],
          borderColor: variant === 'danger' ? c.danger : 'transparent',
          borderWidth: variant === 'danger' ? 1 : 0,
          opacity: inactive ? 0.6 : pressed && variant !== 'primary' ? 0.7 : 1,
        },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={fg[variant]} />
      ) : (
        <Text style={[styles.buttonText, compact && styles.buttonTextCompact, { color: fg[variant] }]}>
          {icon ? `${icon}  ` : ''}
          {title}
        </Text>
      )}
    </Pressable>
  );
}

/** Auswahl-Chip, z. B. für Filter, Sortierung oder Ja/Nein-Fragen. */
export function Chip({
  label,
  selected = false,
  onPress,
  tone = 'primary',
  style,
}: {
  label: string;
  selected?: boolean;
  onPress?: () => void;
  tone?: 'primary' | 'success' | 'danger';
  style?: StyleProp<ViewStyle>;
}) {
  const { theme } = useTheme();
  const c = theme.colors;
  const active = { primary: c.primary, success: c.success, danger: c.danger }[tone];
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={onPress}
      disabled={!onPress}
      style={({ pressed }) => [
        styles.chip,
        {
          backgroundColor: selected ? active : c.surface,
          borderColor: selected ? active : c.border,
          opacity: pressed ? 0.75 : 1,
        },
        style,
      ]}
    >
      <Text style={[styles.chipText, { color: selected ? c.onPrimary : c.text }]}>{label}</Text>
    </Pressable>
  );
}

/** Zeile mit Pfeil, z. B. im Profil. */
export function LinkRow({ label, onPress, icon }: { label: string; onPress: () => void; icon?: string }) {
  const { theme } = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [
        styles.linkRow,
        { backgroundColor: theme.colors.surface, borderColor: theme.colors.border, opacity: pressed ? 0.7 : 1 },
      ]}
    >
      <Txt variant="label" style={styles.flex}>
        {icon ? `${icon}  ` : ''}
        {label}
      </Txt>
      <Txt tone="muted">›</Txt>
    </Pressable>
  );
}

// ---------------------------------------------------------------------------
// Eingabe
// ---------------------------------------------------------------------------

export const TextField = forwardRef<
  TextInput,
  TextInputProps & { label?: string; hint?: string; secure?: boolean; containerStyle?: StyleProp<ViewStyle> }
>(function TextField({ label, hint, secure, containerStyle, style, ...rest }, ref) {
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
          style={[styles.input, { color: c.text }, style]}
        />
        {secure ? (
          <Pressable onPress={() => setVisible((v) => !v)} hitSlop={10} accessibilityLabel="Passwort anzeigen">
            <Text style={{ fontSize: 16 }}>{visible ? '🙈' : '👁️'}</Text>
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
  button: {
    alignItems: 'center',
    borderRadius: radius.md,
    justifyContent: 'center',
    minHeight: 50,
    paddingHorizontal: space.lg,
  },
  buttonCompact: { minHeight: 38, paddingHorizontal: space.md },
  buttonText: { fontSize: 16, fontWeight: '700' },
  buttonTextCompact: { fontSize: 14 },
  card: { borderRadius: radius.lg, borderWidth: 1, gap: space.sm, padding: space.lg },
  center: { alignItems: 'center', flex: 1, justifyContent: 'center' },
  chip: {
    borderRadius: radius.pill,
    borderWidth: 1,
    paddingHorizontal: 13,
    paddingVertical: 8,
  },
  chipText: { fontSize: 14, fontWeight: '600' },
  field: { gap: 6 },
  fieldHint: { marginTop: 2 },
  fieldLabel: { marginLeft: 2 },
  flex: { flex: 1 },
  input: { flex: 1, fontSize: 16, paddingVertical: 12 },
  inputWrap: {
    alignItems: 'center',
    borderRadius: radius.md,
    borderWidth: 1.5,
    flexDirection: 'row',
    gap: space.sm,
    paddingHorizontal: 14,
  },
  linkRow: {
    alignItems: 'center',
    borderRadius: radius.md,
    borderWidth: 1,
    flexDirection: 'row',
    paddingHorizontal: space.lg,
    paddingVertical: 15,
  },
  message: { gap: space.lg, padding: space.xxl },
  messageIcon: { fontSize: 44 },
  messageText: { textAlign: 'center' },
  row: { alignItems: 'center', flexDirection: 'row', gap: space.sm },
  screenContent: { gap: space.md, padding: space.lg, paddingBottom: 48 },
  sectionHeader: { alignItems: 'center', flexDirection: 'row', gap: space.sm, marginBottom: 2 },
});
