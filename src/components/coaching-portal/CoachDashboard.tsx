'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

import {
  coachingCard,
  coachingCardTitle,
  coachingEyebrow,
  coachingMuted,
  coachingPage,
  coachingPrimaryBtn,
} from '@/components/coaching-portal/coaching-ui';
import { MEMBER_ONBOARDING_LABEL } from '@/lib/coaching-portal/coaches';
import type { CoachDashboardMember } from '@/lib/server/carsi-coaching-coaches';

type Props = {
  coach: {
    displayName: string;
    chapterName: string;
    isDemo: boolean;
    /** Chapter accent (#rrggbb, validated on save); null keeps the CARSI look. */
    brandColour: string | null;
    /** Chapter logo: a real uploaded image (https, validated on save). */
    logoUrl: string | null;
  };
  members: CoachDashboardMember[];
};

function formatSession(iso: string | null): string {
  if (!iso) return 'None booked';
  return new Date(iso).toLocaleString('en-AU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function ApproveDraftButton({ memberUserId }: { memberUserId: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function approve() {
    setBusy(true);
    setError(null);
    const res = await fetch('/api/coaching/coach/plan-approval', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ memberUserId }),
    });
    setBusy(false);
    if (!res.ok) {
      const body = (await res.json().catch(() => null)) as { detail?: string } | null;
      setError(body?.detail ?? 'Could not approve the plan.');
      return;
    }
    router.refresh();
  }

  return (
    <div>
      <button
        type="button"
        className={coachingPrimaryBtn}
        disabled={busy}
        onClick={approve}
        data-testid="coach-approve-draft-plan"
      >
        {busy ? 'Approving…' : 'Approve draft plan'}
      </button>
      {error ? <p className="mt-1 text-xs text-red-300">{error}</p> : null}
    </div>
  );
}

export function CoachDashboard({ coach, members }: Props) {
  return (
    <div className={coachingPage} data-testid="coach-dashboard">
      {coach.isDemo ? (
        <p
          className="mb-4 rounded-lg border border-amber-400/30 bg-amber-400/10 px-4 py-2 text-sm text-amber-200"
          data-testid="coach-demo-banner"
        >
          Demo chapter. Every member here is sample data.
        </p>
      ) : null}
      <header
        className="flex flex-wrap items-center gap-4 border-l-4 pl-4"
        style={{ borderColor: coach.brandColour ?? 'transparent' }}
        data-testid="coach-chapter-brand"
      >
        {coach.logoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element -- partner logo is an admin-entered https URL, not a build-time asset
          <img
            src={coach.logoUrl}
            alt={`${coach.chapterName} logo`}
            className="h-12 w-auto max-w-[160px] object-contain"
            loading="lazy"
            referrerPolicy="no-referrer"
          />
        ) : null}
        <div>
          <p className={coachingEyebrow}>{coach.chapterName}</p>
          <h1 className="mt-1 font-display text-2xl font-semibold text-white">Your members</h1>
        </div>
      </header>
      <p className={`mt-2 ${coachingMuted}`}>
        {coach.displayName}: onboarding progress, the next session, and open work for each member.
      </p>

      {members.length === 0 ? (
        <section className={`${coachingCard} mt-6`}>
          <p className={coachingMuted}>No members are assigned to this chapter yet.</p>
        </section>
      ) : (
        <ul className="mt-6 space-y-4">
          {members.map((m) => (
            <li key={m.userId} className={coachingCard} data-testid="coach-member-row">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className={coachingCardTitle} data-testid="coach-member-business">
                    {m.businessName}
                  </h2>
                  <p className={coachingMuted}>
                    {m.memberName} · {m.memberEmail}
                  </p>
                </div>
                <span
                  className="rounded-full border border-white/15 px-3 py-1 text-xs text-slate-200"
                  data-testid="coach-member-onboarding"
                >
                  {MEMBER_ONBOARDING_LABEL[m.onboardingStatus]}
                </span>
              </div>

              <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-4">
                <div>
                  <dt className="text-xs text-slate-400">Next session</dt>
                  <dd className="text-white" data-testid="coach-member-next-session">
                    {formatSession(m.nextSessionAt)}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-slate-400">Open actions</dt>
                  <dd className="text-white" data-testid="coach-member-open-actions">
                    {m.openActions}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-slate-400">Blocked</dt>
                  <dd
                    className={m.blockedActions > 0 ? 'text-amber-300' : 'text-white'}
                    data-testid="coach-member-blocked-actions"
                  >
                    {m.blockedActions}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-slate-400">Growth plan</dt>
                  <dd className="text-white" data-testid="coach-member-plan-status">
                    {m.plan ? (m.plan.status === 'draft' ? 'Draft, awaiting you' : 'Approved') : 'None yet'}
                  </dd>
                </div>
              </dl>

              {m.plan?.status === 'draft' ? (
                <div className="mt-4 rounded-lg border border-white/10 p-4">
                  <p className="text-sm text-white">{m.plan.focusTitle ?? 'Untitled draft plan'}</p>
                  <p className={`mb-3 ${coachingMuted}`}>{m.plan.goalCount} goals in the draft.</p>
                  <ApproveDraftButton memberUserId={m.userId} />
                </div>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
