import {
  coachingCard,
  coachingCardTitle,
  coachingMuted,
} from '@/components/coaching-portal/coaching-ui';
import type { CoachingHomeMonthSummary } from '@/lib/coaching-portal/coaching-home-month-summary';

const TONE_RING: Record<CoachingHomeMonthSummary['tone'], string> = {
  neutral: 'ring-white/10',
  good: 'ring-emerald-500/25',
  attention: 'ring-amber-500/25',
};

export function CoachingMonthSummaryCard({
  summary,
  testId = 'coaching-month-summary',
}: {
  summary: CoachingHomeMonthSummary;
  testId?: string;
}) {
  return (
    <section
      className={`${coachingCard} ${TONE_RING[summary.tone]} lg:col-span-2`}
      data-testid={testId}
    >
      <h2 className={coachingCardTitle}>{summary.headline}</h2>
      <ul className={`mt-3 space-y-2 text-sm ${coachingMuted}`}>
        {summary.lines.map((line) => (
          <li key={line}>{line}</li>
        ))}
      </ul>
    </section>
  );
}