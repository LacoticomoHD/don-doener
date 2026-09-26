export interface Palette {
  background: string;
  surface: string;
  surfaceMuted: string;
  border: string;
  text: string;
  textMuted: string;
  primary: string;
  primaryPressed: string;
  onPrimary: string;
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

/** Warme Palette: Paprika-Rot als Marke, Gold für Sterne. */
export const lightTheme: Theme = {
  dark: false,
  colors: {
    background: '#FAF7F2',
    surface: '#FFFFFF',
    surfaceMuted: '#F1EAE0',
    border: '#E3DACC',
    text: '#1F1B16',
    textMuted: '#6B6258',
    primary: '#C0392B',
    primaryPressed: '#A93226',
    onPrimary: '#FFFFFF',
    accent: '#D35400',
    star: '#F5A623',
    starEmpty: '#D8CFC2',
    success: '#2E7D32',
    danger: '#C62828',
    warning: '#B26A00',
    overlay: 'rgba(0,0,0,0.35)',
  },
};

export const darkTheme: Theme = {
  dark: true,
  colors: {
    background: '#17130F',
    surface: '#221D17',
    surfaceMuted: '#2E2820',
    border: '#3A332A',
    text: '#F5EFE6',
    textMuted: '#A99F91',
    primary: '#E74C3C',
    primaryPressed: '#CF4436',
    onPrimary: '#FFFFFF',
    accent: '#F39C12',
    star: '#F5A623',
    starEmpty: '#4A4238',
    success: '#66BB6A',
    danger: '#EF5350',
    warning: '#FFB74D',
    overlay: 'rgba(0,0,0,0.55)',
  },
};

/** Marken-Verlauf für Kopfbereiche („Glut"). */
export const GLUT_GRADIENT = ['#C0392B', '#D35400', '#E67E22'] as const;

export const space = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 } as const;
export const radius = { sm: 8, md: 12, lg: 16, xl: 24, pill: 999 } as const;

/** Balkenfarbe je Bewertung: stark = grün, solide = orange, schwach = rot. */
export function scoreColor(value: number, palette: Palette): string {
  if (value >= 4.25) return palette.success;
  if (value >= 3.25) return palette.accent;
  return palette.danger;
}
