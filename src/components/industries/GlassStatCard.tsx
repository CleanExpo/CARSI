import type { CSSProperties } from 'react';

import { accentTextVars } from './accentContrast';

interface GlassStatCardProps {
  value: string;
  label: string;
  accentColor?: string;
  sourceHref?: string;
  sourceLabel?: string;
}

export function GlassStatCard({
  value,
  label,
  accentColor = '#2490ed',
  sourceHref,
  sourceLabel,
}: GlassStatCardProps) {
  const accent = accentTextVars(accentColor, 'large');
  return (
    <div className="rounded-2xl border border-slate-200/90 bg-white/90 px-5 py-4 shadow-[0_18px_46px_-32px_rgba(15,23,42,0.35)] backdrop-blur">
      <div className="flex items-start justify-between gap-5">
        <div>
          <p className="text-[10px] font-semibold tracking-[0.14em] text-slate-500 uppercase">
            {label}
          </p>
          {sourceHref && sourceLabel ? (
            <a
              href={sourceHref}
              target="_blank"
              rel="noreferrer"
              className="mt-1.5 inline-block text-[11px] font-medium text-slate-500 underline decoration-slate-300 underline-offset-2 hover:text-slate-800"
            >
              {sourceLabel}
            </a>
          ) : null}
        </div>
        <p
          className="shrink-0 font-[family-name:var(--font-display)] text-2xl font-semibold tracking-[-0.025em] text-[color:var(--carsi-accent-l)]"
          style={{ '--carsi-accent-l': accent.light } as CSSProperties}
        >
          {value}
        </p>
      </div>
    </div>
  );
}
