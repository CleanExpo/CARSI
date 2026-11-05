import type { LucideIcon } from 'lucide-react';

import {
  coachingCard,
  coachingCardTitle,
  coachingMuted,
  coachingPrimaryBtn,
} from '@/components/coaching-portal/coaching-ui';
import Link from 'next/link';

export function CoachingEmptyState({
  icon: Icon,
  title,
  description,
  actionHref,
  actionLabel,
  testId = 'coaching-empty-state',
}: {
  icon: LucideIcon;
  title: string;
  description: string;
  actionHref?: string;
  actionLabel?: string;
  testId?: string;
}) {
  return (
    <section className={`${coachingCard} text-center sm:text-left`} data-testid={testId}>
      <div className="flex flex-col items-center gap-3 sm:flex-row sm:items-start">
        <Icon className="h-8 w-8 shrink-0 text-slate-500" aria-hidden />
        <div className="min-w-0">
          <h2 className={coachingCardTitle}>{title}</h2>
          <p className={`mt-1 ${coachingMuted}`}>{description}</p>
          {actionHref && actionLabel ? (
            <Link href={actionHref} className={`mt-4 inline-flex ${coachingPrimaryBtn}`}>
              {actionLabel}
            </Link>
          ) : null}
        </div>
      </div>
    </section>
  );
}
