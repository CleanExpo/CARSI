'use client';

import { useAuth } from '@/components/auth/auth-provider';
import {
  ContinueLearningBanner,
  type ContinueLearningSnapshot,
} from '@/components/lms/ContinueLearningBanner';
import { EnrolledCourseList } from '@/components/lms/EnrolledCourseList';
import { ErrorBanner } from '@/components/lms/ErrorBanner';
import { PathwayProgressCard } from '@/components/lms/PathwayProgressCard';
import { OnboardingProgramsStrip, OnboardingQuickLink } from '@/components/onboarding/OnboardingProgramsStrip';
import { PushNotificationPrompt } from '@/components/lms/PushNotificationPrompt';
import { apiClient } from '@/lib/api/client';
import { dash } from '@/lib/dashboard-light-ui';
import { ArrowRight } from 'lucide-react';
import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';

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
    () =>
      enrollments.filter((e) => e.status !== 'completed' && e.all_lessons_complete !== true),
    [enrollments]
  );
  const completed = useMemo(
    () => enrollments.filter((e) => e.status === 'completed' || e.all_lessons_complete === true),
    [enrollments]
  );
  const visible = tab === 'completed' ? completed : inProgress;

  return (
    <div className="mx-auto w-full max-w-5xl space-y-8 pb-16">
      <PushNotificationPrompt />

      <header>
        <h1 className={dash.h1}>My Learning</h1>
        <p className={`mt-2 max-w-xl ${dash.lead}`}>
          Your courses, progress and learning history.
        </p>
      </header>

      {tab === 'progress' ? <ContinueLearningBanner snapshot={resume} /> : null}

      <OnboardingProgramsStrip />
      <PathwayProgressCard />

      {sub?.reason === 'grace' ? (
        <div className="rounded-xl border border-[#f2cf8f] bg-[#fff8ed] px-4 py-3 text-sm text-[#7a3500]">
          Your membership payment is past due. You keep access during a 7-day grace period.{' '}
          <Link href="/subscribe" className="underline">
            Manage membership
          </Link>
        </div>
      ) : sub?.reason === 'lapsed' ? (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[#f2b8b8] bg-[#fff5f5] px-4 py-3 text-sm text-[#8a1c1c]">
          <span>Your membership has lapsed. Progress and certificates are retained.</span>
          <Link href="/subscribe" className={dash.btnPrimary}>
            Renew membership
            <ArrowRight className="h-4 w-4" aria-hidden />
          </Link>
        </div>
      ) : null}

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
                ? 'border-[#2490ed]/40 bg-[#eef7ff] text-[#146fc2]'
                : 'border-slate-200 bg-white text-slate-600'
            }`}
          >
            {t.label}
            <span className="ml-1.5 tabular-nums text-slate-400">{t.count}</span>
          </button>
        ))}
        <OnboardingQuickLink />
      </div>

      <section>
        {enrollmentsError ? (
          <ErrorBanner message={enrollmentsError} onRetry={fetchEnrollments} />
        ) : enrollmentsLoading ? (
          <div className="space-y-3" aria-busy="true" aria-label="Loading courses">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-36 animate-pulse rounded-xl border border-slate-200 bg-slate-100" />
            ))}
          </div>
        ) : enrollments.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-300 bg-white px-6 py-12 text-center">
            <p className="text-base font-medium text-slate-900">You have not enrolled in a course yet.</p>
            <p className={`mx-auto mt-2 max-w-sm ${dash.muted}`}>
              Browse the catalogue and start a course. It will appear here with progress.
            </p>
            <Link href="/dashboard/courses" className={`mt-6 ${dash.btnPrimary}`}>
              Browse course catalogue
              <ArrowRight className="h-4 w-4" aria-hidden />
            </Link>
          </div>
        ) : visible.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-300 bg-white px-6 py-10 text-center">
            <p className="text-base font-medium text-slate-900">
              {tab === 'completed'
                ? 'Your completed courses will appear here.'
                : 'No courses in progress.'}
            </p>
            <Link href="/dashboard/courses" className={`mt-6 ${dash.btnSecondary}`}>
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
