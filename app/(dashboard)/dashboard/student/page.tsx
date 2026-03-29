'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { XPLevelBadge } from '@/components/lms/XPLevelBadge';
import { ErrorBanner } from '@/components/lms/ErrorBanner';
import { StreakTracker } from '@/components/lms/StreakTracker';
import { CECProgressRing } from '@/components/lms/CECProgressRing';
import { IICRCIdentityCard } from '@/components/lms/IICRCIdentityCard';
import { SubscriptionStatus } from '@/components/lms/SubscriptionStatus';
import { EnrolledCourseList } from '@/components/lms/EnrolledCourseList';
import { PushNotificationPrompt } from '@/components/lms/PushNotificationPrompt';
import { RecommendationWidget } from '@/components/lms/RecommendationWidget';
import { useAuth } from '@/components/auth/auth-provider';
import { apiClient } from '@/lib/api/client';

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

  useEffect(() => {
    if (!user) return;
    fetchLevel();
    fetchSub();
    fetchProfile();
    fetchEnrollments();
  }, [user, fetchLevel, fetchSub, fetchProfile, fetchEnrollments]);

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

  return (
    <div className="flex max-w-4xl flex-col gap-8 p-6">
      <PushNotificationPrompt />
      <h1 className="font-mono text-2xl font-bold text-white">
        {profile?.full_name ?? 'My Dashboard'}
      </h1>

      {/* --- Professional Identity Row --- */}
      <section className="grid grid-cols-1 gap-6 md:grid-cols-2">
        {/* IICRC Identity Card */}
        <div className="flex flex-col gap-3">
          <h2 className="font-mono text-xs tracking-widest text-white/40 uppercase">
            IICRC Identity
          </h2>
          {errors.profile ? (
            <ErrorBanner message={errors.profile} onRetry={fetchProfile} />
          ) : loading.profile ? (
            <p className="text-sm text-white/30">Loading profile…</p>
          ) : (
            <IICRCIdentityCard
              memberNumber={profile?.iicrc_member_number}
              cardImageUrl={profile?.iicrc_card_image_url}
              expiryDate={profile?.iicrc_expiry_date}
              certifications={certifications}
            />
          )}
        </div>

        {/* CEC Progress */}
        {profile?.iicrc_member_number && (
          <div className="flex flex-col items-center gap-3">
            <h2 className="self-start font-mono text-xs tracking-widest text-white/40 uppercase">
              CEC Progress
            </h2>
            <CECProgressRing
              cecEarned={0}
              cecRequired={8}
              discipline={certifications[0]?.discipline}
              totalCecLifetime={level?.total_cec_lifetime}
            />
          </div>
        )}
      </section>

      {/* --- XP + Streak Row --- */}
      <section className="flex flex-col gap-3">
        <h2 className="font-mono text-xs tracking-widest text-white/40 uppercase">
          Progress &amp; Streak
        </h2>
        {errors.level ? (
          <ErrorBanner message={errors.level} onRetry={fetchLevel} />
        ) : (
          <div className="flex flex-wrap items-center gap-6">
            {loading.level ? (
              <p className="text-sm text-white/30">Loading…</p>
            ) : level ? (
              <>
                <XPLevelBadge
                  totalXp={level.total_xp}
                  currentLevel={level.current_level}
                  levelTitle={level.level_title}
                  xpToNextLevel={level.xp_to_next_level}
                />
                <StreakTracker
                  currentStreak={level.current_streak}
                  longestStreak={level.longest_streak}
                />
              </>
            ) : (
              <p className="text-sm text-white/30">No progress data available</p>
            )}
          </div>
        )}
      </section>

      {/* --- Subscription Status --- */}
      <section className="flex flex-col gap-3">
        <h2 className="font-mono text-xs tracking-widest text-white/40 uppercase">Subscription</h2>
        {errors.sub ? (
          <ErrorBanner message={errors.sub} onRetry={fetchSub} />
        ) : loading.sub ? (
          <p className="text-sm text-white/30">Loading subscription…</p>
        ) : (
          <SubscriptionStatus
            status={
              sub?.has_subscription
                ? (sub.status as 'trialling' | 'active' | 'past_due' | 'cancelled' | 'unpaid')
                : null
            }
            trialEnd={sub?.trial_end}
            periodEnd={sub?.current_period_end}
            onManage={sub?.has_subscription ? handleManageSubscription : undefined}
            onSubscribe={!sub?.has_subscription ? handleSubscribe : undefined}
          />
        )}
      </section>

      {/* --- Enrolled Courses --- */}
      <section className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h2 className="font-mono text-xs tracking-widest text-white/40 uppercase">My Courses</h2>
          {sub?.has_subscription && ['active', 'trialling'].includes(sub.status ?? '') && (
            <Link
              href="/courses"
              className="text-xs font-medium transition-colors hover:text-white"
              style={{ color: '#2490ed' }}
            >
              Browse all courses →
            </Link>
          )}
        </div>
        {errors.enrollments ? (
          <ErrorBanner message={errors.enrollments} onRetry={fetchEnrollments} />
        ) : enrollmentsLoading ? (
          <p className="text-sm text-white/30">Loading courses…</p>
        ) : enrollments.length === 0 && sub?.has_subscription ? (
          <div
            className="rounded-sm p-6 text-center"
            style={{
              background: 'rgba(36,144,237,0.05)',
              border: '1px solid rgba(36,144,237,0.15)',
            }}
          >
            <p className="mb-1 text-sm font-medium text-white/80">
              Your Pro subscription is active.
            </p>
            <p className="mb-4 text-xs text-white/45">
              Click any course to start — your first access creates your enrolment automatically.
            </p>
            <Link
              href="/courses"
              className="inline-flex items-center rounded-sm px-4 py-2 text-sm font-medium text-white transition-all hover:scale-[1.02]"
              style={{ background: '#2490ed' }}
            >
              Browse all courses
            </Link>
          </div>
        ) : (
          <EnrolledCourseList enrollments={enrollments} />
        )}
      </section>

      {/* --- What's Next For You --- */}
      <section className="flex flex-col gap-3">
        <h2 className="font-mono text-xs tracking-widest text-white/40 uppercase">
          What&apos;s Next For You
        </h2>
        <RecommendationWidget />
      </section>
    </div>
  );
}
