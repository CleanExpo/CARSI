import Link from 'next/link';
import {
  ArrowRight,
  BookOpen,
  Building2,
  GraduationCap,
  PlayCircle,
  Sparkles,
  Trophy,
} from 'lucide-react';

import type { SessionClaims } from '@/lib/auth/session-jwt';
import { OnboardingSpotlight } from '@/components/onboarding/OnboardingSpotlight';
import { EnrolledCourseList } from '@/components/lms/EnrolledCourseList';
import type { OnboardingProgramRow } from '@/lib/server/onboarding-programs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { dash } from '@/lib/dashboard-light-ui';
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
    <div className={dash.statCard}>
      <div className="flex items-start justify-between gap-3">
        <p className={dash.statLabel}>{label}</p>
        <Icon className="h-4 w-4 shrink-0 text-[#2490ed]" aria-hidden />
      </div>
      <p className={`mt-3 ${dash.statValue}`}>{value}</p>
      {hint ? <p className={`mt-2 ${dash.statHint}`}>{hint}</p> : null}
    </div>
  );
}

export function DashboardLearningSection({
  claims,
  summary,
  onboardingPrograms = [],
  dbConfigured,
  enrolmentQueryFailed,
}: {
  claims: SessionClaims | null;
  summary: LearnerDashboardSummary | null;
  onboardingPrograms?: OnboardingProgramRow[];
  dbConfigured: boolean;
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
    <div className="w-full max-w-none space-y-10">
      <header className={`border-b ${dash.divider} pb-8`}>
        <p className={dash.eyebrow}>Overview</p>
        <h1 className={`mt-3 ${dash.h1}`}>Welcome back, {name}</h1>
        <p className={`mt-3 max-w-2xl ${dash.lead}`}>
          Continue your training where you left off. Progress syncs as you complete lessons and
          assessments.
        </p>
      </header>

      {!dbConfigured ? (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          Set <code className="rounded-md bg-amber-100 px-1.5 py-0.5 font-mono text-xs">DATABASE_URL</code>{' '}
          and run migrations to load enrolments. The catalogue still works without it.
        </div>
      ) : null}

      {enrolmentQueryFailed ? (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          Could not load enrolments. Check the database connection and Prisma migrations.
        </div>
      ) : null}

      <section aria-labelledby="stats-heading">
        <h2 id="stats-heading" className="sr-only">
          Learning statistics
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard label="Enrolled" value={total} hint="Active seats in your account" icon={BookOpen} />
          <StatCard label="In progress" value={active} hint="Started but not finished" icon={PlayCircle} />
          <StatCard label="Completed" value={completed} hint="Finished programs" icon={Trophy} />
          <StatCard
            label="CEC hours"
            value={cec > 0 ? cec.toFixed(1) : '—'}
            hint={
              catalogHours > 0
                ? `~${catalogHours.toFixed(0)}h catalog time across enrolments`
                : 'From completed courses'
            }
            icon={GraduationCap}
          />
        </div>
      </section>

      {onboardingPrograms.length > 0 ? (
        <OnboardingSpotlight programs={onboardingPrograms} variant="featured" />
      ) : null}

      <section
        className={`flex flex-col gap-4 rounded-xl border ${dash.divider} bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between sm:p-5`}
      >
        <p className={`text-sm ${dash.muted}`}>Jump to your tools</p>
        <div className="flex flex-wrap gap-2">
          <Link href="/dashboard/student" className={dash.btnPrimary}>
            <Sparkles className="h-4 w-4" aria-hidden />
            My learning
            <ArrowRight className="h-3.5 w-3.5 opacity-80" aria-hidden />
          </Link>
          <Link href="/dashboard/courses" className={dash.btnSecondary}>
            Browse courses
          </Link>
          <Link href="/dashboard/pathways" className={dash.btnSecondary}>
            Pathways
          </Link>
          <Link
            href="/dashboard/onboarding"
            className={`${dash.btnSecondary} gap-2 border-[#2490ed]/25 bg-[#eef7ff]/50 text-[#146fc2] hover:bg-[#eef7ff]`}
          >
            <Building2 className="h-4 w-4" aria-hidden />
            Onboarding
          </Link>
        </div>
      </section>

      <Card className={`overflow-hidden ${dash.card}`}>
        <CardHeader className={`border-b ${dash.divider} pb-4`}>
          <CardTitle className="text-lg text-slate-900">Continue learning</CardTitle>
          <CardDescription className="text-slate-600">
            {enrollments.length === 0
              ? 'No enrolments yet — browse the catalogue and enrol to see courses here.'
              : 'Resume lessons and track completion from your last session.'}
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-6">
          <EnrolledCourseList enrollments={enrollments} />
        </CardContent>
      </Card>
    </div>
  );
}
