'use client';

import { useEffect, useMemo, useState } from 'react';
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
import {
  Award,
  BarChart3,
  BookOpen,
  GraduationCap,
  Layers,
  TrendingUp,
  Users,
} from 'lucide-react';

import { adminGlassCard } from '@/components/admin/admin-learner-ui';
import { cn } from '@/lib/utils';

interface CohortSummary {
  total_enrollments: number;
  active_learners_30d: number;
  completions_30d: number;
  courses: Array<{
    course_id: string;
    course_title: string;
    course_slug: string;
    discipline: string | null;
    enrollments_total: number;
    enrollments_completed: number;
    completion_rate_percent: number;
    enrollments_last_30_days: number;
  }>;
  by_discipline: Array<{
    discipline: string;
    enrollments: number;
    completed: number;
  }>;
}

const CHART_COLS = ['#2490ed', '#22d3ee', '#34d399', '#fb923c', '#a78bfa', '#f472b6', '#fbbf24'];

const chartTooltipProps = {
  contentStyle: {
    backgroundColor: 'rgba(10, 14, 26, 0.97)',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    borderRadius: 14,
    boxShadow: '0 20px 50px rgba(0, 0, 0, 0.55)',
    padding: '12px 16px',
  },
  labelStyle: { color: 'rgba(255, 255, 255, 0.5)', fontSize: 11, marginBottom: 6 },
  itemStyle: { color: 'rgba(255, 255, 255, 0.95)', fontSize: 13, fontWeight: 600 },
  cursor: { fill: 'rgba(36, 144, 237, 0.08)' },
} as const;

function truncateTick(label: unknown, max = 14) {
  const s = typeof label === 'string' ? label : String(label);
  return s.length > max ? `${s.slice(0, max - 1)}…` : s;
}

function StatCard({
  label,
  value,
  sub,
  icon: Icon,
  accent,
  delay,
}: {
  label: string;
  value: string | number;
  sub?: string;
  icon: typeof Users;
  accent: string;
  delay?: string;
}) {
  return (
    <div
      className={cn(
        adminGlassCard,
        'group relative overflow-hidden p-5 motion-reduce:animate-none animate-slide-up [animation-fill-mode:both]',
        delay,
      )}
    >
      <div
        className="pointer-events-none absolute -right-8 -top-8 h-32 w-32 rounded-full opacity-30 blur-2xl transition-opacity group-hover:opacity-50"
        style={{ background: `radial-gradient(circle, ${accent}55 0%, transparent 70%)` }}
      />
      <div className="relative flex items-start justify-between gap-3">
        <div>
          <p className="text-[10px] font-semibold tracking-[0.16em] text-white/40 uppercase">{label}</p>
          <p className="mt-2 text-3xl font-black tabular-nums text-white">{value}</p>
          {sub ? <p className="mt-1 text-xs text-white/45">{sub}</p> : null}
        </div>
        <div
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-white/10"
          style={{ background: `${accent}18`, color: accent }}
        >
          <Icon className="h-5 w-5" strokeWidth={1.65} />
        </div>
      </div>
    </div>
  );
}

function ChartPanel({
  title,
  subtitle,
  icon: Icon,
  accent = '#2490ed',
  children,
  className,
}: {
  title: string;
  subtitle: string;
  icon: typeof BarChart3;
  accent?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        adminGlassCard,
        'group relative flex min-h-0 flex-col overflow-hidden',
        className,
      )}
    >
      <div
        className="pointer-events-none absolute -right-20 -top-20 h-48 w-48 rounded-full opacity-25 blur-3xl"
        style={{ background: `radial-gradient(circle, ${accent}40 0%, transparent 68%)` }}
      />
      <div className="relative border-b border-white/[0.06] px-5 py-4 sm:px-6">
        <div className="flex items-center gap-3">
          <div
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/10"
            style={{ background: `${accent}14`, color: accent }}
          >
            <Icon className="h-5 w-5" strokeWidth={1.65} />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-white/90">{title}</h3>
            <p className="text-xs text-white/42">{subtitle}</p>
          </div>
        </div>
      </div>
      <div className="relative flex-1 p-4 sm:p-5">{children}</div>
    </div>
  );
}

export function AdminCohortAnalytics() {
  const [data, setData] = useState<CohortSummary | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/admin/analytics/cohorts', { credentials: 'include' })
      .then((r) => {
        if (!r.ok) throw new Error('Failed to load');
        return r.json() as Promise<CohortSummary>;
      })
      .then(setData)
      .catch(() => setError('Could not load cohort analytics'))
      .finally(() => setLoading(false));
  }, []);

  const topCourses = useMemo(
    () =>
      [...(data?.courses ?? [])]
        .sort((a, b) => b.enrollments_total - a.enrollments_total)
        .slice(0, 8)
        .map((c) => ({
          name: truncateTick(c.course_title, 18),
          enrolled: c.enrollments_total,
          completed: c.enrollments_completed,
          rate: c.completion_rate_percent,
          new30d: c.enrollments_last_30_days,
        })),
    [data?.courses],
  );

  const disciplinePie = useMemo(
    () =>
      (data?.by_discipline ?? []).map((d, i) => ({
        name: d.discipline,
        value: d.enrollments,
        completed: d.completed,
        fill: CHART_COLS[i % CHART_COLS.length],
      })),
    [data?.by_discipline],
  );

  const completionTrend = useMemo(() => {
    if (!data) return [];
    const top = [...data.courses]
      .sort((a, b) => b.completion_rate_percent - a.completion_rate_percent)
      .slice(0, 6);
    return top.map((c) => ({
      name: truncateTick(c.course_title, 12),
      rate: c.completion_rate_percent,
    }));
  }, [data]);

  const activitySpark = useMemo(() => {
    if (!data) return [];
    return [
      { label: 'Total', enrollments: data.total_enrollments, completions: data.completions_30d },
      { label: '30d active', enrollments: data.active_learners_30d, completions: data.completions_30d },
    ];
  }, [data]);

  if (loading) {
    return (
      <div className="grid gap-4 sm:grid-cols-3">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className={cn(adminGlassCard, 'h-28 animate-pulse bg-white/[0.04]')}
          />
        ))}
      </div>
    );
  }

  if (error || !data) {
    return <p className="text-sm text-red-300">{error ?? 'No data'}</p>;
  }

  const completionRate =
    data.total_enrollments > 0
      ? Math.round(
          (data.courses.reduce((a, c) => a + c.enrollments_completed, 0) / data.total_enrollments) *
            100,
        )
      : 0;

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Total enrollments"
          value={data.total_enrollments}
          sub="Across all catalog courses"
          icon={Users}
          accent="#2490ed"
          delay="[animation-delay:0ms]"
        />
        <StatCard
          label="Active learners"
          value={data.active_learners_30d}
          sub="Last 30 days"
          icon={TrendingUp}
          accent="#34d399"
          delay="[animation-delay:60ms]"
        />
        <StatCard
          label="Completions"
          value={data.completions_30d}
          sub="Last 30 days"
          icon={Award}
          accent="#fb923c"
          delay="[animation-delay:120ms]"
        />
        <StatCard
          label="Avg completion"
          value={`${completionRate}%`}
          sub="Weighted across cohorts"
          icon={GraduationCap}
          accent="#a78bfa"
          delay="[animation-delay:180ms]"
        />
      </div>

      <div className="grid gap-6 xl:grid-cols-12">
        <ChartPanel
          title="Top courses by enrollment"
          subtitle="Enrolled vs completed learners"
          icon={BarChart3}
          accent="#2490ed"
          className="xl:col-span-7"
        >
          <div className="h-[280px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={topCourses} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" vertical={false} />
                <XAxis
                  dataKey="name"
                  tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 10 }}
                  axisLine={false}
                  tickLine={false}
                  interval={0}
                  angle={-28}
                  textAnchor="end"
                  height={56}
                />
                <YAxis
                  tick={{ fill: 'rgba(255,255,255,0.35)', fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip {...chartTooltipProps} />
                <Bar dataKey="enrolled" name="Enrolled" fill="#2490ed" radius={[6, 6, 0, 0]} maxBarSize={28} />
                <Bar dataKey="completed" name="Completed" fill="#34d399" radius={[6, 6, 0, 0]} maxBarSize={28} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </ChartPanel>

        <ChartPanel
          title="By IICRC discipline"
          subtitle="Enrollment distribution"
          icon={Layers}
          accent="#22d3ee"
          className="xl:col-span-5"
        >
          {disciplinePie.length > 0 ? (
            <div className="flex h-[280px] flex-col items-center justify-center gap-4 sm:flex-row">
              <div className="h-[200px] w-[200px] shrink-0">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={disciplinePie}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      innerRadius={52}
                      outerRadius={78}
                      paddingAngle={3}
                      stroke="none"
                    >
                      {disciplinePie.map((entry) => (
                        <Cell key={entry.name} fill={entry.fill} />
                      ))}
                    </Pie>
                    <Tooltip {...chartTooltipProps} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <ul className="grid flex-1 gap-2 text-xs">
                {disciplinePie.map((d) => (
                  <li key={d.name} className="flex items-center justify-between gap-3 rounded-lg bg-white/[0.04] px-3 py-2">
                    <span className="flex items-center gap-2 text-white/70">
                      <span className="h-2 w-2 rounded-full" style={{ background: d.fill }} />
                      {d.name}
                    </span>
                    <span className="tabular-nums text-white/45">
                      {d.value} · {d.completed} done
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <p className="py-12 text-center text-sm text-white/45">No discipline data yet</p>
          )}
        </ChartPanel>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <ChartPanel
          title="Completion rate leaders"
          subtitle="Top performing courses by %"
          icon={TrendingUp}
          accent="#34d399"
        >
          <div className="h-[220px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={completionTrend} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
                <defs>
                  <linearGradient id="rateGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#34d399" stopOpacity={0.35} />
                    <stop offset="100%" stopColor="#34d399" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" vertical={false} />
                <XAxis
                  dataKey="name"
                  tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 10 }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  domain={[0, 100]}
                  tick={{ fill: 'rgba(255,255,255,0.35)', fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(v) => `${v}%`}
                />
                <Tooltip {...chartTooltipProps} formatter={(v) => [`${v}%`, 'Completion']} />
                <Area
                  type="monotone"
                  dataKey="rate"
                  stroke="#34d399"
                  strokeWidth={2}
                  fill="url(#rateGrad)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </ChartPanel>

        <ChartPanel
          title="30-day activity snapshot"
          subtitle="New enrollments vs completions"
          icon={BarChart3}
          accent="#fb923c"
        >
          <div className="h-[220px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={activitySpark} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
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
                />
                <Tooltip {...chartTooltipProps} />
                <Bar dataKey="enrollments" name="Learners" fill="#2490ed" radius={[6, 6, 0, 0]} maxBarSize={48} />
                <Bar dataKey="completions" name="Completions" fill="#fb923c" radius={[6, 6, 0, 0]} maxBarSize={48} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </ChartPanel>
      </div>

      <ChartPanel
        title="Course cohort table"
        subtitle="Full breakdown — top 40 courses"
        icon={BookOpen}
        accent="#2490ed"
      >
        <div className="overflow-x-auto rounded-xl border border-white/[0.06]">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-white/10 bg-white/[0.03] text-xs text-white/45 uppercase">
              <tr>
                <th className="px-4 py-3">Course</th>
                <th className="px-4 py-3">Discipline</th>
                <th className="px-4 py-3">Enrolled</th>
                <th className="px-4 py-3">30d new</th>
                <th className="px-4 py-3">Completion</th>
              </tr>
            </thead>
            <tbody>
              {data.courses.slice(0, 40).map((c) => (
                <tr key={c.course_id} className="border-b border-white/[0.04] text-white/75 transition-colors hover:bg-white/[0.03]">
                  <td className="max-w-[260px] truncate px-4 py-2.5 font-medium">{c.course_title}</td>
                  <td className="px-4 py-2.5">
                    {c.discipline ? (
                      <span className="rounded-full border border-[#2490ed]/25 bg-[#2490ed]/10 px-2 py-0.5 text-xs text-[#7ec5ff]">
                        {c.discipline}
                      </span>
                    ) : (
                      '—'
                    )}
                  </td>
                  <td className="px-4 py-2.5 tabular-nums">{c.enrollments_total}</td>
                  <td className="px-4 py-2.5 tabular-nums">
                    {c.enrollments_last_30_days > 0 ? (
                      <span className="text-emerald-300">+{c.enrollments_last_30_days}</span>
                    ) : (
                      '0'
                    )}
                  </td>
                  <td className="px-4 py-2.5">
                    <div className="flex items-center gap-2">
                      <div className="h-1.5 w-16 overflow-hidden rounded-full bg-white/10">
                        <div
                          className="h-full rounded-full bg-[#2490ed]"
                          style={{ width: `${Math.min(100, c.completion_rate_percent)}%` }}
                        />
                      </div>
                      <span className="tabular-nums text-xs text-white/55">{c.completion_rate_percent}%</span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </ChartPanel>
    </div>
  );
}
