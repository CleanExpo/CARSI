import { ArrowRight, Award, Flame } from 'lucide-react';
import Link from 'next/link';

import type { ContinueLearningSnapshot } from '@/components/lms/ContinueLearningBanner';
import type { SessionClaims } from '@/lib/auth/session-jwt';
import { resolveHomeContinueState } from '@/lib/learner-home-state';
import type { EnrollmentDto, LearnerDashboardSummary } from '@/lib/server/learner-dashboard-data';
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

function formatHomeDate(): string {
  return new Intl.DateTimeFormat('en-AU', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'Australia/Sydney',
  }).format(new Date());
}

function learnHref(enr: EnrollmentDto): string {
  if (enr.last_lesson_id) {
    return `/dashboard/learn/${encodeURIComponent(enr.course_slug)}?lesson=${encodeURIComponent(enr.last_lesson_id)}`;
  }
  return `/dashboard/learn/${encodeURIComponent(enr.course_slug)}`;
}

/** One surface + type scale for every Home card. */
const surface = 'learner-home-surface learner-home-card overflow-hidden rounded-[1.25rem]';
const inset = 'learner-home-inset';
const kicker =
  'bg-gradient-to-r from-sky-200 via-cyan-200 to-indigo-200 bg-clip-text text-[11px] font-semibold tracking-[0.2em] text-transparent uppercase';
const heading = 'font-semibold tracking-[-0.02em] text-white';
const muted = 'text-slate-300/80';
const cta =
  'inline-flex items-center gap-1.5 text-[14px] font-semibold text-sky-200 transition hover:text-white';
const btn =
  'inline-flex items-center justify-center gap-2 rounded-full bg-gradient-to-r from-white via-sky-50 to-white px-5 py-2.5 text-[13px] font-semibold text-slate-950 shadow-[0_10px_28px_-10px_rgba(56,189,248,0.8)] transition hover:from-sky-50 hover:to-white';
const linkQuiet =
  'inline-flex shrink-0 items-center gap-1.5 text-[13px] font-medium text-slate-500 transition hover:text-[#146fc2]';

function ProgressTrack({ percent }: { percent: number }) {
  const pct = Math.min(100, Math.max(0, Math.round(percent)));
  return (
    <div
      className="learner-home-bar h-2 overflow-hidden rounded-full bg-white/10"
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={pct}
    >
      <i
        className="rounded-full bg-gradient-to-r from-sky-300 to-[#2490ed]"
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

function BrandRing({
  percent,
  size,
  stroke,
  id,
}: {
  percent: number;
  size: number;
  stroke: number;
  id: string;
}) {
  const pct = Math.min(100, Math.max(0, Math.round(percent)));
  const r = (size - stroke * 2) / 2;
  const circ = 2 * Math.PI * r;
  const mid = size / 2;
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        className="-rotate-90"
        aria-hidden
      >
        <circle
          cx={mid}
          cy={mid}
          r={r}
          fill="none"
          stroke="rgba(255,255,255,0.12)"
          strokeWidth={stroke}
        />
        <circle
          cx={mid}
          cy={mid}
          r={r}
          fill="none"
          stroke={`url(#${id})`}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circ}
          strokeDashoffset={circ - (pct / 100) * circ}
        />
        <defs>
          <linearGradient id={id} x1="0" y1="0" x2={size} y2={size}>
            <stop offset="0%" stopColor="#7dd3fc" />
            <stop offset="100%" stopColor="#2490ed" />
          </linearGradient>
        </defs>
      </svg>
      <span className="absolute inset-0 flex items-center justify-center text-[1.35rem] font-semibold text-white tabular-nums">
        {pct}
        <span className="text-[0.7rem] text-slate-400">%</span>
      </span>
    </div>
  );
}

function SectionHead({
  title,
  subtitle,
  href,
  linkLabel,
}: {
  title: string;
  subtitle?: string;
  href: string;
  linkLabel: string;
}) {
  return (
    <div className="mb-5 flex items-end justify-between gap-6">
      <div>
        <h2 className="text-[1.4rem] font-semibold tracking-tight text-slate-950">{title}</h2>
        {subtitle ? <p className={`mt-1 text-[14px] ${muted}`}>{subtitle}</p> : null}
      </div>
      <Link href={href} className={linkQuiet}>
        {linkLabel}
        <ArrowRight className="h-3.5 w-3.5" aria-hidden />
      </Link>
    </div>
  );
}

function ContinueHero({
  title,
  description,
  percent,
  lessonIndex,
  lessonTotal,
  nextLesson,
  href,
  ctaLabel,
}: {
  title: string;
  description: string | null;
  percent: number | null;
  lessonIndex: number | null;
  lessonTotal: number | null;
  nextLesson: string | null;
  href: string;
  ctaLabel: string;
}) {
  const pct = percent != null ? Math.min(100, Math.max(0, Math.round(percent))) : 0;

  return (
    <section
      aria-label="Continue learning"
      className={`${surface} learner-home-surface--hero w-full`}
    >
      <div className="grid min-h-[19rem] w-full lg:grid-cols-[minmax(0,1.35fr)_minmax(17rem,0.85fr)]">
        <div className="flex flex-col justify-between gap-10 px-8 py-8 sm:px-10">
          <div>
            <p className={kicker}>
              <span className="learner-home-dot mr-2 inline-block h-1.5 w-1.5 rounded-full bg-sky-300 align-middle" />
              In progress
            </p>
            <h2
              className={`mt-4 line-clamp-2 max-w-2xl text-[1.85rem] leading-tight sm:text-[2.1rem] ${heading}`}
            >
              {title}
            </h2>
            {description ? (
              <p className={`mt-3 line-clamp-2 max-w-xl text-[15px] leading-6 ${muted}`}>
                {description}
              </p>
            ) : null}
          </div>
          <div>
            <div
              className={`mb-2 flex items-center justify-between text-[13px] tabular-nums ${muted}`}
            >
              <span>{pct}% complete</span>
              {lessonIndex != null && lessonTotal != null && lessonTotal > 0 ? (
                <span>
                  Lesson {lessonIndex} of {lessonTotal}
                </span>
              ) : null}
            </div>
            <ProgressTrack percent={pct} />
            <div className="mt-7 flex flex-wrap items-end justify-between gap-4">
              <div>
                <p className={kicker}>Next lesson</p>
                <p className="mt-1 text-[15px] font-medium text-white">
                  {nextLesson ?? 'Open the next lesson'}
                </p>
              </div>
              <Link href={href} className={btn}>
                {ctaLabel}
                <ArrowRight className="h-4 w-4" aria-hidden />
              </Link>
            </div>
          </div>
        </div>
        <div className="learner-home-hero-panel relative hidden flex-col items-center justify-center px-8 py-10 lg:flex">
          <div
            className="learner-home-rings pointer-events-none absolute top-1/2 left-1/2 h-64 w-64 -translate-x-1/2 -translate-y-1/2 rounded-full border border-sky-200/25"
            aria-hidden
          />
          <div
            className="pointer-events-none absolute top-1/2 left-1/2 h-44 w-44 -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/10"
            aria-hidden
          />
          <p className={`absolute top-6 right-7 ${kicker}`}>CARSI / Field notes</p>
          <BrandRing percent={pct} size={168} stroke={9} id="home-hero-ring" />
          <p className={`mt-6 max-w-[11rem] text-center text-[13px] leading-5 ${muted}`}>
            Professional skills, built for the field.
          </p>
        </div>
      </div>
    </section>
  );
}

export function DashboardLearningSection({
  claims,
  summary,
  resume,
  recommendations,
  onboardingPrograms: _onboardingPrograms = [],
  dbConfigured,
  enrolmentQueryFailed,
  streakDays = 0,
}: {
  claims: SessionClaims | null;
  summary: LearnerDashboardSummary | null;
  resume:
    | (ContinueLearningSnapshot & {
        course_description?: string | null;
        lesson_index?: number;
        lesson_total?: number;
      })
    | null;
  recommendations: RenewalCourseSuggestion[];
  onboardingPrograms?: OnboardingProgramRow[];
  dbConfigured: boolean;
  enrolmentQueryFailed: boolean;
  streakDays?: number;
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
  const recommended = recommendations.slice(0, 3);
  const cecRemaining = Math.max(0, cecTarget - cec);
  const cecPct = Math.min(100, (cec / cecTarget) * 100);

  return (
    <div className="learner-home -mx-4 w-[calc(100%+2rem)] min-w-0 space-y-12 px-4 pb-8 sm:-mx-6 sm:w-[calc(100%+3rem)] sm:px-6 lg:-mx-10 lg:w-[calc(100%+5rem)] lg:px-10">
      <header className="relative flex w-full flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <p className={`text-[13px] ${muted}`}>{formatHomeDate()}</p>
          <h1 className="mt-2 text-[2.4rem] leading-[1.05] font-semibold tracking-tight text-slate-950 sm:text-[2.85rem]">
            {greetingForHour(hour)}, {firstName}
          </h1>
          <p className={`mt-3 max-w-xl text-[15px] leading-6 ${muted}`}>
            Continue your learning journey with CARSI.
          </p>
        </div>
        <p
          className={`${surface} inline-flex items-center gap-2 self-start rounded-full px-3.5 py-1.5 text-[13px] text-slate-200 sm:self-end`}
        >
          <Flame className="h-3.5 w-3.5 fill-amber-200 text-amber-500" aria-hidden />
          {streakDays} day learning streak
        </p>
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

      <div className="w-full">
        <SectionHead
          title="Continue learning"
          href="/dashboard/student"
          linkLabel="View all learning"
        />
        {continueState === 'resume' && resume ? (
          <ContinueHero
            title={resume.course_title}
            description={resume.course_description ?? resumeEnrollment?.description ?? null}
            percent={resumeEnrollment?.completion_percentage ?? null}
            lessonIndex={resume.lesson_index ?? resumeEnrollment?.lessons_completed ?? null}
            lessonTotal={resume.lesson_total ?? resumeEnrollment?.lessons_total ?? null}
            nextLesson={resume.lesson_title}
            href={resume.resume_href}
            ctaLabel="Continue learning"
          />
        ) : null}
        {continueState === 'start' && inProgress[0] ? (
          <ContinueHero
            title={inProgress[0].course_title}
            description={inProgress[0].description ?? null}
            percent={inProgress[0].completion_percentage}
            lessonIndex={1}
            lessonTotal={inProgress[0].lessons_total ?? null}
            nextLesson={inProgress[0].last_lesson_title ?? inProgress[0].course_title}
            href={learnHref(inProgress[0])}
            ctaLabel="Start course"
          />
        ) : null}
        {continueState === 'empty' ? (
          <ContinueHero
            title="Start a course"
            description="Browse the catalogue and pick up a restoration course."
            percent={0}
            lessonIndex={null}
            lessonTotal={null}
            nextLesson="Browse the catalogue"
            href="/dashboard/courses"
            ctaLabel="Browse courses"
          />
        ) : null}
        {continueState === 'complete' ? (
          <ContinueHero
            title="Courses complete"
            description="You have completed your current courses. Open a recommended course next."
            percent={100}
            lessonIndex={null}
            lessonTotal={null}
            nextLesson="Explore recommended courses"
            href="/dashboard/courses"
            ctaLabel="Explore courses"
          />
        ) : null}
      </div>

      {previewCourses.length > 0 ? (
        <section className="w-full">
          <SectionHead
            title="My courses"
            subtitle="Pick up where you left off."
            href="/dashboard/student"
            linkLabel="View all"
          />
          <ul className="grid w-full items-stretch gap-5 md:grid-cols-2">
            {previewCourses.map((enr) => {
              const started = enr.completion_percentage > 0;
              const done = enr.all_lessons_complete === true || enr.status === 'completed';
              const cecHours = enr.cec_hours != null && enr.cec_hours > 0 ? enr.cec_hours : null;
              const pct = done ? 100 : enr.completion_percentage;
              return (
                <li key={enr.id}>
                  <Link href={learnHref(enr)} className={`${surface} flex h-full min-h-[9.5rem]`}>
                    <div className="flex w-[7rem] shrink-0 flex-col justify-between border-r border-sky-200/10 bg-gradient-to-b from-sky-400/15 to-transparent px-4 py-5 sm:w-32">
                      <span className="text-[1.75rem] leading-none font-semibold text-white tabular-nums">
                        {pct}
                        <span className="text-sm text-slate-400">%</span>
                      </span>
                      <p className={`${kicker} text-[9px] leading-4`}>
                        Professional
                        <br />
                        learning
                      </p>
                    </div>
                    <div className="flex min-w-0 flex-1 flex-col justify-between px-5 py-5">
                      <div>
                        <p className={kicker}>
                          {cecHours != null ? 'IICRC CEC' : 'Professional development'}
                        </p>
                        <h3
                          className={`mt-1.5 line-clamp-2 text-[1.05rem] leading-snug ${heading}`}
                        >
                          {enr.course_title}
                        </h3>
                      </div>
                      <div className="mt-5">
                        <div
                          className={`mb-2 flex items-center justify-between gap-3 text-[12px] ${muted}`}
                        >
                          <span>
                            {done ? 'Completed' : started ? `${pct}% complete` : 'Not started'}
                          </span>
                          <span className="min-w-0 truncate">
                            {enr.last_lesson_title && started ? enr.last_lesson_title : ''}
                          </span>
                        </div>
                        <ProgressTrack percent={pct} />
                        <span className={`${cta} mt-3`}>
                          {done ? 'View course' : started ? 'Continue' : 'Start course'}
                          <ArrowRight className="h-4 w-4" aria-hidden />
                        </span>
                      </div>
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>
      ) : null}

      <section className="grid w-full items-stretch gap-5 lg:grid-cols-2">
        <div className={`${surface} px-7 py-7`}>
          <p className={kicker}>Your progress</p>
          <p className={`mt-2 text-[14px] ${muted}`}>A quick view of your learning journey.</p>
          <dl className="mt-8 grid grid-cols-3 gap-4">
            {(
              [
                [summary?.counts.total ?? 0, enrollments.length === 1 ? 'Course' : 'Courses'],
                [certificates.length, certificates.length === 1 ? 'Certificate' : 'Certificates'],
                [formatCec(cec), 'CECs earned'],
              ] as const
            ).map(([value, label]) => (
              <div key={label} className={`${inset} rounded-xl px-3 py-4`}>
                <dt className={`text-[11px] ${muted}`}>{label}</dt>
                <dd className={`mt-2 text-[2rem] leading-none tabular-nums ${heading}`}>{value}</dd>
              </div>
            ))}
          </dl>
        </div>
        <div className={`${surface} flex flex-col px-7 py-7`}>
          <p className={kicker}>IICRC CEC progress</p>
          <div className="mt-6 flex items-center gap-5">
            <BrandRing percent={cecPct} size={80} stroke={7} id="home-cec-ring" />
            <p className={`text-[2.1rem] leading-none tabular-nums ${heading}`}>
              {formatCec(cec)}
              <span className="text-[1.05rem] font-medium text-slate-400">/{cecTarget}</span>
            </p>
          </div>
          <div className="mt-6">
            <ProgressTrack percent={cecPct} />
          </div>
          <div className={`mt-3 flex items-center justify-between text-[13px] ${muted}`}>
            <span>General</span>
            <span>
              {cec >= cecTarget
                ? 'Renewal target reached'
                : `${formatCec(cecRemaining)} CECs remaining`}
            </span>
          </div>
          <Link href="/dashboard/student/credentials" className={`${cta} mt-auto pt-7`}>
            View CEC details
            <ArrowRight className="h-4 w-4" aria-hidden />
          </Link>
        </div>
      </section>

      {recommended.length > 0 ? (
        <section className="w-full">
          <SectionHead
            title="Recommended for you"
            subtitle="Based on your courses and learning interests."
            href="/dashboard/courses"
            linkLabel="Browse catalogue"
          />
          <ul className="grid w-full items-stretch gap-5 sm:grid-cols-3">
            {recommended.map((c, i) => (
              <li key={c.id}>
                <Link
                  href={`/dashboard/courses/${encodeURIComponent(c.slug)}`}
                  className={`${surface} flex h-full flex-col`}
                >
                  <div
                    className={`learner-home-thumb h-28 border-b border-white/10 ${
                      i % 3 === 1
                        ? 'learner-home-thumb--indigo'
                        : i % 3 === 2
                          ? 'learner-home-thumb--teal'
                          : ''
                    }`}
                  />
                  <div className="flex flex-1 flex-col px-5 pt-4 pb-5">
                    <p className={kicker}>Professional learning</p>
                    <h3
                      className={`mt-2 line-clamp-2 min-h-[3rem] text-[1.05rem] leading-snug ${heading}`}
                    >
                      {c.title}
                    </h3>
                    <span className={`${cta} mt-auto pt-4`}>
                      View course
                      <ArrowRight className="h-4 w-4" aria-hidden />
                    </span>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {certificates.length > 0 ? (
        <section className="w-full">
          <SectionHead
            title="Your certificates"
            subtitle="Your professional achievements."
            href="/dashboard/student/credentials"
            linkLabel="View all"
          />
          <ul className="space-y-4">
            {certificates.slice(0, 2).map((c) => (
              <li
                key={c.id}
                className={`${surface} flex flex-col gap-4 px-5 py-4 sm:flex-row sm:items-center sm:justify-between`}
              >
                <div className="flex min-w-0 items-center gap-4">
                  <span
                    className={`inline-flex h-11 w-11 items-center justify-center rounded-xl ${inset} text-sky-300`}
                  >
                    <Award className="h-5 w-5" aria-hidden />
                  </span>
                  <div>
                    <p className={`text-[1.05rem] ${heading}`}>{c.course_title}</p>
                    <p className={`mt-1 text-[13px] ${muted}`}>
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
                </div>
                <a href={`/api/lms/enrollments/${c.id}/certificate`} className={btn}>
                  Download
                  <ArrowRight className="h-3.5 w-3.5" aria-hidden />
                </a>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
