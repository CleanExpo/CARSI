'use client';

import {
  AlertTriangle,
  ArrowDownRight,
  ArrowRight,
  ArrowUpRight,
  BadgeCheck,
  CircleDollarSign,
  GraduationCap,
  Minus,
  Sparkles,
  Users,
} from 'lucide-react';
import Link from 'next/link';
import { useMemo, useState, type ReactNode } from 'react';
import {
  Area,
  Bar,
  CartesianGrid,
  ComposedChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

import { formatAdminDate } from '@/components/admin/admin-learner-ui';
import type { AdminDashboardClientData } from '@/lib/admin/admin-dashboard-data';
import {
  formatAud,
  formatSignedPct,
  momDeltaPct,
  type AdminOpsPeriod,
} from '@/lib/admin/admin-ops-format';
import { cn } from '@/lib/utils';

const chartTooltipProps = {
  contentStyle: {
    backgroundColor: 'rgba(8, 11, 20, 0.96)',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    borderRadius: 14,
    padding: '12px 16px',
  },
  labelStyle: { color: 'rgba(255, 255, 255, 0.5)', fontSize: 11 },
  itemStyle: { color: 'rgba(255, 255, 255, 0.95)', fontSize: 13, fontWeight: 600 },
} as const;

const PERIODS: { id: AdminOpsPeriod; label: string }[] = [
  { id: 'this_month', label: 'This month' },
  { id: 'last_month', label: 'Last month' },
  { id: 'this_year', label: 'This year' },
  { id: 'all', label: 'All time' },
];

function DeltaChip({ current, previous, show }: { current: number; previous: number; show: boolean }) {
  if (!show) return null;
  const pct = momDeltaPct(current, previous);
  if (pct === null) {
    return <span className="text-[11px] text-white/40">No last-month baseline</span>;
  }
  const up = pct > 0;
  const flat = pct === 0;
  const Icon = flat ? Minus : up ? ArrowUpRight : ArrowDownRight;
  return (
    <span
      className={cn(
        'inline-flex items-center gap-0.5 text-[11px] font-medium',
        flat ? 'text-white/45' : up ? 'text-emerald-300/90' : 'text-rose-300/90'
      )}
    >
      <Icon className="h-3 w-3" />
      {formatSignedPct(pct)}
    </span>
  );
}

export function AdminDashboardClient({ data }: { data: AdminDashboardClientData }) {
  const [period, setPeriod] = useState<AdminOpsPeriod>('this_month');
  const snapshot =
    data.ops[
      period === 'this_month'
        ? 'thisMonth'
        : period === 'last_month'
          ? 'lastMonth'
          : period === 'this_year'
            ? 'thisYear'
            : 'allTime'
    ];
  const compare = period === 'this_month';
  const generatedLabel = useMemo(() => {
    try {
      return new Date(data.generatedAt).toLocaleString('en-AU', {
        dateStyle: 'medium',
        timeStyle: 'short',
      });
    } catch {
      return '';
    }
  }, [data.generatedAt]);

  const completionRate =
    snapshot.enrollments > 0
      ? Math.round((snapshot.completions / snapshot.enrollments) * 100)
      : data.kpis.completionRatePct;

  const funnelTotal = Math.max(
    1,
    data.kpis.neverStartedEnrollments +
      data.kpis.inProgressEnrollments +
      data.kpis.completedEnrollments
  );
  const funnel = [
    {
      label: 'Not started',
      value: data.kpis.neverStartedEnrollments,
      href: '/admin/users?segment=never_started',
      tone: 'bg-amber-400',
    },
    {
      label: 'In progress',
      value: data.kpis.inProgressEnrollments,
      href: '/admin/users?segment=in_progress',
      tone: 'bg-[#2490ed]',
    },
    {
      label: 'Completed',
      value: data.kpis.completedEnrollments,
      href: '/admin/users?segment=completed',
      tone: 'bg-emerald-400',
    },
  ];

  const spark = data.charts.completionsLine;
  const sparkMax = Math.max(1, ...spark.map((d) => d.completions));
  const attentionLoad =
    data.ops.attention.neverStarted.length +
    data.ops.attention.refunds.length +
    data.kpis.neverStartedEnrollments;

  const topCourse = data.ops.topByRevenue[0];
  const avgTicket =
    snapshot.paidEnrollments > 0 ? snapshot.revenueAud / snapshot.paidEnrollments : 0;

  return (
    <div className="relative px-5 py-8 pb-24 sm:px-8 sm:py-10">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-72 bg-[radial-gradient(ellipse_at_top,_rgba(36,144,237,0.16),_transparent_55%)]"
      />

      <header className="relative mb-8 flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
        <div className="max-w-2xl space-y-3">
          <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-[11px] font-medium text-white/60">
            <span className="relative flex h-1.5 w-1.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400/60" />
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-400" />
            </span>
            Command board
            {generatedLabel ? <span className="text-white/35">· {generatedLabel}</span> : null}
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
            What needs you today
          </h1>
          <p className="text-sm leading-relaxed text-white/55">
            Catalogue AUD on paid seats — not a Stripe payout file. {data.ops.revenueNote}
          </p>
        </div>
        <div className="flex flex-wrap gap-1 rounded-full border border-white/10 bg-black/20 p-1">
          {PERIODS.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => setPeriod(p.id)}
              className={cn(
                'rounded-full px-3.5 py-1.5 text-xs font-medium transition-colors',
                period === p.id
                  ? 'bg-[#2490ed] text-white shadow-[0_0_20px_rgba(36,144,237,0.35)]'
                  : 'text-white/55 hover:text-white/85'
              )}
            >
              {p.label}
            </button>
          ))}
        </div>
      </header>

      <section className="relative mb-8 grid gap-4 xl:grid-cols-12">
        <div className="overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-[#1a1408] via-[#0c1018] to-[#0a1220] p-6 xl:col-span-7">
          <p className="text-[11px] font-semibold tracking-[0.16em] text-[#ed9d24]/80 uppercase">
            Recognised revenue
          </p>
          <p className="mt-3 text-4xl font-bold tracking-tight text-white tabular-nums sm:text-5xl">
            {formatAud(snapshot.revenueAud)}
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-white/55">
            <span>
              {snapshot.paidEnrollments.toLocaleString()} paid seats
              {avgTicket > 0 ? ` · ${formatAud(avgTicket)} average` : ''}
            </span>
            <DeltaChip
              current={snapshot.revenueAud}
              previous={data.ops.lastMonth.revenueAud}
              show={compare}
            />
          </div>
          {topCourse ? (
            <p className="mt-4 text-xs text-white/40">
              Leading course: {topCourse.title} · {formatAud(topCourse.revenueAud)}
            </p>
          ) : (
            <p className="mt-4 text-xs text-white/40">No paid seats in this window yet.</p>
          )}
        </div>

        <div className="grid gap-3 sm:grid-cols-2 xl:col-span-5">
          <PulseStat
            label="New learners"
            value={snapshot.newUsers.toLocaleString()}
            hint={`${data.kpis.totalUsers.toLocaleString()} on the books`}
            href="/admin/users?segment=new"
            delta={
              <DeltaChip
                current={snapshot.newUsers}
                previous={data.ops.lastMonth.newUsers}
                show={compare}
              />
            }
          />
          <PulseStat
            label="Completions"
            value={snapshot.completions.toLocaleString()}
            hint={`${completionRate}% of enrolments in this window`}
            delta={
              <DeltaChip
                current={snapshot.completions}
                previous={data.ops.lastMonth.completions}
                show={compare}
              />
            }
          />
          <PulseStat
            label="Needs a look"
            value={data.kpis.neverStartedEnrollments.toLocaleString()}
            hint="Paid or enrolled, not started"
            href="/admin/users?segment=never_started"
            alert={data.kpis.neverStartedEnrollments > 0}
          />
          <PulseStat
            label="Attention load"
            value={attentionLoad.toLocaleString()}
            hint="Unopened + refunds in the queues below"
          />
        </div>
      </section>

      <section className="mb-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <PulseStat
          label="Active learners"
          value={data.kpis.activeLearners.toLocaleString()}
          href="/admin/users?segment=active"
        />
        <PulseStat
          label="Certificates"
          value={snapshot.certificates.toLocaleString()}
          hint={`${data.kpis.certificatesIssued.toLocaleString()} lifetime`}
        />
        <PulseStat
          label="CEC completions"
          value={data.kpis.cecCompletions.toLocaleString()}
          hint="Approved CEC hours only"
          href="/admin/iicrc-cec"
        />
        <PulseStat
          label="Catalogue"
          value={data.catalogMeta.totalCoursesInCatalog.toLocaleString()}
          hint={`${data.catalogMeta.catalogSource} · ${data.catalogMeta.excelPath}`}
        />
      </section>

      {data.kpis.refundedEnrollments > 0 ? (
        <p className="mb-8 flex items-center gap-2 rounded-2xl border border-amber-400/20 bg-amber-400/5 px-4 py-3 text-sm text-[#f2cf8f]">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          {data.kpis.refundedEnrollments} revoked or refunded enrolment
          {data.kpis.refundedEnrollments === 1 ? '' : 's'} — check before promising access.
        </p>
      ) : null}

      <section className="mb-8 rounded-3xl border border-white/10 bg-white/[0.03] p-5">
        <div className="mb-4 flex items-end justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold text-white/88">Learner pipeline</h2>
            <p className="mt-1 text-xs text-white/45">Where paid and enrolled seats sit right now.</p>
          </div>
        </div>
        <div className="grid gap-3 md:grid-cols-3">
          {funnel.map((step) => (
            <Link
              key={step.label}
              href={step.href}
              className="rounded-2xl border border-white/[0.06] bg-black/20 p-4 transition-colors hover:border-white/15"
            >
              <p className="text-[11px] font-semibold tracking-[0.12em] text-white/40 uppercase">
                {step.label}
              </p>
              <p className="mt-2 text-2xl font-bold text-white tabular-nums">{step.value}</p>
              <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/8">
                <div
                  className={cn('h-full rounded-full', step.tone)}
                  style={{ width: `${Math.round((step.value / funnelTotal) * 100)}%` }}
                />
              </div>
            </Link>
          ))}
        </div>
      </section>

      <section className="mb-8 grid gap-5 lg:grid-cols-12">
        <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-5 lg:col-span-7">
          <h2 className="text-sm font-semibold text-white/88">Revenue and seats by month</h2>
          <p className="mt-1 text-xs text-white/45">Gold is recognised AUD. Blue is enrolments.</p>
          <div className="mt-4 h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={data.ops.monthly} margin={{ top: 8, right: 8, left: -8, bottom: 0 }}>
                <CartesianGrid strokeDasharray="4 6" stroke="rgba(255,255,255,0.06)" />
                <XAxis
                  dataKey="month"
                  tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 10 }}
                  tickLine={false}
                />
                <YAxis
                  yAxisId="aud"
                  tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 10 }}
                  tickLine={false}
                  axisLine={false}
                  width={44}
                />
                <YAxis
                  yAxisId="count"
                  orientation="right"
                  tick={{ fill: 'rgba(255,255,255,0.35)', fontSize: 10 }}
                  tickLine={false}
                  axisLine={false}
                  width={28}
                />
                <Tooltip {...chartTooltipProps} />
                <Area
                  yAxisId="aud"
                  type="monotone"
                  dataKey="revenueAud"
                  name="AUD"
                  stroke="#ed9d24"
                  fill="#ed9d24"
                  fillOpacity={0.16}
                />
                <Bar
                  yAxisId="count"
                  dataKey="enrollments"
                  name="Enrolments"
                  fill="#2490ed"
                  radius={[6, 6, 0, 0]}
                  barSize={16}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-5 lg:col-span-5">
          <h2 className="text-sm font-semibold text-white/88">Highest-earning courses</h2>
          <p className="mt-1 text-xs text-white/45">Catalogue price × paid enrolments.</p>
          {data.ops.topByRevenue.length === 0 ? (
            <p className="pt-16 text-center text-sm text-white/40">No paid enrolments yet.</p>
          ) : (
            <ol className="mt-5 space-y-3">
              {data.ops.topByRevenue.map((row, i) => {
                const max = data.ops.topByRevenue[0]?.revenueAud || 1;
                return (
                  <li key={row.title}>
                    <div className="mb-1 flex items-baseline justify-between gap-3">
                      <span className="truncate text-sm text-white/88">
                        <span className="mr-2 font-mono text-[11px] text-white/35">
                          {String(i + 1).padStart(2, '0')}
                        </span>
                        {row.title}
                      </span>
                      <span className="shrink-0 text-xs font-medium text-[#ed9d24] tabular-nums">
                        {formatAud(row.revenueAud)}
                      </span>
                    </div>
                    <div className="h-1 overflow-hidden rounded-full bg-white/8">
                      <div
                        className="h-full rounded-full bg-[#ed9d24]"
                        style={{ width: `${Math.max(6, Math.round((row.revenueAud / max) * 100))}%` }}
                      />
                    </div>
                    <p className="mt-1 text-[11px] text-white/35">
                      {row.enrollments} paid seat{row.enrollments === 1 ? '' : 's'}
                    </p>
                  </li>
                );
              })}
            </ol>
          )}
        </div>
      </section>

      <section className="mb-8 rounded-3xl border border-white/10 bg-white/[0.03] p-5">
        <div className="mb-3 flex items-center justify-between">
          <div>
            <h2 className="text-sm font-semibold text-white/88">Completions, last 14 days</h2>
            <p className="mt-1 text-xs text-white/45">Daily finish line — not enrolments.</p>
          </div>
          <Sparkles className="h-4 w-4 text-white/25" />
        </div>
        <div className="flex h-16 items-end gap-1">
          {spark.map((d) => (
            <div
              key={d.date}
              title={`${d.date}: ${d.completions}`}
              className="flex-1 rounded-t-sm bg-[#2490ed]/80"
              style={{ height: `${Math.max(8, (d.completions / sparkMax) * 100)}%` }}
            />
          ))}
        </div>
      </section>

      <section className="grid gap-5 lg:grid-cols-3">
        <AttentionCard
          title="Bought, not started"
          empty="Nobody is sitting on an unopened course."
          rows={data.ops.attention.neverStarted.map((r) => ({
            href: `/admin/users/${r.userId}`,
            title: r.name,
            meta: r.courseTitle,
          }))}
          icon={Users}
          tone="warn"
        />
        <AttentionCard
          title="Recently completed"
          empty="No completions in the current data."
          rows={data.ops.attention.recentCompletions.map((r) => ({
            href: `/admin/users/${r.userId}`,
            title: r.name,
            meta: `${r.courseTitle} · ${formatAdminDate(r.at)}`,
          }))}
          icon={GraduationCap}
        />
        <AttentionCard
          title="Refunds and revokes"
          empty="No refunded or revoked seats."
          rows={data.ops.attention.refunds.map((r) => ({
            href: `/admin/users/${r.userId}`,
            title: r.name,
            meta: `${r.courseTitle} · ${r.reason}`,
          }))}
          icon={CircleDollarSign}
          tone="warn"
        />
      </section>

      <p className="mt-10">
        <Link
          href="/admin/users"
          className="inline-flex items-center gap-2 text-sm font-medium text-[#7ec5ff] hover:underline"
        >
          Open customer directory
          <ArrowRight className="h-4 w-4" />
        </Link>
      </p>
    </div>
  );
}

function PulseStat({
  label,
  value,
  hint,
  href,
  delta,
  alert,
}: {
  label: string;
  value: string;
  hint?: string;
  href?: string;
  delta?: ReactNode;
  alert?: boolean;
}) {
  const inner = (
    <>
      <p className="text-[11px] font-semibold tracking-[0.14em] text-white/42 uppercase">{label}</p>
      <p className="mt-2 text-2xl font-bold tracking-tight text-white tabular-nums">{value}</p>
      {delta ? <div className="mt-1">{delta}</div> : null}
      {hint ? <p className="mt-1 text-xs text-white/42">{hint}</p> : null}
    </>
  );
  const className = cn(
    'rounded-2xl border p-5 transition-colors',
    alert
      ? 'border-amber-400/25 bg-amber-400/[0.06] hover:border-amber-400/40'
      : 'border-white/[0.07] bg-white/[0.03] hover:border-white/12'
  );
  if (href) {
    return (
      <Link href={href} className={cn(className, 'block')}>
        {inner}
      </Link>
    );
  }
  return <div className={className}>{inner}</div>;
}

function AttentionCard({
  title,
  empty,
  rows,
  icon: Icon,
  tone,
}: {
  title: string;
  empty: string;
  rows: { href: string; title: string; meta: string }[];
  icon: typeof BadgeCheck;
  tone?: 'warn';
}) {
  return (
    <div
      className={cn(
        'rounded-3xl border p-5',
        tone === 'warn' && rows.length > 0
          ? 'border-amber-400/20 bg-amber-400/[0.04]'
          : 'border-white/10 bg-white/[0.03]'
      )}
    >
      <h2 className="flex items-center justify-between gap-2 text-sm font-semibold text-white/88">
        <span className="inline-flex items-center gap-2">
          <Icon className="h-4 w-4 text-white/40" />
          {title}
        </span>
        <span className="font-mono text-xs text-white/35">{rows.length}</span>
      </h2>
      {rows.length === 0 ? (
        <p className="mt-6 text-sm text-white/40">{empty}</p>
      ) : (
        <ul className="mt-4 space-y-3">
          {rows.map((row) => (
            <li key={`${row.href}-${row.meta}`}>
              <Link href={row.href} className="block rounded-lg px-1 py-0.5 hover:bg-white/[0.04]">
                <p className="truncate text-sm text-white/88">{row.title}</p>
                <p className="truncate text-xs text-white/42">{row.meta}</p>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
