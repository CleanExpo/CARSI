import type { LucideIcon } from 'lucide-react';
import Link from 'next/link';

import {
  coachingCard,
  coachingCardTitle,
  coachingEyebrow,
  coachingMuted,
  coachingPrimaryBtn,
  coachingSecondaryBtn,
} from '@/components/coaching-portal/coaching-ui';

export function CoachingFeatureSpotlight({
  eyebrow,
  title,
  description,
  primaryHref,
  primaryLabel,
  secondaryHref,
  secondaryLabel,
  icon: Icon,
  tone = 'sky',
  testId,
}: {
  eyebrow: string;
  title: string;
  description: string;
  primaryHref: string;
  primaryLabel: string;
  secondaryHref?: string;
  secondaryLabel?: string;
  icon: LucideIcon;
  tone?: 'sky' | 'emerald';
  testId?: string;
}) {
  const border = tone === 'emerald' ? 'border-emerald-500/20' : 'border-sky-500/20';
  const bg = tone === 'emerald' ? 'from-emerald-950/30' : 'from-sky-950/40';
  return (
    <section
      className={`${coachingCard} mb-4 border ${border} bg-gradient-to-br ${bg} to-[#0a101c]`}
      data-testid={testId}
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex gap-3">
          <Icon className="mt-0.5 h-5 w-5 shrink-0 text-sky-400" aria-hidden />
          <div>
            <p className={coachingEyebrow}>{eyebrow}</p>
            <h2 className={`mt-1 ${coachingCardTitle}`}>{title}</h2>
            <p className={`mt-1 ${coachingMuted}`}>{description}</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href={primaryHref} className={coachingPrimaryBtn}>
            {primaryLabel}
          </Link>
          {secondaryHref && secondaryLabel ? (
            <Link href={secondaryHref} className={coachingSecondaryBtn}>
              {secondaryLabel}
            </Link>
          ) : null}
        </div>
      </div>
    </section>
  );
}
