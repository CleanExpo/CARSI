'use client';

import { Check, Inbox, Loader2, Users, X } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';

import {
  AdminCoachingEmptyState,
  AdminCoachingLoadingState,
  AdminCoachingNotice,
  AdminCoachingPageHeader,
  AdminCoachingPrimaryBtn,
  AdminCoachingSecondaryBtn,
  AdminCoachingSection,
  AdminCoachingShortcutNav,
  AdminCoachingStatusPill,
  adminCoachingInset,
  adminCoachingLabel,
  adminCoachingPage,
  adminCoachingTextarea,
} from '@/components/admin/admin-coaching-ui';
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

async function fetchProposed(): Promise<ProposedItem[]> {
  const res = await fetch('/api/admin/coaching/proposed-actions');
  if (!res.ok) throw new Error('Failed to load proposed actions');
  const data = (await res.json()) as { items: ProposedItem[] };
  return data.items;
}

/** GP-634: coach reviews marketing-pack fixes proposed for each member. */
export function AdminCoachingProposedActionsClient() {
  const pathname = usePathname();
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
      } else {
        setNotes((n) => {
          const next = { ...n };
          delete next[id];
          return next;
        });
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
  const memberCount = Object.keys(byMember).length;

  return (
    <div className={adminCoachingPage} data-testid="admin-coaching-proposed">
      <AdminCoachingPageHeader
        eyebrow="GP-634 · Marketing pack"
        title="Coaching: proposed actions"
        description="Marketing-pack fixes only. Approve to add one to the member's action list, or decline it. A note is shown to the member as coach feedback."
        aside={
          <Link href="/admin/coaching-members" className={AdminCoachingSecondaryBtn}>
            <Users className="h-4 w-4 shrink-0" aria-hidden />
            Member workspace
          </Link>
        }
      />

      <AdminCoachingShortcutNav currentPath={pathname} />

      {!loading && items.length > 0 ? (
        <div className={`${adminCoachingInset} flex flex-wrap items-center gap-3`}>
          <Inbox className="h-5 w-5 text-sky-400" aria-hidden />
          <p className="text-sm text-slate-200">
            <span className="font-semibold text-white">{items.length}</span> fix
            {items.length === 1 ? '' : 'es'} awaiting decision across{' '}
            <span className="font-semibold text-white">{memberCount}</span> member
            {memberCount === 1 ? '' : 's'}.
          </p>
        </div>
      ) : null}

      {error ? <AdminCoachingNotice variant="error">{error}</AdminCoachingNotice> : null}

      {loading ? (
        <AdminCoachingLoadingState label="Loading proposed fixes…" />
      ) : items.length === 0 ? (
        <AdminCoachingEmptyState
          title="Nothing waiting for review"
          description="When members build a marketing pack and propose fixes, they appear here grouped by business for a single approve or decline flow."
        />
      ) : (
        <ul className="space-y-6" aria-label="Proposed actions by member">
          {Object.entries(byMember).map(([email, list]) => (
            <li key={email}>
              <AdminCoachingSection
                title={list[0].member.businessName || list[0].member.name || email}
                description={[email, list[0].member.location, list[0].member.website]
                  .filter(Boolean)
                  .join(' · ')}
                testId={`admin-proposed-member-${email}`}
              >
                <ul className="space-y-4">
                  {list.map((item) => {
                    const noteLen = (notes[item.id] ?? '').length;
                    return (
                      <li
                        key={item.id}
                        className="rounded-xl border border-white/[0.08] bg-[#0a101c]/60 p-4 sm:p-5"
                      >
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="text-sm font-semibold text-white">{item.title}</p>
                          {item.marketing ? (
                            <>
                              <span className="font-mono text-xs text-sky-300/90">
                                #{item.marketing.rank}
                              </span>
                              {item.marketing.area ? (
                                <AdminCoachingStatusPill tone="neutral">
                                  {marketingFixAreaLabel(item.marketing.area)}
                                </AdminCoachingStatusPill>
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
                                <AdminCoachingStatusPill tone="draft">
                                  {item.marketing.effortLabel}
                                </AdminCoachingStatusPill>
                              ) : null}
                            </>
                          ) : null}
                          {item.priority ? (
                            <AdminCoachingStatusPill tone="neutral">
                              {item.priority}
                            </AdminCoachingStatusPill>
                          ) : null}
                        </div>
                        {item.marketing?.packGeneratedAt ? (
                          <p className="mt-1 text-[11px] text-slate-500">
                            From pack built{' '}
                            {new Date(item.marketing.packGeneratedAt).toLocaleString('en-AU')}
                          </p>
                        ) : null}
                        {item.description ? (
                          <p className="mt-2 text-sm whitespace-pre-line text-slate-400">
                            {item.description}
                          </p>
                        ) : null}
                        <div className="mt-4">
                          <label className={adminCoachingLabel} htmlFor={`coach-note-${item.id}`}>
                            Note for the member (optional)
                          </label>
                          <textarea
                            id={`coach-note-${item.id}`}
                            rows={2}
                            maxLength={COACH_FEEDBACK_MAX_CHARS}
                            aria-label={`Coach note for ${item.title}`}
                            value={notes[item.id] ?? ''}
                            onChange={(e) => setNotes((n) => ({ ...n, [item.id]: e.target.value }))}
                            className={adminCoachingTextarea}
                          />
                          <p className="mt-1 text-right text-[11px] text-slate-600 tabular-nums">
                            {noteLen}/{COACH_FEEDBACK_MAX_CHARS}
                          </p>
                        </div>
                        <div className="mt-4 flex flex-wrap gap-2">
                          <button
                            type="button"
                            disabled={busyId === item.id}
                            onClick={() => void decide(item.id, 'approve')}
                            className={AdminCoachingPrimaryBtn}
                          >
                            {busyId === item.id ? (
                              <Loader2 className="h-4 w-4 shrink-0 animate-spin" aria-hidden />
                            ) : (
                              <Check className="h-4 w-4 shrink-0" aria-hidden />
                            )}
                            Approve
                          </button>
                          <button
                            type="button"
                            disabled={busyId === item.id}
                            onClick={() => void decide(item.id, 'decline')}
                            className={AdminCoachingSecondaryBtn}
                          >
                            <X className="h-4 w-4 shrink-0" aria-hidden />
                            Decline
                          </button>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </AdminCoachingSection>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
