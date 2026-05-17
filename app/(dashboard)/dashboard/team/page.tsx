'use client';

import { Suspense } from 'react';
import { useAuth } from '@/components/auth/auth-provider';
import { ErrorBanner } from '@/components/lms/ErrorBanner';
import { TEAM_TIERS, type TeamBundleTierId } from '@/lib/lms/pricing-tiers';
import { apiClient, ApiClientError } from '@/lib/api/client';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';

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

interface TeamPayload {
  id: string;
  name: string;
  slug: string;
  bundle_tier: string;
  seat_limit: number;
  seats_used: number;
  is_owner: boolean;
  members: TeamMember[];
  pending_invites: PendingInvite[];
}

function TeamDashboardPage() {
  const { user } = useAuth();
  const searchParams = useSearchParams();
  const createTier = searchParams.get('create') as TeamBundleTierId | null;

  const [team, setTeam] = useState<TeamPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [teamName, setTeamName] = useState('');
  const [selectedTier, setSelectedTier] = useState<TeamBundleTierId>(
    createTier && TEAM_TIERS.some((t) => t.id === createTier) ? createTier : 'starter'
  );
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteUrl, setInviteUrl] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const loadTeam = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiClient.get<{ team: TeamPayload | null }>('/api/lms/teams/me');
      setTeam(data.team);
    } catch (e) {
      setError(e instanceof ApiClientError ? e.message : 'Failed to load team');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (user) void loadTeam();
  }, [user, loadTeam]);

  async function handleCreateTeam(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await apiClient.post('/api/lms/teams', {
        name: teamName,
        bundle_tier: selectedTier,
      });
      await loadTeam();
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : 'Could not create team');
    } finally {
      setBusy(false);
    }
  }

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault();
    if (!team) return;
    setBusy(true);
    setError(null);
    setInviteUrl(null);
    try {
      const data = await apiClient.post<{ invite_url: string }>('/api/lms/teams/invite', {
        email: inviteEmail,
      });
      setInviteUrl(data.invite_url);
      setInviteEmail('');
      await loadTeam();
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : 'Could not send invite');
    } finally {
      setBusy(false);
    }
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
    return <p className="text-white/50">Loading team…</p>;
  }

  if (!team) {
    return (
      <div className="mx-auto max-w-lg space-y-6">
        <header>
          <p className="text-[11px] font-semibold tracking-[0.2em] text-[#2490ed]/80 uppercase">
            Teams
          </p>
          <h1 className="mt-2 text-2xl font-bold text-white">Create your team</h1>
          <p className="mt-2 text-sm text-white/50">
            Seat-based training for your restoration crew. Billing integration completes in a later
            phase — your team is ready for invites now.
          </p>
        </header>
        {error ? <ErrorBanner message={error} /> : null}
        <form onSubmit={handleCreateTeam} className="space-y-4 rounded-2xl border border-white/10 p-6">
          <label className="block text-sm text-white/70">
            Team name
            <input
              required
              value={teamName}
              onChange={(e) => setTeamName(e.target.value)}
              className="mt-1 w-full rounded-lg border border-white/12 bg-black/30 px-3 py-2 text-white"
              placeholder="e.g. Acme Restoration"
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
          <p className="text-center text-xs text-white/40">
            <Link href="/pricing" className="text-[#7ec5ff] hover:underline">
              Compare team plans
            </Link>
          </p>
        </form>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-8">
      <header>
        <p className="text-[11px] font-semibold tracking-[0.2em] text-[#2490ed]/80 uppercase">
          Teams
        </p>
        <h1 className="mt-2 text-2xl font-bold text-white">{team.name}</h1>
        <p className="mt-1 text-sm text-white/45">
          {team.bundle_tier.replace(/_/g, ' ')} · {team.seats_used}/{team.seat_limit} seats used
        </p>
      </header>

      {error ? <ErrorBanner message={error} /> : null}

      <section className="rounded-2xl border border-white/10 p-6">
        <h2 className="text-sm font-semibold text-white">Members</h2>
        <ul className="mt-3 divide-y divide-white/8">
          {team.members.map((m) => (
            <li key={m.user_id} className="flex justify-between py-2 text-sm">
              <span className="text-white/85">{m.full_name || m.email}</span>
              <span className="text-white/40 capitalize">{m.role}</span>
            </li>
          ))}
        </ul>
      </section>

      {team.is_owner ? (
        <section className="rounded-2xl border border-white/10 p-6">
          <h2 className="text-sm font-semibold text-white">Invite member</h2>
          <form onSubmit={handleInvite} className="mt-3 flex flex-col gap-3 sm:flex-row">
            <input
              type="email"
              required
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              placeholder="tech@company.com.au"
              className="min-w-0 flex-1 rounded-lg border border-white/12 bg-black/30 px-3 py-2 text-sm text-white"
            />
            <button
              type="submit"
              disabled={busy}
              className="rounded-lg bg-[#2490ed] px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
            >
              Send invite
            </button>
          </form>
          {inviteUrl ? (
            <p className="mt-3 break-all text-xs text-emerald-300/90">
              Invite link (share securely): {inviteUrl}
            </p>
          ) : null}
          {team.pending_invites.length > 0 ? (
            <ul className="mt-4 space-y-1 text-xs text-white/45">
              {team.pending_invites.map((i) => (
                <li key={i.id}>Pending: {i.email}</li>
              ))}
            </ul>
          ) : null}
        </section>
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
