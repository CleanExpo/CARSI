'use client';

import { Loader2 } from 'lucide-react';
import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

import { coachingFieldClass } from '@/components/coaching-portal/coaching-form-primitives';
import {
  coachingCard,
  coachingCardTitle,
  coachingEyebrow,
  coachingMuted,
  coachingPage,
  coachingPrimaryBtn,
  coachingProgressFill,
  coachingProgressFillStyle,
  coachingProgressTrackClass,
  coachingSecondaryBtn,
} from '@/components/coaching-portal/coaching-ui';
import { CoachingPageHeader, CoachingSupportPanel } from '@/components/coaching-portal/visual';
import { useCoachingPortal } from '@/components/coaching-portal/CoachingPortalContext';
import { COACHING_PAGE_META } from '@/lib/coaching-portal/coaching-page-meta';
import {
  ACCOUNTABILITY_COPY,
  ACCOUNTABILITY_KPI_MAX,
  ACCOUNTABILITY_KPI_MIN,
} from '@/lib/coaching-portal/accountability';
import { coachingPortalPath } from '@/lib/coaching-portal/coaching-portal-paths';
import type { MemberAccountabilityView } from '@/lib/server/carsi-coaching-accountability';

const ENDPOINT = '/api/coaching/portal/accountability';
const COPY = ACCOUNTABILITY_COPY;
/** Series colours from the existing CARSI chart palette (AdminCohortAnalytics). */
const SERIES_COLOURS = ['#2490ed', '#34d399', '#f59e0b', '#a78bfa', '#f472b6'];

type LoadState =
  | { status: 'loading' }
  | { status: 'hidden' }
  | { status: 'ready'; view: MemberAccountabilityView };

/** Loads the member's accountability. Hidden (renders nothing) unless the API answers 200. */
function useAccountability() {
  const [state, setState] = useState<LoadState>({ status: 'loading' });
  useEffect(() => {
    let cancelled = false;
    fetch(ENDPOINT)
      .then(async (res) => {
        if (cancelled) return;
        if (!res.ok) {
          setState({ status: 'hidden' });
          return;
        }
        const data = (await res.json()) as { accountability: MemberAccountabilityView };
        setState({ status: 'ready', view: data.accountability });
      })
      .catch(() => !cancelled && setState({ status: 'hidden' }));
    return () => {
      cancelled = true;
    };
  }, []);
  const replace = useCallback(
    (view: MemberAccountabilityView) => setState({ status: 'ready', view }),
    []
  );
  return { state, replace };
}

async function post(body: unknown): Promise<{ view?: MemberAccountabilityView; error?: string }> {
  const res = await fetch(ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = (await res.json().catch(() => ({}))) as {
    accountability?: MemberAccountabilityView;
    detail?: string;
  };
  if (!res.ok || !data.accountability)
    return { error: data.detail ?? 'Could not save. Try again.' };
  return { view: data.accountability };
}

function formatPeriod(period: string): string {
  return new Date(`${period}T00:00:00Z`).toLocaleDateString('en-AU', {
    day: 'numeric',
    month: 'short',
    timeZone: 'UTC',
  });
}

function QuietBanner({ days }: { days: number }) {
  return (
    <div className="rounded-lg border border-sky-500/25 bg-sky-500/[0.07] px-4 py-3 text-sm text-sky-50">
      <p className="font-semibold">{COPY.quietTitle}</p>
      <p className="mt-1 text-sky-100/80">{COPY.quietBody(days)}</p>
    </div>
  );
}

/** GP-635 Home card: check-in due or done, and the streak. Hidden while the flag is off. */
export function CoachingCheckInCard({ className = '' }: { className?: string }) {
  const { state } = useAccountability();
  if (state.status !== 'ready') return null;
  const { view } = state;
  return (
    <section className={`${coachingCard} ${className}`} aria-label={COPY.homeCardTitle}>
      <p className={coachingEyebrow}>{COPY.homeCardTitle}</p>
      {view.quiet ? (
        <div className="mt-3">
          <QuietBanner days={view.quiet.daysSilent} />
        </div>
      ) : null}
      <p className="mt-3 text-lg font-semibold text-white">
        {view.kpis.length === 0
          ? COPY.kpiSetupTitle
          : view.checkInDue
            ? COPY.checkInDue
            : COPY.checkInDone}
      </p>
      {view.kpis.length > 0 ? (
        <p className={`mt-1 ${coachingMuted}`}>
          {COPY.streakLabel}: <span className="font-semibold text-white">{view.streak}</span>{' '}
          {COPY.streakUnit}
        </p>
      ) : null}
      <Link
        href={coachingPortalPath('/progress')}
        className={`mt-4 inline-flex ${coachingPrimaryBtn}`}
      >
        {COPY.homeCardCta}
      </Link>
    </section>
  );
}

function KpiSetupForm({
  view,
  canEdit,
  onSaved,
}: {
  view: MemberAccountabilityView;
  canEdit: boolean;
  onSaved: (v: MemberAccountabilityView) => void;
}) {
  const initial = view.kpis.length
    ? view.kpis.map((k) => ({ id: k.id as string | undefined, label: k.label }))
    : Array.from({ length: ACCOUNTABILITY_KPI_MIN }, () => ({ id: undefined, label: '' }));
  const [rows, setRows] = useState(initial);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const filled = rows.filter((r) => r.label.trim().length > 0);
  const valid = filled.length >= ACCOUNTABILITY_KPI_MIN && filled.length <= ACCOUNTABILITY_KPI_MAX;

  async function save() {
    setSaving(true);
    setError(null);
    const res = await post({ kpis: filled.map((r) => ({ id: r.id, label: r.label.trim() })) });
    setSaving(false);
    if (res.error) setError(res.error);
    else if (res.view) onSaved(res.view);
  }

  return (
    <section className={coachingCard}>
      <h2 className={coachingCardTitle}>{COPY.kpiSetupTitle}</h2>
      <p className={`mt-1 ${coachingMuted}`}>{COPY.kpiSetupIntro}</p>
      <div className="mt-5 space-y-3">
        {rows.map((row, i) => (
          <label key={i} className="block text-sm font-medium text-slate-200">
            Number {i + 1}
            <input
              className={coachingFieldClass}
              value={row.label}
              maxLength={60}
              disabled={!canEdit || saving}
              placeholder={['Quotes sent', 'Jobs won', 'New Google reviews', '', ''][i]}
              onChange={(e) =>
                setRows((prev) =>
                  prev.map((r, j) => (j === i ? { ...r, label: e.target.value } : r))
                )
              }
            />
          </label>
        ))}
      </div>
      <div className="mt-5 flex flex-wrap gap-2">
        {rows.length < ACCOUNTABILITY_KPI_MAX ? (
          <button
            type="button"
            className={coachingSecondaryBtn}
            disabled={!canEdit || saving}
            onClick={() => setRows((prev) => [...prev, { id: undefined, label: '' }])}
          >
            Add another
          </button>
        ) : null}
        <button
          type="button"
          className={coachingPrimaryBtn}
          disabled={!canEdit || saving || !valid}
          onClick={save}
        >
          {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden /> : null}
          {COPY.kpiSave}
        </button>
      </div>
      {error ? <p className="mt-3 text-sm text-rose-300">{error}</p> : null}
    </section>
  );
}

function CheckInForm({
  view,
  canEdit,
  onSaved,
}: {
  view: MemberAccountabilityView;
  canEdit: boolean;
  onSaved: (v: MemberAccountabilityView) => void;
}) {
  const [values, setValues] = useState<Record<string, string>>(() =>
    Object.fromEntries(
      view.kpis.map((k) => [
        k.id,
        view.currentValues?.[k.id] != null ? String(view.currentValues[k.id]) : '',
      ])
    )
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const complete = view.kpis.every((k) => (values[k.id] ?? '').trim() !== '');

  async function submit() {
    setSaving(true);
    setError(null);
    const res = await post({ checkIn: { values } });
    setSaving(false);
    if (res.error) setError(res.error);
    else if (res.view) onSaved(res.view);
  }

  return (
    <section className={coachingCard}>
      <p className={coachingEyebrow}>Fortnight from {formatPeriod(view.period)}</p>
      <h2 className={`mt-1 ${coachingCardTitle}`}>{COPY.checkInTitle}</h2>
      <p className={`mt-1 ${coachingMuted}`}>
        {view.checkInDue ? COPY.checkInDue : COPY.checkInDone}
      </p>
      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        {view.kpis.map((k) => (
          <label key={k.id} className="block text-sm font-medium text-slate-200">
            {k.label}
            <input
              className={`${coachingFieldClass} font-mono`}
              type="number"
              inputMode="decimal"
              min={0}
              step="any"
              value={values[k.id] ?? ''}
              disabled={!canEdit || saving}
              onChange={(e) => setValues((prev) => ({ ...prev, [k.id]: e.target.value }))}
            />
          </label>
        ))}
      </div>
      <button
        type="button"
        className={`mt-5 ${coachingPrimaryBtn}`}
        disabled={!canEdit || saving || !complete}
        onClick={submit}
      >
        {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden /> : null}
        {COPY.checkInSubmit}
      </button>
      {error ? <p className="mt-3 text-sm text-rose-300">{error}</p> : null}
    </section>
  );
}

function KpiTrendChart({ view }: { view: MemberAccountabilityView }) {
  if (view.trend.length === 0) {
    return <p className={`mt-3 ${coachingMuted}`}>{COPY.trendEmpty}</p>;
  }
  const data = view.trend.map((p) => ({ ...p, label: formatPeriod(p.period) }));
  return (
    <div className="mt-4 h-72 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 8, right: 12, left: -12, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" vertical={false} />
          <XAxis
            dataKey="label"
            tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 11 }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            tick={{ fill: 'rgba(255,255,255,0.35)', fontSize: 11 }}
            axisLine={false}
            tickLine={false}
            allowDecimals={false}
          />
          <Tooltip
            contentStyle={{
              background: '#0c1424',
              border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: 8,
              color: '#e2e8f0',
            }}
          />
          <Legend wrapperStyle={{ color: '#cbd5e1', fontSize: 12 }} />
          {view.kpis.map((k, i) => (
            <Line
              key={k.id}
              type="monotone"
              dataKey={k.id}
              name={k.label}
              stroke={SERIES_COLOURS[i % SERIES_COLOURS.length]}
              strokeWidth={2}
              dot={{ r: 3 }}
              connectNulls
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

/** GP-635 Progress page: KPI setup, fortnightly check-in, streak, completion rate, KPI trend. */
export function CoachingProgressPage() {
  const { access } = useCoachingPortal();
  const meta = COACHING_PAGE_META.progress;
  const { state, replace } = useAccountability();
  const [editingKpis, setEditingKpis] = useState(false);

  if (state.status === 'loading') {
    return (
      <div className={coachingPage} data-testid="coaching-progress-loading">
        <Loader2
          className="mx-auto mt-16 h-8 w-8 motion-safe:animate-spin text-slate-500"
          aria-label="Loading"
        />
      </div>
    );
  }
  if (state.status === 'hidden') {
    return (
      <div className={coachingPage}>
        <div className={coachingCard}>
          <p className={coachingMuted}>
            Check-ins are available with an active coaching subscription.
          </p>
        </div>
      </div>
    );
  }

  const { view } = state;
  const showSetup = view.kpis.length === 0 || editingKpis;
  const saved = (v: MemberAccountabilityView) => {
    setEditingKpis(false);
    replace(v);
  };

  return (
    <div className={coachingPage} data-testid="coaching-progress-page">
      <CoachingPageHeader
        eyebrow={meta.eyebrow}
        title={meta.title}
        description={COPY.pageIntro}
        testId="coaching-progress-header"
      />

      {view.quiet ? (
        <div className="mb-6">
          <QuietBanner days={view.quiet.daysSilent} />
        </div>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-2">
        {showSetup ? (
          <div className="lg:col-span-2">
            <KpiSetupForm view={view} canEdit={access.canEdit} onSaved={saved} />
          </div>
        ) : (
          <>
            <div className="lg:col-span-2">
              <CheckInForm
                key={view.period}
                view={view}
                canEdit={access.canEdit}
                onSaved={replace}
              />
              <button
                type="button"
                className={`mt-3 text-sm text-sky-300 hover:text-sky-200`}
                onClick={() => setEditingKpis(true)}
              >
                Change my numbers
              </button>
            </div>

            <section className={coachingCard}>
              <h2 className="text-sm font-semibold text-slate-300">{COPY.streakLabel}</h2>
              <p className="mt-2 font-mono text-3xl font-semibold text-white">{view.streak}</p>
              <p className={coachingMuted}>{COPY.streakUnit}</p>
            </section>

            <section className={coachingCard}>
              <h2 className="text-sm font-semibold text-slate-300">{COPY.completionLabel}</h2>
              <p className="mt-2 font-mono text-3xl font-semibold text-white">
                {view.completion.percent}%
              </p>
              <p className={coachingMuted}>
                {view.completion.done} of {view.completion.total} actions done
              </p>
              <div
                className={`mt-3 ${coachingProgressTrackClass()}`}
                role="progressbar"
                aria-valuenow={view.completion.percent}
                aria-valuemin={0}
                aria-valuemax={100}
              >
                <div
                  className={coachingProgressFill}
                  style={coachingProgressFillStyle(view.completion.percent)}
                />
              </div>
            </section>

            <section className={`${coachingCard} lg:col-span-2`}>
              <h2 className={coachingCardTitle}>{COPY.trendTitle}</h2>
              <KpiTrendChart view={view} />
            </section>
          </>
        )}

        {view.nudges.length > 0 ? (
          <section className={`${coachingCard} lg:col-span-2`}>
            <h2 className="text-sm font-semibold text-slate-300">Actions needing attention</h2>
            <ul className="mt-3 space-y-2">
              {view.nudges.map((n, i) => (
                <li key={i} className="flex flex-wrap justify-between gap-2 text-sm text-slate-200">
                  <span>{n.title}</span>
                  <span
                    className={n.kind === 'action_overdue' ? 'text-rose-300' : 'text-amber-200'}
                  >
                    {n.kind === 'action_overdue' ? 'Overdue' : 'Due soon'}
                    {n.dueDate
                      ? `, ${new Date(n.dueDate).toLocaleDateString('en-AU', { day: 'numeric', month: 'short' })}`
                      : ''}
                  </span>
                </li>
              ))}
            </ul>
            <Link
              href={coachingPortalPath('/actions')}
              className={`mt-4 inline-flex ${coachingSecondaryBtn}`}
            >
              Open action board
            </Link>
          </section>
        ) : null}
      </div>

      <CoachingSupportPanel
        className="mt-8"
        mailSubject={meta.supportSubject}
        tips={meta.supportTips}
        testId="coaching-progress-support"
      />
    </div>
  );
}
