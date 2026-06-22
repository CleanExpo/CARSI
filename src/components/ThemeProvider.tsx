'use client';

import { createContext, useContext, useEffect, useState } from 'react';

import { apiClient } from '@/lib/api/client';

export type Theme = 'light' | 'dark';

const STORAGE_KEY = 'carsi-theme';

const ThemeContext = createContext<{ theme: Theme; toggle: () => void; setTheme: (t: Theme) => void }>({
  theme: 'light',
  toggle: () => {},
  setTheme: () => {},
});

function readStoredTheme(): Theme | null {
  if (typeof window === 'undefined') return null;
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored === 'light' || stored === 'dark' ? stored : null;
  } catch {
    return null;
  }
}

export function ThemeProvider({
  children,
  initialTheme = 'light',
}: {
  children: React.ReactNode;
  initialTheme?: Theme;
}) {
  const [theme, setThemeState] = useState<Theme>(initialTheme);

  useEffect(() => {
    const stored = readStoredTheme();
    if (stored) setThemeState(stored);
  }, []);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
    try {
      localStorage.setItem(STORAGE_KEY, theme);
    } catch {
      /* private mode */
    }
  }, [theme]);

  const setTheme = (next: Theme) => setThemeState(next);

  const toggle = async () => {
    const next: Theme = theme === 'light' ? 'dark' : 'light';
    setThemeState(next);
    apiClient.patch('/api/lms/auth/me', { theme_preference: next }).catch(() => {});
  };

  return (
    <ThemeContext.Provider value={{ theme, toggle, setTheme }}>{children}</ThemeContext.Provider>
  );
}

export const useTheme = () => useContext(ThemeContext);
