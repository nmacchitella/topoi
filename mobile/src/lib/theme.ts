import { createContext, useContext } from 'react';

export type ThemeMode = 'light' | 'dark' | 'system';

export interface Theme {
  mode: ThemeMode;
  isDark: boolean;
  colors: {
    background: string;
    surface: string;
    surfaceHover: string;
    border: string;
    text: string;
    textSecondary: string;
    textMuted: string;
    primary: string;
    primaryHover: string;
    error: string;
    success: string;
    warning: string;
  };
}

export const lightTheme: Theme = {
  mode: 'light',
  isDark: false,
  colors: {
    background: '#faf9f5',
    surface: '#ffffff',
    surfaceHover: '#f5f5f5',
    border: '#e5e5e5',
    text: '#1a1a1a',
    textSecondary: '#666666',
    textMuted: '#999999',
    primary: '#DE7356',
    primaryHover: '#c96548',
    error: '#EF4444',
    success: '#22C55E',
    warning: '#F59E0B',
  },
};

export const darkTheme: Theme = {
  mode: 'dark',
  isDark: true,
  colors: {
    background: '#252523',
    surface: '#3a3a38',
    surfaceHover: '#4a4a48',
    border: '#4a4a48',
    text: '#faf9f5',
    textSecondary: '#a3a3a3',
    textMuted: '#737373',
    primary: '#DE7356',
    primaryHover: '#e88a71',
    error: '#EF4444',
    success: '#22C55E',
    warning: '#F59E0B',
  },
};

interface ThemeContextType {
  theme: Theme;
  themeMode: ThemeMode;
  setThemeMode: (mode: ThemeMode) => void;
  toggleTheme: () => void;
}

export const ThemeContext = createContext<ThemeContextType>({
  theme: darkTheme,
  themeMode: 'dark',
  setThemeMode: () => {},
  toggleTheme: () => {},
});

export const useTheme = () => useContext(ThemeContext);
