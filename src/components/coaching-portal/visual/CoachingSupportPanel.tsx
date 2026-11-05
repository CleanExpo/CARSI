'use client';

import { LifeBuoy, Mail } from 'lucide-react';

import {
  coachingCard,
  coachingCardTitle,
  coachingMuted,
  coachingSecondaryBtn,
} from '@/components/coaching-portal/coaching-ui';
import { openCoachingSupportEmail } from '@/lib/coaching-portal/support-contact';

export function CoachingSupportPanel({
  id,
  title = 'Need help?',
  description = 'If something looks wrong, your website will not load, or you are not sure what to do next, contact the coaching team.',
  mailSubject = 'Business Coaching — marketing pack help',
  tips,
  testId = 'coaching-support-panel',
}: {
  id?: string;
  title?: string;
  description?: string;
  mailSubject?: string;
  tips?: string[];
  testId?: string;
}) {
  return (
    <section
      id={id}
      className={`${coachingCard} border-sky-500/15 bg-[#0c1424]/90`}
      aria-labelledby={id ? `${id}-title` : undefined}
      data-testid={testId}
    >
      <div className="flex gap-3">
        <LifeBuoy className="mt-0.5 h-5 w-5 shrink-0 text-sky-400" aria-hidden />
        <div className="min-w-0 flex-1">
          <h2 id={id ? `${id}-title` : undefined} className={coachingCardTitle}>
            {title}
          </h2>
          <p className={`mt-1 ${coachingMuted}`}>{description}</p>
          {tips && tips.length > 0 ? (
            <ul className={`mt-3 list-inside list-disc space-y-1 ${coachingMuted}`}>
              {tips.map((t) => (
                <li key={t}>{t}</li>
              ))}
            </ul>
          ) : null}
          <button
            type="button"
            className={`mt-4 ${coachingSecondaryBtn} gap-2`}
            onClick={() => openCoachingSupportEmail(mailSubject)}
            data-testid={`${testId}-email`}
          >
            <Mail className="h-4 w-4" aria-hidden />
            Email coaching support
          </button>
        </div>
      </div>
    </section>
  );
}
