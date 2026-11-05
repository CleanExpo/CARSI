import type { LucideIcon } from 'lucide-react';

import {
  coachingStatLabel,
  coachingStatTile,
  coachingStatToneRing,
  coachingStatValue,
} from '@/components/coaching-portal/coaching-ui';

export type CoachingStatItem = {
  id: string;
  label: string;
  value: string;
  hint?: string;
  tone?: 'neutral' | 'good' | 'warn';
  icon?: LucideIcon;
};

export function CoachingStatGrid({
  items,
  testIdPrefix = 'coaching-stat',
}: {
  items: CoachingStatItem[];
  testIdPrefix?: string;
}) {
  return (
    <div
      className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4"
      role="list"
      aria-label="Summary"
      data-testid={`${testIdPrefix}-grid`}
    >
      {items.map((s) => {
        const Icon = s.icon;
        const tone = s.tone ?? 'neutral';
        return (
          <div
            key={s.id}
            role="listitem"
            data-testid={`${testIdPrefix}-${s.id}`}
            className={`${coachingStatTile} ${coachingStatToneRing(tone)}`}
          >
            <div className="flex items-start justify-between gap-2">
              <p className={coachingStatLabel}>{s.label}</p>
              {Icon ? <Icon className="h-4 w-4 shrink-0 text-sky-400/70" aria-hidden /> : null}
            </div>
            <p className={coachingStatValue}>{s.value}</p>
            {s.hint ? (
              <p className="mt-1 text-[11px] leading-snug text-slate-500">{s.hint}</p>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}
