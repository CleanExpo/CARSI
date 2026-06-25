'use client';

import Link from 'next/link';
import { useId, useMemo, useState, type ReactNode } from 'react';
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
  CheckCircle2,
  ChevronRight,
  Hash,
  LayoutDashboard,
  LineChart as LineChartIcon,
  PieChart as PieChartIcon,
  Search,
  TrendingUp,
  Users,
} from 'lucide-react';

import type { AdminDashboardClientData } from '@/lib/admin/admin-dashboard-data';

import {
  adminGlassCard,
  completionColor,
  formatAdminDateTime,
  LearnerAvatar,
  StatusBadge,
} from '@/components/admin/admin-learner-ui';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
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
  const chartUid = useId().replace(/:/g, '');
  const [userQuery, setUserQuery] = useState('');

  const filteredUsers = useMemo(() => {
    const q = userQuery.trim().toLowerCase();
    if (!q) return data.users;
    return data.users.filter((u) => {
      const haystack = [u.fullName, u.email, u.iicrcMemberNumber, u.role]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return haystack.includes(q);
    });
  }, [data.users, userQuery]);

  const learnersWithEnrollments = useMemo(
    () => data.users.filter((u) => u.enrollmentCount > 0).length,
    [data.users],
  );

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
                        formatter={(value) => [`${value ?? 0}%`, 'Complete']}
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
                        formatter={(value, name) => [value ?? 0, String(name ?? '')]}
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
                        formatter={(value) => [value ?? 0, 'Courses']}
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
                        formatter={(value) => [value ?? 0, 'Enrollments']}
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
                      formatter={(value) => [value ?? 0, 'Completions']}
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
          title="Learner directory"
          description="Live data from LMS enrollments and lesson progress. Open a profile for enrollments, IICRC renewal, and course access."
        />
        <Card className={adminGlassCard}>
          <CardHeader className="space-y-4 border-b border-white/[0.06] pb-4">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <CardTitle className="text-base font-semibold text-white/88">All learners</CardTitle>
                <CardDescription className="text-white/45">
                  {filteredUsers.length.toLocaleString()} shown · {learnersWithEnrollments.toLocaleString()} with
                  enrollments · catalog from {data.catalogMeta.catalogSource}
                </CardDescription>
              </div>
              <div className="relative w-full max-w-sm">
                <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-white/35" />
                <input
                  type="search"
                  value={userQuery}
                  onChange={(e) => setUserQuery(e.target.value)}
                  placeholder="Search name, email, IICRC #…"
                  className="h-10 w-full rounded-xl border border-white/10 bg-black/25 pr-3 pl-9 text-sm text-white/85 placeholder:text-white/35 outline-none focus:border-[#2490ed]/40 focus:ring-1 focus:ring-[#2490ed]/30"
                />
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0 pt-2">
            <div className="overflow-auto rounded-xl border border-white/[0.06] bg-black/20">
              <Table>
                <TableHeader>
                  <TableRow className="border-white/[0.06] hover:bg-transparent">
                    <TableHead className="sticky top-0 z-[1] bg-[rgba(8,12,22,0.97)] py-3 text-[11px] font-semibold tracking-wide text-white/45 uppercase backdrop-blur-sm">
                      Learner
                    </TableHead>
                    <TableHead className="sticky top-0 z-[1] hidden bg-[rgba(8,12,22,0.97)] py-3 text-[11px] font-semibold tracking-wide text-white/45 uppercase backdrop-blur-sm md:table-cell">
                      IICRC
                    </TableHead>
                    <TableHead className="sticky top-0 z-[1] hidden bg-[rgba(8,12,22,0.97)] py-3 text-[11px] font-semibold tracking-wide text-white/45 uppercase backdrop-blur-sm lg:table-cell">
                      Courses
                    </TableHead>
                    <TableHead className="sticky top-0 z-[1] hidden bg-[rgba(8,12,22,0.97)] py-3 text-[11px] font-semibold tracking-wide text-white/45 uppercase backdrop-blur-sm sm:table-cell">
                      Last active
                    </TableHead>
                    <TableHead className="sticky top-0 z-[1] bg-[rgba(8,12,22,0.97)] py-3 text-right text-[11px] font-semibold tracking-wide text-white/45 uppercase backdrop-blur-sm">
                      Progress
                    </TableHead>
                    <TableHead className="sticky top-0 z-[1] w-12 bg-[rgba(8,12,22,0.97)] py-3 backdrop-blur-sm" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredUsers.length === 0 ? (
                    <TableRow className="hover:bg-transparent">
                      <TableCell colSpan={6} className="py-12 text-center text-sm text-white/45">
                        No learners match your search.
                      </TableCell>
                    </TableRow>
                  ) : null}
                  {filteredUsers.map((u) => (
                    <TableRow
                      key={u.userId}
                      className="group border-white/[0.04] transition-colors hover:bg-white/[0.04]"
                    >
                      <TableCell className="py-3">
                        <Link
                          href={`/admin/users/${u.userId}`}
                          className="flex items-center gap-3 outline-none focus-visible:ring-2 focus-visible:ring-[#2490ed]/50"
                        >
                          <LearnerAvatar user={u} />
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-1.5">
                              <span className="truncate text-sm font-medium text-white/90 group-hover:text-white">
                                {u.fullName ?? u.email}
                              </span>
                              {!u.isActive ? <StatusBadge label="Inactive" tone="muted" /> : null}
                              {u.isVerified ? <StatusBadge label="Verified" tone="success" /> : null}
                            </div>
                            <div className="truncate text-xs text-white/42">{u.email}</div>
                          </div>
                        </Link>
                      </TableCell>
                      <TableCell className="hidden py-3 md:table-cell">
                        {u.iicrcMemberNumber ? (
                          <span className="inline-flex items-center gap-1 text-xs text-white/65">
                            <Hash className="h-3 w-3 text-white/35" />
                            {u.iicrcMemberNumber}
                          </span>
                        ) : (
                          <span className="text-xs text-white/30">—</span>
                        )}
                      </TableCell>
                      <TableCell className="hidden py-3 lg:table-cell">
                        <Link href={`/admin/users/${u.userId}`} className="block text-sm text-white/65">
                          {u.enrollmentCount === 0 ? (
                            <span className="text-white/35">No enrollments</span>
                          ) : (
                            <span className="tabular-nums">
                              <span className="font-medium text-white/85">{u.completedCourseCount}</span>
                              <span className="text-white/35"> / {u.enrollmentCount} complete</span>
                              {u.activeCourseCount > 0 ? (
                                <span className="ml-1 text-[#7ec5ff]">· {u.activeCourseCount} in progress</span>
                              ) : null}
                            </span>
                          )}
                        </Link>
                      </TableCell>
                      <TableCell className="hidden py-3 text-xs text-white/45 sm:table-cell">
                        {formatAdminDateTime(u.lastActiveAt)}
                      </TableCell>
                      <TableCell className="py-3 text-right">
                        <Link
                          href={`/admin/users/${u.userId}`}
                          className="inline-flex flex-col items-end gap-0.5"
                        >
                          <span
                            className="text-sm font-bold tabular-nums"
                            style={{ color: completionColor(u.overallCompletionPct) }}
                          >
                            {u.enrollmentCount === 0 ? '—' : `${u.overallCompletionPct}%`}
                          </span>
                          {u.enrollmentCount > 0 ? (
                            <span className="h-1 w-14 overflow-hidden rounded-full bg-white/10">
                              <span
                                className="block h-full rounded-full bg-[#2490ed]"
                                style={{ width: `${u.overallCompletionPct}%` }}
                              />
                            </span>
                          ) : null}
                        </Link>
                      </TableCell>
                      <TableCell className="py-3 text-right">
                        <Link
                          href={`/admin/users/${u.userId}`}
                          className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-transparent text-white/35 transition-colors group-hover:border-white/10 group-hover:bg-white/[0.06] group-hover:text-[#7ec5ff]"
                          aria-label={`View ${u.fullName ?? u.email}`}
                        >
                          <ChevronRight className="h-4 w-4" />
                        </Link>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
