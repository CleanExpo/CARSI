'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Award,
  BookOpen,
  Calendar,
  CheckCircle2,
  Clock,
  Hash,
  Loader2,
  Mail,
  Shield,
  Trash2,
  UserRound,
} from 'lucide-react';
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts';

import type { AdminCatalogCourseOption, AdminUserProgress } from '@/lib/admin/admin-user-progress';
import type { AdminCourseProgressForUser } from '@/lib/admin/admin-user-progress';

import {
  adminGlassCard,
  completionColor,
  enrollmentStatusTone,
  formatAdminDate,
  formatAdminDateTime,
  LearnerAvatar,
  StatusBadge,
} from '@/components/admin/admin-learner-ui';
import { ProgressBar } from '@/components/lms/ProgressBar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';

const chartTooltipProps = {
  contentStyle: {
    backgroundColor: 'rgba(10, 14, 26, 0.97)',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    borderRadius: 14,
    padding: '10px 14px',
  },
  itemStyle: { color: 'rgba(255, 255, 255, 0.95)', fontSize: 13 },
} as const;

function CourseEnrollmentCard({
  enrollment,
  pendingRevoke,
  onRevoke,
}: {
  enrollment: AdminCourseProgressForUser;
  pendingRevoke: boolean;
  onRevoke: (id: string) => void;
}) {
  const statusLabel = enrollment.status.replace(/_/g, ' ');
  return (
    <article
      className={cn(
        adminGlassCard,
        'overflow-hidden p-0',
        enrollment.completionPct >= 100 && 'border-emerald-400/20',
      )}
    >
      <div className="border-b border-white/[0.06] px-5 py-4 sm:px-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0 flex-1 space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <StatusBadge label={statusLabel} tone={enrollmentStatusTone(enrollment.status)} />
              {enrollment.discipline ? (
                <StatusBadge label={enrollment.discipline} tone="info" />
              ) : null}
              {enrollment.cecHours != null && enrollment.cecHours > 0 ? (
                <span className="text-xs text-white/45">{enrollment.cecHours} CEC</span>
              ) : null}
            </div>
            <h3 className="text-lg font-semibold tracking-tight text-white/95">{enrollment.courseTitle}</h3>
            <p className="text-sm text-white/48">
              {enrollment.completedLessons} of {enrollment.totalLessons} lessons ·{' '}
              {enrollment.completedModules} modules complete
              {enrollment.remainingLessons > 0
                ? ` · ${enrollment.remainingLessons} remaining`
                : ''}
            </p>
            <dl className="grid gap-2 text-xs text-white/42 sm:grid-cols-2">
              <div>
                <dt className="font-medium text-white/35">Enrolled</dt>
                <dd className="mt-0.5 text-white/65">{formatAdminDate(enrollment.enrolledAt)}</dd>
              </div>
              <div>
                <dt className="font-medium text-white/35">Completed</dt>
                <dd className="mt-0.5 text-white/65">
                  {enrollment.completedAt ? formatAdminDate(enrollment.completedAt) : 'In progress'}
                </dd>
              </div>
            </dl>
          </div>
          <div className="flex items-center gap-3">
            <div
              className="text-2xl font-black tabular-nums"
              style={{ color: completionColor(enrollment.completionPct) }}
            >
              {enrollment.completionPct}%
            </div>
            <Button
              type="button"
              size="icon"
              variant="destructive"
              className="h-10 w-10 shrink-0 rounded-xl"
              disabled={pendingRevoke}
              onClick={() => onRevoke(enrollment.enrollmentId)}
              title="Remove enrollment"
            >
              {pendingRevoke ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
            </Button>
          </div>
        </div>
        <div className="mt-4">
          <ProgressBar percentage={enrollment.completionPct} label="Course completion" />
        </div>
      </div>
      <div className="bg-black/15 px-5 py-4 sm:px-6">
        <p className="mb-3 text-[10px] font-semibold tracking-[0.18em] text-white/38 uppercase">Modules</p>
        <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
          {enrollment.modules.map((m) => (
            <div
              key={m.moduleNo}
              className={cn(
                'flex gap-3 rounded-xl border px-3 py-3 text-sm transition-colors',
                m.completed
                  ? 'border-emerald-400/25 bg-emerald-400/[0.08]'
                  : 'border-white/[0.08] bg-white/[0.02]',
              )}
            >
              <div
                className={cn(
                  'mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[10px] font-bold',
                  m.completed
                    ? 'bg-emerald-400/20 text-emerald-200'
                    : 'bg-white/8 text-white/45',
                )}
              >
                {m.completed ? <CheckCircle2 className="h-3.5 w-3.5" /> : m.moduleNo}
              </div>
              <div className="min-w-0">
                <div className="font-medium text-white/88">{m.title}</div>
                <div className="mt-0.5 truncate text-xs text-white/42">{m.lessonTitle}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </article>
  );
}

export function AdminUserDetailClient({
  user,
  roleNames,
  catalogCourses,
}: {
  user: AdminUserProgress;
  roleNames: string[];
  catalogCourses: AdminCatalogCourseOption[];
}) {
  const router = useRouter();
  const [courseSlugToAdd, setCourseSlugToAdd] = useState('');
  const [pendingGrant, setPendingGrant] = useState(false);
  const [pendingRevokeId, setPendingRevokeId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const enrolledSlugs = useMemo(() => new Set(user.enrollments.map((e) => e.courseSlug)), [user.enrollments]);
  const grantableCourses = useMemo(
    () => catalogCourses.filter((c) => !enrolledSlugs.has(c.slug)),
    [catalogCourses, enrolledSlugs],
  );

  const completedCourses = user.enrollments.filter((e) => e.completionPct >= 100).length;
  const totalLessonsDone = user.enrollments.reduce((a, e) => a + e.completedLessons, 0);
  const totalLessons = user.enrollments.reduce((a, e) => a + e.totalLessons, 0);

  const gaugeData = useMemo(
    () => [
      { name: 'done', value: user.overallCompletionPct },
      { name: 'rest', value: Math.max(0, 100 - user.overallCompletionPct) },
    ],
    [user.overallCompletionPct],
  );

  const displayName = user.fullName?.trim() || user.email.split('@')[0] || 'Learner';

  async function grantCourse() {
    setActionError(null);
    if (!courseSlugToAdd) return;
    setPendingGrant(true);
    try {
      const res = await fetch('/api/admin/enrollments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ studentId: user.userId, courseSlug: courseSlugToAdd }),
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

  return (
    <div className="relative px-5 py-8 pb-24 sm:px-8 sm:py-10">
      <div
        className="pointer-events-none absolute inset-0 -z-10 opacity-[0.55]"
        aria-hidden
        style={{
          background:
            'radial-gradient(900px 420px at 8% -5%, rgba(36, 144, 237, 0.16), transparent 55%), radial-gradient(600px 360px at 92% 5%, rgba(34, 211, 238, 0.07), transparent 50%)',
        }}
      />

      <Link
        href="/admin"
        className="mb-8 inline-flex items-center gap-2 text-sm font-medium text-white/55 transition-colors hover:text-white/90"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to learner directory
      </Link>

      {actionError ? (
        <div
          className="mb-6 rounded-xl border border-red-400/25 bg-red-500/10 px-4 py-3 text-sm text-red-100"
          role="status"
        >
          {actionError}
        </div>
      ) : null}

      <header className={cn(adminGlassCard, 'mb-6 overflow-hidden p-0')}>
        <div className="border-b border-white/[0.06] bg-gradient-to-br from-[#2490ed]/10 via-transparent to-transparent px-6 py-8 sm:px-8">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
            <div className="flex min-w-0 gap-5">
              <LearnerAvatar user={user} size="lg" />
              <div className="min-w-0 space-y-3">
                <div className="flex flex-wrap items-center gap-2">
                  <StatusBadge
                    label={user.isActive ? 'Active account' : 'Inactive'}
                    tone={user.isActive ? 'success' : 'muted'}
                  />
                  <StatusBadge
                    label={user.isVerified ? 'Verified' : 'Unverified'}
                    tone={user.isVerified ? 'info' : 'warning'}
                  />
                  {roleNames.map((r) => (
                    <StatusBadge key={r} label={r} tone="info" />
                  ))}
                </div>
                <h1 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">{displayName}</h1>
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-white/55">
                  <span className="inline-flex items-center gap-1.5">
                    <Mail className="h-3.5 w-3.5 shrink-0" />
                    {user.email}
                  </span>
                  {user.iicrcMemberNumber ? (
                    <span className="inline-flex items-center gap-1.5">
                      <Hash className="h-3.5 w-3.5 shrink-0" />
                      IICRC {user.iicrcMemberNumber}
                    </span>
                  ) : null}
                </div>
              </div>
            </div>
            <div className="relative mx-auto h-[140px] w-[140px] shrink-0 lg:mx-0">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={gaugeData}
                    dataKey="value"
                    cx="50%"
                    cy="50%"
                    innerRadius="58%"
                    outerRadius="82%"
                    startAngle={90}
                    endAngle={-270}
                    stroke="none"
                  >
                    <Cell fill="#2490ed" />
                    <Cell fill="rgba(255,255,255,0.07)" />
                  </Pie>
                  <Tooltip {...chartTooltipProps} />
                </PieChart>
              </ResponsiveContainer>
              <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                <span
                  className="text-3xl font-black tabular-nums"
                  style={{ color: completionColor(user.overallCompletionPct) }}
                >
                  {user.overallCompletionPct}%
                </span>
                <span className="text-[10px] font-semibold tracking-[0.2em] text-white/38 uppercase">overall</span>
              </div>
            </div>
          </div>
        </div>
        <div className="grid gap-px bg-white/[0.06] sm:grid-cols-2 lg:grid-cols-4">
          {[
            { label: 'Enrollments', value: user.enrollments.length, icon: BookOpen },
            { label: 'Courses complete', value: completedCourses, icon: Award },
            { label: 'Lessons done', value: `${totalLessonsDone}/${totalLessons}`, icon: CheckCircle2 },
            { label: 'Last active', value: formatAdminDateTime(user.lastActiveAt), icon: Clock, small: true },
          ].map((stat) => (
            <div key={stat.label} className="flex items-center gap-3 bg-black/20 px-5 py-4">
              <stat.icon className="h-4 w-4 shrink-0 text-[#7ec5ff]" strokeWidth={1.75} />
              <div className="min-w-0">
                <p className="text-[10px] font-semibold tracking-[0.14em] text-white/38 uppercase">{stat.label}</p>
                <p
                  className={cn(
                    'mt-0.5 font-bold text-white/90 tabular-nums',
                    stat.small ? 'text-sm' : 'text-xl',
                  )}
                >
                  {stat.value}
                </p>
              </div>
            </div>
          ))}
        </div>
      </header>

      <div className="grid gap-6 xl:grid-cols-12">
        <Card className={cn(adminGlassCard, 'xl:col-span-4')}>
          <CardHeader className="border-b border-white/[0.06] pb-4">
            <CardTitle className="flex items-center gap-2 text-base text-white/88">
              <UserRound className="h-4 w-4 text-[#7ec5ff]" />
              Account details
            </CardTitle>
            <CardDescription className="text-white/45">Profile and membership information</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 pt-5 text-sm">
            <dl className="space-y-3">
              <div className="flex justify-between gap-4 border-b border-white/[0.05] pb-3">
                <dt className="text-white/42">Member since</dt>
                <dd className="text-right font-medium text-white/85">{formatAdminDate(user.createdAt)}</dd>
              </div>
              <div className="flex justify-between gap-4 border-b border-white/[0.05] pb-3">
                <dt className="text-white/42">Profile updated</dt>
                <dd className="text-right font-medium text-white/85">{formatAdminDate(user.updatedAt)}</dd>
              </div>
              <div className="flex justify-between gap-4 border-b border-white/[0.05] pb-3">
                <dt className="text-white/42">Platform role</dt>
                <dd className="text-right font-medium text-white/85">{user.role ?? 'student'}</dd>
              </div>
              <div className="flex justify-between gap-4 border-b border-white/[0.05] pb-3">
                <dt className="text-white/42">IICRC expiry</dt>
                <dd className="text-right font-medium text-white/85">
                  {user.iicrcExpiryDate ? formatAdminDate(user.iicrcExpiryDate) : '—'}
                </dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-white/42">LMS roles</dt>
                <dd className="text-right font-medium text-white/85">
                  {roleNames.length > 0 ? roleNames.join(', ') : '—'}
                </dd>
              </div>
            </dl>
            {!user.iicrcMemberNumber ? (
              <p className="rounded-lg border border-amber-400/20 bg-amber-400/5 px-3 py-2 text-xs text-amber-100/80">
                No IICRC member number on file. Add it from the learner profile when they update credentials.
              </p>
            ) : null}
          </CardContent>
        </Card>

        <div className="space-y-6 xl:col-span-8">
          <Card className={cn(adminGlassCard, 'overflow-visible')}>
            <CardHeader className="space-y-4 border-b border-white/[0.06] pb-4">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[#2490ed]/25 bg-[#2490ed]/10">
                  <Shield className="h-5 w-5 text-[#7ec5ff]" strokeWidth={1.75} />
                </div>
                <div>
                  <CardTitle className="text-base text-white/88">Course enrollments</CardTitle>
                  <CardDescription className="text-white/45">
                    Assign catalog courses, review progress, and remove access
                  </CardDescription>
                </div>
              </div>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
                <div className="min-w-0 flex-1 space-y-1.5">
                  <div className="text-[10px] font-semibold tracking-[0.16em] text-white/38 uppercase">
                    Add course
                  </div>
                  <Select
                    value={courseSlugToAdd}
                    onValueChange={setCourseSlugToAdd}
                    disabled={grantableCourses.length === 0}
                  >
                    <SelectTrigger className="h-11 rounded-xl border-white/10 bg-white/[0.04]">
                      <SelectValue
                        placeholder={
                          grantableCourses.length ? 'Choose a course…' : 'All catalog courses assigned'
                        }
                      />
                    </SelectTrigger>
                    <SelectContent
                      className="z-[200] border-white/10 bg-[rgba(10,14,26,0.98)] text-white shadow-xl"
                      position="popper"
                      sideOffset={6}
                    >
                      {grantableCourses.map((c) => (
                        <SelectItem
                          key={c.slug}
                          value={c.slug}
                          className="items-start py-2.5 pr-9 pl-3 whitespace-normal focus:bg-white/10"
                        >
                          <span className="block leading-snug">
                            {c.title}
                            <span className="mt-0.5 block text-xs text-white/50">{c.moduleCount} modules</span>
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Button
                  type="button"
                  className="h-11 shrink-0 rounded-xl px-6 font-semibold"
                  disabled={!courseSlugToAdd || pendingGrant}
                  onClick={() => void grantCourse()}
                >
                  {pendingGrant ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Grant access'}
                </Button>
              </div>
            </CardHeader>
          </Card>

          {user.enrollments.length > 0 ? (
            <div className="space-y-5">
              {user.enrollments.map((e) => (
                <CourseEnrollmentCard
                  key={e.enrollmentId}
                  enrollment={e}
                  pendingRevoke={pendingRevokeId === e.enrollmentId}
                  onRevoke={(id) => void revokeEnrollment(id)}
                />
              ))}
            </div>
          ) : (
            <div
              className={cn(
                adminGlassCard,
                'flex flex-col items-center justify-center gap-3 py-16 text-center',
              )}
            >
              <Calendar className="h-10 w-10 text-white/25" strokeWidth={1.25} />
              <p className="text-sm font-medium text-white/70">No course enrollments yet</p>
              <p className="max-w-sm text-xs text-white/45">
                Grant a course from the catalog above to start tracking this learner&apos;s modules and
                completion.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
