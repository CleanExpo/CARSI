'use client';

import { Moon, Sun } from 'lucide-react';

import { useTheme } from '@/components/ThemeProvider';

export function PublicThemeToggle({ variant = 'chrome' }: { variant?: 'chrome' | 'light' }) {
  const { theme, toggle } = useTheme();

  const className =
    variant === 'chrome'
      ? 'flex h-10 w-10 items-center justify-center rounded-lg border border-white/15 bg-white/5 text-white/80 transition-colors duration-200 hover:bg-white/10 hover:text-white focus-visible:ring-2 focus-visible:ring-[#2490ed]/45 focus-visible:outline-none'
      : 'flex h-10 w-10 items-center justify-center rounded-lg border border-slate-200 bg-slate-50 text-slate-700 transition-colors duration-200 hover:bg-slate-100 hover:text-slate-900 focus-visible:ring-2 focus-visible:ring-[#2490ed]/40 focus-visible:outline-none';

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={theme === 'light' ? 'Switch to dark mode' : 'Switch to light mode'}
      className={className}
    >
      {theme === 'light' ? <Moon className="h-4 w-4" aria-hidden /> : <Sun className="h-4 w-4" aria-hidden />}
    </button>
  );
}
