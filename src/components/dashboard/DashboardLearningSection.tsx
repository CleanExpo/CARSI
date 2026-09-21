import { ArrowRight } from 'lucide-react';
import Link from 'next/link';

import {
  ContinueLearningBanner,
  type ContinueLearningSnapshot,
} from '@/components/lms/ContinueLearningBanner';
import { EnrolledCourseList } from '@/components/lms/EnrolledCourseList';
import { PathwayProgressCard } from '@/components/lms/PathwayProgressCard';
import { PopularForYouStrip } from '@/components/lms/PopularForYouStrip';
import { OnboardingSpotlight } from '@/components/onboarding/OnboardingSpotlight';
import type { SessionClaims } from '@/lib/auth/session-jwt';
import { dash } from '@/lib/dashboard-light-ui';
import { resolveHomeContinueState } from '@/lib/learner-home-state';
import type { LearnerDashboardSummary } from '@/lib/server/learner-dashboard-data';
import type { OnboardingProgramRow } from '@/lib/server/onboarding-programs';
import { RENEWAL_CEC_REQUIRED, type RenewalCourseSuggestion } from '@/types/renewal';

function greetingForHour(hour: number): string {
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

function formatCec(n: number): string {
  return n.toFixed(n % 1 === 0 ? 0 : 1);
}

export function DashboardLearningSection({
  claims,
  summary,
  resume,
  recommendations,
  onboardingPrograms = [],
  dbConfigured,
  enrolmentQueryFailed,
}: {
  claims: SessionClaims | null;
  summary: LearnerDashboardSummary | null;
  resume: ContinueLearningSnapshot | null;
  recommendations: RenewalCourseSuggestion[];
  onboardingPrograms?: OnboardingProgramRow[];
  dbConfigured: boolean;
  enrolmentQueryFailed: boolean;
}) {
  const firstName = claims?.full_name?.trim().split(/\s+/)[0] || 'Learner';
  const enrollments = summary?.enrollments ?? [];
  const completed = enrollments.filter(
    (e) => e.all_lessons_complete === true || e.status === 'completed'
  );
  const inProgress = enrollments.filter(
    (e) => e.status !== 'completed' && e.all_lessons_complete !== true
  );
  const certificates = completed.filter((e) => e.certificate_issued_at);
  const cec = summary?.cecHoursFromCompleted ?? 0;
  const cecTarget = RENEWAL_CEC_REQUIRED;
  const showCec = cec > 0;
  const previewCourses = (inProgress.length > 0 ? inProgress : enrollments).slice(0, 2);
  const hour = new Date().getHours();
  const continueState = resolveHomeContinueState({
    hasResume: Boolean(resume),
    inProgressCount: inProgress.length,
    enrolledCount: enrollments.length,
    completedCount: completed.length,
  });
  const resumeEnrollment = resume
    ? enrollments.find((e) => e.course_slug === resume.course_slug)
    : undefined;

  return (
    <div className="max-w-9xl mx-auto w-full space-y-10 pb-20">
      <header>
        <h1 className={dash.h1}>
          {greetingForHour(hour)}, {firstName}
        </h1>
        <p className={`mt-2 max-w-xl ${dash.lead}`}>Continue your learning journey with CARSI.</p>
      </header>

      {!dbConfigured ? (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          Course progress is unavailable until the database is configured. The catalogue still
          works.
        </div>
      ) : null}

      {enrolmentQueryFailed ? (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          Your course progress could not be loaded.
        </div>
      ) : null}

      {onboardingPrograms.length > 0 ? (
        <OnboardingSpotlight programs={onboardingPrograms} variant="featured" />
      ) : null}

      {continueState === 'resume' && resume ? (
        <ContinueLearningBanner
          snapshot={resume}
          progressPercent={resumeEnrollment?.completion_percentage}
        />
      ) : null}

      {continueState === 'start' && inProgress[0] ? (
        <section className="rounded-2xl border border-slate-200 bg-white px-5 py-6 sm:px-8">
          <p className={dash.eyebrow}>Start your course</p>
          <h2 className={`mt-2 ${dash.h2}`}>{inProgress[0].course_title}</h2>
          <p className={`mt-1 ${dash.lead}`}>Not started</p>
          <Link
            href={`/dashboard/learn/${encodeURIComponent(inProgress[0].course_slug)}`}
            className={`mt-5 ${dash.btnPrimary}`}
          >
            Start course
            <ArrowRight className="h-4 w-4" aria-hidden />
          </Link>
        </section>
      ) : null}

      {continueState === 'empty' ? (
        <section className="rounded-2xl border border-dashed border-slate-300 bg-white px-5 py-10 text-center sm:px-8">
          <p className={dash.eyebrow}>Start your learning journey</p>
          <p className={`mx-auto mt-3 max-w-md ${dash.lead}`}>
            You currently have no course in progress.
          </p>
          <Link href="/dashboard/courses" className={`mt-6 ${dash.btnPrimary}`}>
            Browse courses
            <ArrowRight className="h-4 w-4" aria-hidden />
          </Link>
        </section>
      ) : null}

      {continueState === 'complete' ? (
        <section className="rounded-2xl border border-slate-200 bg-white px-5 py-8 text-center sm:px-8">
          <p className={dash.eyebrow}>Learning complete</p>
          <p className={`mx-auto mt-3 max-w-md ${dash.lead}`}>
            You have completed your current courses.
          </p>
          <Link href="/dashboard/courses" className={`mt-6 ${dash.btnPrimary}`}>
            Explore recommended courses
            <ArrowRight className="h-4 w-4" aria-hidden />
          </Link>
        </section>
      ) : null}

      <PathwayProgressCard />

      {previewCourses.length > 0 ? (
        <section>
          <div className="mb-4 flex items-end justify-between gap-3">
            <h2 className={dash.h2}>My courses</h2>
            <Link
              href="/dashboard/student"
              className="text-sm font-medium text-[#146fc2] hover:underline"
            >
              View all
            </Link>
          </div>
          <EnrolledCourseList enrollments={previewCourses} />
        </section>
      ) : null}

      {enrollments.length > 0 ? (
        <section aria-label="Your progress">
          <h2 className={`${dash.h2} mb-3`}>Your progress</h2>
          <p className="text-sm text-slate-600">
            <span className="font-medium text-slate-900 tabular-nums">
              {summary?.counts.total ?? 0}
            </span>{' '}
            Courses
            <span className="mx-2 text-slate-300" aria-hidden>
              ·
            </span>
            <span className="font-medium text-slate-900 tabular-nums">{certificates.length}</span>{' '}
            Certificate{certificates.length === 1 ? '' : 's'}
            <span className="mx-2 text-slate-300" aria-hidden>
              ·
            </span>
            <span className="font-medium text-slate-900 tabular-nums">
              {cec > 0 ? formatCec(cec) : '0'}
            </span>{' '}
            CECs
          </p>
        </section>
      ) : null}

      {showCec ? (
        <section className="rounded-2xl border border-slate-200 bg-white px-5 py-5 sm:px-6">
          <h2 className="text-base font-semibold text-slate-900">IICRC CEC progress</h2>
          <p className="mt-2 text-sm text-slate-600 tabular-nums">
            {formatCec(cec)} / {cecTarget} CECs
          </p>
          <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100">
            <div
              className="h-full rounded-full bg-[#2490ed]"
              style={{ width: `${Math.min(100, (cec / cecTarget) * 100)}%` }}
            />
          </div>
          <p className="mt-2 text-sm text-slate-500">
            {cec >= cecTarget
              ? 'Renewal target reached'
              : `${formatCec(Math.max(0, cecTarget - cec))} CECs remaining`}
          </p>
          <Link
            href="/dashboard/student/credentials"
            className="mt-4 inline-block text-sm font-medium text-[#146fc2] hover:underline"
          >
            View CEC details
          </Link>
        </section>
      ) : null}

      <PopularForYouStrip courses={recommendations.slice(0, 3)} />

      {certificates.length > 0 ? (
        <section>
          <div className="mb-4 flex items-end justify-between gap-3">
            <h2 className={dash.h2}>Your certificates</h2>
            <Link
              href="/dashboard/student/credentials"
              className="text-sm font-medium text-[#146fc2] hover:underline"
            >
              View all
            </Link>
          </div>
          <ul className="space-y-3">
            {certificates.slice(0, 2).map((c) => (
              <li
                key={c.id}
                className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white px-4 py-4 sm:flex-row sm:items-center sm:justify-between"
              >
                <div>
                  <p className="font-medium text-slate-900">{c.course_title}</p>
                  <p className="mt-1 text-sm text-slate-500">
                    Completed{' '}
                    {c.certificate_issued_at
                      ? new Date(c.certificate_issued_at).toLocaleDateString('en-AU', {
                          day: 'numeric',
                          month: 'long',
                          year: 'numeric',
                        })
                      : ''}
                    {c.cec_submission_status === 'sent' ? ' · CEC submitted' : ''}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Link href="/dashboard/student/credentials" className={dash.btnSecondary}>
                    View certificate
                  </Link>
                  <a href={`/api/lms/enrollments/${c.id}/certificate`} className={dash.btnGhost}>
                    Download
                  </a>
                </div>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
