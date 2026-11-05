import type { ReactNode } from 'react';

import { coachingCard, coachingCardTitle } from '@/components/coaching-portal/coaching-ui';

export function CoachingSection({
  id,
  title,
  children,
  className = '',
  testId,
}: {
  id?: string;
  title: string;
  children: ReactNode;
  className?: string;
  testId?: string;
}) {
  return (
    <section
      id={id}
      className={`${coachingCard} scroll-mt-28 ${className}`}
      aria-labelledby={id ? `${id}-title` : undefined}
      data-testid={testId}
    >
      <h2 id={id ? `${id}-title` : undefined} className={coachingCardTitle}>
        {title}
      </h2>
      <div className="mt-4">{children}</div>
    </section>
  );
}
