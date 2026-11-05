'use client';

import { Check, Loader2, X } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';

import {
  COACH_FEEDBACK_MAX_CHARS,
  normalizeCoachFeedback,
} from '@/lib/coaching-portal/marketing-pack/coach-input-limits';
import {
  marketingFixAreaLabel,
  marketingFixImpactBadgeClass,
} from '@/lib/coaching-portal/marketing-pack/ui-labels';

type ProposedItem = {
  id: string;
  title: string;
  description: string | null;
  priority: string | null;
  createdAt: string;
  marketing: {
    rank: number;
    fixId: string;
    area: 'website' | 'google-business-profile' | null;
    impact: 1 | 2 | 3 | null;
    effort: 1 | 2 | 3 | null;
    impactLabel: string | null;
    effortLabel: string | null;
    packGeneratedAt: string | null;
  } | null;
  member: {
    email: string;
    name: string | null;
    businessName: string | null;
    location: string | null;
    website: string | null;
    googleBusinessUrl: string | null;
  };
};

const surface =
  'rounded-2xl border border-white/10 bg-white/[0.04] shadow-[0_1px_0_rgba(255,255,255,0.04)_inset]';

async function fetchProposed(): Promise<ProposedItem[]> {
  const res = await fetch('/api/admin/coaching/proposed-actions');
  if (!res.ok) throw new Error('Failed to load proposed actions');
  const data = (await res.json()) as { items: ProposedItem[] };
  return data.items;
}

/** GP-634: coach reviews marketing-pack fixes proposed for each member. */
export function AdminCoachingProposedActionsClient() {
  const [items, setItems] = useState<ProposedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busyId, setBusyId] = useState<string | null>(null);
  const [notes, setNotes] = useState<Record<string, string>>({});

  const load = useCallback(
    () =>
      fetchProposed()
        .then((list) => {
          setItems(list);
          setError('');
        })
        .catch((e: unknown) => setError(e instanceof Error ? e.message : 'Failed to load'))
        .finally(() => setLoading(false)),
    []
  );

  useEffect(() => {
    fetchProposed()
      .then((list) => setItems(list))
      .catch((e: unknown) => setError(e instanceof Error ? e.message : 'Failed to load'))
      .finally(() => setLoading(false));
  }, []);

  async function decide(id: string, decision: 'approve' | 'decline') {
    setBusyId(id);
    try {
      const res = await fetch('/api/admin/coaching/proposed-actions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          actionId: id,
          decision,
          coachFeedback: normalizeCoachFeedback(notes[id] ?? '') ?? '',
        }),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { detail?: string };
        setError(data.detail ?? 'Could not save that decision.');
      }
      await load();
    } finally {
      setBusyId(null);
    }
  }

  const byMember = items.reduce<Record<string, ProposedItem[]>>((acc, item) => {
    (acc[item.member.email] ??= []).push(item);
    return acc;
  }, {});

  return (
    <div className="mx-auto w-full max-w-5xl space-y-6 p-6">
      <header>
        <h1 className="text-2xl font-semibold text-white">Coaching: proposed actions</h1>
        <p className="mt-1 text-sm text-slate-400">
          Marketing-pack fixes only. Approve to add one to the member&apos;s action list, or decline
          it. A note is shown to the member as coach feedback.
        </p>
      </header>
      {error ? (
        <p role="alert" className="text-sm text-amber-300">
          {error}
        </p>
      ) : null}
      {loading ? (
        <Loader2 className="mx-auto h-8 w-8 animate-spin text-sky-400" aria-label="Loading" />
      ) : items.length === 0 ? (
        <p className="text-sm text-slate-400">Nothing waiting for review.</p>
      ) : (
        <ul className="space-y-6" aria-label="Proposed actions by member">
          {Object.entries(byMember).map(([email, list]) => (
            <li key={email}>
              <section className={`${surface} p-5`}>
                <h2 className="text-base font-semibold text-white">
                  {list[0].member.businessName || list[0].member.name || email}
                </h2>
                <p className="text-xs text-slate-500">
                  {email}
                  {list[0].member.location ? ` · ${list[0].member.location}` : ''}
                  {list[0].member.website ? ` · ${list[0].member.website}` : ''}
                </p>
                <ul className="mt-4 space-y-3">
                  {list.map((item) => (
                    <li key={item.id} className="rounded-xl border border-white/[0.06] p-4">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-sm font-semibold text-white">{item.title}</p>
                        {item.marketing ? (
                          <>
                            <span className="font-mono text-xs text-sky-300/90">
                              #{item.marketing.rank}
                            </span>
                            {item.marketing.area ? (
                              <span className="rounded-full bg-white/[0.06] px-2 py-0.5 text-[10px] font-semibold tracking-wide text-slate-400 uppercase">
                                {marketingFixAreaLabel(item.marketing.area)}
                              </span>
                            ) : null}
                            {item.marketing.impactLabel && item.marketing.impact ? (
                              <span
                                className={`rounded-full px-2 py-0.5 text-[10px] font-semibold tracking-wide uppercase ring-1 ring-inset ${marketingFixImpactBadgeClass(
                                  item.marketing.impact
                                )}`}
                              >
                                {item.marketing.impactLabel}
                              </span>
                            ) : null}
                            {item.marketing.effortLabel ? (
                              <span className="rounded-full bg-white/[0.06] px-2 py-0.5 text-[10px] font-semibold text-slate-400">
                                {item.marketing.effortLabel}
                              </span>
                            ) : null}
                          </>
                        ) : null}
                        {item.priority ? (
                          <span className="rounded-full bg-white/[0.06] px-2 py-0.5 text-[10px] font-semibold tracking-wide text-slate-400 uppercase">
                            {item.priority}
                          </span>
                        ) : null}
                      </div>
                      {item.marketing?.packGeneratedAt ? (
                        <p className="mt-1 text-[11px] text-slate-600">
                          From pack built{' '}
                          {new Date(item.marketing.packGeneratedAt).toLocaleString('en-AU')}
                        </p>
                      ) : null}
                      {item.description ? (
                        <p className="mt-1 text-sm whitespace-pre-line text-slate-400">
                          {item.description}
                        </p>
                      ) : null}
                      <label className="mt-3 block text-xs text-slate-500">
                        Note for the member (optional)
                        <input
                          type="text"
                          maxLength={COACH_FEEDBACK_MAX_CHARS}
                          aria-label={`Coach note for ${item.title}`}
                          value={notes[item.id] ?? ''}
                          onChange={(e) => setNotes((n) => ({ ...n, [item.id]: e.target.value }))}
                          className="mt-1 w-full rounded-lg border border-white/10 bg-[#060a14] px-3 py-2 text-sm text-white"
                        />
                      </label>
                      <div className="mt-3 flex gap-2">
                        <button
                          type="button"
                          disabled={busyId === item.id}
                          onClick={() => void decide(item.id, 'approve')}
                          className="inline-flex min-h-9 items-center gap-1.5 rounded-lg bg-[#146fc2] px-3 text-sm font-semibold text-white hover:bg-[#125da8] disabled:opacity-50"
                        >
                          <Check className="h-4 w-4" aria-hidden />
                          Approve
                        </button>
                        <button
                          type="button"
                          disabled={busyId === item.id}
                          onClick={() => void decide(item.id, 'decline')}
                          className="inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-white/15 px-3 text-sm font-semibold text-slate-100 hover:bg-white/5 disabled:opacity-50"
                        >
                          <X className="h-4 w-4" aria-hidden />
                          Decline
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              </section>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
