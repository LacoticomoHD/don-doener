export interface Palette {
  background: string;
  surface: string;
  surfaceMuted: string;
  /** Konturen und harte Schatten im Sticker-Look */
  ink: string;
  border: string;
  text: string;
  textMuted: string;
  primary: string;
  primaryPressed: string;
  onPrimary: string;
  /** Senf-Gelb – zweite Markenfarbe für Highlights */
  secondary: string;
  onSecondary: string;
  accent: string;
  star: string;
  starEmpty: string;
  success: string;
  danger: string;
  warning: string;
  overlay: string;
}

export interface Theme {
  dark: boolean;
  colors: Palette;
}

/** Bold & verspielt: Paprika-Rot, Senf-Gelb, Creme – mit dunklen Konturen. */
export const lightTheme: Theme = {
  dark: false,
  colors: {
    background: '#FFF4E3',
    surface: '#FFFFFF',
    surfaceMuted: '#FFE7C2',
    ink: '#1C1410',
    border: '#1C1410',
    text: '#1C1410',
    textMuted: '#6E6259',
    primary: '#E8412C',
    primaryPressed: '#CC3521',
    onPrimary: '#FFFFFF',
    secondary: '#FFC93C',
    onSecondary: '#1C1410',
    accent: '#D9480F',
    star: '#FFB800',
    starEmpty: '#E8DCCB',
    success: '#1E9E5A',
    danger: '#D62839',
    warning: '#B26A00',
    overlay: 'rgba(28,20,16,0.45)',
  },
};

export const darkTheme: Theme = {
  dark: true,
  colors: {
    background: '#17110D',
    surface: '#261D17',
    surfaceMuted: '#3A2C20',
    ink: '#000000',
    border: '#5A4636',
    text: '#FFF4E3',
    textMuted: '#BFAE9C',
    primary: '#FF5A43',
    primaryPressed: '#E8412C',
    onPrimary: '#FFFFFF',
    secondary: '#FFC93C',
    onSecondary: '#1C1410',
    accent: '#FF8A3D',
    star: '#FFC93C',
    starEmpty: '#4E3E31',
    success: '#3DD68C',
    danger: '#FF5C6C',
    warning: '#FFB74D',
    overlay: 'rgba(0,0,0,0.6)',
  },
};

export const fonts = {
  display: 'BricolageGrotesque_800ExtraBold',
  heading: 'BricolageGrotesque_700Bold',
  body: 'DMSans_400Regular',
  medium: 'DMSans_500Medium',
  bold: 'DMSans_700Bold',
} as const;

export const space = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 } as const;
export const radius = { sm: 10, md: 14, lg: 20, xl: 28, pill: 999 } as const;

/** Versatz des „harten" Sticker-Schattens. */
export const SHADOW_OFFSET = 4;

/** Balkenfarbe je Bewertung: stark = grün, solide = gelb, schwach = rot. */
export function scoreColor(value: number, palette: Palette): string {
  if (value >= 4.25) return palette.success;
  if (value >= 3.25) return palette.secondary;
  return palette.danger;
}

/** Karten-Marker bleiben unabhängig vom Thema gut sichtbar. */
export const MARKER_COLORS = {
  rated: '#E8412C',
  unrated: '#8D8173',
  open: '#1E9E5A',
  closed: '#D62839',
  selected: '#FFC93C',
} as const;
