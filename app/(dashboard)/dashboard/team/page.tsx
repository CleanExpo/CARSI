'use client';

import { Suspense, useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';

import { useAuth } from '@/components/auth/auth-provider';
import { ErrorBanner } from '@/components/lms/ErrorBanner';
import { TEAM_TIERS, type TeamBundleTierId } from '@/lib/lms/pricing-tiers';
import { apiClient, ApiClientError } from '@/lib/api/client';

interface TeamMember {
  user_id: string;
  role: string;
  email: string;
  full_name: string | null;
}

interface PendingInvite {
  id: string;
  email: string;
  role: string;
  expires_at: string;
}

interface TeamCoursePurchase {
  id: string;
  course_slug: string;
  course_title: string;
  seat_limit: number;
  seats_used: number;
  seats_remaining: number;
  purchased_at: string;
}

interface TeamCourseSeatPool {
  course_slug: string;
  course_title: string;
  seat_limit: number;
  seats_used: number;
  seats_remaining: number;
  purchase_count: number;
  purchases: TeamCoursePurchase[];
}

interface TeamMemberAssignedCourse {
  slug: string;
  title: string;
}

interface TeamPayload {
  id: string;
  name: string;
  slug: string;
  bundle_tier: string;
  is_owner: boolean;
  course_slug?: string | null;
  seat_limit?: number;
  seats_used?: number;
  members?: TeamMember[];
  pending_invites?: PendingInvite[];
  course_purchases?: TeamCoursePurchase[];
  course_seat_pools?: TeamCourseSeatPool[];
  added_by?: { full_name: string | null; email: string };
  my_team_courses?: TeamMemberAssignedCourse[];
}

function TeamDashboardPage() {
  const { user } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();

  const sessionId = searchParams.get('session_id');
  const fromPurchase = searchParams.get('from_purchase') === '1';
  const purchasedCourse = searchParams.get('course');
  const purchasedSeats = searchParams.get('seats');
  const createTier = searchParams.get('create') as TeamBundleTierId | null;
  const showAnnualPlanForm = Boolean(
    createTier && TEAM_TIERS.some((t) => t.id === createTier),
  );

  const [team, setTeam] = useState<TeamPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const [teamName, setTeamName] = useState('My team');
  const [editingName, setEditingName] = useState(false);
  const [selectedTier, setSelectedTier] = useState<TeamBundleTierId>(
    createTier && TEAM_TIERS.some((t) => t.id === createTier) ? createTier : 'starter',
  );
  const [inviteEmail, setInviteEmail] = useState('');
  const [assignableCourses, setAssignableCourses] = useState<
    {
      slug: string;
      title: string;
      is_team_purchase_course: boolean;
      seat_limit?: number;
      seats_used?: number;
      seats_remaining?: number;
      team_purchase_count?: number;
    }[]
  >([]);
  const [selectedCourseSlugs, setSelectedCourseSlugs] = useState<string[]>([]);
  const [coursesLoading, setCoursesLoading] = useState(false);

  const [checkoutEmail, setCheckoutEmail] = useState('');
  const [setupPassword, setSetupPassword] = useState('');
  const [setupLoading, setSetupLoading] = useState(false);

  const needsCheckoutSetup = Boolean(sessionId && !user);
  const hasSyncedRef = useRef(false);
  const initialSessionIdRef = useRef(sessionId);

  const syncTeam = useCallback(async (activateSessionId?: string) => {
    const data = await apiClient.post<{ team: TeamPayload | null; detail?: string }>(
      '/api/lms/teams/activate-purchase',
      activateSessionId ? { session_id: activateSessionId } : {},
    );
    if (data.team) {
      setTeam(data.team);
      setTeamName(data.team.name);
      return data.team;
    }
    if (data.detail) setError(data.detail);
    const me = await apiClient.get<{ team: TeamPayload | null }>('/api/lms/teams/me');
    if (me.team) {
      setTeam(me.team);
      setTeamName(me.team.name);
      return me.team;
    }
    return null;
  }, []);

  useEffect(() => {
    if (!sessionId || user) return;
    let cancelled = false;
    fetch(`/api/lms/checkout/session?session_id=${encodeURIComponent(sessionId)}`)
      .then((r) => r.json() as Promise<{ email?: string }>)
      .then((data) => {
        if (!cancelled && data.email) setCheckoutEmail(data.email);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [sessionId, user]);

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }
    if (hasSyncedRef.current) return;

    let cancelled = false;
    const activateSessionId = initialSessionIdRef.current ?? undefined;

    (async () => {
      setLoading(true);
      setError(null);
      try {
        await syncTeam(activateSessionId);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof ApiClientError ? err.message : 'Failed to load team');
        }
      } finally {
        if (!cancelled) {
          hasSyncedRef.current = true;
          setLoading(false);
          if (activateSessionId) {
            const params = new URLSearchParams(searchParams.toString());
            params.delete('session_id');
            const qs = params.toString();
            router.replace(qs ? `/dashboard/team?${qs}` : '/dashboard/team');
          }
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [user, syncTeam, router, searchParams]);

  async function handleCheckoutSetup(e: React.FormEvent) {
    e.preventDefault();
    if (!sessionId || setupPassword.length < 8) return;
    setSetupLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/lms/enrollments/guest-complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          session_id: sessionId,
          password: setupPassword,
          team_name: teamName,
        }),
      });
      const data = (await res.json().catch(() => ({}))) as { detail?: string; learn_url?: string };
      if (!res.ok) {
        setError(data.detail ?? 'Could not finish setup');
        return;
      }
      sessionStorage.removeItem('carsi_guest_checkout');
      window.location.href = data.learn_url ?? '/dashboard/team?from_purchase=1';
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setSetupLoading(false);
    }
  }

  async function handleSaveTeamName(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setSuccess(null);
    try {
      const data = await apiClient.patch<{ name: string }>('/api/lms/teams/me', { name: teamName });
      setTeam((t) => (t ? { ...t, name: data.name } : t));
      setEditingName(false);
      setSuccess('Team name saved.');
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : 'Could not save team name');
    } finally {
      setBusy(false);
    }
  }

  async function handleCreateAnnualTeam(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await apiClient.post('/api/lms/teams', {
        name: teamName,
        bundle_tier: selectedTier,
      });
      await syncTeam();
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : 'Could not create team');
    } finally {
      setBusy(false);
    }
  }

  const loadAssignableCourses = useCallback(async () => {
    setCoursesLoading(true);
    try {
      const data = await apiClient.get<{
        courses: { slug: string; title: string; is_team_purchase_course: boolean }[];
      }>('/api/lms/teams/assignable-courses');
      const list = data.courses ?? [];
      setAssignableCourses(list);
      setSelectedCourseSlugs((prev) => {
        if (prev.length > 0) return prev.filter((s) => list.some((c) => c.slug === s));
        const defaults = list.filter((c) => c.is_team_purchase_course).map((c) => c.slug);
        if (defaults.length > 0) return defaults;
        return list.length === 1 ? [list[0]!.slug] : [];
      });
    } catch {
      setAssignableCourses([]);
    } finally {
      setCoursesLoading(false);
    }
  }, []);

  useEffect(() => {
    if (user && team?.is_owner) void loadAssignableCourses();
  }, [user, team?.is_owner, team?.id, loadAssignableCourses]);

  function toggleCourseSlug(slug: string) {
    setSelectedCourseSlugs((prev) =>
      prev.includes(slug) ? prev.filter((s) => s !== slug) : [...prev, slug],
    );
  }

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault();
    if (!team) return;
    if (selectedCourseSlugs.length === 0) {
      setError('Select at least one course for this person.');
      return;
    }
    setBusy(true);
    setError(null);
    setSuccess(null);
    try {
      const data = await apiClient.post<{ message?: string; email?: string }>('/api/lms/teams/invite', {
        email: inviteEmail,
        course_slugs: selectedCourseSlugs,
      });
      setInviteEmail('');
      setSuccess(data.message ?? `Added ${data.email}. They will receive an email with access details.`);
      await syncTeam();
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : 'Could not add team member');
    } finally {
      setBusy(false);
    }
  }

  if (needsCheckoutSetup) {
    return (
      <div className="mx-auto max-w-lg space-y-6">
        <header>
          <p className="text-[11px] font-semibold tracking-[0.2em] text-[#2490ed]/80 uppercase">
            Team setup
          </p>
          <h1 className="mt-2 text-2xl font-bold text-white">Your team is ready</h1>
          <p className="mt-2 text-sm text-white/50">
            Payment received{purchasedSeats ? ` for ${purchasedSeats} seats` : ''}. Name your team,
            set a password, then add learners by email.
          </p>
        </header>
        {error ? <ErrorBanner message={error} /> : null}
        <form
          onSubmit={handleCheckoutSetup}
          className="space-y-4 rounded-2xl border border-white/10 p-6"
        >
          {checkoutEmail ? (
            <p className="text-sm text-white/55">
              Account email: <span className="text-white/85">{checkoutEmail}</span>
            </p>
          ) : null}
          <label className="block text-sm text-white/70">
            Team name
            <input
              required
              minLength={2}
              value={teamName}
              onChange={(e) => setTeamName(e.target.value)}
              className="mt-1 w-full rounded-lg border border-white/12 bg-black/30 px-3 py-2 text-white"
              placeholder="e.g. Acme Restoration"
            />
          </label>
          <label className="block text-sm text-white/70">
            Password (for your CARSI account)
            <input
              required
              type="password"
              minLength={8}
              value={setupPassword}
              onChange={(e) => setSetupPassword(e.target.value)}
              className="mt-1 w-full rounded-lg border border-white/12 bg-black/30 px-3 py-2 text-white"
            />
          </label>
          <button
            type="submit"
            disabled={setupLoading}
            className="w-full rounded-xl bg-[#2490ed] py-2.5 text-sm font-semibold text-white disabled:opacity-50"
          >
            {setupLoading ? 'Saving…' : 'Continue to add team members'}
          </button>
        </form>
      </div>
    );
  }

  if (!user) {
    return (
      <p className="text-white/60">
        <Link href="/login" className="text-[#7ec5ff] hover:underline">
          Sign in
        </Link>{' '}
        to manage your team.
      </p>
    );
  }

  if (loading) {
    return <p className="text-white/50">Loading your team…</p>;
  }

  if (!team && showAnnualPlanForm) {
    return (
      <div className="mx-auto max-w-lg space-y-6">
        <header>
          <p className="text-[11px] font-semibold tracking-[0.2em] text-[#2490ed]/80 uppercase">
            Teams
          </p>
          <h1 className="mt-2 text-2xl font-bold text-white">Annual team plan</h1>
          <p className="mt-2 text-sm text-white/50">
            Subscribe to a yearly team bundle from{' '}
            <Link href="/pricing" className="text-[#7ec5ff] hover:underline">
              pricing
            </Link>
            .
          </p>
        </header>
        {error ? <ErrorBanner message={error} /> : null}
        <form
          onSubmit={handleCreateAnnualTeam}
          className="space-y-4 rounded-2xl border border-white/10 p-6"
        >
          <label className="block text-sm text-white/70">
            Team name
            <input
              required
              value={teamName}
              onChange={(e) => setTeamName(e.target.value)}
              className="mt-1 w-full rounded-lg border border-white/12 bg-black/30 px-3 py-2 text-white"
            />
          </label>
          <label className="block text-sm text-white/70">
            Bundle
            <select
              value={selectedTier}
              onChange={(e) => setSelectedTier(e.target.value as TeamBundleTierId)}
              className="mt-1 w-full rounded-lg border border-white/12 bg-black/30 px-3 py-2 text-white"
            >
              {TEAM_TIERS.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name} — {t.priceLabel} ({t.seatsIncluded} seats)
                </option>
              ))}
            </select>
          </label>
          <button
            type="submit"
            disabled={busy}
            className="w-full rounded-xl bg-[#2490ed] py-2.5 text-sm font-semibold text-white disabled:opacity-50"
          >
            {busy ? 'Creating…' : 'Create team'}
          </button>
        </form>
      </div>
    );
  }

  if (!team) {
    return (
      <div className="mx-auto max-w-lg space-y-4">
        <h1 className="text-xl font-bold text-white">No team on this account</h1>
        <p className="text-sm text-white/55">
          Course team seats are created when you complete team checkout on a course page. If you
          already paid, try restoring your purchase below.
        </p>
        {error ? <ErrorBanner message={error} /> : null}
        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={async () => {
              setLoading(true);
              setError(null);
              try {
                await syncTeam();
              } catch (err) {
                setError(err instanceof ApiClientError ? err.message : 'Could not restore team');
              } finally {
                setLoading(false);
              }
            }}
            className="rounded-lg bg-[#2490ed] px-4 py-2 text-sm font-semibold text-white"
          >
            Restore my course team
          </button>
          <Link
            href="/courses"
            className="rounded-lg border border-white/15 px-4 py-2 text-sm text-white/70 hover:text-white"
          >
            Browse courses
          </Link>
        </div>
      </div>
    );
  }

  if (!team.is_owner) {
    const addedBy =
      team.added_by?.full_name?.trim() ||
      team.added_by?.email?.split('@')[0] ||
      'Your team owner';
    const courses = team.my_team_courses ?? [];

    return (
      <div className="mx-auto max-w-lg space-y-6">
        <header>
          <p className="text-[11px] font-semibold tracking-[0.2em] text-[#2490ed]/80 uppercase">
            Team access
          </p>
          <h1 className="mt-2 text-2xl font-bold text-white">{team.name}</h1>
          <p className="mt-2 text-sm text-white/55">
            You were added to this team by{' '}
            <span className="font-medium text-white/85">{addedBy}</span>
            {team.added_by?.email ? (
              <span className="text-white/40"> ({team.added_by.email})</span>
            ) : null}
            .
          </p>
        </header>

        <section className="rounded-2xl border border-white/10 p-6">
          <h2 className="text-sm font-semibold text-white">Your courses</h2>
          <p className="mt-1 text-xs text-white/45">
            Only the courses your team owner assigned to you are listed here.
          </p>
          {courses.length === 0 ? (
            <p className="mt-4 text-sm text-white/50">
              No courses assigned yet. Ask your team owner if you expected access.
            </p>
          ) : (
            <ul className="mt-4 space-y-3">
              {courses.map((c) => (
                <li
                  key={c.slug}
                  className="flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-black/20 px-4 py-3"
                >
                  <span className="text-sm font-medium text-white/90">{c.title}</span>
                  <Link
                    href={`/dashboard/learn/${encodeURIComponent(c.slug)}`}
                    className="shrink-0 rounded-lg bg-[#2490ed] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#1a7fd4]"
                  >
                    Open course
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        <p className="text-center text-xs text-white/35">
          <Link href="/dashboard/student" className="text-[#7ec5ff] hover:underline">
            Go to your dashboard
          </Link>
        </p>
      </div>
    );
  }

  const pools = team.course_seat_pools ?? [];
  const purchases = team.course_purchases ?? [];
  const isCourseTeam =
    team.bundle_tier === 'course_purchase' &&
    (pools.length > 0 || purchases.length > 0 || Boolean(team.course_slug));
  const seatsRemaining = Math.max(0, (team.seat_limit ?? 0) - (team.seats_used ?? 0));
  const hasPoolSeats = pools.some((p) => p.seats_remaining > 0);
  const canInviteMore = isCourseTeam ? hasPoolSeats : seatsRemaining > 0;
  const showPurchaseBanner = fromPurchase || Boolean(isCourseTeam);
  const showNameEditor = team.is_owner && (editingName || fromPurchase || isCourseTeam);

  return (
    <div className="mx-auto max-w-2xl space-y-8">
      <header>
        <p className="text-[11px] font-semibold tracking-[0.2em] text-[#2490ed]/80 uppercase">
          Teams
        </p>
        {showNameEditor ? (
          <form onSubmit={handleSaveTeamName} className="mt-3 space-y-2">
            <label className="block text-sm text-white/70">
              Team name
              <input
                required
                minLength={2}
                value={teamName}
                onChange={(e) => setTeamName(e.target.value)}
                className="mt-1 w-full rounded-lg border border-white/12 bg-black/30 px-3 py-2 text-lg font-bold text-white"
              />
            </label>
            <button
              type="submit"
              disabled={busy}
              className="rounded-lg bg-[#2490ed] px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
            >
              {busy ? 'Saving…' : 'Save name'}
            </button>
          </form>
        ) : (
          <>
            <h1 className="mt-2 text-2xl font-bold text-white">{team.name}</h1>
            {team.is_owner ? (
              <button
                type="button"
                onClick={() => {
                  setTeamName(team.name);
                  setEditingName(true);
                }}
                className="mt-1 text-xs text-[#7ec5ff] hover:underline"
              >
                Edit team name
              </button>
            ) : null}
          </>
        )}
        {!isCourseTeam ? (
          <p className="mt-2 text-sm text-white/45">
            {team.bundle_tier.replace(/_/g, ' ')} · {team.seats_used}/{team.seat_limit} seats used
          </p>
        ) : null}
      </header>

      {isCourseTeam && purchases.length > 0 ? (
        <section className="rounded-2xl border border-white/10 p-6">
          <h2 className="text-sm font-semibold text-white">Team course purchases</h2>
          <p className="mt-1 text-xs text-white/45">
            Each checkout is listed separately. Seat use is counted per course.
          </p>
          <ul className="mt-4 space-y-3">
            {purchases.map((p) => {
              const pool = pools.find((x) => x.course_slug === p.course_slug);
              return (
                <li
                  key={p.id}
                  className="rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-sm"
                >
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <span className="font-medium text-white/90">{p.course_title}</span>
                    <span className="text-xs text-[#7ec5ff]">Team purchase</span>
                  </div>
                  <p className="mt-1 text-white/55">
                    {p.seat_limit} seats in this purchase
                    {pool && (pool.purchase_count > 1 || pool.purchases.length > 1) ? (
                      <span className="text-white/40">
                        {' '}
                        · {pool.seats_used}/{pool.seat_limit} used across{' '}
                        {pool.purchase_count} purchases for this course
                      </span>
                    ) : (
                      <span className="text-white/40">
                        {' '}
                        · {p.seats_used}/{p.seat_limit} seats used
                      </span>
                    )}
                  </p>
                </li>
              );
            })}
          </ul>
          {pools.some((p) => p.purchase_count > 1) ? (
            <ul className="mt-4 space-y-2 border-t border-white/8 pt-4 text-xs text-white/50">
              {pools
                .filter((p) => p.purchase_count > 1)
                .map((p) => (
                  <li key={p.course_slug}>
                    <strong className="text-white/70">{p.course_title}</strong>:{' '}
                    {p.purchase_count} team purchases · {p.seat_limit} seats total ·{' '}
                    {p.seats_used}/{p.seat_limit} used
                  </li>
                ))}
            </ul>
          ) : null}
        </section>
      ) : isCourseTeam ? (
        <p className="text-sm text-white/45">
          Course · {(purchasedCourse ?? team.course_slug ?? '').replace(/-/g, ' ')} ·{' '}
          {team.seats_used}/{team.seat_limit} seats used
        </p>
      ) : null}

      {showPurchaseBanner ? (
        <div className="rounded-2xl border border-[#2490ed]/35 bg-[#2490ed]/10 p-4 text-sm text-white/80">
          <p className="font-semibold text-white">Add your team</p>
          <p className="mt-1 text-white/60">
            {isCourseTeam && pools.length > 0
              ? 'Pick which courses they get — the email only mentions those. Each course has its own seat pool from your team purchases.'
              : `Invite up to ${seatsRemaining} more ${seatsRemaining === 1 ? 'learner' : 'learners'}. Pick which of your courses they get — the email only mentions those.`}
          </p>
        </div>
      ) : null}

      {error ? <ErrorBanner message={error} /> : null}
      {success ? (
        <p className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200">
          {success}
        </p>
      ) : null}

      <section className="rounded-2xl border border-white/10 p-6">
        <h2 className="text-sm font-semibold text-white">Members</h2>
        <ul className="mt-3 divide-y divide-white/8">
          {(team.members ?? []).map((m) => (
            <li key={m.user_id} className="flex justify-between py-2 text-sm">
              <span className="text-white/85">{m.full_name || m.email}</span>
              <span className="text-white/40 capitalize">{m.role}</span>
            </li>
          ))}
        </ul>
      </section>

      {team.is_owner && canInviteMore ? (
        <section className="rounded-2xl border border-white/10 p-6">
          <h2 className="text-sm font-semibold text-white">Add team member</h2>
          <p className="mt-1 text-xs text-white/45">
            Enter their email, tick the courses they should access, then send. They only get
            enrolment and email text for the courses you select.
          </p>
          <form onSubmit={handleInvite} className="mt-4 space-y-4">
            <label className="block text-sm text-white/70">
              Email
              <input
                type="email"
                required
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                placeholder="tech@company.com.au"
                className="mt-1 w-full rounded-lg border border-white/12 bg-black/30 px-3 py-2 text-sm text-white"
              />
            </label>
            <fieldset className="space-y-2">
              <legend className="text-sm font-medium text-white/70">Courses they can access</legend>
              {coursesLoading ? (
                <p className="text-xs text-white/40">Loading your courses…</p>
              ) : assignableCourses.length === 0 ? (
                <p className="text-xs text-amber-200/80">
                  You have no enrolled courses to assign. Enrol in a course first, then return here.
                </p>
              ) : (
                <ul className="max-h-48 space-y-2 overflow-y-auto rounded-lg border border-white/10 bg-black/20 p-3">
                  {assignableCourses.map((c) => {
                    const noSeats =
                      c.is_team_purchase_course &&
                      typeof c.seats_remaining === 'number' &&
                      c.seats_remaining <= 0;
                    return (
                      <li key={c.slug}>
                        <label
                          className={`flex items-start gap-2.5 text-sm ${noSeats ? 'cursor-not-allowed opacity-50' : 'cursor-pointer text-white/85'}`}
                        >
                          <input
                            type="checkbox"
                            className="mt-0.5"
                            disabled={noSeats}
                            checked={selectedCourseSlugs.includes(c.slug)}
                            onChange={() => toggleCourseSlug(c.slug)}
                          />
                          <span>
                            {c.title}
                            {c.is_team_purchase_course ? (
                              <span className="ml-1 text-xs text-[#7ec5ff]">
                                (team purchase
                                {typeof c.seats_used === 'number' && typeof c.seat_limit === 'number'
                                  ? ` · ${c.seats_used}/${c.seat_limit} seats`
                                  : ''}
                                {(c.team_purchase_count ?? 0) > 1
                                  ? ` · ${c.team_purchase_count} purchases`
                                  : ''}
                                )
                              </span>
                            ) : null}
                            {noSeats ? (
                              <span className="ml-1 text-xs text-amber-200/80">— full</span>
                            ) : null}
                          </span>
                        </label>
                      </li>
                    );
                  })}
                </ul>
              )}
            </fieldset>
            <button
              type="submit"
              disabled={busy || assignableCourses.length === 0 || selectedCourseSlugs.length === 0}
              className="w-full rounded-lg bg-[#2490ed] px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50 sm:w-auto"
            >
              Add &amp; send email
            </button>
          </form>
        </section>
      ) : null}

      {team.is_owner && !canInviteMore ? (
        <p className="text-sm text-white/45">
          {isCourseTeam
            ? 'All seats are in use for your team-purchased courses.'
            : 'All seats are in use.'}
        </p>
      ) : null}
    </div>
  );
}

export default function TeamPage() {
  return (
    <Suspense fallback={<p className="text-white/50">Loading team…</p>}>
      <TeamDashboardPage />
    </Suspense>
  );
}
