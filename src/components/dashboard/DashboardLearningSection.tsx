import Link from 'next/link';
import { BookOpen, GraduationCap, PlayCircle, Sparkles, Trophy } from 'lucide-react';

import type { SessionClaims } from '@/lib/auth/session-jwt';
import { EnrolledCourseList } from '@/components/lms/EnrolledCourseList';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import type { LearnerDashboardSummary } from '@/lib/server/learner-dashboard-data';

function StatCard({
  label,
  value,
  hint,
  icon: Icon,
}: {
  label: string;
  value: string | number;
  hint?: string;
  icon: typeof BookOpen;
}) {
  return (
    <Card
      className="border-white/[0.08] bg-white/[0.02]"
      style={{ borderColor: 'rgba(255,255,255,0.08)' }}
    >
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-white/70">{label}</CardTitle>
        <Icon className="h-4 w-4 text-[#2490ed]" aria-hidden />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold tracking-tight text-white">{value}</div>
        {hint ? <p className="text-muted-foreground mt-1 text-xs">{hint}</p> : null}
      </CardContent>
    </Card>
  );
}

export function DashboardLearningSection({
  claims,
  summary,
  dbConfigured,
  enrolmentQueryFailed,
}: {
  claims: SessionClaims | null;
  summary: LearnerDashboardSummary | null;
  dbConfigured: boolean;
  /** DB is configured but Prisma query failed (connection, schema drift, etc.). */
  enrolmentQueryFailed: boolean;
}) {
  const name = claims?.full_name?.split(' ')[0] ?? 'Learner';
  const total = summary?.counts.total ?? 0;
  const active = summary?.counts.active ?? 0;
  const completed = summary?.counts.completed ?? 0;
  const cec = summary?.cecHoursFromCompleted ?? 0;
  const catalogHours = summary?.totalCatalogHours ?? 0;
  const enrollments = summary?.enrollments ?? [];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-white">Welcome back, {name}</h1>
        <p className="mt-1 text-sm text-white/50">
          Pick up where you left off — your progress is saved as you complete lessons and quizzes.
        </p>
      </div>

      {!dbConfigured ? (
        <p
          className="rounded-lg border px-4 py-3 text-sm text-amber-200/90"
          style={{
            background: 'rgba(245, 158, 11, 0.08)',
            borderColor: 'rgba(245, 158, 11, 0.25)',
          }}
        >
          Set <code className="rounded bg-black/30 px-1.5 py-0.5 font-mono text-xs">DATABASE_URL</code>{' '}
          and run migrations so enrolments load from Postgres. Until then, the catalogue and checkout
          still work; this overview stays empty.
        </p>
      ) : null}

      {enrolmentQueryFailed ? (
        <p
          className="rounded-lg border px-4 py-3 text-sm text-red-200/90"
          style={{
            background: 'rgba(239, 68, 68, 0.1)',
            borderColor: 'rgba(239, 68, 68, 0.3)',
          }}
        >
          Could not read enrolments from the database. Check the connection, run{' '}
          <code className="rounded bg-black/30 px-1.5 py-0.5 font-mono text-xs">pnpm prisma migrate</code>
          , and confirm <code className="rounded bg-black/30 px-1.5 py-0.5 font-mono text-xs">lms_enrollments</code>{' '}
          exists.
        </p>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Enrolled courses"
          value={total}
          hint="Total seats you hold in the catalogue"
          icon={BookOpen}
        />
        <StatCard
          label="In progress"
          value={active}
          hint="Courses you have started"
          icon={PlayCircle}
        />
        <StatCard
          label="Completed"
          value={completed}
          hint="Finished certificates"
          icon={Trophy}
        />
        <StatCard
          label="CEC hours (completed)"
          value={cec > 0 ? cec.toFixed(1) : '—'}
          hint={
            catalogHours > 0
              ? `~${catalogHours.toFixed(0)}h catalog time across enrolments`
              : 'From course metadata in the database'
          }
          icon={GraduationCap}
        />
      </div>

      <div className="flex flex-wrap gap-3">
        <Link
          href="/dashboard/student"
          className="inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium text-white transition hover:opacity-95"
          style={{ background: '#2490ed' }}
        >
          <Sparkles className="h-4 w-4" aria-hidden />
          Full learning hub
        </Link>
        <Link
          href="/dashboard/courses"
          className="inline-flex items-center gap-2 rounded-lg border border-white/15 bg-white/[0.04] px-4 py-2 text-sm font-medium text-white/85 transition hover:bg-white/[0.07]"
        >
          Browse all courses
        </Link>
        <Link
          href="/dashboard/pathways"
          className="inline-flex items-center gap-2 rounded-lg border border-white/15 bg-white/[0.04] px-4 py-2 text-sm font-medium text-white/85 transition hover:bg-white/[0.07]"
        >
          Learning pathways
        </Link>
      </div>

      <Card
        className="border-white/[0.08] bg-white/[0.02]"
        style={{ borderColor: 'rgba(255,255,255,0.08)' }}
      >
        <CardHeader>
          <CardTitle className="text-white">Continue learning</CardTitle>
          <CardDescription className="text-white/45">
            {enrollments.length === 0
              ? 'No enrolments yet — explore the catalogue and enrol to see courses here.'
              : 'Open a course to resume lessons, videos, and assessments.'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <EnrolledCourseList enrollments={enrollments} />
        </CardContent>
      </Card>
    </div>
  );
}
