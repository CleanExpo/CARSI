'use client';

import { useAuth } from '@/components/auth/auth-provider';
import {
  ContinueLearningBanner,
  type ContinueLearningSnapshot,
} from '@/components/lms/ContinueLearningBanner';
import { EnrolledCourseList } from '@/components/lms/EnrolledCourseList';
import { ErrorBanner } from '@/components/lms/ErrorBanner';
import { PathwayProgressCard } from '@/components/lms/PathwayProgressCard';
import { PushNotificationPrompt } from '@/components/lms/PushNotificationPrompt';
import {
  OnboardingProgramsStrip,
  OnboardingQuickLink,
} from '@/components/onboarding/OnboardingProgramsStrip';
import { apiClient } from '@/lib/api/client';
import { formatCecHoursForDisplay } from '@/lib/cec-display';
import { RENEWAL_CEC_REQUIRED } from '@/types/renewal';
import { ArrowRight } from 'lucide-react';
import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';

const surface = 'learner-home-surface learner-home-card overflow-hidden rounded-[1.25rem]';
const inset = 'learner-home-inset';
const kicker =
  'bg-gradient-to-r from-sky-200 via-cyan-200 to-indigo-200 bg-clip-text text-[11px] font-semibold tracking-[0.2em] text-transparent uppercase';
const heading = 'font-semibold tracking-[-0.02em] text-white';
const muted = 'text-slate-300/80';
const btn =
  'inline-flex items-center justify-center gap-2 rounded-full bg-gradient-to-r from-white via-sky-50 to-white px-5 py-2.5 text-[13px] font-semibold text-slate-950 shadow-[0_10px_28px_-10px_rgba(56,189,248,0.8)] transition hover:from-sky-50 hover:to-white';
const btnGhost =
  'inline-flex items-center justify-center gap-2 rounded-full border border-white/15 bg-white/5 px-5 py-2.5 text-[13px] font-semibold text-sky-100 transition hover:border-sky-200/40 hover:bg-white/10';

interface SubData {
  has_subscription: boolean;
  status: string | null;
  reason?: 'active' | 'grace' | 'lapsed' | 'none' | 'unknown';
}

interface Enrollment {
  id: string;
  course_id: string;
  course_title: string;
  course_slug: string;
  status: string;
  enrolled_at: string;
  completion_percentage: number;
  thumbnail_url?: string | null;
  last_lesson_id?: string | null;
  last_lesson_title?: string | null;
  last_activity_at?: string | null;
  completed_at?: string | null;
  all_lessons_complete?: boolean;
  certificate_issued_at?: string | null;
  cec_submission_status?: string | null;
  cec_submitted_at?: string | null;
  description?: string | null;
  category?: string | null;
  cec_hours?: number | null;
  lessons_total?: number;
  lessons_completed?: number;
}

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
      <span className="absolute inset-0 flex items-center justify-center text-[1.2rem] font-semibold text-white tabular-nums">
        {pct}
        <span className="text-[0.65rem] text-slate-400">%</span>
      </span>
    </div>
  );
}

export default function StudentDashboardPage() {
  const { user } = useAuth();
  const [sub, setSub] = useState<SubData | null>(null);
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [enrollmentsLoading, setEnrollmentsLoading] = useState(true);
  const [resume, setResume] = useState<ContinueLearningSnapshot | null>(null);
  const [enrollmentsError, setEnrollmentsError] = useState<string | null>(null);
  const [tab, setTab] = useState<'progress' | 'completed'>('progress');

  const fetchSub = useCallback(async () => {
    if (!user) return;
    try {
      setSub(await apiClient.get<SubData>('/api/lms/subscription/status'));
    } catch {
      setSub(null);
    }
  }, [user]);

  const fetchEnrollments = useCallback(async () => {
    if (!user) return;
    setEnrollmentsLoading(true);
    setEnrollmentsError(null);
    try {
      setEnrollments(await apiClient.get<Enrollment[]>('/api/lms/enrollments/me'));
    } catch {
      setEnrollmentsError('Your courses could not be loaded.');
    } finally {
      setEnrollmentsLoading(false);
    }
  }, [user]);

  const fetchResume = useCallback(async () => {
    if (!user) return;
    try {
      const resumeData = await apiClient.get<ContinueLearningSnapshot | null>(
        '/api/lms/learner/resume'
      );
      setResume(resumeData && typeof resumeData === 'object' ? resumeData : null);
    } catch {
      setResume(null);
    }
  }, [user]);

  useEffect(() => {
    if (!user) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- fetch-on-mount for the signed-in learner
    fetchSub();
    fetchEnrollments();
    fetchResume();
  }, [user, fetchSub, fetchEnrollments, fetchResume]);

  const inProgress = useMemo(
    () => enrollments.filter((e) => e.status !== 'completed' && e.all_lessons_complete !== true),
    [enrollments]
  );
  const completed = useMemo(
    () => enrollments.filter((e) => e.status === 'completed' || e.all_lessons_complete === true),
    [enrollments]
  );
  const visible = tab === 'completed' ? completed : inProgress;
  const certificates = completed.filter((e) => e.certificate_issued_at);
  const approvedCec = completed.reduce(
    (sum, e) => sum + (e.cec_hours != null && e.cec_hours > 0 ? e.cec_hours : 0),
    0
  );
  const cecTarget = RENEWAL_CEC_REQUIRED;
  const cecPct = Math.min(100, (approvedCec / cecTarget) * 100);
  const cecRemaining = Math.max(0, cecTarget - approvedCec);
  const cecLabel = formatCecHoursForDisplay(approvedCec);
  const resumeEnrollment = resume
    ? enrollments.find((e) => e.course_slug === resume.course_slug)
    : undefined;

  return (
    <div className="learner-home -mx-4 w-[calc(100%+2rem)] min-w-0 space-y-10 px-4 pb-16 sm:-mx-6 sm:w-[calc(100%+3rem)] sm:px-6 lg:-mx-10 lg:w-[calc(100%+5rem)] lg:px-10">
      <PushNotificationPrompt />

      <header>
        <p className="text-[13px] text-slate-500">Your enrolled courses</p>
        <h1 className="mt-2 text-[2.4rem] leading-[1.05] font-semibold tracking-tight text-slate-950 sm:text-[2.75rem]">
          My Learning
        </h1>
        <p className="mt-3 max-w-xl text-[15px] leading-6 text-slate-500">
          Progress, next lessons, certificates, and approved IICRC CEC hours — only where the IICRC
          has confirmed them.
        </p>
      </header>

      {enrollments.length > 0 && !enrollmentsLoading ? (
        <section className="grid w-full items-stretch gap-5 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)]">
          <div className={`${surface} px-7 py-7`}>
            <p className={kicker}>Your record</p>
            <p className={`mt-2 text-[14px] ${muted}`}>A detailed view of this learning account.</p>
            <dl className="mt-7 grid grid-cols-2 gap-3 sm:grid-cols-4">
              {(
                [
                  [inProgress.length, inProgress.length === 1 ? 'In progress' : 'In progress'],
                  [completed.length, completed.length === 1 ? 'Completed' : 'Completed'],
                  [certificates.length, certificates.length === 1 ? 'Certificate' : 'Certificates'],
                  [cecLabel ?? '0', 'Approved CEC'],
                ] as const
              ).map(([value, label]) => (
                <div key={label} className={`${inset} rounded-xl px-3 py-4`}>
                  <dt className={`text-[11px] ${muted}`}>{label}</dt>
                  <dd className={`mt-2 text-[1.85rem] leading-none tabular-nums ${heading}`}>
                    {value}
                  </dd>
                </div>
              ))}
            </dl>
          </div>
          <div className={`${surface} flex flex-col px-7 py-7`}>
            <p className={kicker}>IICRC CEC progress</p>
            <div className="mt-6 flex items-center gap-5">
              <BrandRing percent={cecPct} size={84} stroke={7} id="learning-cec-ring" />
              <p className={`text-[2.1rem] leading-none tabular-nums ${heading}`}>
                {cecLabel ?? '0'}
                <span className="text-[1.05rem] font-medium text-slate-400">/{cecTarget}</span>
              </p>
            </div>
            <div className="mt-6">
              <ProgressTrack percent={cecPct} />
            </div>
            <p className={`mt-3 text-[13px] ${muted}`}>
              {approvedCec >= cecTarget
                ? 'Renewal target reached'
                : `${formatCecHoursForDisplay(cecRemaining) ?? cecRemaining} CECs remaining toward the ${cecTarget}-hour renewal target. Unapproved courses add none.`}
            </p>
            <Link
              href="/dashboard/student/credentials"
              className={`${btnGhost} mt-auto self-start pt-6`}
            >
              View certificates
              <ArrowRight className="h-4 w-4" aria-hidden />
            </Link>
          </div>
        </section>
      ) : null}

      {tab === 'progress' ? (
        <ContinueLearningBanner
          snapshot={resume}
          progressPercent={resumeEnrollment?.completion_percentage}
          description={resumeEnrollment?.description}
          lessonIndex={resumeEnrollment?.lessons_completed}
          lessonTotal={resumeEnrollment?.lessons_total}
        />
      ) : null}

      <OnboardingProgramsStrip />
      <PathwayProgressCard />

      {sub?.reason === 'grace' ? (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          Your membership payment is past due. You keep access during a 7-day grace period.{' '}
          <Link href="/subscribe" className="underline">
            Manage membership
          </Link>
        </div>
      ) : sub?.reason === 'lapsed' ? (
        <div className={`${surface} flex flex-wrap items-center justify-between gap-3 px-5 py-4`}>
          <span className={`text-sm ${muted}`}>
            Your membership has lapsed. Progress and certificates are retained.
          </span>
          <Link href="/subscribe" className={btn}>
            Renew membership
            <ArrowRight className="h-4 w-4" aria-hidden />
          </Link>
        </div>
      ) : null}

      <div>
        <div className="mb-5 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h2 className="text-[1.4rem] font-semibold tracking-tight text-slate-950">
              {tab === 'completed' ? 'Completed courses' : 'Courses in progress'}
            </h2>
            <p className="mt-1 text-[14px] text-slate-500">
              {tab === 'completed'
                ? 'Certificates and CEC submission status for finished courses.'
                : 'Pick up a course, see the next lesson, and track approved CEC hours.'}
            </p>
          </div>
          <Link
            href="/dashboard/courses"
            className="inline-flex shrink-0 items-center gap-1.5 text-[13px] font-medium text-slate-500 transition hover:text-[#146fc2]"
          >
            Browse catalogue
            <ArrowRight className="h-3.5 w-3.5" aria-hidden />
          </Link>
        </div>
        <div className="flex flex-wrap items-center gap-2" role="tablist" aria-label="Course lists">
          {(
            [
              { id: 'progress' as const, label: 'In progress', count: inProgress.length },
              { id: 'completed' as const, label: 'Completed', count: completed.length },
            ] as const
          ).map((t) => (
            <button
              key={t.id}
              type="button"
              role="tab"
              aria-selected={tab === t.id}
              onClick={() => setTab(t.id)}
              className={`min-h-11 rounded-full border px-4 py-2 text-sm font-medium ${
                tab === t.id
                  ? 'learner-home-surface border-sky-300/30 text-white'
                  : 'border-slate-200 bg-white text-slate-600'
              }`}
            >
              {t.label}
              <span
                className={`ml-1.5 tabular-nums ${tab === t.id ? 'text-sky-200' : 'text-slate-400'}`}
              >
                {t.count}
              </span>
            </button>
          ))}
          <OnboardingQuickLink />
        </div>
      </div>

      <section>
        {enrollmentsError ? (
          <ErrorBanner message={enrollmentsError} onRetry={fetchEnrollments} />
        ) : enrollmentsLoading ? (
          <div className="space-y-3" aria-busy="true" aria-label="Loading courses">
            {[1, 2, 3].map((i) => (
              <div key={i} className={`${surface} h-36 animate-pulse`} />
            ))}
          </div>
        ) : enrollments.length === 0 ? (
          <div className={`${surface} learner-home-surface--hero px-8 py-14 text-center`}>
            <p className={`text-[1.25rem] ${heading}`}>You have not enrolled in a course yet.</p>
            <p className={`mx-auto mt-2 max-w-sm text-[15px] ${muted}`}>
              Browse the catalogue and start a course. It will appear here with progress.
            </p>
            <Link href="/dashboard/courses" className={`${btn} mt-8`}>
              Browse course catalogue
              <ArrowRight className="h-4 w-4" aria-hidden />
            </Link>
          </div>
        ) : visible.length === 0 ? (
          <div className={`${surface} px-8 py-12 text-center`}>
            <p className={`text-[1.15rem] ${heading}`}>
              {tab === 'completed'
                ? 'Your completed courses will appear here.'
                : 'No courses in progress.'}
            </p>
            <Link href="/dashboard/courses" className={`${btnGhost} mt-8`}>
              Browse course catalogue
            </Link>
          </div>
        ) : (
          <EnrolledCourseList enrollments={visible} />
        )}
      </section>
    </div>
  );
}
