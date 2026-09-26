import { createContext, useContext, useMemo, useState, type ReactNode } from 'react';
import { useColorScheme } from 'react-native';

import { readSetting, writeSetting } from '@/lib/storage';

import { darkTheme, lightTheme, type Theme } from './tokens';

export type ThemeMode = 'system' | 'light' | 'dark';

const STORAGE_KEY = 'dondoener.themeMode';

interface ThemeContextValue {
  theme: Theme;
  mode: ThemeMode;
  setMode: (mode: ThemeMode) => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

function initialMode(): ThemeMode {
  const stored = readSetting(STORAGE_KEY);
  return stored === 'light' || stored === 'dark' ? stored : 'system';
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const systemScheme = useColorScheme();
  const [mode, setModeState] = useState<ThemeMode>(initialMode);

  const value = useMemo<ThemeContextValue>(() => {
    const effective = mode === 'system' ? (systemScheme ?? 'light') : mode;
    return {
      theme: effective === 'dark' ? darkTheme : lightTheme,
      mode,
      setMode: (next) => {
        setModeState(next);
        writeSetting(STORAGE_KEY, next);
      },
    };
  }, [mode, systemScheme]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme außerhalb von ThemeProvider');
  return ctx;
}
