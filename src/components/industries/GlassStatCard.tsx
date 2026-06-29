import type { CSSProperties } from 'react';

import { accentTextVars } from './accentContrast';

interface GlassStatCardProps {
  value: string;
  label: string;
  accentColor?: string;
}

export function GlassStatCard({ value, label, accentColor = '#2490ed' }: GlassStatCardProps) {
  const accent = accentTextVars(accentColor, 'large');
  return (
    <div className="rounded-2xl border border-slate-200/90 bg-white px-4 py-5 text-center shadow-[0_16px_48px_-28px_rgba(15,23,42,0.12)] dark:border-white/[0.08] dark:bg-gradient-to-b dark:from-white/[0.07] dark:to-white/[0.02] dark:shadow-[0_16px_48px_-28px_rgba(0,0,0,0.8)]">
      <p
        className="text-2xl font-bold tracking-tight text-[color:var(--carsi-accent-l)] dark:text-[color:var(--carsi-accent-d)]"
        style={{ '--carsi-accent-l': accent.light, '--carsi-accent-d': accent.dark } as CSSProperties}
      >
        {value}
      </p>
      <p className="mt-1 text-xs font-medium tracking-wide text-slate-500 uppercase dark:text-white/55">
        {label}
      </p>
    </div>
  );
}
