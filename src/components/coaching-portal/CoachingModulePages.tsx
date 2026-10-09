'use client';

import { Loader2 } from 'lucide-react';
import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';

import {
  coachingCard,
  coachingCardTitle,
  coachingMuted,
  coachingPage,
  coachingPrimaryBtn,
  coachingSecondaryBtn,
} from '@/components/coaching-portal/coaching-ui';
import { useCoachingPortal } from '@/components/coaching-portal/CoachingPortalContext';
import { COACHING_GROWTH_SERVICE_CATEGORIES } from '@/lib/coaching-portal/growth-services';
import { openCoachingSupportEmail } from '@/lib/coaching-portal/support-contact';
import type { CoachingActionStatus } from '@/lib/coaching-portal/types';
import { carsiCoachingMonthlyPriceLabel } from '@/lib/marketing/carsi-coaching-monthly';
import {
  carsiCoachingAddOnContactEmail,
  carsiCoachingAddOnsComingSoon,
} from '@/lib/marketing/carsi-coaching-program';

type ActionItem = {
  id: string;
  title: string;
  description: string | null;
  status: CoachingActionStatus;
  dueDate: string | null;
  priority: string | null;
  progressNote?: string | null;
};

const FILTERS: Array<{ id: 'all' | CoachingActionStatus; label: string }> = [
  { id: 'all', label: 'All' },
  { id: 'todo', label: 'To do' },
  { id: 'in_progress', label: 'In progress' },
  { id: 'done', label: 'Completed' },
  { id: 'blocked', label: 'Blocked' },
];

export function CoachingPlanPage() {
  const { access, plan } = useCoachingPortal();
  const [horizontal, setHorizontal] = useState(access.workspace.horizontalSummary);
  const [direction, setDirection] = useState(access.workspace.directionSummary);
  const [saving, setSaving] = useState(false);

  async function save() {
    if (!access.canEdit) return;
    setSaving(true);
    await fetch('/api/coaching/portal/me', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        horizontalSummary: horizontal,
        directionSummary: direction,
        sessionPrepNotes: access.workspace.sessionPrepNotes,
        monthlyActions: access.workspace.monthlyActions,
      }),
    });
    setSaving(false);
  }

  return (
    <div className={coachingPage}>
      <h1 className="text-2xl font-semibold text-white">My plan</h1>
      <p className={`mt-2 ${coachingMuted}`}>
        Your direction, goals, and focus — updated with Phill each month.
      </p>

      {plan.hasApprovedPlan ? (
        <section className={`${coachingCard} mt-6`}>
          <h2 className={coachingCardTitle}>Current focus</h2>
          <p className="mt-2 text-lg font-semibold text-white">{plan.focusTitle}</p>
          {plan.focusDescription ? (
            <p className={`mt-2 ${coachingMuted}`}>{plan.focusDescription}</p>
          ) : null}
        </section>
      ) : (
        <section className={`${coachingCard} mt-6`}>
          <p className={coachingMuted}>
            No approved growth plan yet. Phill will publish your plan after reviewing your
            assessment.
          </p>
        </section>
      )}

      <section className={`${coachingCard} mt-4 space-y-4`}>
        <h2 className={coachingCardTitle}>Business direction</h2>
        <label className="block text-xs text-slate-400">Horizontal (what you bring today)</label>
        <textarea
          value={horizontal}
          disabled={!access.canEdit}
          onChange={(e) => setHorizontal(e.target.value)}
          rows={4}
          className="w-full rounded-lg border border-white/10 bg-[#060a14] px-3 py-2 text-sm text-white"
        />
        <label className="block text-xs text-slate-400">Direction (6 / 12 / 60 months)</label>
        <textarea
          value={direction}
          disabled={!access.canEdit}
          onChange={(e) => setDirection(e.target.value)}
          rows={5}
          className="w-full rounded-lg border border-white/10 bg-[#060a14] px-3 py-2 text-sm text-white"
        />
        {access.canEdit ? (
          <button
            type="button"
            className={coachingPrimaryBtn}
            disabled={saving}
            onClick={() => void save()}
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            Save
          </button>
        ) : null}
      </section>
    </div>
  );
}

export function CoachingActionsPage() {
  const { access } = useCoachingPortal();
  const [items, setItems] = useState<ActionItem[]>([]);
  const [filter, setFilter] = useState<'all' | CoachingActionStatus>('all');
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const res = await fetch('/api/coaching/portal/actions');
    const data = (await res.json()) as { items?: ActionItem[] };
    setItems(data.items ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const visible = useMemo(
    () => (filter === 'all' ? items : items.filter((a) => a.status === filter)),
    [items, filter]
  );

  async function updateAction(action: ActionItem) {
    if (!access.canEdit) return;
    await fetch('/api/coaching/portal/actions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(action),
    });
    await load();
  }

  return (
    <div className={coachingPage}>
      <h1 className="text-2xl font-semibold text-white">Actions</h1>
      <p className={`mt-2 ${coachingMuted}`}>
        Steps for this month — set with Phill, executed by you.
      </p>

      <div className="mt-6 flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <button
            key={f.id}
            type="button"
            onClick={() => setFilter(f.id)}
            className={`rounded-full px-3 py-1.5 text-xs font-semibold ${
              filter === f.id ? 'bg-[#146fc2] text-white' : 'bg-white/10 text-slate-300'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {loading ? (
        <Loader2 className="mx-auto mt-12 h-8 w-8 animate-spin text-sky-400" />
      ) : visible.length === 0 ? (
        <p className={`mt-8 ${coachingMuted}`}>No actions in this view yet.</p>
      ) : (
        <ul className="mt-6 space-y-3">
          {visible.map((a) => (
            <li key={a.id} className={coachingCard}>
              <p className="font-semibold text-white">{a.title}</p>
              {a.description ? <p className={`mt-1 ${coachingMuted}`}>{a.description}</p> : null}
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <select
                  value={a.status}
                  disabled={!access.canEdit}
                  onChange={(e) =>
                    void updateAction({ ...a, status: e.target.value as CoachingActionStatus })
                  }
                  className="rounded-lg border border-white/10 bg-[#060a14] px-2 py-1 text-xs text-white"
                >
                  {FILTERS.filter((f) => f.id !== 'all').map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.label}
                    </option>
                  ))}
                </select>
                {a.dueDate ? (
                  <span className="text-xs text-slate-500">
                    Due {new Date(a.dueDate).toLocaleDateString('en-AU')}
                  </span>
                ) : null}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

type SessionRow = {
  id: string;
  scheduledAt: string;
  durationMinutes: number;
  coachName: string;
  meetingUrl: string | null;
  status: string;
  customerSummary: string | null;
};

export function CoachingSessionsPage() {
  const { bookingUrl, access, sessions } = useCoachingPortal();
  const [history, setHistory] = useState<SessionRow[]>([]);

  useEffect(() => {
    void (async () => {
      const res = await fetch('/api/coaching/portal/sessions');
      const data = (await res.json()) as { sessions?: SessionRow[] };
      setHistory(data.sessions ?? []);
    })();
  }, []);

  const upcoming = sessions.upcoming;

  return (
    <div className={coachingPage}>
      <h1 className="text-2xl font-semibold text-white">Sessions</h1>
      <p className={`mt-2 ${coachingMuted}`}>
        Your consultations with Phill — prep, join, and follow-up.
      </p>

      <section className={`${coachingCard} mt-6`}>
        <h2 className={coachingCardTitle}>Upcoming session</h2>
        {upcoming ? (
          <>
            <p className="mt-2 font-medium text-white">
              {new Date(upcoming.scheduledAt).toLocaleString('en-AU', {
                dateStyle: 'full',
                timeStyle: 'short',
                timeZoneName: 'short',
              })}
            </p>
            <p className={coachingMuted}>
              {upcoming.durationMinutes} min · {upcoming.coachName}
            </p>
            {upcoming.meetingUrl ? (
              <a
                href={upcoming.meetingUrl}
                className={`mt-4 inline-flex ${coachingPrimaryBtn}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                Join meeting
              </a>
            ) : null}
          </>
        ) : (
          <>
            <p className={`mt-2 ${coachingMuted}`}>You have no upcoming sessions scheduled.</p>
            {access.canEdit && bookingUrl ? (
              <a href={bookingUrl} className={`mt-4 inline-flex ${coachingPrimaryBtn}`}>
                Book your session
              </a>
            ) : null}
          </>
        )}
      </section>

      <section className={`${coachingCard} mt-4`}>
        <h2 className={coachingCardTitle}>Session history</h2>
        {history.filter((s) => s.status === 'completed' || new Date(s.scheduledAt) < new Date())
          .length === 0 ? (
          <p className={`mt-2 ${coachingMuted}`}>
            Past sessions will appear here after your first call.
          </p>
        ) : (
          <ul className="mt-4 space-y-3">
            {history.map((s) => (
              <li key={s.id} className="border-b border-white/10 pb-3 last:border-0">
                <p className="text-sm font-medium text-white">
                  {new Date(s.scheduledAt).toLocaleDateString('en-AU', { dateStyle: 'medium' })}
                </p>
                {s.customerSummary ? (
                  <p className={`mt-1 text-sm ${coachingMuted}`}>{s.customerSummary}</p>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

export function CoachingResourcesPage() {
  return (
    <div className={coachingPage}>
      <h1 className="text-2xl font-semibold text-white">Resources</h1>
      <p className={`mt-2 ${coachingMuted}`}>
        CARSI learning and templates tied to your coaching plan.
      </p>
      <section className={`${coachingCard} mt-6`}>
        <Link href="/dashboard/courses" className="font-semibold text-sky-400 hover:underline">
          Open course catalogue
        </Link>
        <p className={`mt-2 ${coachingMuted}`}>
          Complete modules Phill assigns in My Learning. Enrolment rules still apply to paid
          courses.
        </p>
        <p className={`mt-4 ${coachingMuted}`}>
          Templates and checklists: email{' '}
          <a
            href={`mailto:${carsiCoachingAddOnContactEmail}`}
            className="text-sky-400 hover:underline"
          >
            {carsiCoachingAddOnContactEmail}
          </a>
        </p>
        {carsiCoachingAddOnsComingSoon ? (
          <p className="mt-4 text-sm text-amber-100/90">
            Add-on booking in the portal is coming soon.
          </p>
        ) : null}
      </section>
    </div>
  );
}

export function CoachingBillingPage() {
  const { access } = useCoachingPortal();
  const subscription = access.subscription;
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const periodEnd = subscription?.currentPeriodEnd
    ? new Date(subscription.currentPeriodEnd).toLocaleDateString('en-AU', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      })
    : null;

  async function openBilling() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/coaching/portal/billing', { method: 'POST', body: '{}' });
      const data = (await res.json()) as { url?: string; detail?: string };
      if (!res.ok || !data.url) {
        setError(data.detail ?? 'Could not open billing.');
        return;
      }
      window.location.href = data.url;
    } catch {
      setError('Could not open billing.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className={coachingPage}>
      <h1 className="text-2xl font-semibold text-white">Billing</h1>
      <p className={`mt-2 ${coachingMuted}`}>
        Coaching membership billing is separate from annual CARSI membership or course purchases.
      </p>
      <section className={`${coachingCard} mt-6`}>
        <dl className="grid gap-4 sm:grid-cols-2">
          <div>
            <dt className="text-xs text-slate-500 uppercase">Plan</dt>
            <dd className="font-medium text-white">{carsiCoachingMonthlyPriceLabel} / month</dd>
          </div>
          <div>
            <dt className="text-xs text-slate-500 uppercase">Status</dt>
            <dd className="font-medium text-white capitalize">{subscription?.status ?? '—'}</dd>
          </div>
          {periodEnd ? (
            <div className="sm:col-span-2">
              <dt className="text-xs text-slate-500 uppercase">Current period ends</dt>
              <dd className="text-white">{periodEnd}</dd>
            </div>
          ) : null}
        </dl>
        {access.canEdit ? (
          <button
            type="button"
            className={`mt-6 ${coachingPrimaryBtn}`}
            disabled={loading}
            onClick={() => void openBilling()}
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            Manage subscription in Stripe
          </button>
        ) : (
          <p className={`mt-4 ${coachingMuted}`}>Subscribe to manage billing.</p>
        )}
        {error ? <p className="mt-3 text-sm text-red-300">{error}</p> : null}
      </section>
    </div>
  );
}

export function CoachingServicesPage() {
  return (
    <div className={coachingPage}>
      <h1 className="text-2xl font-semibold text-white">Growth services</h1>
      <p className={`mt-2 ${coachingMuted}`}>
        Optional implementation work — quoted separately from your {carsiCoachingMonthlyPriceLabel}{' '}
        coaching membership. Rates below are indicative; you&apos;ll receive a written quote before
        any work starts.
      </p>
      <div className="mt-6 space-y-4">
        {COACHING_GROWTH_SERVICE_CATEGORIES.map((cat) => (
          <section key={cat.id} className={coachingCard}>
            <h2 className="text-xs font-semibold tracking-wide text-slate-500 uppercase">
              {cat.title}
            </h2>
            <div
              className="mt-4 hidden gap-4 border-b border-white/[0.08] pb-2 text-[11px] font-semibold tracking-wide text-slate-500 uppercase sm:grid sm:grid-cols-[1fr_7.5rem]"
              aria-hidden
            >
              <span>Service</span>
              <span className="text-right">Rate (AUD)</span>
            </div>
            <ul className="mt-2 space-y-0 sm:mt-0">
              {cat.items.map((item) => (
                <li
                  key={item.title}
                  className="grid gap-1 border-b border-white/[0.06] py-4 last:border-0 sm:grid-cols-[1fr_7.5rem] sm:items-start sm:gap-4"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-white">{item.title}</p>
                    <p className={`mt-1 ${coachingMuted}`}>{item.description}</p>
                  </div>
                  <div className="sm:text-right">
                    <span className="text-[10px] font-semibold tracking-wide text-slate-500 uppercase sm:hidden">
                      Rate
                    </span>
                    <p className="text-sm font-semibold text-sky-300 tabular-nums">
                      {item.rateLabel}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
      <div className="mt-6 flex flex-wrap gap-3">
        <button
          type="button"
          className={coachingPrimaryBtn}
          onClick={() => openCoachingSupportEmail('Growth services quote request')}
        >
          Request a quote
        </button>
        <button
          type="button"
          className={coachingSecondaryBtn}
          onClick={() => openCoachingSupportEmail('Business Coaching support')}
        >
          Contact support
        </button>
      </div>
    </div>
  );
}
