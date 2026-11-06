'use client';

import { ClipboardList, Compass, ExternalLink, Loader2, Megaphone, Video } from 'lucide-react';
import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';

import {
  coachingCard,
  coachingCardTitle,
  coachingMuted,
  coachingPage,
  coachingPrimaryBtn,
  coachingProgressFill,
  coachingProgressFillStyle,
  coachingProgressTrackClass,
  coachingSecondaryBtn,
} from '@/components/coaching-portal/coaching-ui';
import { CoachingAskCoachPanel } from '@/components/coaching-portal/CoachingAskCoachPanel';
import { CoachingGrowthQuoteDialog } from '@/components/coaching-portal/CoachingGrowthQuoteDialog';
import { useCoachingPortal } from '@/components/coaching-portal/CoachingPortalContext';
import { CoachingSessionPrepCard } from '@/components/coaching-portal/CoachingSessionPrepCard';
import {
  CoachingEmptyState,
  CoachingFilterPills,
  CoachingPageHeader,
  CoachingSection,
  CoachingStatGrid,
  CoachingSupportPanel,
} from '@/components/coaching-portal/visual';
import { actionBoardStats } from '@/lib/coaching-portal/action-board-view';
import { COACHING_PAGE_META } from '@/lib/coaching-portal/coaching-page-meta';
import { COACHING_RESOURCE_SECTIONS } from '@/lib/coaching-portal/coaching-resources';
import {
  COACHING_GROWTH_SERVICE_CATEGORIES,
  type GrowthServiceItem,
} from '@/lib/coaching-portal/growth-services';
import { learningCourseLink } from '@/lib/coaching-portal/learning-path';
import type { CoachingActionStatus } from '@/lib/coaching-portal/types';
import { carsiCoachingMonthlyPriceLabel } from '@/lib/marketing/carsi-coaching-monthly';

type ActionItem = {
  id: string;
  title: string;
  description: string | null;
  status: CoachingActionStatus;
  dueDate: string | null;
  priority: string | null;
  progressNote?: string | null;
  /** Prescribed CARSI course (GP-633): status and progress follow the LMS. */
  learning?: { courseSlug: string; percent: number; enrolled: boolean } | null;
};

const STATUS_LABEL: Record<CoachingActionStatus, string> = {
  todo: 'Not started',
  in_progress: 'In progress',
  done: 'Completed',
  blocked: 'Blocked',
  proposed: 'Waiting for coach',
  declined: 'Declined by coach',
};

/** Enrolled members open the lesson player; others go to the course page to enrol. */
function LearningCourseAction({
  learning,
  status,
  className,
}: {
  learning: NonNullable<ActionItem['learning']>;
  status: CoachingActionStatus;
  className: string;
}) {
  const link = learningCourseLink(learning);
  if (!link) return null;
  return (
    <Link href={link.href} className={className}>
      {status === 'done' && learning.enrolled ? 'Review the course' : link.label}
    </Link>
  );
}

function LearningProgress({ learning }: { learning: NonNullable<ActionItem['learning']> }) {
  return (
    <div className="mt-3">
      <div
        className={coachingProgressTrackClass()}
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={learning.percent}
        aria-label="Course progress"
      >
        <div
          className={coachingProgressFill}
          style={coachingProgressFillStyle(learning.percent)}
        />
      </div>
      <p className="mt-1 text-xs text-slate-400">{learning.percent}% of the course complete</p>
    </div>
  );
}

const FILTERS: Array<{ id: 'all' | CoachingActionStatus; label: string }> = [
  { id: 'all', label: 'All' },
  { id: 'todo', label: 'To do' },
  { id: 'in_progress', label: 'In progress' },
  { id: 'done', label: 'Completed' },
  { id: 'blocked', label: 'Blocked' },
  { id: 'proposed', label: 'Waiting for coach' },
];

/** Statuses the member can pick; proposed/declined are set by the coach only (GP-634). */
const MEMBER_STATUS_OPTIONS = FILTERS.filter(
  (f) => f.id !== 'all' && f.id !== 'proposed' && f.id !== 'declined'
);

export function CoachingPlanPage() {
  const { access, plan } = useCoachingPortal();
  const meta = COACHING_PAGE_META.plan;
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
    <div className={coachingPage} data-testid="coaching-plan-page">
      <CoachingPageHeader
        eyebrow={meta.eyebrow}
        title={meta.title}
        description={meta.description}
        testId="coaching-plan-header"
      />

      {plan.hasApprovedPlan ? (
        <CoachingSection title="Current focus" className="mt-0" testId="coaching-plan-focus">
          <p className="mt-3 text-lg font-semibold text-white">{plan.focusTitle}</p>
          {plan.focusDescription ? (
            <p className={`mt-2 ${coachingMuted}`}>{plan.focusDescription}</p>
          ) : null}
        </CoachingSection>
      ) : (
        <CoachingEmptyState
          icon={Compass}
          title="Plan in review"
          description="Phill will publish your approved growth plan after reviewing your assessment."
          testId="coaching-plan-empty"
        />
      )}

      <CoachingSection title="Business direction" className="space-y-4" testId="coaching-plan-direction">
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
      </CoachingSection>

      <CoachingAskCoachPanel className="mt-4" />
      <CoachingSupportPanel
        className="mt-4"
        mailSubject={meta.supportSubject}
        tips={meta.supportTips}
        testId="coaching-plan-support"
      />
    </div>
  );
}

export function CoachingActionsPage() {
  const { access } = useCoachingPortal();
  const meta = COACHING_PAGE_META.actions;
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
    void fetch('/api/coaching/portal/actions')
      .then((res) => res.json())
      .then((data: { items?: ActionItem[] }) => {
        setItems(data.items ?? []);
        setLoading(false);
      });
  }, []);

  const visible = useMemo(
    () =>
      filter === 'all'
        ? items.filter((a) => a.status !== 'declined')
        : items.filter((a) => a.status === filter),
    [items, filter]
  );

  const boardStats = useMemo(
    () =>
      actionBoardStats(items).map((s) => ({
        ...s,
        icon: s.id === 'coach' ? Megaphone : ClipboardList,
      })),
    [items]
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
    <div className={coachingPage} data-testid="coaching-actions-page">
      <CoachingPageHeader
        eyebrow={meta.eyebrow}
        title={meta.title}
        description={meta.description}
        testId="coaching-actions-header"
      />

      {!loading && items.length > 0 ? (
        <div className="mb-6">
          <CoachingStatGrid items={boardStats} testIdPrefix="coaching-action-stat" />
        </div>
      ) : null}

      <CoachingFilterPills
        options={FILTERS}
        value={filter}
        onChange={setFilter}
        testId="coaching-action-filters"
      />

      {loading ? (
        <Loader2 className="mx-auto mt-12 h-8 w-8 motion-safe:animate-spin text-sky-400" aria-label="Loading" />
      ) : visible.length === 0 ? (
        <div className="mt-8">
          <CoachingEmptyState
            icon={ClipboardList}
            title="No actions in this view"
            description="Try another filter, or wait for your coach to assign monthly actions after your plan is approved."
            testId="coaching-actions-empty"
          />
        </div>
      ) : (
        <ul className="mt-6 space-y-3">
          {visible.map((a) => (
            <li key={a.id} className={coachingCard}>
              <div className="flex flex-wrap items-center gap-2">
                <p className="font-semibold text-white">{a.title}</p>
                {a.learning ? (
                  <span className="rounded-full bg-sky-400/10 px-2 py-0.5 text-[10px] font-semibold tracking-wide text-sky-300 uppercase">
                    Learning
                  </span>
                ) : null}
              </div>
              {a.description ? <p className={`mt-1 ${coachingMuted}`}>{a.description}</p> : null}
              {a.learning ? <LearningProgress learning={a.learning} /> : null}
              <div className="mt-3 flex flex-wrap items-center gap-2">
                {a.status === 'proposed' ? (
                  <span className="rounded-full bg-amber-400/10 px-2.5 py-1 text-xs font-semibold text-amber-200">
                    Waiting for your coach to approve
                  </span>
                ) : a.learning ? (
                  <>
                    <span className="rounded-lg border border-white/10 px-2 py-1 text-xs text-slate-300">
                      {STATUS_LABEL[a.status]}
                    </span>
                    <LearningCourseAction
                      learning={a.learning}
                      status={a.status}
                      className="text-xs font-semibold text-sky-300 hover:text-sky-200"
                    />
                  </>
                ) : (
                  <select
                    value={a.status}
                    disabled={!access.canEdit}
                    onChange={(e) =>
                      void updateAction({ ...a, status: e.target.value as CoachingActionStatus })
                    }
                    className="rounded-lg border border-white/10 bg-[#060a14] px-2 py-1 text-xs text-white"
                  >
                    {MEMBER_STATUS_OPTIONS.map((f) => (
                      <option key={f.id} value={f.id}>
                        {f.label}
                      </option>
                    ))}
                  </select>
                )}
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

      <CoachingSupportPanel
        className="mt-8"
        mailSubject={meta.supportSubject}
        tips={meta.supportTips}
        testId="coaching-actions-support"
      />
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
  const meta = COACHING_PAGE_META.sessions;
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
    <div className={coachingPage} data-testid="coaching-sessions-page">
      <CoachingPageHeader
        eyebrow={meta.eyebrow}
        title={meta.title}
        description={meta.description}
        testId="coaching-sessions-header"
      />

      <CoachingSessionPrepCard />

      <CoachingSection title="Upcoming session" testId="coaching-sessions-upcoming">
        {upcoming ? (
          <>
            <p className="font-medium text-white">
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
                className={`inline-flex ${coachingPrimaryBtn}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                Join meeting
              </a>
            ) : null}
          </>
        ) : (
          <>
            <CoachingEmptyState
              icon={Video}
              title="No upcoming session"
              description="Book your next consultation when you are ready — prep notes from your workspace travel with you."
              testId="coaching-sessions-empty-upcoming"
            />
            {access.canEdit && bookingUrl ? (
              <a href={bookingUrl} className={`inline-flex ${coachingPrimaryBtn}`}>
                Book your session
              </a>
            ) : null}
          </>
        )}
      </CoachingSection>

      <CoachingSection title="Session history" testId="coaching-sessions-history">
        {history.filter((s) => s.status === 'completed' || new Date(s.scheduledAt) < new Date())
          .length === 0 ? (
          <p className={coachingMuted}>Past sessions will appear here after your first call.</p>
        ) : (
          <ul className="space-y-3">
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
      </CoachingSection>

      <CoachingSupportPanel
        className="mt-8"
        mailSubject={meta.supportSubject}
        tips={meta.supportTips}
        testId="coaching-sessions-support"
      />
    </div>
  );
}

function CoachingLearningPathSection() {
  const [items, setItems] = useState<ActionItem[] | null>(null);

  useEffect(() => {
    void fetch('/api/coaching/portal/actions')
      .then((res) => (res.ok ? res.json() : { items: [] }))
      .then((data: { items?: ActionItem[] }) =>
        setItems((data.items ?? []).filter((a) => a.learning))
      )
      .catch(() => setItems([]));
  }, []);

  if (items === null) return null;

  const done = items.filter((a) => a.status === 'done').length;

  return (
    <section className={coachingCard}>
      <h2 className={coachingCardTitle}>Your learning path</h2>
      <p className={`mt-1 ${coachingMuted}`}>
        {items.length === 0
          ? 'Once Phill has your business assessment, the CARSI courses that match your gaps appear here.'
          : `Courses picked from your business assessment. ${done} of ${items.length} completed.`}
      </p>
      {items.length > 0 ? (
        <ol className="mt-5 divide-y divide-white/[0.06]">
          {items.map((a) => (
            <li
              key={a.id}
              className="flex flex-col gap-2 py-4 first:pt-0 last:pb-0 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="min-w-0">
                <p className="text-sm font-semibold text-white">{a.title}</p>
                <p className={`mt-1 text-xs ${coachingMuted}`}>{STATUS_LABEL[a.status]}</p>
                {a.learning ? <LearningProgress learning={a.learning} /> : null}
              </div>
              {a.learning ? (
                <LearningCourseAction
                  learning={a.learning}
                  status={a.status}
                  className={`inline-flex shrink-0 items-center text-sm font-semibold text-sky-300 hover:text-sky-200 ${coachingSecondaryBtn} !min-h-9 !px-3`}
                />
              ) : null}
            </li>
          ))}
        </ol>
      ) : null}
    </section>
  );
}

export function CoachingResourcesPage() {
  const meta = COACHING_PAGE_META.resources;
  return (
    <div className={coachingPage} data-testid="coaching-resources-page">
      <CoachingPageHeader
        eyebrow={meta.eyebrow}
        title={meta.title}
        description={meta.description}
        testId="coaching-resources-header"
      />
      <div className="space-y-6">
        <CoachingLearningPathSection />
        {COACHING_RESOURCE_SECTIONS.map((section) => (
          <CoachingSection key={section.id} title={section.title} testId={`coaching-resource-${section.id}`}>
            <p className={`-mt-2 mb-4 ${coachingMuted}`}>{section.description}</p>
            <ul className="divide-y divide-white/[0.06]">
              {section.items.map((item) => (
                <li
                  key={item.id}
                  className="flex flex-col gap-2 py-4 first:pt-0 last:pb-0 sm:flex-row sm:items-start sm:justify-between"
                >
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-semibold text-white">{item.title}</p>
                      {item.tag ? (
                        <span className="rounded-full bg-white/[0.06] px-2 py-0.5 text-[10px] font-semibold tracking-wide text-slate-400 uppercase">
                          {item.tag}
                        </span>
                      ) : null}
                    </div>
                    <p className={`mt-1 ${coachingMuted}`}>{item.description}</p>
                  </div>
                  <Link
                    href={item.href}
                    target={item.external ? '_blank' : undefined}
                    rel={item.external ? 'noopener noreferrer' : undefined}
                    className={`inline-flex shrink-0 items-center gap-1.5 text-sm font-semibold text-sky-300 hover:text-sky-200 ${coachingSecondaryBtn} !min-h-9 !px-3`}
                  >
                    Open
                    {item.external ? <ExternalLink className="h-3.5 w-3.5" aria-hidden /> : null}
                  </Link>
                </li>
              ))}
            </ul>
          </CoachingSection>
        ))}
      </div>
      <CoachingSupportPanel
        className="mt-8"
        mailSubject={meta.supportSubject}
        tips={meta.supportTips}
        testId="coaching-resources-support"
      />
    </div>
  );
}

export function CoachingBillingPage() {
  const { access } = useCoachingPortal();
  const meta = COACHING_PAGE_META.billing;
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

  const statusLabel = subscription?.status?.replace(/_/g, ' ') ?? '—';
  const isActive = subscription?.status === 'active' || subscription?.status === 'trialing';

  async function openBilling() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/coaching/portal/billing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: '{}',
      });
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
    <div className={coachingPage} data-testid="coaching-billing-page">
      <CoachingPageHeader
        eyebrow={meta.eyebrow}
        title={meta.title}
        description={meta.description}
        testId="coaching-billing-header"
      />

      <CoachingSection title="Your membership" testId="coaching-billing-membership">
        <dl className="grid gap-5 sm:grid-cols-2">
          <div className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-4">
            <dt className="text-[11px] font-semibold tracking-wide text-slate-500 uppercase">
              Plan
            </dt>
            <dd className="mt-1 text-lg font-semibold text-white">
              {carsiCoachingMonthlyPriceLabel}
              <span className="text-sm font-normal text-slate-400"> / month</span>
            </dd>
          </div>
          <div className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-4">
            <dt className="text-[11px] font-semibold tracking-wide text-slate-500 uppercase">
              Status
            </dt>
            <dd className="mt-1 flex flex-wrap items-center gap-2">
              <span className="text-lg font-semibold text-white capitalize">{statusLabel}</span>
              {isActive ? (
                <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-semibold text-emerald-300 uppercase">
                  Active
                </span>
              ) : null}
            </dd>
          </div>
          {periodEnd ? (
            <div className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-4 sm:col-span-2">
              <dt className="text-[11px] font-semibold tracking-wide text-slate-500 uppercase">
                {subscription?.cancelAtPeriodEnd ? 'Access until' : 'Next renewal'}
              </dt>
              <dd className="mt-1 text-white">{periodEnd}</dd>
              {subscription?.cancelAtPeriodEnd ? (
                <p className="mt-2 text-sm text-amber-200/90">
                  Cancellation scheduled — you keep access until this date. You can reactivate in
                  Stripe if needed.
                </p>
              ) : null}
            </div>
          ) : null}
        </dl>
      </CoachingSection>

      <CoachingSection title="Payment & invoices" testId="coaching-billing-portal">
        <p className={coachingMuted}>
          Update your card, download invoices, or cancel your coaching subscription in the secure
          Stripe customer portal.
        </p>
        <ul className={`mt-4 list-inside list-disc text-sm ${coachingMuted}`}>
          <li>Payment method and billing email</li>
          <li>Invoice history (PDF)</li>
          <li>Cancel or resume subscription</li>
        </ul>
        {access.canEdit ? (
          <button
            type="button"
            className={`mt-6 ${coachingPrimaryBtn}`}
            disabled={loading}
            onClick={() => void openBilling()}
          >
            {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Open Stripe billing portal
          </button>
        ) : (
          <p className={`mt-4 ${coachingMuted}`}>Subscribe to manage billing.</p>
        )}
        {error ? <p className="mt-3 text-sm text-red-300">{error}</p> : null}
      </CoachingSection>

      <CoachingSection title="Growth services" testId="coaching-billing-services">
        <p className={coachingMuted}>
          Website, SEO, and implementation work are invoiced separately. Request quotes from{' '}
          <Link href="/dashboard/coaching/services" className="text-sky-400 hover:underline">
            Growth services
          </Link>
          .
        </p>
      </CoachingSection>

      <CoachingSupportPanel
        className="mt-8"
        mailSubject={meta.supportSubject}
        tips={meta.supportTips}
        testId="coaching-billing-support"
      />
    </div>
  );
}

export function CoachingServicesPage() {
  const meta = COACHING_PAGE_META.services;
  const [quoteService, setQuoteService] = useState<GrowthServiceItem | null>(null);

  return (
    <div className={coachingPage} data-testid="coaching-services-page">
      <CoachingPageHeader
        eyebrow={meta.eyebrow}
        title={meta.title}
        description={`Optional implementation work — quoted separately from your ${carsiCoachingMonthlyPriceLabel} coaching membership. Rates below are indicative; you receive a written quote before any work starts.`}
        testId="coaching-services-header"
      />
      <div className="space-y-4">
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
                    <button
                      type="button"
                      className={`mt-3 w-full sm:mt-0 sm:w-auto ${coachingSecondaryBtn} !min-h-9 !px-3 !text-xs`}
                      onClick={() => setQuoteService(item)}
                    >
                      Request quote
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
      <CoachingSupportPanel
        className="mt-8"
        title="Questions before you quote?"
        mailSubject={meta.supportSubject}
        tips={meta.supportTips}
        testId="coaching-services-support"
      />
      {quoteService ? (
        <CoachingGrowthQuoteDialog
          key={quoteService.id}
          open={Boolean(quoteService)}
          service={quoteService}
          onClose={() => setQuoteService(null)}
        />
      ) : null}
    </div>
  );
}
