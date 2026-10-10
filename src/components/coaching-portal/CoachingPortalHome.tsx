'use client';

import Link from 'next/link';

import { BusinessCoachingMonthlySubscribe } from '@/components/ccw/BusinessCoachingMonthlySubscribe';
import {
  coachingCard,
  coachingCardTitle,
  coachingEyebrow,
  coachingMuted,
  coachingPage,
  coachingPrimaryBtn,
  coachingSecondaryBtn,
} from '@/components/coaching-portal/coaching-ui';
import { CoachingOnboardingStatusBar } from '@/components/coaching-portal/CoachingOnboardingStatusBar';
import { useCoachingPortal } from '@/components/coaching-portal/CoachingPortalContext';
import { CheckCircle2, Circle } from 'lucide-react';

function LockedHome() {
  const { access } = useCoachingPortal();
  return (
    <div className={coachingPage}>
      <div className={coachingCard}>
        <h1 className="text-2xl font-semibold tracking-tight text-white">
          Business Coaching Workspace
        </h1>
        <p className={`mt-2 ${coachingMuted}`}>
          Subscribe to unlock your plan, actions, sessions, and resources — separate from the course
          catalogue.
        </p>
        <div className="mt-6 max-w-sm">
          <BusinessCoachingMonthlySubscribe checkoutEnabled={true} />
        </div>
        <Link href={access.subscribeUrl} className={`mt-4 inline-flex ${coachingSecondaryBtn}`}>
          View programme
        </Link>
      </div>
    </div>
  );
}

function OnboardingChecklist() {
  const { onboarding, welcomeMessage, user } = useCoachingPortal();
  return (
    <div className={coachingPage}>
      <header className="mb-8">
        <p className={coachingEyebrow}>Welcome back</p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight text-white sm:text-[1.75rem]">
          Welcome back, {user.firstName}
        </h1>
        <p className={`mt-2 max-w-2xl ${coachingMuted}`}>{welcomeMessage}</p>
      </header>

      <CoachingOnboardingStatusBar />

      <section className={coachingCard}>
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h2 className={coachingCardTitle}>Let&apos;s get you started</h2>
            <p className={`mt-1 ${coachingMuted}`}>
              {onboarding.completedCount} of {onboarding.steps.length} steps complete
            </p>
          </div>
          <div
            className="h-2 w-full max-w-[200px] overflow-hidden rounded-full bg-white/10 sm:w-48"
            role="progressbar"
            aria-valuenow={onboarding.completedCount}
            aria-valuemin={0}
            aria-valuemax={onboarding.steps.length}
          >
            <div
              className="h-full rounded-full bg-[#146fc2] transition-all"
              style={{
                width: `${(onboarding.completedCount / onboarding.steps.length) * 100}%`,
              }}
            />
          </div>
        </div>

        <ol className="mt-8 space-y-4">
          {onboarding.steps.map((step, index) => (
            <li
              key={step.id}
              className="flex flex-col gap-4 rounded-lg border border-white/[0.06] bg-white/[0.03] p-4 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="flex gap-3">
                {step.complete ? (
                  <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-400" aria-hidden />
                ) : (
                  <Circle className="mt-0.5 h-5 w-5 shrink-0 text-slate-500" aria-hidden />
                )}
                <div>
                  <p className="text-sm font-semibold text-white">
                    Step {index + 1}: {step.title}
                  </p>
                  <p className={`mt-1 ${coachingMuted}`}>{step.description}</p>
                </div>
              </div>
              {!step.complete ? (
                <Link href={step.href} className={coachingPrimaryBtn}>
                  Continue
                </Link>
              ) : (
                <span className="text-xs font-semibold tracking-wide text-emerald-400/90 uppercase">
                  Complete
                </span>
              )}
            </li>
          ))}
        </ol>
      </section>
    </div>
  );
}

function AssessmentPendingHome() {
  const { user, welcomeMessage, assessment } = useCoachingPortal();
  const submittedLabel = assessment.submittedAt
    ? new Date(assessment.submittedAt).toLocaleDateString('en-AU', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      })
    : null;

  return (
    <div className={coachingPage}>
      <header className="mb-8">
        <p className={coachingEyebrow}>Welcome back</p>
        <h1 className="mt-1 text-2xl font-semibold text-white sm:text-[1.75rem]">
          Welcome back, {user.firstName}
        </h1>
        <p className={`mt-2 ${coachingMuted}`}>{welcomeMessage}</p>
      </header>
      <CoachingOnboardingStatusBar />
      <section className={coachingCard}>
        <h2 className={coachingCardTitle}>Assessment submitted</h2>
        <p className={`mt-2 ${coachingMuted}`}>
          Phill is reviewing your answers{submittedLabel ? ` (submitted ${submittedLabel})` : ''}.
          You&apos;ll receive your growth plan and monthly actions after your review — usually
          before your next session.
        </p>
        {assessment.status === 'reviewed' && assessment.customerFeedback ? (
          <div className="mt-4 rounded-lg border border-sky-500/20 bg-sky-500/10 p-4 text-sm text-sky-100">
            {assessment.customerFeedback}
          </div>
        ) : null}
        <div className="mt-6 flex flex-wrap gap-3">
          <Link href="/dashboard/coaching/onboarding/packet" className={coachingSecondaryBtn}>
            What we sent Phill
          </Link>
          <Link href="/dashboard/coaching/onboarding/assessment" className={coachingSecondaryBtn}>
            View your answers
          </Link>
          <Link href="/dashboard/coaching/sessions" className={coachingPrimaryBtn}>
            Sessions
          </Link>
        </div>
      </section>
    </div>
  );
}

function ActiveHome() {
  const { user, welcomeMessage, plan, actions, sessions } = useCoachingPortal();

  return (
    <div className={coachingPage}>
      <header className="mb-8">
        <p className={coachingEyebrow}>Welcome back</p>
        <h1 className="mt-1 text-2xl font-semibold text-white sm:text-[1.75rem]">
          Welcome back, {user.firstName}
        </h1>
        <p className={`mt-2 ${coachingMuted}`}>{welcomeMessage}</p>
      </header>

      <CoachingOnboardingStatusBar />

      <div className="grid gap-4 lg:grid-cols-2">
        {plan.focusTitle ? (
          <section className={coachingCard}>
            <h2 className="text-sm font-semibold text-slate-300">Current focus</h2>
            <p className="mt-2 text-lg font-semibold text-white">{plan.focusTitle}</p>
            {plan.focusDescription ? (
              <p className={`mt-2 ${coachingMuted}`}>{plan.focusDescription}</p>
            ) : null}
            <Link href="/dashboard/coaching/plan" className={`mt-4 inline-flex ${coachingPrimaryBtn}`}>
              View my plan
            </Link>
          </section>
        ) : (
          <section className={coachingCard}>
            <h2 className={coachingCardTitle}>Growth plan</h2>
            <p className={`mt-2 ${coachingMuted}`}>
              No approved growth plan yet. Phill will publish your plan after reviewing your
              assessment.
            </p>
            <Link href="/dashboard/coaching/plan" className={`mt-4 inline-flex ${coachingSecondaryBtn}`}>
              View plan
            </Link>
          </section>
        )}

        <section className={coachingCard}>
          <h2 className="text-sm font-semibold text-slate-300">Your next action</h2>
          {actions.nextAction ? (
            <>
              <p className="mt-2 text-lg font-semibold text-white">{actions.nextAction.title}</p>
              {actions.nextAction.dueDate ? (
                <p className={`mt-1 text-xs text-slate-500`}>
                  Due{' '}
                  {new Date(actions.nextAction.dueDate).toLocaleDateString('en-AU', {
                    day: 'numeric',
                    month: 'short',
                  })}
                </p>
              ) : null}
              <Link href="/dashboard/coaching/actions" className={`mt-4 inline-flex ${coachingPrimaryBtn}`}>
                View action
              </Link>
            </>
          ) : (
            <>
              <p className={`mt-2 ${coachingMuted}`}>No actions assigned yet.</p>
              <Link href="/dashboard/coaching/actions" className={`mt-4 inline-flex ${coachingSecondaryBtn}`}>
                Action board
              </Link>
            </>
          )}
        </section>

        <section className={coachingCard}>
          <h2 className="text-sm font-semibold text-slate-300">Upcoming coaching session</h2>
          {sessions.upcoming ? (
            <>
              <p className="mt-2 text-lg font-semibold text-white">
                {new Date(sessions.upcoming.scheduledAt).toLocaleString('en-AU', {
                  weekday: 'long',
                  day: 'numeric',
                  month: 'long',
                  hour: 'numeric',
                  minute: '2-digit',
                  timeZoneName: 'short',
                })}
              </p>
              <p className={`mt-1 ${coachingMuted}`}>
                {sessions.upcoming.durationMinutes} min with {sessions.upcoming.coachName}
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                <Link href="/dashboard/coaching/sessions" className={coachingPrimaryBtn}>
                  View session
                </Link>
                {sessions.upcoming.meetingUrl ? (
                  <a
                    href={sessions.upcoming.meetingUrl}
                    className={coachingSecondaryBtn}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Join meeting
                  </a>
                ) : null}
              </div>
            </>
          ) : (
            <>
              <p className={`mt-2 ${coachingMuted}`}>You have no upcoming sessions scheduled.</p>
              <Link
                href="/dashboard/coaching/sessions"
                className={`mt-4 inline-flex ${coachingSecondaryBtn}`}
              >
                Book or view sessions
              </Link>
            </>
          )}
        </section>

        <section className={coachingCard}>
          <h2 className="text-sm font-semibold text-slate-300">Latest guidance from Phill</h2>
          {plan.latestGuidance ? (
            <p className={`mt-2 text-sm text-slate-200`}>{plan.latestGuidance}</p>
          ) : (
            <p className={`mt-2 ${coachingMuted}`}>
              Guidance will appear here after your coaching sessions and plan reviews.
            </p>
          )}
        </section>

        <section className={`${coachingCard} lg:col-span-2`}>
          <h2 className="text-sm font-semibold text-slate-300">Progress summary</h2>
          {actions.totalThisMonth > 0 ? (
            <p className="mt-2 text-lg text-white">
              <span className="font-semibold">{actions.completedThisMonth}</span> of{' '}
              <span className="font-semibold">{actions.totalThisMonth}</span> actions completed this
              month.
            </p>
          ) : (
            <p className={`mt-2 ${coachingMuted}`}>
              No actions recorded this month yet. Check your action board after your plan is set.
            </p>
          )}
        </section>
      </div>
    </div>
  );
}

export function CoachingPortalHome() {
  const { homeState, access } = useCoachingPortal();

  if (access.mode === 'staff_preview' && homeState === 'locked') {
    return (
      <div className={coachingPage}>
        <p className="mb-4 rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
          Staff preview — subscriber data may be empty. Editing requires an active coaching
          subscription.
        </p>
        <ActiveHome />
      </div>
    );
  }

  if (homeState === 'locked') return <LockedHome />;
  if (homeState === 'onboarding') return <OnboardingChecklist />;
  if (homeState === 'assessment_pending') return <AssessmentPendingHome />;
  return <ActiveHome />;
}
