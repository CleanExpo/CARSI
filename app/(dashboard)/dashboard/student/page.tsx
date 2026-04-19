'use client';

import { useAuth } from '@/components/auth/auth-provider';
import {
  ContinueLearningBanner,
  type ContinueLearningSnapshot,
} from '@/components/lms/ContinueLearningBanner';
import { EnrolledCourseList } from '@/components/lms/EnrolledCourseList';
import { ErrorBanner } from '@/components/lms/ErrorBanner';
import { PopularForYouStrip } from '@/components/lms/PopularForYouStrip';
import { PushNotificationPrompt } from '@/components/lms/PushNotificationPrompt';
import { RenewalCockpit } from '@/components/lms/RenewalCockpit';
import { apiClient } from '@/lib/api/client';
import Link from 'next/link';
import { ArrowRight, BookOpen, Sparkles } from 'lucide-react';
import type { RenewalCourseSuggestion } from '@/types/renewal';
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
  }, []);

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

  function handleManageSubscription() {
    apiClient
      .post<{ url: string }>('/api/lms/subscription/portal')
      .then((data) => {
        if (data.url) window.location.href = data.url;
      })
      .catch(() => null);
  }

  function handleSubscribe() {
    window.location.href = '/subscribe';
  }

  const certifications = profile?.iicrc_certifications ?? [];
  const displayName = profile?.full_name?.trim() || user?.email?.split('@')[0] || 'Learner';

  return (
    <div className="mx-auto w-full space-y-10 pb-16">
      <PushNotificationPrompt />

      <ContinueLearningBanner snapshot={resume} />

      {/* Hero */}
      <header className="relative overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-[#2490ed]/18 via-white/[0.04] to-transparent px-6 py-8 shadow-[0_24px_80px_-40px_rgba(36,144,237,0.45)] sm:px-10 sm:py-10">
        <div
          className="pointer-events-none absolute -top-20 -right-20 h-56 w-56 rounded-full bg-[#2490ed]/25 blur-3xl"
          aria-hidden
        />
        <div className="relative">
          <p className="text-[11px] font-semibold tracking-[0.2em] text-white/40 uppercase">
            My learning
          </p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-balance text-white sm:text-4xl">
            {displayName}
          </h1>
          <p className="mt-2 max-w-xl text-sm leading-relaxed text-white/55">
            Your progress, credentials, and courses in one calm workspace — minimal, focused, and
            built for serious training.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              href="/dashboard/courses"
              className="inline-flex items-center rounded-lg border border-white/15 bg-white/5 px-4 py-2 text-sm font-medium text-white/90 transition-colors hover:border-[#2490ed]/40 hover:bg-white/[0.08]"
            >
              Browse catalogue
            </Link>
            <Link
              href="/dashboard/student/credentials"
              className="inline-flex items-center rounded-lg border border-transparent px-4 py-2 text-sm font-medium text-[#7ec5ff] transition-colors hover:text-[#9ed4ff]"
            >
              Certificates →
            </Link>
          </div>
        </div>
      </header>

      <PopularForYouStrip courses={popular} />

      <RenewalCockpit />

      {/* My courses — primary workspace */}
      <section className="relative overflow-hidden rounded-2xl border border-white/10 shadow-[0_0_0_1px_rgba(255,255,255,0.04)_inset]">
        <div
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_90%_60%_at_50%_-30%,rgba(36,144,237,0.22),transparent_55%)]"
          aria-hidden
        />
        <div className="pointer-events-none absolute -right-24 top-1/2 h-64 w-64 -translate-y-1/2 rounded-full bg-[#2490ed]/10 blur-3xl" aria-hidden />
        <div className="relative px-5 py-8 sm:px-10 sm:py-10">
          <div className="flex flex-col gap-8 lg:flex-row lg:items-start lg:justify-between">
            <div className="flex min-w-0 gap-4 sm:gap-5">
              <div
                className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-[#2490ed]/35 bg-gradient-to-br from-[#2490ed]/25 to-[#2490ed]/5 text-[#9ed4ff] shadow-[0_8px_32px_-12px_rgba(36,144,237,0.5)]"
                aria-hidden
              >
                <BookOpen className="h-7 w-7" strokeWidth={1.5} />
              </div>
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-3">
                  <h2 className="text-xl font-semibold tracking-tight text-white sm:text-2xl">
                    My courses
                  </h2>
                  {!enrollmentsLoading && enrollments.length > 0 ? (
                    <span className="rounded-full border border-white/10 bg-white/5 px-3 py-0.5 text-xs font-medium tabular-nums text-white/55">
                      {enrollments.length} enrolled
                    </span>
                  ) : null}
                </div>
                <p className="mt-2 max-w-lg text-sm leading-relaxed text-white/45">
                  Pick up where you left off, track progress, and grab certificates when you finish.
                </p>
              </div>
            </div>
            {sub?.has_subscription && ['active', 'trialling'].includes(sub.status ?? '') ? (
              <Link
                href="/dashboard/courses"
                className="inline-flex shrink-0 items-center justify-center gap-2 self-start rounded-xl border border-white/12 bg-white/5 px-5 py-3 text-sm font-semibold text-white shadow-sm transition-all hover:border-[#2490ed]/45 hover:bg-[#2490ed]/12 hover:text-[#c8e9ff] lg:mt-1"
              >
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
                    className="animate-pulse rounded-2xl border border-white/8 bg-white/5 p-5 sm:p-6"
                  >
                    <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
                      <div className="h-28 rounded-xl bg-white/10 sm:h-24 sm:w-44" />
                      <div className="min-w-0 flex-1 space-y-4">
                        <div className="h-5 max-w-xs rounded-md bg-white/15" />
                        <div className="h-3 max-w-lg rounded bg-white/8" />
                        <div className="h-2 max-w-md rounded-full bg-white/10" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : enrollments.length === 0 && sub?.has_subscription ? (
              <div className="relative overflow-hidden rounded-2xl border border-[#2490ed]/25 bg-gradient-to-br from-[#2490ed]/15 via-white/5 to-transparent p-8 text-center sm:p-12">
                <div
                  className="pointer-events-none absolute -left-16 top-0 h-40 w-40 rounded-full bg-emerald-400/10 blur-3xl"
                  aria-hidden
                />
                <div className="relative mx-auto max-w-md">
                  <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-white/15 bg-white/10 text-amber-200/90 shadow-lg">
                    <Sparkles className="h-7 w-7" aria-hidden />
                  </div>
                  <p className="text-lg font-semibold tracking-tight text-white">
                    Subscription active — your catalogue is unlocked
                  </p>
                  <p className="mt-2 text-sm leading-relaxed text-white/50">
                    Enrol by opening any course. Your first visit creates the enrolment automatically so
                    progress saves here.
                  </p>
                  <Link
                    href="/dashboard/courses"
                    className="mt-8 inline-flex items-center justify-center gap-2 rounded-xl bg-[#2490ed] px-8 py-3.5 text-sm font-semibold text-white shadow-[0_12px_40px_-12px_rgba(36,144,237,0.65)] transition-transform hover:scale-[1.02] hover:bg-[#1f82d4]"
                  >
                    Explore courses
                    <ArrowRight className="h-4 w-4" aria-hidden />
                  </Link>
                </div>
              </div>
            ) : enrollments.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-white/15 bg-white/5 px-6 py-14 text-center sm:px-10">
                <p className="text-base font-medium text-white/80">No enrolments yet</p>
                <p className="mx-auto mt-2 max-w-sm text-sm text-white/45">
                  Browse the catalogue and start a course — it will show up here with progress and
                  completion status.
                </p>
                <Link
                  href="/dashboard/courses"
                  className="mt-8 inline-flex items-center gap-2 rounded-xl border border-white/15 bg-white/5 px-6 py-3 text-sm font-semibold text-white transition-colors hover:border-[#2490ed]/40 hover:bg-[#2490ed]/10"
                >
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
