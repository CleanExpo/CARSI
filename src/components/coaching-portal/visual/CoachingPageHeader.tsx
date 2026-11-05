import type { ReactNode } from 'react';

import {
  coachingEyebrow,
  coachingHeroBand,
  coachingMuted,
} from '@/components/coaching-portal/coaching-ui';

export function CoachingPageHeader({
  eyebrow,
  title,
  description,
  children,
  testId = 'coaching-page-header',
}: {
  eyebrow: string;
  title: string;
  description: string;
  children?: ReactNode;
  testId?: string;
}) {
  return (
    <header className={`${coachingHeroBand} mb-6`} data-testid={testId}>
      <p className={coachingEyebrow}>{eyebrow}</p>
      <h1 className="mt-2 text-2xl font-semibold tracking-tight text-white sm:text-[1.75rem]">
        {title}
      </h1>
      <p className={`mt-3 max-w-2xl ${coachingMuted}`}>{description}</p>
      {children ? <div className="mt-4">{children}</div> : null}
    </header>
  );
}
