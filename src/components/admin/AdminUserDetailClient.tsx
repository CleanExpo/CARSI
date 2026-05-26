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
import { AdminCourseMultiPicker } from '@/components/admin/AdminCourseMultiPicker';
import { ProgressBar } from '@/components/lms/ProgressBar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
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
  pendingComplete,
  selectable,
  selected,
  onToggleSelect,
  onRevoke,
  onMarkComplete,
}: {
  enrollment: AdminCourseProgressForUser;
  pendingRevoke: boolean;
  pendingComplete: boolean;
  selectable: boolean;
  selected: boolean;
  onToggleSelect: () => void;
  onRevoke: (id: string) => void;
  onMarkComplete: (id: string) => void;
}) {
  const statusLabel = enrollment.status.replace(/_/g, ' ');
  const isComplete = enrollment.completionPct >= 100;
  return (
    <article
      className={cn(
        adminGlassCard,
        'overflow-hidden p-0',
        isComplete && 'border-emerald-400/20',
        selected && 'ring-1 ring-[#2490ed]/45',
      )}
    >
      <div className="border-b border-white/[0.06] px-5 py-4 sm:px-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          {selectable ? (
            <label className="flex cursor-pointer items-start gap-3 pt-1">
              <input
                type="checkbox"
                checked={selected}
                disabled={pendingComplete}
                onChange={onToggleSelect}
                className="mt-1 h-4 w-4 shrink-0 rounded border-white/20 bg-white/5 accent-[#2490ed]"
                aria-label={`Select ${enrollment.courseTitle}`}
              />
            </label>
          ) : null}
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
          <div className="flex flex-wrap items-center justify-end gap-2">
            <div
              className="text-2xl font-black tabular-nums"
              style={{ color: completionColor(enrollment.completionPct) }}
            >
              {enrollment.completionPct}%
            </div>
            {!isComplete ? (
              <Button
                type="button"
                variant="secondary"
                size="sm"
                className="h-9 rounded-lg border-white/10 bg-white/[0.06] text-white/85 hover:bg-white/10"
                disabled={pendingComplete || pendingRevoke}
                onClick={() => onMarkComplete(enrollment.enrollmentId)}
              >
                {pendingComplete ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <>
                    <CheckCircle2 className="mr-1.5 h-3.5 w-3.5" />
                    Mark complete
                  </>
                )}
              </Button>
            ) : null}
            <Button
              type="button"
              size="icon"
              variant="destructive"
              className="h-10 w-10 shrink-0 rounded-xl"
              disabled={pendingRevoke || pendingComplete}
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
  const [selectedCourseSlugs, setSelectedCourseSlugs] = useState<Set<string>>(() => new Set());
  const [pendingGrant, setPendingGrant] = useState(false);
  const [pendingRevokeId, setPendingRevokeId] = useState<string | null>(null);
  const [pendingCompleteIds, setPendingCompleteIds] = useState<Set<string>>(() => new Set());
  const [selectedEnrollmentIds, setSelectedEnrollmentIds] = useState<Set<string>>(() => new Set());
  const [actionError, setActionError] = useState<string | null>(null);

  const incompleteEnrollments = useMemo(
    () => user.enrollments.filter((e) => e.completionPct < 100),
    [user.enrollments],
  );

  const enrolledSlugs = useMemo(() => new Set(user.enrollments.map((e) => e.courseSlug)), [user.enrollments]);
  const grantableCount = useMemo(
    () => catalogCourses.filter((c) => !enrolledSlugs.has(c.slug)).length,
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

  async function grantSelectedCourses() {
    setActionError(null);
    const slugs = [...selectedCourseSlugs].filter((s) => !enrolledSlugs.has(s));
    if (slugs.length === 0) return;
    setPendingGrant(true);
    try {
      const res = await fetch('/api/admin/enrollments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ studentId: user.userId, courseSlugs: slugs }),
      });
      const payload = (await res.json().catch(() => ({}))) as {
        detail?: string;
        created?: number;
        alreadyEnrolled?: number;
      };
      if (!res.ok) {
        setActionError(payload.detail ?? 'Could not grant course access');
        return;
      }
      setSelectedCourseSlugs(new Set());
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
      setSelectedEnrollmentIds((prev) => {
        const next = new Set(prev);
        next.delete(enrollmentId);
        return next;
      });
      router.refresh();
    } finally {
      setPendingRevokeId(null);
    }
  }

  function toggleEnrollmentSelection(enrollmentId: string) {
    setSelectedEnrollmentIds((prev) => {
      const next = new Set(prev);
      if (next.has(enrollmentId)) next.delete(enrollmentId);
      else next.add(enrollmentId);
      return next;
    });
  }

  function selectAllIncomplete() {
    setSelectedEnrollmentIds(new Set(incompleteEnrollments.map((e) => e.enrollmentId)));
  }

  function clearSelection() {
    setSelectedEnrollmentIds(new Set());
  }

  async function markEnrollmentsComplete(enrollmentIds: string[]) {
    if (enrollmentIds.length === 0) return;
    setActionError(null);
    setPendingCompleteIds(new Set(enrollmentIds));
    try {
      const res = await fetch('/api/admin/enrollments/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ studentId: user.userId, enrollmentIds }),
      });
      const payload = (await res.json().catch(() => ({}))) as { detail?: string };
      if (!res.ok) {
        setActionError(payload.detail ?? 'Could not mark courses complete');
        return;
      }
      setSelectedEnrollmentIds(new Set());
      router.refresh();
    } finally {
      setPendingCompleteIds(new Set());
    }
  }

  const bulkCompletePending = pendingCompleteIds.size > 0;
  const selectedCount = selectedEnrollmentIds.size;

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
                    Assign courses, mark completions for CEC support, or remove access
                  </CardDescription>
                </div>
              </div>
              <div className="space-y-3">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="text-[10px] font-semibold tracking-[0.16em] text-white/38 uppercase">
                    Add courses
                  </div>
                  <Button
                    type="button"
                    className="h-10 shrink-0 rounded-xl px-5 font-semibold sm:self-start"
                    disabled={selectedCourseSlugs.size === 0 || pendingGrant || grantableCount === 0}
                    onClick={() => void grantSelectedCourses()}
                  >
                    {pendingGrant ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      `Grant access${selectedCourseSlugs.size > 0 ? ` (${selectedCourseSlugs.size})` : ''}`
                    )}
                  </Button>
                </div>
                <AdminCourseMultiPicker
                  courses={catalogCourses}
                  enrolledSlugs={enrolledSlugs}
                  selectedSlugs={selectedCourseSlugs}
                  onSelectionChange={setSelectedCourseSlugs}
                  disabled={pendingGrant || grantableCount === 0}
                />
              </div>
            </CardHeader>
          </Card>

          {user.enrollments.length > 0 ? (
            <div className="space-y-5">
              {incompleteEnrollments.length > 0 ? (
                <div
                  className={cn(
                    adminGlassCard,
                    'flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between',
                  )}
                >
                  <p className="text-sm text-white/55">
                    {incompleteEnrollments.length} course
                    {incompleteEnrollments.length === 1 ? '' : 's'} not fully complete
                    {selectedCount > 0 ? (
                      <span className="text-white/80"> · {selectedCount} selected</span>
                    ) : null}
                  </p>
                  <div className="flex flex-wrap items-center gap-2">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-9 text-white/60 hover:text-white"
                      disabled={bulkCompletePending}
                      onClick={selectAllIncomplete}
                    >
                      Select all incomplete
                    </Button>
                    {selectedCount > 0 ? (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-9 text-white/60 hover:text-white"
                        disabled={bulkCompletePending}
                        onClick={clearSelection}
                      >
                        Clear
                      </Button>
                    ) : null}
                    <Button
                      type="button"
                      size="sm"
                      className="h-9 rounded-lg bg-[#2490ed] px-4 font-semibold hover:bg-[#1a7fd4]"
                      disabled={selectedCount === 0 || bulkCompletePending}
                      onClick={() => void markEnrollmentsComplete([...selectedEnrollmentIds])}
                    >
                      {bulkCompletePending ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <>
                          <CheckCircle2 className="mr-1.5 h-4 w-4" />
                          Mark {selectedCount > 0 ? selectedCount : ''} complete
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              ) : null}
              {user.enrollments.map((e) => {
                const isIncomplete = e.completionPct < 100;
                return (
                  <CourseEnrollmentCard
                    key={e.enrollmentId}
                    enrollment={e}
                    selectable={isIncomplete}
                    selected={selectedEnrollmentIds.has(e.enrollmentId)}
                    pendingRevoke={pendingRevokeId === e.enrollmentId}
                    pendingComplete={pendingCompleteIds.has(e.enrollmentId)}
                    onToggleSelect={() => toggleEnrollmentSelection(e.enrollmentId)}
                    onRevoke={
                      bulkCompletePending ? () => {} : (id) => void revokeEnrollment(id)
                    }
                    onMarkComplete={
                      bulkCompletePending
                        ? () => {}
                        : (id) => void markEnrollmentsComplete([id])
                    }
                  />
                );
              })}
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
