import { ArrowRight, CalendarClock, CircleCheckBig, ListTodo, Megaphone, TrendingUp } from 'lucide-react';
import Link from 'next/link';

import {
  coachingCard,
  coachingCardTitle,
  coachingMuted,
  coachingPrimaryBtn,
  coachingProgressFill,
  coachingProgressFillStyle,
  coachingProgressTrackClass,
  coachingSecondaryBtn,
} from '@/components/coaching-portal/coaching-ui';
import type { CoachingHomeMonthSummary } from '@/lib/coaching-portal/coaching-home-month-summary';

const TONE_STYLES: Record<
  CoachingHomeMonthSummary['tone'],
  { ring: string; pill: string; pillLabel: string }
> = {
  neutral: {
    ring: 'ring-white/10',
    pill: 'bg-slate-500/15 text-slate-300 ring-slate-400/20',
    pillLabel: 'On track',
  },
  good: {
    ring: 'ring-emerald-500/30',
    pill: 'bg-emerald-500/15 text-emerald-200 ring-emerald-400/25',
    pillLabel: 'Month clear',
  },
  attention: {
    ring: 'ring-amber-500/30',
    pill: 'bg-amber-500/15 text-amber-100 ring-amber-400/25',
    pillLabel: 'Needs attention',
  },
};

function lineIcon(line: string) {
  const lower = line.toLowerCase();
  if (lower.startsWith('next up')) return ListTodo;
  if (lower.includes('marketing')) return Megaphone;
  if (lower.includes('actions') || lower.includes('complete')) return TrendingUp;
  return CalendarClock;
}

export function CoachingMonthSummaryCard({
  summary,
  testId = 'coaching-month-summary',
}: {
  summary: CoachingHomeMonthSummary;
  testId?: string;
}) {
  const tone = TONE_STYLES[summary.tone];

  return (
    <section
      className={`${coachingCard} ${tone.ring} lg:col-span-2`}
      data-testid={testId}
      aria-labelledby={`${testId}-title`}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <span
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-sky-500/10 ring-1 ring-sky-400/20"
            aria-hidden
          >
            <CircleCheckBig className="h-5 w-5 text-sky-300" />
          </span>
          <div>
            <h2 id={`${testId}-title`} className={coachingCardTitle}>
              {summary.headline}
            </h2>
            <p className={`mt-1 text-xs ${coachingMuted}`}>
              Progress, marketing pack, and your next coached action
            </p>
          </div>
        </div>
        <span
          className={`inline-flex items-center rounded-full px-3 py-1 text-[11px] font-semibold tracking-wide uppercase ring-1 ${tone.pill}`}
        >
          {tone.pillLabel}
        </span>
      </div>

      {summary.progress ? (
        <div className="mt-5">
          <div className="mb-2 flex items-center justify-between text-xs text-slate-400">
            <span>Monthly actions</span>
            <span className="font-semibold text-slate-200">
              {summary.progress.completed} / {summary.progress.total} · {summary.progress.percent}%
            </span>
          </div>
          <div
            className={coachingProgressTrackClass()}
            role="progressbar"
            aria-valuenow={summary.progress.percent}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label="Monthly coaching actions completed"
          >
            <div
              className={coachingProgressFill}
              style={coachingProgressFillStyle(summary.progress.percent)}
            />
          </div>
        </div>
      ) : null}

      <ul className={`mt-5 space-y-3 text-sm ${coachingMuted}`}>
        {summary.lines.map((line) => {
          const Icon = lineIcon(line);
          return (
            <li key={line} className="flex gap-3 leading-relaxed">
              <Icon className="mt-0.5 h-4 w-4 shrink-0 text-sky-400/75" aria-hidden />
              <span className="text-slate-300">{line}</span>
            </li>
          );
        })}
      </ul>

      {summary.ctas.length > 0 ? (
        <div
          className="mt-6 flex flex-col gap-2 border-t border-white/[0.06] pt-5 sm:flex-row sm:flex-wrap"
          data-testid={`${testId}-actions`}
        >
          {summary.ctas.map((cta) => (
            <Link
              key={cta.href + cta.label}
              href={cta.href}
              className={
                cta.variant === 'primary'
                  ? `${coachingPrimaryBtn} inline-flex min-h-11 items-center justify-center gap-2`
                  : `${coachingSecondaryBtn} inline-flex min-h-11 items-center justify-center gap-2`
              }
            >
              {cta.label}
              {cta.variant === 'primary' ? (
                <ArrowRight className="h-4 w-4" aria-hidden />
              ) : null}
            </Link>
          ))}
        </div>
      ) : null}
    </section>
  );
}
