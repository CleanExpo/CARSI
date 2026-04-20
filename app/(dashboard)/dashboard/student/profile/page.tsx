'use client';

import { useAuth } from '@/components/auth/auth-provider';
import { AcronymTooltip } from '@/components/ui/AcronymTooltip';
import { Button } from '@/components/ui/button';
import type { User } from '@/lib/api/auth';
import { apiClient } from '@/lib/api/client';
import { useToast } from '@/hooks/use-toast';
import {
  Award,
  BookOpen,
  Calendar,
  ChevronRight,
  GraduationCap,
  LayoutDashboard,
  Shield,
  User as UserIcon,
} from 'lucide-react';
import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';

const SECTIONS = [
  { id: 'overview', label: 'Overview' },
  { id: 'account', label: 'Account' },
  { id: 'recognition', label: 'Recognition' },
  { id: 'iicrc', label: 'IICRC & renewal' },
] as const;

function initialsFromUser(u: { full_name?: string; email?: string } | null): string {
  if (!u) return 'U';
  if (u.full_name?.trim()) {
    return u.full_name
      .split(/\s+/)
      .map((n) => n[0])
      .join('')
      .slice(0, 2)
      .toUpperCase();
  }
  return u.email?.charAt(0).toUpperCase() ?? 'U';
}

export default function StudentProfilePage() {
  const { user: authUser, refreshUser } = useAuth();
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [savingSection, setSavingSection] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [fullName, setFullName] = useState('');
  const [member, setMember] = useState('');
  const [expiry, setExpiry] = useState('');
  const [cardUrl, setCardUrl] = useState('');
  const [leaderboardShow, setLeaderboardShow] = useState(false);
  const [leaderboardName, setLeaderboardName] = useState('');
  const [profile, setProfile] = useState<User | null>(null);

  const load = useCallback(async () => {
    if (!authUser) return;
    setLoading(true);
    setError(null);
    try {
      const data = await apiClient.get<User>('/api/lms/auth/me');
      setProfile(data);
      setFullName(data.full_name ?? '');
      setMember(data.iicrc_member_number ?? '');
      setExpiry(data.iicrc_expiry_date ?? '');
      setCardUrl(data.iicrc_card_image_url ?? '');
      setLeaderboardShow(data.leaderboard_show_display_name ?? false);
      setLeaderboardName(data.leaderboard_display_name ?? '');
    } catch {
      setError('Could not load profile.');
    } finally {
      setLoading(false);
    }
  }, [authUser]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (loading) return;
    const id = typeof window !== 'undefined' ? window.location.hash.slice(1) : '';
    if (!id) return;
    requestAnimationFrame(() => {
      document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  }, [loading]);

  async function saveAccount(e: React.FormEvent) {
    e.preventDefault();
    if (!authUser) return;
    setSavingSection('account');
    setError(null);
    try {
      const data = await apiClient.patch<User>('/api/lms/auth/me', {
        full_name: fullName.trim() || undefined,
      });
      setProfile(data);
      await refreshUser();
      toast({ title: 'Account updated' });
    } catch {
      toast({ title: 'Could not save account', variant: 'destructive' });
    } finally {
      setSavingSection(null);
    }
  }

  async function saveRecognition(e: React.FormEvent) {
    e.preventDefault();
    if (!authUser) return;
    setSavingSection('recognition');
    setError(null);
    try {
      const data = await apiClient.patch<User>('/api/lms/auth/me', {
        leaderboard_show_display_name: leaderboardShow,
        leaderboard_display_name: leaderboardName.trim() || null,
      });
      setProfile(data);
      await refreshUser();
      toast({ title: 'Recognition preferences saved' });
    } catch {
      toast({ title: 'Could not save recognition settings', variant: 'destructive' });
    } finally {
      setSavingSection(null);
    }
  }

  async function saveIicrc(e: React.FormEvent) {
    e.preventDefault();
    if (!authUser) return;
    setSavingSection('iicrc');
    setError(null);
    try {
      const data = await apiClient.patch<User>('/api/lms/auth/me', {
        iicrc_member_number: member.trim() || null,
        iicrc_expiry_date: expiry.trim() || null,
        iicrc_card_image_url: cardUrl.trim() || null,
      });
      setProfile(data);
      await refreshUser();
      toast({ title: 'IICRC details saved' });
    } catch {
      toast({ title: 'Could not save IICRC details', variant: 'destructive' });
    } finally {
      setSavingSection(null);
    }
  }

  function scrollTo(id: string) {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  if (!authUser) {
    return (
      <div className="mx-auto max-w-lg p-8 text-sm text-white/50">
        Sign in to view your profile.
      </div>
    );
  }

  const displayName = profile?.full_name?.trim() || authUser.full_name || authUser.email?.split('@')[0];
  const roleLabel = authUser.roles?.[0] ?? 'student';
  const certs = profile?.iicrc_certifications ?? [];

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-10 pb-20 lg:flex-row lg:gap-12">
      <nav
        className="lg:sticky lg:top-6 lg:h-fit lg:w-52 lg:shrink-0"
        aria-label="Profile sections"
      >
        <Link
          href="/dashboard/student"
          className="mb-6 inline-flex items-center gap-1 text-xs font-medium text-[#7ec5ff] hover:underline"
        >
          ← Back to My learning
        </Link>
        <p className="mb-3 text-[10px] font-semibold tracking-[0.2em] text-white/35 uppercase">
          Profile
        </p>
        <ul className="flex flex-wrap gap-2 lg:flex-col lg:gap-0 lg:border-l border-white/10 lg:pl-4">
          {SECTIONS.map((s) => (
            <li key={s.id}>
              <button
                type="button"
                onClick={() => scrollTo(s.id)}
                className="w-full rounded-lg px-0 py-2 text-left text-sm text-white/55 transition hover:text-white lg:rounded-none lg:py-2"
              >
                {s.label}
              </button>
            </li>
          ))}
        </ul>

        <div className="mt-8 hidden space-y-1 border-t border-white/10 pt-6 lg:block">
          <p className="mb-2 text-[10px] font-semibold tracking-wider text-white/30 uppercase">
            Shortcuts
          </p>
          <Link
            href="/dashboard/student"
            className="flex items-center gap-2 rounded-lg px-2 py-2 text-xs text-white/50 transition hover:bg-white/5 hover:text-white/80"
          >
            <LayoutDashboard className="h-3.5 w-3.5 shrink-0" />
            Dashboard
          </Link>
          <Link
            href="/dashboard/courses"
            className="flex items-center gap-2 rounded-lg px-2 py-2 text-xs text-white/50 transition hover:bg-white/5 hover:text-white/80"
          >
            <BookOpen className="h-3.5 w-3.5 shrink-0" />
            Browse courses
          </Link>
          <Link
            href="/dashboard/student/credentials"
            className="flex items-center gap-2 rounded-lg px-2 py-2 text-xs text-white/50 transition hover:bg-white/5 hover:text-white/80"
          >
            <Award className="h-3.5 w-3.5 shrink-0" />
            Certificates
          </Link>
        </div>
      </nav>

      <div className="min-w-0 flex-1 space-y-12">
        {error ? (
          <p className="text-sm text-red-400/90" role="alert">
            {error}
          </p>
        ) : null}

        {loading ? (
          <div className="space-y-4 animate-pulse">
            <div className="h-40 rounded-2xl bg-white/5" />
            <div className="h-32 rounded-2xl bg-white/5" />
          </div>
        ) : (
          <>
            <section
              id="overview"
              className="scroll-mt-24 overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-[#2490ed]/12 via-white/[0.03] to-transparent p-6 sm:p-8"
            >
              <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
                <div className="flex gap-5">
                  <div
                    className="flex h-20 w-20 shrink-0 items-center justify-center rounded-2xl text-xl font-bold text-white shadow-lg sm:h-24 sm:w-24 sm:text-2xl"
                    style={{
                      background: 'linear-gradient(135deg, #2490ed 0%, #1a6bb8 100%)',
                      boxShadow: '0 12px 40px -12px rgba(36, 144, 237, 0.5)',
                    }}
                    aria-hidden
                  >
                    {initialsFromUser(profile ?? authUser)}
                  </div>
                  <div className="min-w-0">
                    <h1 className="text-2xl font-semibold tracking-tight text-white sm:text-3xl">
                      {displayName}
                    </h1>
                    <p className="mt-1 truncate text-sm text-white/50">{authUser.email}</p>
                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      <span className="inline-flex items-center gap-1 rounded-md border border-white/10 bg-white/5 px-2.5 py-1 text-[11px] font-medium text-white/70 capitalize">
                        <Shield className="h-3 w-3 text-[#2490ed]" aria-hidden />
                        {roleLabel}
                      </span>
                      {authUser.is_verified ? (
                        <span className="rounded-md border border-emerald-500/25 bg-emerald-500/10 px-2.5 py-1 text-[11px] font-medium text-emerald-300/90">
                          Verified account
                        </span>
                      ) : null}
                    </div>
                  </div>
                </div>
                <Link
                  href="/dashboard/student"
                  className="inline-flex shrink-0 items-center gap-2 self-start rounded-xl border border-white/12 bg-white/5 px-4 py-2.5 text-sm font-medium text-white/85 transition hover:border-[#2490ed]/35 hover:bg-[#2490ed]/10"
                >
                  Go to learning
                  <ChevronRight className="h-4 w-4 opacity-70" />
                </Link>
              </div>
              <p className="mt-6 max-w-2xl text-sm leading-relaxed text-white/45">
                Manage how you appear in CARSI and your <AcronymTooltip term="IICRC" /> renewal
                details — similar to account hubs on platforms like Coursera or Udemy.
              </p>
            </section>

            <section id="account" className="scroll-mt-24">
              <div className="mb-4 flex items-center gap-2">
                <UserIcon className="h-4 w-4 text-[#2490ed]" aria-hidden />
                <h2 className="text-lg font-semibold text-white">Account</h2>
              </div>
              <p className="mb-6 text-sm text-white/45">
                Your sign-in email is managed for security. Update the name shown across your
                dashboard and certificates.
              </p>
              <form
                onSubmit={saveAccount}
                className="space-y-5 rounded-2xl border border-white/10 bg-white/[0.03] p-6 sm:p-8"
              >
                <div>
                  <label htmlFor="full_name" className="block text-xs font-medium text-white/50">
                    Full name
                  </label>
                  <input
                    id="full_name"
                    type="text"
                    value={fullName}
                    onChange={(ev) => setFullName(ev.target.value)}
                    className="mt-2 w-full max-w-md rounded-xl border border-white/10 bg-[#0a0f1a] px-4 py-3 text-sm text-white placeholder:text-white/30 focus:border-[#2490ed]/50 focus:outline-none"
                    autoComplete="name"
                  />
                </div>
                <div>
                  <label htmlFor="email_ro" className="block text-xs font-medium text-white/50">
                    Email
                  </label>
                  <input
                    id="email_ro"
                    type="email"
                    value={authUser.email}
                    readOnly
                    className="mt-2 w-full max-w-md cursor-not-allowed rounded-xl border border-white/6 bg-white/[0.04] px-4 py-3 text-sm text-white/45"
                  />
                  <p className="mt-1.5 text-xs text-white/35">
                    Contact support to change your email or reset your password from the login page.
                  </p>
                </div>
                <div>
                  <span className="block text-xs font-medium text-white/50">Account ID</span>
                  <p className="mt-2 font-mono text-xs text-white/40 break-all">{authUser.id}</p>
                </div>
                <Button
                  type="submit"
                  disabled={savingSection === 'account'}
                  className="rounded-xl bg-[#2490ed] px-6 hover:bg-[#1f82d4]"
                >
                  {savingSection === 'account' ? 'Saving…' : 'Save account'}
                </Button>
              </form>
            </section>

            <section id="recognition" className="scroll-mt-24">
              <div className="mb-4 flex items-center gap-2">
                <Award className="h-4 w-4 text-[#2490ed]" aria-hidden />
                <h2 className="text-lg font-semibold text-white">Recognition</h2>
              </div>
              <p className="mb-6 text-sm text-white/45">
                The monthly board highlights completion-based activity for the current calendar month
                (Australia/Sydney). It is{' '}
                <span className="text-white/70">anonymous by default</span> — only an optional label
                you enter here can appear publicly. Your email and account name are never shown on
                the board.
              </p>
              <form
                onSubmit={saveRecognition}
                className="space-y-5 rounded-2xl border border-white/10 bg-white/[0.03] p-6 sm:p-8"
              >
                <div className="flex items-start gap-3">
                  <input
                    id="lb_show"
                    type="checkbox"
                    checked={leaderboardShow}
                    onChange={(ev) => setLeaderboardShow(ev.target.checked)}
                    className="mt-1 h-4 w-4 rounded border-white/20 bg-[#0a0f1a] text-[#2490ed] focus:ring-[#2490ed]/40"
                  />
                  <div>
                    <label htmlFor="lb_show" className="text-sm font-medium text-white/80">
                      Show my chosen public label on the monthly recognition board
                    </label>
                    <p className="mt-1 text-xs text-white/35">
                      If off, you appear as a neutral professional identifier (not your real name).
                    </p>
                  </div>
                </div>
                <div>
                  <label htmlFor="lb_name" className="block text-xs font-medium text-white/50">
                    Public label (optional, max 48 characters)
                  </label>
                  <input
                    id="lb_name"
                    type="text"
                    value={leaderboardName}
                    onChange={(ev) => setLeaderboardName(ev.target.value.slice(0, 48))}
                    disabled={!leaderboardShow}
                    placeholder="e.g. Alex K., WRT · QLD"
                    className="mt-2 w-full max-w-md rounded-xl border border-white/10 bg-[#0a0f1a] px-4 py-3 text-sm text-white placeholder:text-white/30 focus:border-[#2490ed]/50 focus:outline-none disabled:cursor-not-allowed disabled:opacity-45"
                    autoComplete="off"
                  />
                  <p className="mt-1.5 text-xs text-white/35">
                    Do not use your email. This is only for the leaderboard — not certificates or
                    verification.
                  </p>
                </div>
                <Button
                  type="submit"
                  disabled={savingSection === 'recognition'}
                  className="rounded-xl bg-[#2490ed] px-6 hover:bg-[#1f82d4]"
                >
                  {savingSection === 'recognition' ? 'Saving…' : 'Save recognition settings'}
                </Button>
              </form>
            </section>

            <section id="iicrc" className="scroll-mt-24">
              <div className="mb-4 flex items-center gap-2">
                <GraduationCap className="h-4 w-4 text-[#2490ed]" aria-hidden />
                <h2 className="text-lg font-semibold text-white">
                  <AcronymTooltip term="IICRC" /> &amp; renewal
                </h2>
              </div>
              <p className="mb-6 text-sm text-white/45">
                Used for your renewal cockpit, <AcronymTooltip term="CEC" /> tracking, and reporting.
                Keep your member number and renewal date current.
              </p>
              <form
                onSubmit={saveIicrc}
                className="space-y-5 rounded-2xl border border-white/10 bg-white/[0.03] p-6 sm:p-8"
              >
                <div>
                  <label htmlFor="iicrc_member" className="block text-xs font-medium text-white/50">
                    IICRC member number
                  </label>
                  <input
                    id="iicrc_member"
                    type="text"
                    value={member}
                    onChange={(ev) => setMember(ev.target.value)}
                    className="mt-2 w-full max-w-md rounded-xl border border-white/10 bg-[#0a0f1a] px-4 py-3 text-sm text-white placeholder:text-white/30 focus:border-[#2490ed]/50 focus:outline-none"
                    placeholder="Optional"
                    autoComplete="off"
                  />
                </div>
                <div>
                  <label htmlFor="iicrc_expiry" className="block text-xs font-medium text-white/50">
                    Certification / renewal expiry date
                  </label>
                  <div className="mt-2 flex max-w-md items-center gap-2">
                    <Calendar className="h-4 w-4 shrink-0 text-white/30" aria-hidden />
                    <input
                      id="iicrc_expiry"
                      type="date"
                      value={expiry}
                      onChange={(ev) => setExpiry(ev.target.value)}
                      className="w-full rounded-xl border border-white/10 bg-[#0a0f1a] px-4 py-3 text-sm text-white focus:border-[#2490ed]/50 focus:outline-none"
                    />
                  </div>
                </div>
                <div>
                  <label htmlFor="iicrc_card_url" className="block text-xs font-medium text-white/50">
                    Member card image URL
                  </label>
                  <input
                    id="iicrc_card_url"
                    type="url"
                    value={cardUrl}
                    onChange={(ev) => setCardUrl(ev.target.value)}
                    className="mt-2 w-full max-w-lg rounded-xl border border-white/10 bg-[#0a0f1a] px-4 py-3 text-sm text-white placeholder:text-white/30 focus:border-[#2490ed]/50 focus:outline-none"
                    placeholder="https://…"
                    autoComplete="off"
                  />
                  <p className="mt-1.5 text-xs text-white/35">
                    Optional link to your stored card image (e.g. cloud or intranet URL).
                  </p>
                </div>
                {certs.length > 0 ? (
                  <div>
                    <span className="block text-xs font-medium text-white/50">Certifications on file</span>
                    <ul className="mt-3 divide-y divide-white/8 rounded-xl border border-white/8">
                      {certs.map((c, i) => (
                        <li
                          key={`${c.discipline}-${c.certified_at}-${i}`}
                          className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 text-sm"
                        >
                          <span className="font-mono text-[#7ec5ff]">{c.discipline}</span>
                          <span className="text-white/45">
                            {new Date(c.certified_at + 'T12:00:00').toLocaleDateString('en-AU', {
                              day: 'numeric',
                              month: 'short',
                              year: 'numeric',
                            })}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}
                <Button
                  type="submit"
                  disabled={savingSection === 'iicrc'}
                  className="rounded-xl bg-[#2490ed] px-6 hover:bg-[#1f82d4]"
                >
                  {savingSection === 'iicrc' ? 'Saving…' : 'Save IICRC details'}
                </Button>
              </form>
            </section>
          </>
        )}
      </div>
    </div>
  );
}
