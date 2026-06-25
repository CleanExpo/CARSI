'use client';

import { useEffect } from 'react';

/**
 * Dashboard routes use a fixed light workspace. Strip global `.dark` while mounted
 * so shadcn tokens and page content stay readable on the light shell.
 */
export function DashboardLightTheme() {
  useEffect(() => {
    const root = document.documentElement;
    const hadDark = root.classList.contains('dark');
    root.classList.remove('dark');
    root.style.colorScheme = 'light';

    return () => {
      root.style.colorScheme = '';
      if (hadDark) root.classList.add('dark');
    };
  }, []);

  return null;
}
