import { ArrowRight, Award, Flame, Sparkle } from 'lucide-react';
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
  return new Intl.DateTimeFormat('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
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

const REC_BANDS = [
  'radial-gradient(80% 90% at 20% 10%, #1d4ed8 0%, transparent 55%), linear-gradient(145deg, #071226 0%, #163a6a 55%, #0b1730 100%)',
  'radial-gradient(90% 80% at 80% 0%, #fff7ed 0%, transparent 50%), linear-gradient(160deg, #f4e6d4 0%, #fde68a 40%, #fed7aa 100%)',
  'radial-gradient(80% 80% at 10% 0%, #ecfdf5 0%, transparent 50%), linear-gradient(160deg, #d1fae5 0%, #a7f3d0 45%, #e5f3ea 100%)',
] as const;
const COURSE_TILES = [
  'linear-gradient(165deg, #f8fbff 0%, #dbeafe 48%, #edf2f8 100%)',
  'linear-gradient(165deg, #fffdf8 0%, #fde68a 42%, #f6efe6 100%)',
] as const;
const RING = 20;
const CIRC = 2 * Math.PI * RING;

function ProgressTrack({ percent, tone = 'brand' }: { percent: number; tone?: 'brand' | 'light' }) {
  const pct = Math.min(100, Math.max(0, Math.round(percent)));
  return (
    <div
      className={`learner-home-bar h-[3px] overflow-hidden rounded-full ${tone === 'light' ? 'bg-white/12' : 'bg-slate-100'}`}
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={pct}
    >
      <i
        className={`rounded-full ${
          tone === 'light'
            ? 'bg-gradient-to-r from-[#60a5fa] to-[#3b82f6]'
            : 'bg-gradient-to-r from-[#146fc2] to-[#3b82f6]'
        }`}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

function CecRing({ percent }: { percent: number }) {
  const pct = Math.min(100, Math.max(0, percent));
  const offset = CIRC - (pct / 100) * CIRC;
  return (
    <svg width="44" height="44" viewBox="0 0 48 48" className="-rotate-90" aria-hidden>
      <circle cx="24" cy="24" r={RING} fill="none" stroke="#e8eef6" strokeWidth="4" />
      <circle
        cx="24"
        cy="24"
        r={RING}
        fill="none"
        stroke="#3b82f6"
        strokeWidth="4"
        strokeLinecap="round"
        strokeDasharray={CIRC}
        strokeDashoffset={offset}
      />
    </svg>
  );
}

function SectionHead({
  title,
  subtitle,
  href,
  linkLabel,
  eyebrow,
}: {
  title: string;
  subtitle?: string;
  href: string;
  linkLabel: string;
  eyebrow?: boolean;
}) {
  return (
    <div className={`flex items-end justify-between gap-4 ${eyebrow ? 'mb-3' : 'mb-4'}`}>
      <div>
        <h2
          className={
            eyebrow
              ? 'text-[11px] font-semibold tracking-[0.22em] text-slate-400 uppercase'
              : 'text-[1.35rem] font-semibold tracking-tight text-slate-900'
          }
        >
          {title}
        </h2>
        {subtitle ? <p className="mt-1 text-[13px] text-slate-400">{subtitle}</p> : null}
      </div>
      <Link
        href={href}
        className="group inline-flex shrink-0 items-center gap-1 text-[13px] text-slate-400 transition hover:text-slate-700"
      >
        {linkLabel}
        <ArrowRight
          className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5"
          aria-hidden
        />
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
  cta,
}: {
  title: string;
  description: string | null;
  percent: number | null;
  lessonIndex: number | null;
  lessonTotal: number | null;
  nextLesson: string | null;
  href: string;
  cta: string;
}) {
  const pct = percent != null ? Math.min(100, Math.max(0, Math.round(percent))) : 0;

  return (
    <section
      aria-label="Continue learning"
      className="relative w-full overflow-hidden rounded-[1.5rem] bg-[#071226] text-white shadow-[0_32px_80px_-40px_rgba(7,18,38,0.9)]"
    >
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(70%_90%_at_8%_-10%,rgba(59,130,246,0.32),transparent_55%),radial-gradient(50%_70%_at_90%_110%,rgba(99,102,241,0.22),transparent_50%)]" />
      <div className="learner-home-grid pointer-events-none absolute inset-0 opacity-70" />
      <div className="relative grid min-h-[17.5rem] w-full lg:grid-cols-[minmax(0,1.45fr)_minmax(0,1fr)]">
        <div className="z-10 flex flex-col justify-between px-8 py-7 sm:px-10 sm:py-8">
          <div>
            <p className="inline-flex items-center gap-2 text-[10px] font-semibold tracking-[0.2em] text-white/65 uppercase">
              <span
                className="learner-home-dot h-1.5 w-1.5 rounded-full bg-[#3b82f6]"
                aria-hidden
              />
              In progress
            </p>
            <h2 className="mt-4 text-[1.85rem] leading-tight font-semibold tracking-tight text-balance sm:text-[2.05rem]">
              {title}
            </h2>
            {description ? (
              <p className="mt-2.5 max-w-2xl text-[13.5px] leading-relaxed text-white/50">
                {description}
              </p>
            ) : null}
          </div>
          <div className="mt-8">
            <div className="flex items-center justify-between text-[13px] text-white/60 tabular-nums">
              <span>{pct}% complete</span>
              {lessonIndex != null && lessonTotal != null && lessonTotal > 0 ? (
                <span>
                  Lesson {lessonIndex} of {lessonTotal}
                </span>
              ) : null}
            </div>
            <div className="mt-2">
              <ProgressTrack percent={pct} tone="light" />
            </div>
            <div className="mt-7 flex flex-wrap items-end justify-between gap-4">
              <div>
                <p className="text-[10px] tracking-[0.16em] text-white/35 uppercase">Next lesson</p>
                <p className="mt-1 text-[14px] text-white/85">
                  {nextLesson ?? 'Open the next lesson'}
                </p>
              </div>
              <Link
                href={href}
                className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-white to-[#e8f3ff] px-5 py-2 text-[13px] font-medium text-slate-900 shadow-[0_10px_28px_-10px_rgba(147,197,253,0.8)] transition hover:from-white hover:to-white"
              >
                {cta}
                <ArrowRight className="h-3.5 w-3.5" aria-hidden />
              </Link>
            </div>
          </div>
        </div>
        <div className="relative hidden overflow-hidden bg-gradient-to-br from-[#0d2a55] via-[#0c2348] to-[#071226] lg:block">
          <div className="learner-home-orb pointer-events-none absolute top-6 right-10 h-40 w-40 rounded-full bg-[radial-gradient(circle,rgba(96,165,250,0.35),transparent_68%)]" />
          <p className="absolute top-7 right-8 z-10 text-[10px] font-medium tracking-[0.18em] text-white/40 uppercase">
            CARSI / Field notes
          </p>
          <div className="learner-home-rings absolute top-[46%] left-[58%] h-[26rem] w-[26rem] rounded-full border border-white/[0.16]" />
          <div className="absolute top-[46%] left-[58%] h-[16.5rem] w-[16.5rem] -translate-x-1/2 -translate-y-1/2 rounded-full border border-cyan-200/20" />
          <div className="absolute right-8 bottom-8 z-10 max-w-[11rem] text-right">
            <span className="mb-3 ml-auto block h-[2px] w-8 bg-[#3b82f6]" aria-hidden />
            <p className="text-[13.5px] leading-snug text-white/45">
              Professional skills,
              <br />
              built for the field.
            </p>
          </div>
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
    <div className="learner-home -mx-4 w-[calc(100%+2rem)] min-w-0 space-y-11 px-4 sm:-mx-6 sm:w-[calc(100%+3rem)] sm:px-6 lg:-mx-10 lg:w-[calc(100%+5rem)] lg:px-8">
      <div className="learner-home-mesh" aria-hidden />
      <header className="relative flex w-full flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-[13px] text-slate-400">{formatHomeDate()}</p>
          <h1 className="mt-1.5 bg-gradient-to-r from-slate-950 via-slate-800 to-[#146fc2] bg-clip-text text-[2.35rem] leading-none font-semibold tracking-tight text-transparent sm:text-[2.6rem]">
            {greetingForHour(hour)}, {firstName}
          </h1>
          <p className="mt-2.5 text-[14px] text-slate-400">
            Continue your learning journey with CARSI.
          </p>
        </div>
        <p className="learner-home-glass mt-1 inline-flex items-center gap-1.5 self-start rounded-full px-3 py-1 text-[13px] text-slate-500">
          <Flame className="h-3.5 w-3.5 fill-amber-200 text-amber-400" aria-hidden />
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
          eyebrow
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
            cta="Continue learning"
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
            cta="Start course"
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
            cta="Browse courses"
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
            cta="Explore courses"
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
          <ul className="grid w-full gap-4 md:grid-cols-2">
            {previewCourses.map((enr, i) => {
              const started = enr.completion_percentage > 0;
              const done = enr.all_lessons_complete === true || enr.status === 'completed';
              const cecHours = enr.cec_hours != null && enr.cec_hours > 0 ? enr.cec_hours : null;
              const pct = done ? 100 : enr.completion_percentage;
              return (
                <li key={enr.id}>
                  <Link
                    href={learnHref(enr)}
                    className="learner-home-card learner-home-glass flex min-h-[8.25rem] overflow-hidden rounded-2xl"
                  >
                    <div
                      className="flex w-[6.75rem] shrink-0 flex-col justify-end px-3.5 py-4 sm:w-[7.25rem]"
                      style={{ backgroundImage: COURSE_TILES[i % COURSE_TILES.length] }}
                    >
                      <p className="text-[9px] leading-[14px] font-semibold tracking-[0.18em] text-slate-400 uppercase">
                        Professional
                        <br />
                        learning
                      </p>
                    </div>
                    <div className="flex min-w-0 flex-1 flex-col justify-between px-5 py-4">
                      <div>
                        <p className="text-[9px] font-semibold tracking-[0.18em] text-slate-400 uppercase">
                          {cecHours != null ? 'IICRC CEC' : 'Professional development'}
                        </p>
                        <h3 className="mt-1 text-[1.05rem] font-semibold tracking-tight text-slate-900">
                          {enr.course_title}
                        </h3>
                      </div>
                      <div className="mt-5">
                        <div className="flex items-center justify-between gap-3 text-[12px] text-slate-400 tabular-nums">
                          <span>
                            {done
                              ? 'Completed'
                              : started
                                ? `${enr.completion_percentage}% complete`
                                : 'Not started'}
                          </span>
                          <span className="min-w-0 truncate">
                            {enr.last_lesson_title && started ? enr.last_lesson_title : ''}
                          </span>
                        </div>
                        <div className="mt-2">
                          <ProgressTrack percent={pct} />
                        </div>
                        <span className="mt-3 inline-flex items-center gap-1 text-[13px] font-medium text-slate-800">
                          {done ? 'View course' : started ? 'Continue' : 'Start course'}
                          <ArrowRight className="h-3.5 w-3.5" aria-hidden />
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

      <section className="grid w-full gap-4 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,0.95fr)]">
        <div className="learner-home-glass rounded-2xl px-7 py-6">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-[1.35rem] font-semibold tracking-tight text-slate-900">
                Your progress
              </h2>
              <p className="mt-1 text-[13px] text-slate-400">
                A quick view of your learning journey.
              </p>
            </div>
            <Sparkle className="h-4 w-4 text-slate-300" aria-hidden />
          </div>
          <dl className="mt-9 grid grid-cols-3 gap-6">
            {(
              [
                [summary?.counts.total ?? 0, 'Courses'],
                [certificates.length, 'Certificate'],
                [formatCec(cec), 'CECs earned'],
              ] as const
            ).map(([value, label]) => (
              <div key={label}>
                <dt className="sr-only">{label}</dt>
                <dd className="bg-gradient-to-b from-slate-900 to-slate-600 bg-clip-text text-[2rem] leading-none font-semibold tracking-tight text-transparent tabular-nums">
                  {value}
                </dd>
                <p className="mt-2 text-[13px] text-slate-400">{label}</p>
              </div>
            ))}
          </dl>
        </div>
        <div className="learner-home-glass rounded-2xl px-7 py-6">
          <div className="flex items-start justify-between gap-3">
            <h2 className="text-[11px] font-semibold tracking-[0.18em] text-slate-400 uppercase">
              IICRC CEC progress
            </h2>
            <CecRing percent={cecPct} />
          </div>
          <p className="mt-4 text-[2rem] leading-none font-semibold tracking-tight text-slate-900 tabular-nums">
            {formatCec(cec)}/{cecTarget} CECs
          </p>
          <div className="mt-6">
            <ProgressTrack percent={cecPct} />
          </div>
          <div className="mt-3 flex items-center justify-between text-[13px] text-slate-400">
            <span>General</span>
            <span>
              {cec >= cecTarget
                ? 'Renewal target reached'
                : `${formatCec(cecRemaining)} CECs remaining`}
            </span>
          </div>
          <Link
            href="/dashboard/student/credentials"
            className="group mt-8 inline-flex items-center gap-1 text-[13px] font-medium text-slate-800"
          >
            View CEC details
            <ArrowRight
              className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5"
              aria-hidden
            />
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
          <ul className="grid w-full gap-4 sm:grid-cols-3">
            {recommended.map((c, i) => (
              <li key={c.id}>
                <Link
                  href={`/dashboard/courses/${encodeURIComponent(c.slug)}`}
                  className="learner-home-card learner-home-glass block overflow-hidden rounded-2xl"
                >
                  <div
                    className="relative h-[7.25rem] overflow-hidden"
                    style={{ backgroundImage: REC_BANDS[i % REC_BANDS.length] }}
                  >
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_20%,rgba(255,255,255,0.18),transparent_45%)]" />
                  </div>
                  <div className="px-5 pt-4 pb-5">
                    <p className="text-[9px] font-semibold tracking-[0.18em] text-slate-400 uppercase">
                      Professional learning
                    </p>
                    <h3 className="mt-1.5 line-clamp-2 min-h-[2.6rem] text-[1.05rem] leading-snug font-semibold tracking-tight text-slate-900">
                      {c.title}
                    </h3>
                    <span className="mt-3 inline-flex items-center gap-1 text-[13px] font-medium text-slate-800">
                      View course
                      <ArrowRight className="h-3.5 w-3.5" aria-hidden />
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
          <ul className="space-y-3">
            {certificates.slice(0, 2).map((c) => (
              <li
                key={c.id}
                className="learner-home-card learner-home-glass flex flex-col gap-3 rounded-2xl px-5 py-4 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="flex min-w-0 items-center gap-3">
                  <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-[#eef7ff] to-[#dbeafe]">
                    <Award className="h-4 w-4 text-[#146fc2]" aria-hidden />
                  </span>
                  <div>
                    <p className="text-[15px] font-medium text-slate-900">{c.course_title}</p>
                    <p className="mt-0.5 text-[13px] text-slate-400">
                      Completed{' '}
                      {c.certificate_issued_at
                        ? new Date(c.certificate_issued_at).toLocaleDateString('en-US', {
                            month: 'long',
                            day: 'numeric',
                            year: 'numeric',
                          })
                        : ''}
                      {c.cec_submission_status === 'sent' ? ' · CEC submitted' : ''}
                    </p>
                  </div>
                </div>
                <a
                  href={`/api/lms/enrollments/${c.id}/certificate`}
                  className="inline-flex items-center justify-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-1.5 text-[13px] text-slate-500 transition hover:border-slate-300 hover:text-slate-800"
                >
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
