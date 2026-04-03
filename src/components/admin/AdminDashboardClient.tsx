'use client';

import { useId, useMemo, useState, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { LucideIcon } from 'lucide-react';
import {
  Activity,
  AreaChart as AreaChartIcon,
  BarChart3,
  BookOpen,
  CheckCircle2,
  LayoutDashboard,
  LineChart as LineChartIcon,
  Loader2,
  PieChart as PieChartIcon,
  Sparkles,
  Trash2,
  TrendingUp,
  UserRound,
  Users,
} from 'lucide-react';

import type { AdminDashboardClientData, AdminUserProgress } from '@/lib/admin/admin-dashboard-data';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ProgressBar } from '@/components/lms/ProgressBar';
import { cn } from '@/lib/utils';

const CHART_COLS = ['#2490ed', '#22d3ee', '#34d399', '#fb923c', '#a78bfa', '#f472b6'];

const chartTooltipProps = {
  contentStyle: {
    backgroundColor: 'rgba(10, 14, 26, 0.97)',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    borderRadius: 14,
    boxShadow: '0 20px 50px rgba(0, 0, 0, 0.55)',
    padding: '12px 16px',
  },
  labelStyle: { color: 'rgba(255, 255, 255, 0.5)', fontSize: 11, marginBottom: 6, fontWeight: 500 },
  itemStyle: { color: 'rgba(255, 255, 255, 0.95)', fontSize: 13, fontWeight: 600 },
  cursor: { fill: 'rgba(36, 144, 237, 0.08)' },
  animationDuration: 180,
  animationEasing: 'ease-out' as const,
} as const;

const chartPanelMotion = cn(
  'motion-reduce:animate-none animate-slide-up [animation-fill-mode:both]'
);

function statusSliceColor(name: string, idx: number) {
  if (name === 'Completed') return '#34d399';
  return CHART_COLS[idx % CHART_COLS.length] ?? '#2490ed';
}

function truncateTick(label: unknown, max = 11) {
  const s = typeof label === 'string' ? label : String(label);
  return s.length > max ? `${s.slice(0, max - 1)}…` : s;
}

function AnalyticsPanel({
  title,
  subtitle,
  icon: Icon,
  accent = '#2490ed',
  staggerClass,
  headerRight,
  children,
  className,
}: {
  title: string;
  subtitle: string;
  icon: LucideIcon;
  accent?: string;
  staggerClass?: string;
  headerRight?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        chartPanelMotion,
        'group relative flex min-h-0 flex-col overflow-hidden rounded-2xl border border-white/10',
        'bg-gradient-to-br from-white/[0.08] via-white/[0.03] to-transparent',
        'shadow-[0_0_0_1px_rgba(255,255,255,0.04)_inset,0_24px_56px_-32px_rgba(0,0,0,0.72)]',
        'transition-[transform,box-shadow,border-color] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)]',
        'hover:border-white/[0.14] hover:shadow-[0_0_0_1px_rgba(255,255,255,0.06)_inset,0_32px_64px_-28px_rgba(36,144,237,0.2)]',
        staggerClass,
        className
      )}
    >
      <div
        className="pointer-events-none absolute -right-24 -top-28 h-64 w-64 rounded-full opacity-[0.35] blur-3xl transition-all duration-700 ease-out group-hover:opacity-[0.48]"
        style={{ background: `radial-gradient(circle, ${accent}40 0%, transparent 68%)` }}
      />
      <div className="relative z-[1] flex min-h-0 flex-1 flex-col">
        <div className="flex shrink-0 items-start justify-between gap-3 border-b border-white/[0.07] px-5 py-4 sm:px-6">
          <div className="flex min-w-0 gap-3.5">
            <div
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/[0.06] transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:scale-[1.05]"
              style={{ color: accent }}
            >
              <Icon className="h-5 w-5" strokeWidth={1.65} />
            </div>
            <div className="min-w-0 space-y-1">
              <h3 className="text-[15px] font-semibold tracking-tight text-white/[0.94]">{title}</h3>
              <p className="text-xs leading-relaxed text-white/48">{subtitle}</p>
            </div>
          </div>
          {headerRight ? <div className="shrink-0 pt-0.5">{headerRight}</div> : null}
        </div>
        <div className="min-h-0 flex-1 px-3 pb-5 pt-3 sm:px-5 sm:pb-6">{children}</div>
      </div>
    </div>
  );
}

function AnalyticsChartEmpty({ message }: { message: string }) {
  return (
    <div className="flex h-[min(280px,42vh)] flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-white/[0.1] bg-black/25 px-6 text-center">
      <div className="h-px w-12 bg-gradient-to-r from-transparent via-white/25 to-transparent" />
      <p className="max-w-[220px] text-sm leading-relaxed text-white/45">{message}</p>
    </div>
  );
}

function completionColor(completionPct: number) {
  if (completionPct >= 90) return '#34d399';
  if (completionPct >= 40) return '#2490ed';
  return '#fb923c';
}

function AvatarIcon({ user }: { user: AdminUserProgress }) {
  const label = (user.fullName ?? user.email).split(' ').filter(Boolean)[0]?.slice(0, 1) ?? 'A';
  return (
    <div
      aria-hidden
      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-sm font-bold tracking-tight shadow-inner transition-transform duration-200 group-hover:scale-[1.03]"
      style={{
        background: 'linear-gradient(145deg, rgba(36,144,237,0.22) 0%, rgba(36,144,237,0.06) 100%)',
        border: '1px solid rgba(36,144,237,0.28)',
        color: '#93c5fd',
      }}
    >
      {label.toUpperCase()}
    </div>
  );
}

function SectionHeading({ title, description }: { title: string; description?: string }) {
  return (
    <div className="mb-5 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h2 className="text-[11px] font-semibold tracking-[0.22em] text-white/40 uppercase">{title}</h2>
        {description ? <p className="mt-1 max-w-2xl text-sm leading-relaxed text-white/50">{description}</p> : null}
      </div>
    </div>
  );
}

function KpiCard({
  label,
  value,
  accent,
  icon: Icon,
}: {
  label: string;
  value: string | number;
  accent: string;
  icon: typeof Users;
}) {
  const display = typeof value === 'number' ? value.toLocaleString() : value;
  return (
    <div
      className={cn(
        'group relative overflow-hidden rounded-2xl border border-white/[0.07] bg-white/[0.025] p-5',
        'shadow-[0_1px_0_rgba(255,255,255,0.04)_inset] transition-all duration-300 ease-out',
        'hover:border-white/[0.11] hover:bg-white/[0.035] hover:shadow-[0_20px_48px_-24px_rgba(0,0,0,0.65)]'
      )}
    >
      <div
        className="absolute top-0 left-0 h-[3px] w-full opacity-90 transition-opacity duration-300 group-hover:opacity-100"
        style={{
          background: `linear-gradient(90deg, ${accent}, transparent)`,
        }}
      />
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-3">
          <p className="text-[11px] font-semibold tracking-[0.14em] text-white/42 uppercase">{label}</p>
          <p className="text-3xl font-bold tracking-tight tabular-nums sm:text-[2rem]" style={{ color: accent }}>
            {display}
          </p>
        </div>
        <div
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-white/[0.08] bg-white/[0.04] transition-transform duration-300 group-hover:scale-105"
          style={{ color: accent }}
        >
          <Icon className="h-5 w-5 opacity-90" strokeWidth={1.75} />
        </div>
      </div>
    </div>
  );
}

export function AdminDashboardClient({ data }: { data: AdminDashboardClientData }) {
  const router = useRouter();
  const chartUid = useId().replace(/:/g, '');
  const [selectedUserId, setSelectedUserId] = useState<string | null>(data.users[0]?.userId ?? null);
  const [courseSlugToAdd, setCourseSlugToAdd] = useState<string>('');
  const [pendingGrant, setPendingGrant] = useState(false);
  const [pendingRevokeId, setPendingRevokeId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const selected = useMemo(
    () => data.users.find((u) => u.userId === selectedUserId) ?? null,
    [data.users, selectedUserId]
  );

  const enrolledSlugs = useMemo(
    () => new Set(selected?.enrollments.map((e) => e.courseSlug) ?? []),
    [selected]
  );

  const grantableCourses = useMemo(
    () => data.catalogCourses.filter((c) => !enrolledSlugs.has(c.slug)),
    [data.catalogCourses, enrolledSlugs]
  );

  const gaugeData = useMemo(() => {
    const pct = selected?.overallCompletionPct ?? 0;
    return [
      { name: 'done', value: pct },
      { name: 'rest', value: Math.max(0, 100 - pct) },
    ];
  }, [selected]);

  const generatedLabel = useMemo(() => {
    try {
      return new Date(data.generatedAt).toLocaleString(undefined, {
        dateStyle: 'medium',
        timeStyle: 'short',
      });
    } catch {
      return '';
    }
  }, [data.generatedAt]);

  const statusEnrollmentTotal = useMemo(
    () => data.charts.statusPie.reduce((acc, row) => acc + row.value, 0),
    [data.charts.statusPie]
  );

  async function grantCourse() {
    setActionError(null);
    if (!selectedUserId || !courseSlugToAdd) return;
    setPendingGrant(true);
    try {
      const res = await fetch('/api/admin/enrollments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ studentId: selectedUserId, courseSlug: courseSlugToAdd }),
      });
      const payload = (await res.json().catch(() => ({}))) as { detail?: string };
      if (!res.ok) {
        setActionError(payload.detail ?? 'Could not add course');
        return;
      }
      setCourseSlugToAdd('');
      router.refresh();
    } finally {
      setPendingGrant(false);
    }
  }

  async function revokeEnrollment(enrollmentId: string) {
    setActionError(null);
    setPendingRevokeId(enrollmentId);
    try {
      const res = await fetch(`/api/admin/enrollments/${enrollmentId}`, { method: 'DELETE' });
      const payload = (await res.json().catch(() => ({}))) as { detail?: string };
      if (!res.ok) {
        setActionError(payload.detail ?? 'Could not remove course');
        return;
      }
      router.refresh();
    } finally {
      setPendingRevokeId(null);
    }
  }

  const glassCard = cn(
    'rounded-2xl border border-white/[0.07] bg-white/[0.025]',
    'shadow-[0_1px_0_rgba(255,255,255,0.04)_inset]',
    'transition-[border-color,box-shadow,background-color] duration-300 ease-out',
    'hover:border-white/[0.1] hover:bg-white/[0.03]'
  );

  return (
    <div className="relative px-5 py-8 pb-20 sm:px-8 sm:py-10">
      <div
        className="pointer-events-none absolute inset-0 -z-10 opacity-[0.55]"
        aria-hidden
        style={{
          background:
            'radial-gradient(900px 420px at 12% -8%, rgba(36, 144, 237, 0.14), transparent 55%), radial-gradient(700px 380px at 88% 0%, rgba(34, 211, 238, 0.08), transparent 50%)',
        }}
      />

      <header className="mb-10 max-w-3xl space-y-4">
        <div className="inline-flex items-center gap-2 rounded-full border border-white/[0.08] bg-white/[0.04] px-3 py-1 text-[11px] font-medium tracking-wide text-white/55">
          <LayoutDashboard className="h-3.5 w-3.5 text-[#2490ed]" strokeWidth={2} />
          Overview
        </div>
        <div className="space-y-2">
          <h1 className="text-3xl font-bold tracking-tight text-white sm:text-[2rem] sm:leading-tight">
            Learner insights
          </h1>
          <p className="max-w-2xl text-sm leading-relaxed text-white/52 sm:text-[15px]">
            Monitor workbook engagement, completion, and catalog coverage. Seed catalog holds{' '}
            <span className="font-semibold text-white/75">{data.catalogMeta.totalCoursesInCatalog}</span>{' '}
            courses.
          </p>
        </div>
        {generatedLabel ? (
          <p className="text-xs text-white/38">Figures refreshed · {generatedLabel}</p>
        ) : null}
      </header>

      {actionError ? (
        <div
          className="mb-8 flex items-start gap-3 rounded-xl border border-red-400/25 bg-red-500/[0.09] px-4 py-3 text-sm text-red-100/95 shadow-[0_0_0_1px_rgba(248,113,113,0.08)_inset]"
          role="status"
        >
          <span className="mt-0.5 inline-block h-1.5 w-1.5 shrink-0 rounded-full bg-red-400" />
          {actionError}
        </div>
      ) : null}

      <section className="mb-14">
        <SectionHeading
          title="Key metrics"
          description="High-level counts across your learner base and workbook enrollments."
        />
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <KpiCard label="Users" value={data.kpis.totalUsers} accent="#93c5fd" icon={Users} />
          <KpiCard label="Active enrollments" value={data.kpis.activeLearners} accent="#22d3ee" icon={Activity} />
          <KpiCard label="Completed" value={data.kpis.completedEnrollments} accent="#34d399" icon={CheckCircle2} />
          <KpiCard
            label="Completion rate"
            value={`${data.kpis.completionRatePct}%`}
            accent="#2490ed"
            icon={TrendingUp}
          />
        </div>
      </section>

      <section className="mb-16">
        <SectionHeading
          title="Analytics"
          description="Interactive charts with smooth transitions — hover for detail. Figures mirror your current catalog and enrollments."
        />
        <div className="rounded-3xl border border-white/[0.08] bg-gradient-to-b from-white/[0.04] to-transparent p-4 shadow-[0_1px_0_rgba(255,255,255,0.05)_inset] sm:p-6">
          <div className="grid auto-rows-fr gap-5 lg:grid-cols-12 lg:gap-6">
            <AnalyticsPanel
              className="lg:col-span-7"
              staggerClass="[animation-delay:0ms]"
              title="Completion by course"
              subtitle="Share of enrollments marked complete — full titles in the tooltip."
              icon={BarChart3}
              accent="#38bdf8"
            >
              {data.charts.completionByCourseBar.length === 0 ? (
                <AnalyticsChartEmpty message="No workbook enrollments yet — add learners and courses to see this chart." />
              ) : (
                <div className="h-[min(320px,48vh)] w-full min-h-[240px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={data.charts.completionByCourseBar}
                      margin={{ top: 16, right: 10, left: -12, bottom: 4 }}
                      barCategoryGap="20%"
                    >
                      <CartesianGrid strokeDasharray="5 8" vertical={false} stroke="rgba(255,255,255,0.055)" />
                      <XAxis
                        dataKey="courseTitle"
                        tick={{ fill: 'rgba(255,255,255,0.42)', fontSize: 10 }}
                        tickLine={false}
                        axisLine={{ stroke: 'rgba(255,255,255,0.07)' }}
                        interval={0}
                        angle={-20}
                        textAnchor="end"
                        height={58}
                        tickFormatter={(v) => truncateTick(v, 10)}
                      />
                      <YAxis
                        tick={{ fill: 'rgba(255,255,255,0.42)', fontSize: 11 }}
                        tickLine={false}
                        axisLine={false}
                        domain={[0, 100]}
                        width={34}
                        tickFormatter={(v) => `${v}%`}
                      />
                      <Tooltip
                        {...chartTooltipProps}
                        formatter={(value: number | string) => [`${value}%`, 'Complete']}
                        labelFormatter={(label) => (typeof label === 'string' ? label : String(label))}
                      />
                      <Bar
                        dataKey="completionPct"
                        radius={[8, 8, 0, 0]}
                        animationDuration={1100}
                        animationEasing="ease-out"
                        maxBarSize={48}
                      >
                        {data.charts.completionByCourseBar.map((_, idx) => (
                          <Cell key={idx} fill={CHART_COLS[idx % CHART_COLS.length]} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </AnalyticsPanel>

            <AnalyticsPanel
              className="lg:col-span-5"
              staggerClass="[animation-delay:70ms]"
              title="Enrollment status"
              subtitle="Distribution across active and completed states."
              icon={PieChartIcon}
              accent="#34d399"
              headerRight={
                <span className="rounded-full border border-white/10 bg-white/[0.05] px-2.5 py-1 text-[11px] font-semibold tabular-nums text-white/55">
                  {statusEnrollmentTotal} total
                </span>
              }
            >
              <div className="flex flex-col items-stretch gap-6 lg:flex-row lg:items-center">
                <div className="relative mx-auto h-[220px] w-full max-w-[260px] shrink-0 lg:mx-0 lg:w-[52%]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart margin={{ top: 4, right: 4, bottom: 4, left: 4 }}>
                      <Pie
                        data={data.charts.statusPie}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        innerRadius="62%"
                        outerRadius="88%"
                        paddingAngle={5}
                        cornerRadius={6}
                        stroke="rgba(6,10,20,0.55)"
                        strokeWidth={2}
                        animationDuration={1000}
                        animationEasing="ease-out"
                      >
                        {data.charts.statusPie.map((entry, idx) => (
                          <Cell key={entry.name} fill={statusSliceColor(entry.name, idx)} />
                        ))}
                      </Pie>
                      <Tooltip
                        {...chartTooltipProps}
                        formatter={(value: number | string, name: string) => [value, name]}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
                    <span className="text-3xl font-bold tracking-tight tabular-nums text-white/[0.92]">
                      {statusEnrollmentTotal}
                    </span>
                    <span className="mt-0.5 text-[10px] font-semibold tracking-[0.2em] text-white/38 uppercase">
                      enrollments
                    </span>
                  </div>
                </div>
                <ul className="flex min-w-0 flex-1 flex-col justify-center gap-3 lg:pl-2">
                  {data.charts.statusPie.map((row, idx) => {
                    const pct =
                      statusEnrollmentTotal > 0 ? Math.round((row.value / statusEnrollmentTotal) * 100) : 0;
                    const color = statusSliceColor(row.name, idx);
                    return (
                      <li
                        key={row.name}
                        className="flex items-center gap-3 rounded-xl border border-white/[0.06] bg-black/20 px-3 py-2.5 transition-colors duration-300 hover:border-white/[0.1] hover:bg-white/[0.04]"
                      >
                        <span
                          className="h-2.5 w-2.5 shrink-0 rounded-full shadow-[0_0_10px_currentColor]"
                          style={{ backgroundColor: color, color }}
                        />
                        <div className="min-w-0 flex-1">
                          <div className="text-sm font-medium text-white/88">{row.name}</div>
                          <div className="text-xs text-white/42">{pct}% of all enrollments</div>
                        </div>
                        <span className="shrink-0 text-sm font-bold tabular-nums text-white/80">{row.value}</span>
                      </li>
                    );
                  })}
                </ul>
              </div>
            </AnalyticsPanel>

            <AnalyticsPanel
              className="lg:col-span-12"
              staggerClass="[animation-delay:130ms]"
              title="Catalog categories"
              subtitle="Courses per category — ranked bars are easier to scan than a crowded pie."
              icon={LineChartIcon}
              accent="#a78bfa"
            >
              {data.charts.catalogCategoryPie.length === 0 ? (
                <AnalyticsChartEmpty message="No categories in the seed catalog." />
              ) : (
                <div className="h-[min(340px,50vh)] w-full min-h-[260px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      layout="vertical"
                      data={data.charts.catalogCategoryPie}
                      margin={{ top: 8, right: 20, left: 8, bottom: 8 }}
                    >
                      <CartesianGrid strokeDasharray="5 8" horizontal stroke="rgba(255,255,255,0.055)" />
                      <XAxis
                        type="number"
                        tick={{ fill: 'rgba(255,255,255,0.42)', fontSize: 11 }}
                        tickLine={false}
                        axisLine={false}
                      />
                      <YAxis
                        type="category"
                        dataKey="name"
                        width={128}
                        tick={{ fill: 'rgba(255,255,255,0.5)', fontSize: 10 }}
                        tickLine={false}
                        axisLine={false}
                        tickFormatter={(v) => truncateTick(v, 16)}
                      />
                      <Tooltip
                        {...chartTooltipProps}
                        formatter={(value: number | string) => [value, 'Courses']}
                        labelFormatter={(label) => (typeof label === 'string' ? label : String(label))}
                      />
                      <Bar
                        dataKey="value"
                        radius={[0, 10, 10, 0]}
                        barSize={14}
                        animationDuration={1100}
                        animationEasing="ease-out"
                        maxBarSize={18}
                      >
                        {data.charts.catalogCategoryPie.map((_, i) => (
                          <Cell key={i} fill={CHART_COLS[i % CHART_COLS.length]} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </AnalyticsPanel>

            <AnalyticsPanel
              className="lg:col-span-6"
              staggerClass="[animation-delay:190ms]"
              title="Seats per course"
              subtitle="Top titles by active enrollment count."
              icon={BarChart3}
              accent="#2490ed"
            >
              {data.charts.enrollmentsPerCourse.length === 0 ? (
                <AnalyticsChartEmpty message="No enrollment data to rank yet." />
              ) : (
                <div className="h-[min(340px,48vh)] w-full min-h-[260px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      layout="vertical"
                      data={data.charts.enrollmentsPerCourse}
                      margin={{ top: 10, right: 18, left: 4, bottom: 8 }}
                    >
                      <CartesianGrid strokeDasharray="5 8" horizontal stroke="rgba(255,255,255,0.055)" />
                      <XAxis
                        type="number"
                        tick={{ fill: 'rgba(255,255,255,0.42)', fontSize: 11 }}
                        tickLine={false}
                        axisLine={false}
                      />
                      <YAxis
                        type="category"
                        dataKey="name"
                        width={132}
                        tick={{ fill: 'rgba(255,255,255,0.48)', fontSize: 10 }}
                        tickLine={false}
                        axisLine={false}
                      />
                      <Tooltip
                        {...chartTooltipProps}
                        formatter={(value: number | string) => [value, 'Enrollments']}
                      />
                      <Bar
                        dataKey="enrollments"
                        fill="#2490ed"
                        radius={[0, 10, 10, 0]}
                        barSize={15}
                        animationDuration={1100}
                        animationEasing="ease-out"
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </AnalyticsPanel>

            <AnalyticsPanel
              className="lg:col-span-6"
              staggerClass="[animation-delay:250ms]"
              title="Completion trend"
              subtitle="Daily completed enrollments over the last 14 days."
              icon={AreaChartIcon}
              accent="#22d3ee"
            >
              <div className="h-[min(340px,48vh)] w-full min-h-[260px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={data.charts.completionsLine} margin={{ top: 16, right: 12, left: -12, bottom: 8 }}>
                    <defs>
                      <linearGradient id={`adminArea-${chartUid}`} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="4%" stopColor="#22d3ee" stopOpacity={0.5} />
                        <stop offset="92%" stopColor="#2490ed" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="5 8" stroke="rgba(255,255,255,0.055)" />
                    <XAxis
                      dataKey="date"
                      tick={{ fill: 'rgba(255,255,255,0.42)', fontSize: 10 }}
                      tickLine={false}
                      axisLine={{ stroke: 'rgba(255,255,255,0.07)' }}
                      tickFormatter={(v) => (typeof v === 'string' && v.length >= 10 ? v.slice(5, 10) : String(v))}
                    />
                    <YAxis
                      tick={{ fill: 'rgba(255,255,255,0.42)', fontSize: 11 }}
                      tickLine={false}
                      axisLine={false}
                      width={36}
                      allowDecimals={false}
                    />
                    <Tooltip
                      {...chartTooltipProps}
                      formatter={(value: number | string) => [value, 'Completions']}
                      labelFormatter={(label) => (typeof label === 'string' ? label : String(label))}
                    />
                    <Area
                      type="monotone"
                      dataKey="completions"
                      stroke="#22d3ee"
                      strokeWidth={2.5}
                      fillOpacity={1}
                      fill={`url(#adminArea-${chartUid})`}
                      animationDuration={1200}
                      animationEasing="ease-out"
                      dot={false}
                      activeDot={{ r: 5, strokeWidth: 0, fill: '#e0f2fe' }}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </AnalyticsPanel>
          </div>
        </div>
      </section>

      <section>
        <SectionHeading
          title="Learner management"
          description="Select a learner, review progress, and grant or revoke workbook access."
        />
        <div className="grid gap-5 lg:grid-cols-12">
          <Card className={cn(glassCard, 'lg:col-span-3')}>
            <CardHeader className="border-b border-white/[0.06] pb-4">
              <CardTitle className="text-base font-semibold text-white/88">Selected learner</CardTitle>
              <CardDescription className="text-white/45">Overall workbook progress</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col items-center gap-5 pt-6">
              {selected ? (
                <>
                  <div className="relative h-[168px] w-[168px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={gaugeData}
                          dataKey="value"
                          cx="50%"
                          cy="50%"
                          innerRadius="62%"
                          outerRadius="86%"
                          startAngle={90}
                          endAngle={-270}
                          stroke="none"
                          animationDuration={700}
                        >
                          <Cell fill="#2490ed" />
                          <Cell fill="rgba(255,255,255,0.07)" />
                        </Pie>
                        <Tooltip {...chartTooltipProps} />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
                      <div
                        className="text-3xl font-black tabular-nums tracking-tight"
                        style={{ color: completionColor(selected.overallCompletionPct) }}
                      >
                        {selected.overallCompletionPct}%
                      </div>
                      <div className="mt-0.5 text-[10px] font-semibold tracking-[0.2em] text-white/38 uppercase">
                        overall
                      </div>
                    </div>
                  </div>
                  <div className="w-full space-y-1 text-center">
                    <div className="text-sm font-semibold text-white/92">{selected.fullName ?? selected.email}</div>
                    <div className="truncate text-xs text-white/48">{selected.email}</div>
                  </div>
                </>
              ) : (
                <p className="py-8 text-center text-sm text-white/45">Select a user from the directory</p>
              )}
            </CardContent>
          </Card>

          <Card className={cn(glassCard, 'lg:col-span-4')}>
            <CardHeader className="border-b border-white/[0.06] pb-4">
              <CardTitle className="text-base font-semibold text-white/88">Directory</CardTitle>
              <CardDescription className="text-white/45">Click a row to inspect</CardDescription>
            </CardHeader>
            <CardContent className="p-0 pt-2">
              <div className="max-h-[min(520px,55vh)] overflow-auto rounded-xl border border-white/[0.06] bg-black/20">
                <Table>
                  <TableHeader>
                    <TableRow className="border-white/[0.06] hover:bg-transparent">
                      <TableHead className="sticky top-0 z-[1] bg-[rgba(8,12,22,0.97)] py-3 text-[11px] font-semibold tracking-wide text-white/45 uppercase backdrop-blur-sm">
                        User
                      </TableHead>
                      <TableHead className="sticky top-0 z-[1] bg-[rgba(8,12,22,0.97)] py-3 text-right text-[11px] font-semibold tracking-wide text-white/45 uppercase backdrop-blur-sm">
                        Progress
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.users.map((u) => {
                      const active = selectedUserId === u.userId;
                      return (
                        <TableRow
                          key={u.userId}
                          onClick={() => setSelectedUserId(u.userId)}
                          className={cn(
                            'group cursor-pointer border-white/[0.04] transition-colors duration-200',
                            active
                              ? 'bg-[rgba(36,144,237,0.12)] ring-1 ring-[rgba(36,144,237,0.35)] ring-inset'
                              : 'hover:bg-white/[0.04]'
                          )}
                        >
                          <TableCell className="py-3">
                            <div className="flex items-center gap-3">
                              <AvatarIcon user={u} />
                              <div className="min-w-0">
                                <div className="truncate text-sm font-medium text-white/90">{u.fullName ?? u.email}</div>
                                <div className="truncate text-xs text-white/42">{u.email}</div>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell
                            className="py-3 text-right text-sm font-bold tabular-nums"
                            style={{ color: completionColor(u.overallCompletionPct) }}
                          >
                            {u.overallCompletionPct}%
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>

          <Card className={cn(glassCard, 'lg:col-span-5')}>
            <CardHeader className="border-b border-white/[0.06] space-y-4 pb-4">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[rgba(36,144,237,0.25)] bg-[rgba(36,144,237,0.1)]">
                  <BookOpen className="h-5 w-5 text-[#7ec5ff]" strokeWidth={1.75} />
                </div>
                <div className="min-w-0 flex-1 space-y-1">
                  <CardTitle className="text-base font-semibold text-white/88">Workbook access</CardTitle>
                  <CardDescription className="text-white/45">Grant seed-catalog courses for the selected learner</CardDescription>
                </div>
              </div>
              {selected ? (
                <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
                  <div className="min-w-0 flex-1 space-y-1.5">
                    <div className="text-[10px] font-semibold tracking-[0.16em] text-white/38 uppercase">Add course</div>
                    <Select
                      value={courseSlugToAdd}
                      onValueChange={setCourseSlugToAdd}
                      disabled={grantableCourses.length === 0 || !selected}
                    >
                      <SelectTrigger className="h-11 rounded-xl border-white/[0.1] bg-white/[0.04] transition-colors hover:bg-white/[0.06]">
                        <SelectValue
                          placeholder={grantableCourses.length ? 'Choose a course…' : 'All catalog courses assigned'}
                        />
                      </SelectTrigger>
                      <SelectContent>
                        {grantableCourses.map((c) => (
                          <SelectItem key={c.slug} value={c.slug}>
                            {c.title} ({c.moduleCount} modules)
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <Button
                    type="button"
                    className="h-11 shrink-0 rounded-xl px-6 font-semibold shadow-[0_0_20px_-4px_rgba(36,144,237,0.55)] transition-[transform,box-shadow] duration-200 hover:shadow-[0_0_28px_-4px_rgba(36,144,237,0.65)] active:scale-[0.98]"
                    disabled={!courseSlugToAdd || pendingGrant || !selected}
                    onClick={() => void grantCourse()}
                  >
                    {pendingGrant ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Add access'}
                  </Button>
                </div>
              ) : null}
            </CardHeader>
            <CardContent className="max-h-[min(520px,55vh)] space-y-4 overflow-y-auto pr-1 pt-5">
              {selected ? (
                selected.enrollments.length > 0 ? (
                  selected.enrollments.map((e) => (
                    <div
                      key={e.enrollmentId}
                      className={cn(
                        'rounded-xl border border-white/[0.08] bg-white/[0.02] p-4 sm:p-5',
                        'shadow-[0_1px_0_rgba(255,255,255,0.03)_inset]',
                        'transition-[border-color,background-color,box-shadow] duration-300',
                        'hover:border-white/[0.12] hover:bg-white/[0.035] hover:shadow-[0_12px_40px_-28px_rgba(0,0,0,0.75)]'
                      )}
                    >
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <div className="truncate text-base font-semibold text-white/92">{e.courseTitle}</div>
                          <div className="mt-1.5 text-xs leading-relaxed text-white/48">
                            {e.completedLessons}/{e.totalLessons} lessons · {e.completedModules} modules complete
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <div
                            className="text-sm font-bold tabular-nums"
                            style={{ color: completionColor(e.completionPct) }}
                          >
                            {e.completionPct}%
                          </div>
                          <Button
                            type="button"
                            size="icon"
                            variant="destructive"
                            className="h-9 w-9 shrink-0 rounded-lg opacity-90 transition-opacity hover:opacity-100"
                            disabled={pendingRevokeId === e.enrollmentId}
                            onClick={() => void revokeEnrollment(e.enrollmentId)}
                            title="Remove access"
                          >
                            {pendingRevokeId === e.enrollmentId ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Trash2 className="h-4 w-4" />
                            )}
                          </Button>
                        </div>
                      </div>
                      <div className="mt-4">
                        <ProgressBar percentage={e.completionPct} label="Completion" />
                      </div>
                      <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                        {e.modules.map((m) => (
                          <div
                            key={m.moduleNo}
                            className={cn(
                              'rounded-lg border px-3 py-2.5 text-xs transition-colors duration-200',
                              m.completed
                                ? 'border-emerald-400/22 bg-emerald-400/[0.07] text-white/88'
                                : 'border-white/[0.08] bg-white/[0.02] text-white/80'
                            )}
                          >
                            <div className="font-medium">{m.title}</div>
                            <div className="mt-0.5 text-white/42">Module {m.moduleNo}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-white/[0.12] bg-white/[0.02] py-14 text-center">
                    <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-white/[0.08] bg-white/[0.04]">
                      <UserRound className="h-7 w-7 text-white/35" strokeWidth={1.5} />
                    </div>
                    <div className="space-y-1 px-4">
                      <p className="text-sm font-medium text-white/70">No enrollments yet</p>
                      <p className="text-xs leading-relaxed text-white/45">
                        Add a workbook from the catalog to start tracking this learner&apos;s progress.
                      </p>
                    </div>
                  </div>
                )
              ) : (
                <div className="flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-white/[0.1] py-14 text-center text-sm text-white/45">
                  <Sparkles className="h-8 w-8 text-white/25" strokeWidth={1.25} />
                  Select a learner from the directory to manage courses.
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </section>
    </div>
  );
}
