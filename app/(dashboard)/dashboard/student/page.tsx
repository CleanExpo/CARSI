'use client';

import { useAuth } from '@/components/auth/auth-provider';
import {
  ContinueLearningBanner,
  type ContinueLearningSnapshot,
} from '@/components/lms/ContinueLearningBanner';
import { EnrolledCourseList } from '@/components/lms/EnrolledCourseList';
import { ErrorBanner } from '@/components/lms/ErrorBanner';
import { LearningMomentumLoop } from '@/components/lms/LearningMomentumLoop';
import { PathwayProgressCard } from '@/components/lms/PathwayProgressCard';
import { PopularForYouStrip } from '@/components/lms/PopularForYouStrip';
import { PushNotificationPrompt } from '@/components/lms/PushNotificationPrompt';
import { RenewalCockpit } from '@/components/lms/RenewalCockpit';
import { apiClient } from '@/lib/api/client';
import { dash } from '@/lib/dashboard-light-ui';
import type { RenewalCourseSuggestion } from '@/types/renewal';
import { ArrowRight, Award, BookOpen, Flame, Sparkles, TrendingUp } from 'lucide-react';
import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';

interface LevelData {
  total_xp: number;
  current_level: number;
  level_title: string;
  current_streak: number;
  longest_streak: number;
  xp_to_next_level: number | null;
  total_cec_lifetime?: number;
}

interface SubData {
  has_subscription: boolean;
  status: string | null;
  plan: string | null;
  current_period_end: string | null;
  trial_end: string | null;
}

interface ProfileData {
  full_name: string;
  email: string;
  iicrc_member_number: string | null;
  iicrc_card_image_url: string | null;
  iicrc_expiry_date: string | null;
  iicrc_certifications: Array<{ discipline: string; certified_at: string }> | null;
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
  all_lessons_complete?: boolean;
  certificate_issued_at?: string | null;
}

interface ErrorState {
  level: string | null;
  sub: string | null;
  profile: string | null;
  enrollments: string | null;
}

export default function StudentDashboardPage() {
  const { user } = useAuth();
  const [level, setLevel] = useState<LevelData | null>(null);
  const [sub, setSub] = useState<SubData | null>(null);
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [enrollmentsLoading, setEnrollmentsLoading] = useState(true);
  const [resume, setResume] = useState<ContinueLearningSnapshot | null>(null);
  const [popular, setPopular] = useState<RenewalCourseSuggestion[]>([]);
  const [errors, setErrors] = useState<ErrorState>({
    level: null,
    sub: null,
    profile: null,
    enrollments: null,
  });
  const [loading, setLoading] = useState({
    level: true,
    sub: true,
    profile: true,
  });

  const fetchLevel = useCallback(async () => {
    if (!user) return;
    setLoading((l) => ({ ...l, level: true }));
    setErrors((e) => ({ ...e, level: null }));
    try {
      const data = await apiClient.get<LevelData>('/api/lms/gamification/me/level');
      setLevel(data);
    } catch {
      setErrors((e) => ({ ...e, level: 'Failed to load progress data' }));
    } finally {
      setLoading((l) => ({ ...l, level: false }));
    }
  }, [user]);

  const fetchSub = useCallback(async () => {
    if (!user) return;
    setLoading((l) => ({ ...l, sub: true }));
    setErrors((e) => ({ ...e, sub: null }));
    try {
      const data = await apiClient.get<SubData>('/api/lms/subscription/status');
      setSub(data);
    } catch {
      setErrors((e) => ({ ...e, sub: 'Failed to load subscription status' }));
    } finally {
      setLoading((l) => ({ ...l, sub: false }));
    }
  }, [user]);

  const fetchProfile = useCallback(async () => {
    if (!user) return;
    setLoading((l) => ({ ...l, profile: true }));
    setErrors((e) => ({ ...e, profile: null }));
    try {
      const data = await apiClient.get<ProfileData>('/api/lms/auth/me');
      setProfile(data);
    } catch {
      setErrors((e) => ({ ...e, profile: 'Failed to load profile' }));
    } finally {
      setLoading((l) => ({ ...l, profile: false }));
    }
  }, [user]);

  const fetchEnrollments = useCallback(async () => {
    if (!user) return;
    setEnrollmentsLoading(true);
    setErrors((e) => ({ ...e, enrollments: null }));
    try {
      const data = await apiClient.get<Enrollment[]>('/api/lms/enrollments/me');
      setEnrollments(data);
    } catch {
      setErrors((e) => ({ ...e, enrollments: 'Failed to load courses' }));
    } finally {
      setEnrollmentsLoading(false);
    }
  }, [user]);

  const fetchResumeAndPopular = useCallback(async () => {
    if (!user) return;
    try {
      const [resumeData, recData] = await Promise.all([
        apiClient.get<ContinueLearningSnapshot | null>('/api/lms/learner/resume'),
        apiClient.get<RenewalCourseSuggestion[]>('/api/lms/recommendations/next-course'),
      ]);
      setResume(resumeData && typeof resumeData === 'object' ? resumeData : null);
      setPopular(Array.isArray(recData) ? recData : []);
    } catch {
      setResume(null);
      setPopular([]);
    }
  }, [user]);

  useEffect(() => {
    if (!user) return;
    fetchLevel();
    fetchSub();
    fetchProfile();
    fetchEnrollments();
    fetchResumeAndPopular();
  }, [user, fetchLevel, fetchSub, fetchProfile, fetchEnrollments, fetchResumeAndPopular]);

  const displayName = profile?.full_name?.trim() || user?.email?.split('@')[0] || 'Learner';

  return (
    <div className="mx-auto w-full space-y-10 pb-16">
      <PushNotificationPrompt />

      <ContinueLearningBanner snapshot={resume} />

      <LearningMomentumLoop
        resume={resume}
        enrollments={enrollments}
        recommendationsCount={popular.length}
        loading={enrollmentsLoading}
      />

      <PathwayProgressCard />

      {/* Hero */}
      <header className={`relative ${dash.hero} px-6 py-8 sm:px-10 sm:py-10`}>
        <div className="pointer-events-none absolute inset-0 rounded-2xl bg-gradient-to-br from-[#eef7ff] via-white to-white" aria-hidden />
        <div className="relative flex flex-col gap-10 lg:flex-row lg:items-stretch lg:justify-between lg:gap-12">
          <div className="min-w-0 flex-1">
            <p className={dash.eyebrow}>My learning</p>
            <h1 className={`mt-3 text-balance sm:text-4xl ${dash.h1}`}>
              Welcome back, <span className="text-[#146fc2]">{displayName}</span>
            </h1>
            <p className={`mt-3 max-w-xl sm:text-base ${dash.lead}`}>
              Pick up where you left off, track CECs, and move through courses the same way you
              would on major learning platforms — built for shift work and on-site schedules.
            </p>

            <div className="mt-6 flex flex-wrap gap-2.5">
              <Link href="/dashboard/courses" className={dash.btnPrimary}>
                Browse catalogue
                <ArrowRight className="h-4 w-4 opacity-90" aria-hidden />
              </Link>
              <Link href="/dashboard/student/credentials" className={dash.btnSecondary}>
                Certificates
              </Link>
              <Link href="/dashboard/student/notes" className={dash.btnGhost}>
                Notes
              </Link>
              <Link href="/dashboard/student/leaderboard" className={dash.btnGhost}>
                Recognition
              </Link>
            </div>
          </div>

          <div className="grid shrink-0 grid-cols-2 gap-3 sm:max-w-md lg:w-[340px] lg:max-w-none">
            <div className={dash.statCard}>
              <div className="flex items-center gap-2 text-[#2490ed]">
                <TrendingUp className="h-4 w-4" aria-hidden />
                <span className={dash.statLabel}>Level</span>
              </div>
              <p className={`mt-2 text-2xl font-bold tabular-nums ${dash.statValue}`}>
                {loading.level ? '—' : (level?.current_level ?? '—')}
              </p>
              <p className={`mt-0.5 line-clamp-2 ${dash.statHint}`}>
                {loading.level ? 'Loading…' : (level?.level_title ?? 'Your progress')}
              </p>
            </div>
            <div className={dash.statCard}>
              <div className="flex items-center gap-2 text-orange-500">
                <Flame className="h-4 w-4" aria-hidden />
                <span className={dash.statLabel}>Streak</span>
              </div>
              <p className={`mt-2 text-2xl font-bold tabular-nums ${dash.statValue}`}>
                {loading.level ? '—' : (level?.current_streak ?? 0)}
              </p>
              <p className={`mt-0.5 ${dash.statHint}`}>Active days</p>
            </div>
            <div className={dash.statCard}>
              <div className="flex items-center gap-2 text-emerald-600">
                <BookOpen className="h-4 w-4" aria-hidden />
                <span className={dash.statLabel}>Courses</span>
              </div>
              <p className={`mt-2 text-2xl font-bold tabular-nums ${dash.statValue}`}>
                {enrollmentsLoading ? '—' : enrollments.length}
              </p>
              <p className={`mt-0.5 ${dash.statHint}`}>Enrolled</p>
            </div>
            <div className={dash.statCard}>
              <div className="flex items-center gap-2 text-violet-600">
                <Award className="h-4 w-4" aria-hidden />
                <span className={dash.statLabel}>CECs</span>
              </div>
              <p className={`mt-2 text-2xl font-bold tabular-nums ${dash.statValue}`}>
                {loading.level
                  ? '—'
                  : level?.total_cec_lifetime != null
                    ? Number(level.total_cec_lifetime).toFixed(1)
                    : '—'}
              </p>
              <p className={`mt-0.5 ${dash.statHint}`}>Tracked (lifetime)</p>
            </div>
          </div>
        </div>
      </header>

      <PopularForYouStrip courses={popular} />

      <RenewalCockpit />

      {/* My courses — primary workspace */}
      <section className={`${dash.card} relative overflow-hidden`}>
        <div className="relative px-5 py-8 sm:px-10 sm:py-10">
          <div className="flex flex-col gap-8 lg:flex-row lg:items-start lg:justify-between">
            <div className="flex min-w-0 gap-4 sm:gap-5">
              <div
                className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-[#2490ed]/25 bg-[#eef7ff] text-[#146fc2] shadow-sm"
                aria-hidden
              >
                <BookOpen className="h-7 w-7" strokeWidth={1.5} />
              </div>
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-3">
                  <h2 className={dash.h2}>My courses</h2>
                  {!enrollmentsLoading && enrollments.length > 0 ? (
                    <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-0.5 text-xs font-medium text-slate-600 tabular-nums">
                      {enrollments.length} enrolled
                    </span>
                  ) : null}
                </div>
                <p className={`mt-2 max-w-lg ${dash.lead}`}>
                  Pick up where you left off, track progress, and grab certificates when you finish.
                </p>
              </div>
            </div>
            {sub?.has_subscription && ['active', 'trialling'].includes(sub.status ?? '') ? (
              <Link href="/dashboard/courses" className={`${dash.btnSecondary} self-start lg:mt-1`}>
                Browse catalogue
                <ArrowRight className="h-4 w-4 opacity-80" aria-hidden />
              </Link>
            ) : null}
          </div>

          <div className="mt-10">
            {errors.enrollments ? (
              <ErrorBanner message={errors.enrollments} onRetry={fetchEnrollments} />
            ) : enrollmentsLoading ? (
              <div className="space-y-4" aria-busy="true" aria-label="Loading courses">
                {[1, 2, 3].map((i) => (
                  <div
                    key={i}
                    className="animate-pulse rounded-2xl border border-slate-200 bg-slate-50 p-5 sm:p-6"
                  >
                    <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
                      <div className="h-28 rounded-xl bg-slate-200 sm:h-24 sm:w-44" />
                      <div className="min-w-0 flex-1 space-y-4">
                        <div className="h-5 max-w-xs rounded-md bg-slate-200" />
                        <div className="h-3 max-w-lg rounded bg-slate-100" />
                        <div className="h-2 max-w-md rounded-full bg-slate-200" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : enrollments.length === 0 && sub?.has_subscription ? (
              <div className="relative overflow-hidden rounded-2xl border border-[#2490ed]/25 bg-gradient-to-br from-[#eef7ff] to-white p-8 text-center sm:p-12">
                <div className="relative mx-auto max-w-md">
                  <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-slate-200 bg-white text-amber-500 shadow-sm">
                    <Sparkles className="h-7 w-7" aria-hidden />
                  </div>
                  <p className="text-lg font-semibold tracking-tight text-slate-900">
                    Subscription active — your catalogue is unlocked
                  </p>
                  <p className={`mt-2 ${dash.lead}`}>
                    Enrol by opening any course. Your first visit creates the enrolment
                    automatically so progress saves here.
                  </p>
                  <Link href="/dashboard/courses" className={`mt-8 ${dash.btnPrimary}`}>
                    Explore courses
                    <ArrowRight className="h-4 w-4" aria-hidden />
                  </Link>
                </div>
              </div>
            ) : enrollments.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-6 py-14 text-center sm:px-10">
                <p className="text-base font-medium text-slate-800">No enrolments yet</p>
                <p className={`mx-auto mt-2 max-w-sm ${dash.muted}`}>
                  Browse the catalogue and start a course — it will show up here with progress and
                  completion status.
                </p>
                <Link href="/dashboard/courses" className={`mt-8 ${dash.btnSecondary}`}>
                  Browse catalogue
                  <ArrowRight className="h-4 w-4" aria-hidden />
                </Link>
              </div>
            ) : (
              <EnrolledCourseList enrollments={enrollments} />
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
