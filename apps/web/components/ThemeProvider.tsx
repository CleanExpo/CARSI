'use client';
import { createContext, useContext, useEffect, useState } from 'react';
import { apiClient } from '@/lib/api/client';

type Theme = 'light' | 'dark';

const ThemeContext = createContext<{ theme: Theme; toggle: () => void }>({
  theme: 'light',
  toggle: () => {},
});

export function ThemeProvider({
  children,
  initialTheme = 'light',
}: {
  children: React.ReactNode;
  initialTheme?: Theme;
}) {
  const [theme, setTheme] = useState<Theme>(initialTheme);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
  }, [theme]);

  const toggle = async () => {
    const next: Theme = theme === 'light' ? 'dark' : 'light';
    setTheme(next);
    // Persist to API (fire-and-forget — theme still toggles locally if this fails)
    apiClient.patch('/api/lms/auth/me', { theme_preference: next }).catch(() => {});
  };

  return <ThemeContext.Provider value={{ theme, toggle }}>{children}</ThemeContext.Provider>;
}

export const useTheme = () => useContext(ThemeContext);
