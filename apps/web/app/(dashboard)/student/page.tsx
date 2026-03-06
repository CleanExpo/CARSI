'use client';

import { useEffect, useState } from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';
import { XPLevelBadge } from '@/components/lms/XPLevelBadge';
import { StreakTracker } from '@/components/lms/StreakTracker';
import { CECProgressRing } from '@/components/lms/CECProgressRing';
import { IICRCIdentityCard } from '@/components/lms/IICRCIdentityCard';
import { SubscriptionStatus } from '@/components/lms/SubscriptionStatus';
import { EnrolledCourseList } from '@/components/lms/EnrolledCourseList';

const API = process.env.NEXT_PUBLIC_BACKEND_URL ?? 'http://localhost:8000';

function getUserId(): string {
  return typeof window !== 'undefined' ? (localStorage.getItem('carsi_user_id') ?? '') : '';
}

function authHeaders(): Record<string, string> {
  const id = getUserId();
  return id ? { 'X-User-Id': id } : {};
}

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

function ErrorBanner({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="flex items-center gap-2 rounded-sm border border-red-900/50 bg-red-950/30 px-3 py-2 text-sm text-red-400">
      <AlertCircle className="h-4 w-4 flex-shrink-0" />
      <span>{message}</span>
      {onRetry && (
        <button
          onClick={onRetry}
          className="ml-auto flex items-center gap-1 rounded-sm bg-red-900/50 px-2 py-1 text-xs hover:bg-red-900/70"
        >
          <RefreshCw className="h-3 w-3" />
          Retry
        </button>
      )}
    </div>
  );
}

export default function StudentDashboardPage() {
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

  const fetchLevel = async () => {
    const headers = authHeaders();
    if (!headers['X-User-Id']) return;
    setLoading((l) => ({ ...l, level: true }));
    setErrors((e) => ({ ...e, level: null }));
    try {
      const r = await fetch(`${API}/api/lms/gamification/me/level`, { headers });
      if (r.ok) {
        setLevel(await r.json());
      } else {
        setErrors((e) => ({ ...e, level: 'Failed to load progress data' }));
      }
    } catch {
      setErrors((e) => ({ ...e, level: 'Network error loading progress' }));
    } finally {
      setLoading((l) => ({ ...l, level: false }));
    }
  };

  const fetchSub = async () => {
    const headers = authHeaders();
    if (!headers['X-User-Id']) return;
    setLoading((l) => ({ ...l, sub: true }));
    setErrors((e) => ({ ...e, sub: null }));
    try {
      const r = await fetch(`${API}/api/lms/subscription/status`, { headers });
      if (r.ok) {
        setSub(await r.json());
      } else {
        setErrors((e) => ({ ...e, sub: 'Failed to load subscription status' }));
      }
    } catch {
      setErrors((e) => ({ ...e, sub: 'Network error loading subscription' }));
    } finally {
      setLoading((l) => ({ ...l, sub: false }));
    }
  };

  const fetchProfile = async () => {
    const headers = authHeaders();
    if (!headers['X-User-Id']) return;
    setLoading((l) => ({ ...l, profile: true }));
    setErrors((e) => ({ ...e, profile: null }));
    try {
      const r = await fetch(`${API}/api/lms/auth/me`, { headers });
      if (r.ok) {
        setProfile(await r.json());
      } else {
        setErrors((e) => ({ ...e, profile: 'Failed to load profile' }));
      }
    } catch {
      setErrors((e) => ({ ...e, profile: 'Network error loading profile' }));
    } finally {
      setLoading((l) => ({ ...l, profile: false }));
    }
  };

  const fetchEnrollments = async () => {
    const headers = authHeaders();
    if (!headers['X-User-Id']) return;
    setEnrollmentsLoading(true);
    setErrors((e) => ({ ...e, enrollments: null }));
    try {
      const r = await fetch(`${API}/api/lms/enrollments/me`, { headers });
      if (r.ok) {
        setEnrollments(await r.json());
      } else {
        setErrors((e) => ({ ...e, enrollments: 'Failed to load courses' }));
      }
    } catch {
      setErrors((e) => ({ ...e, enrollments: 'Network error loading courses' }));
    } finally {
      setEnrollmentsLoading(false);
    }
  };

  useEffect(() => {
    const headers = authHeaders();
    if (!headers['X-User-Id']) return;

    fetchLevel();
    fetchSub();
    fetchProfile();
    fetchEnrollments();
  }, []);

  function handleManageSubscription() {
    const headers = authHeaders();
    fetch(`${API}/api/lms/subscription/portal`, { method: 'POST', headers })
      .then((r) => r.json())
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
        <h2 className="font-mono text-xs tracking-widest text-white/40 uppercase">My Courses</h2>
        {errors.enrollments ? (
          <ErrorBanner message={errors.enrollments} onRetry={fetchEnrollments} />
        ) : enrollmentsLoading ? (
          <p className="text-sm text-white/30">Loading courses…</p>
        ) : (
          <EnrolledCourseList enrollments={enrollments} />
        )}
      </section>
    </div>
  );
}
