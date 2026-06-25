'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Award,
  BookOpen,
  Calendar,
  Check,
  CheckCircle2,
  Clock,
  Copy,
  Download,
  Hash,
  KeyRound,
  Loader2,
  Mail,
  Shield,
  Trash2,
  UserRound,
} from 'lucide-react';
import { Cell, Pie, PieChart, Tooltip } from 'recharts';

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
import { renewalStatusLabel, type RenewalStatus } from '@/types/iicrc-renewal';
import { AdminCourseMultiPicker } from '@/components/admin/AdminCourseMultiPicker';
import { ProgressBar } from '@/components/lms/ProgressBar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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

function isCecEligibleEnrollment(enrollment: AdminCourseProgressForUser): boolean {
  return (
    (enrollment.cecHours != null && enrollment.cecHours > 0) ||
    Boolean(enrollment.discipline?.trim())
  );
}

function CourseEnrollmentCard({
  enrollment,
  pendingRevoke,
  pendingComplete,
  pendingSendIicrc,
  pendingDownloadCertificate,
  hasIicrcMemberNumber,
  selectable,
  selected,
  onToggleSelect,
  onRevoke,
  onMarkComplete,
  onSendIicrc,
  onDownloadCertificate,
}: {
  enrollment: AdminCourseProgressForUser;
  pendingRevoke: boolean;
  pendingComplete: boolean;
  pendingSendIicrc: boolean;
  pendingDownloadCertificate: boolean;
  hasIicrcMemberNumber: boolean;
  selectable: boolean;
  selected: boolean;
  onToggleSelect: () => void;
  onRevoke: (id: string) => void;
  onMarkComplete: (id: string) => void;
  onSendIicrc: (id: string) => void;
  onDownloadCertificate: (id: string, slug: string) => void;
}) {
  const statusLabel = enrollment.status.replace(/_/g, ' ');
  const isComplete = enrollment.completionPct >= 100;
  const cecEligible = isCecEligibleEnrollment(enrollment);
  const renewalAlreadySent =
    enrollment.renewalStatus === 'sent' ||
    enrollment.renewalStatus === 'approved' ||
    enrollment.renewalStatus === 'completed';
  const canSendIicrc = isComplete && cecEligible && hasIicrcMemberNumber && !renewalAlreadySent;
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
            {isComplete ? (
              <Button
                type="button"
                variant="secondary"
                size="sm"
                className="h-9 rounded-lg border-white/10 bg-white/[0.06] text-white/85 hover:bg-white/10"
                disabled={pendingDownloadCertificate || pendingRevoke || pendingComplete}
                onClick={() => onDownloadCertificate(enrollment.enrollmentId, enrollment.courseSlug)}
              >
                {pendingDownloadCertificate ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <>
                    <Download className="mr-1.5 h-3.5 w-3.5" />
                    Certificate
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
        {isComplete && cecEligible ? (
          <div className="mt-4 rounded-xl border border-[#2490ed]/20 bg-[#2490ed]/[0.06] px-4 py-3">
            <p className="text-[10px] font-semibold tracking-[0.18em] text-[#7ec5ff]/80 uppercase">
              IICRC renewal
            </p>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              {enrollment.renewalStatus ? (
                <StatusBadge
                  label={renewalStatusLabel(enrollment.renewalStatus as RenewalStatus)}
                  tone={
                    enrollment.renewalStatus === 'approved' ||
                    enrollment.renewalStatus === 'completed' ||
                    enrollment.renewalStatus === 'sent'
                      ? 'success'
                      : enrollment.renewalStatus === 'awaiting_response'
                        ? 'warning'
                        : enrollment.renewalStatus === 'failed' || enrollment.renewalStatus === 'rejected'
                          ? 'warning'
                          : 'muted'
                  }
                />
              ) : (
                <StatusBadge label="Not sent" tone="muted" />
              )}
              {enrollment.renewalSentAt ? (
                <span className="text-xs text-white/45">
                  Sent {formatAdminDateTime(enrollment.renewalSentAt)}
                </span>
              ) : null}
              {enrollment.renewalCommunicationCount > 0 ? (
                <span className="text-xs text-white/40">
                  {enrollment.renewalCommunicationCount} message
                  {enrollment.renewalCommunicationCount === 1 ? '' : 's'}
                </span>
              ) : null}
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              {canSendIicrc ? (
                <Button
                  type="button"
                  size="sm"
                  className="h-8 rounded-lg bg-[#2490ed] px-3 text-xs font-semibold hover:bg-[#1a7fd4]"
                  disabled={pendingSendIicrc || pendingComplete || pendingRevoke}
                  onClick={() => onSendIicrc(enrollment.enrollmentId)}
                >
                  {pendingSendIicrc ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <>
                      <Mail className="mr-1.5 h-3.5 w-3.5" />
                      Send IICRC email
                    </>
                  )}
                </Button>
              ) : null}
              {!hasIicrcMemberNumber && isComplete ? (
                <span className="text-xs text-amber-200/70">IICRC member number required</span>
              ) : null}
              {enrollment.renewalSubmissionId ? (
                <Link
                  href={`/admin/iicrc-cec/${enrollment.renewalSubmissionId}`}
                  className="inline-flex items-center gap-1 text-xs font-medium text-[#7ec5ff] hover:underline"
                >
                  <Mail className="h-3 w-3" />
                  View communication log
                </Link>
              ) : null}
            </div>
          </div>
        ) : null}
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
  const [pendingSendIicrcIds, setPendingSendIicrcIds] = useState<Set<string>>(() => new Set());
  const [pendingDownloadIds, setPendingDownloadIds] = useState<Set<string>>(() => new Set());
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [passwordDialogOpen, setPasswordDialogOpen] = useState(false);
  const [passwordMode, setPasswordMode] = useState<'generate' | 'custom'>('generate');
  const [customPassword, setCustomPassword] = useState('');
  const [sendPasswordEmail, setSendPasswordEmail] = useState(true);
  const [pendingPasswordReset, setPendingPasswordReset] = useState(false);
  const [resetResult, setResetResult] = useState<{
    password: string;
    emailSent: boolean;
  } | null>(null);
  const [passwordCopied, setPasswordCopied] = useState(false);

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

  const cecEligibleCompleted = useMemo(
    () => user.enrollments.filter((e) => e.completionPct >= 100 && isCecEligibleEnrollment(e)),
    [user.enrollments],
  );

  const hasIicrcMemberNumber = Boolean(user.iicrcMemberNumber?.trim());

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

  async function sendIicrcRenewalEmail(enrollmentId: string) {
    setActionError(null);
    setActionSuccess(null);

    const enrollment = user.enrollments.find((e) => e.enrollmentId === enrollmentId);
    const iicrcMemberNumber = user.iicrcMemberNumber?.trim();
    if (!iicrcMemberNumber) {
      setActionError('Add an IICRC member number to this learner profile before sending renewal email.');
      return;
    }

    setPendingSendIicrcIds(new Set([enrollmentId]));
    try {
      const res = await fetch('/api/admin/iicrc-cec-submissions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        signal: AbortSignal.timeout(15_000),
        body: JSON.stringify({
          enrollmentId,
          studentId: user.userId,
          iicrcMemberNumber,
          cecHours: enrollment?.cecHours ?? null,
        }),
      });
      const payload = (await res.json().catch(() => ({}))) as {
        detail?: string;
        status?: string;
        alreadySent?: boolean;
        failureReason?: string;
      };
      if (res.status === 202 || payload.status === 'processing') {
        setActionSuccess(
          payload.detail ??
            'IICRC renewal email is being sent. Refresh in a moment or check Admin → IICRC CEC.',
        );
        router.refresh();
        return;
      }
      if (!res.ok) {
        if (res.status === 504) {
          setActionError(
            'Request timed out while sending to IICRC. Check Admin → IICRC CEC for whether the email was logged.',
          );
          return;
        }
        setActionError(payload.detail ?? 'Could not send IICRC renewal email');
        return;
      }
      if (payload.alreadySent) {
        setActionSuccess('IICRC renewal email was already sent for this course.');
      } else if (payload.status === 'sent') {
        setActionSuccess('IICRC renewal email sent successfully.');
      } else if (payload.status === 'failed') {
        setActionError(payload.detail ?? 'IICRC email delivery failed — check the communication log.');
      } else if (payload.status === 'skipped') {
        setActionError(
          payload.detail ??
            'IICRC submission was skipped — verify course CEC eligibility, MAILTRAP_API_KEY, and completion status.',
        );
      }
      router.refresh();
    } finally {
      setPendingSendIicrcIds(new Set());
    }
  }

  function openPasswordDialog() {
    setActionError(null);
    setResetResult(null);
    setPasswordCopied(false);
    setPasswordMode('generate');
    setCustomPassword('');
    setSendPasswordEmail(true);
    setPasswordDialogOpen(true);
  }

  function closePasswordDialog() {
    setPasswordDialogOpen(false);
    setResetResult(null);
    setCustomPassword('');
    setPasswordCopied(false);
  }

  async function resetUserPassword() {
    if (passwordMode === 'custom' && customPassword.trim().length < 8) {
      setActionError('Custom password must be at least 8 characters.');
      return;
    }

    setPendingPasswordReset(true);
    setActionError(null);
    try {
      const res = await fetch(`/api/admin/users/${user.userId}/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          password: passwordMode === 'custom' ? customPassword : undefined,
          sendEmail: sendPasswordEmail,
        }),
      });
      const payload = (await res.json().catch(() => ({}))) as {
        detail?: string;
        password?: string;
        emailSent?: boolean;
      };
      if (!res.ok) {
        setActionError(payload.detail ?? 'Could not reset password');
        return;
      }
      if (typeof payload.password === 'string') {
        setResetResult({
          password: payload.password,
          emailSent: payload.emailSent === true,
        });
      }
    } finally {
      setPendingPasswordReset(false);
    }
  }

  async function copyResetPassword() {
    if (!resetResult?.password) return;
    try {
      await navigator.clipboard.writeText(resetResult.password);
      setPasswordCopied(true);
      window.setTimeout(() => setPasswordCopied(false), 2000);
    } catch {
      setActionError('Could not copy to clipboard. Select and copy the password manually.');
    }
  }

  async function downloadCertificate(enrollmentId: string, courseSlug: string) {
    setActionError(null);
    setPendingDownloadIds(new Set([enrollmentId]));
    try {
      const res = await fetch(
        `/api/admin/enrollments/${encodeURIComponent(enrollmentId)}/certificate?studentId=${encodeURIComponent(user.userId)}`,
        { credentials: 'include' },
      );
      if (!res.ok) {
        const payload = (await res.json().catch(() => ({}))) as { detail?: string };
        setActionError(payload.detail ?? 'Could not download certificate');
        return;
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = `carsi-certificate-${courseSlug}.pdf`;
      anchor.click();
      URL.revokeObjectURL(url);
      setActionSuccess('Certificate downloaded.');
    } finally {
      setPendingDownloadIds(new Set());
    }
  }

  const displayName = user.fullName?.trim() || user.email.split('@')[0] || 'Learner';

  const bulkCompletePending = pendingCompleteIds.size > 0;
  const selectedCount = selectedEnrollmentIds.size;
  const enrollDisabled =
    selectedCourseSlugs.size === 0 || pendingGrant || grantableCount === 0;
  const enrollButtonLabel =
    selectedCourseSlugs.size > 0
      ? `Enroll in ${selectedCourseSlugs.size} course${selectedCourseSlugs.size === 1 ? '' : 's'}`
      : 'Enroll learner';

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

      {actionSuccess ? (
        <div
          className="mb-6 rounded-xl border border-emerald-400/25 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-100"
          role="status"
        >
          {actionSuccess}
        </div>
      ) : null}

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
              <PieChart width={140} height={140}>
                <Pie
                  data={gaugeData}
                  dataKey="value"
                  cx={70}
                  cy={70}
                  innerRadius={40}
                  outerRadius={57}
                  startAngle={90}
                  endAngle={-270}
                  stroke="none"
                >
                  <Cell fill="#2490ed" />
                  <Cell fill="rgba(255,255,255,0.07)" />
                </Pie>
                <Tooltip {...chartTooltipProps} />
              </PieChart>
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

            <div className="rounded-xl border border-white/[0.08] bg-black/20 p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="flex items-center gap-2 text-sm font-semibold text-white/88">
                    <KeyRound className="h-4 w-4 text-[#7ec5ff]" />
                    Password
                  </p>
                  <p className="mt-1 text-xs text-white/45">
                    Generate a secure password or set a custom one. Optionally email it to the learner.
                  </p>
                </div>
                <Button
                  type="button"
                  size="sm"
                  className="h-8 shrink-0 rounded-lg bg-[#2490ed] px-3 text-xs font-semibold hover:bg-[#1a7fd4]"
                  onClick={openPasswordDialog}
                >
                  Reset password
                </Button>
              </div>
            </div>

            {cecEligibleCompleted.length > 0 ? (
              <div className="rounded-xl border border-[#2490ed]/20 bg-[#2490ed]/[0.05] p-4">
                <div className="flex items-center gap-2">
                  <Mail className="h-4 w-4 text-[#7ec5ff]" />
                  <p className="text-sm font-semibold text-white/88">Manual IICRC renewal</p>
                </div>
                <p className="mt-1 text-xs text-white/45">
                  Send certificate of completion to IICRC using member number{' '}
                  <span className="font-medium text-white/70">{user.iicrcMemberNumber}</span>
                </p>
                <ul className="mt-3 space-y-2">
                  {cecEligibleCompleted.map((e) => {
                    const alreadySent =
                      e.renewalStatus === 'sent' ||
                      e.renewalStatus === 'approved' ||
                      e.renewalStatus === 'completed';
                    return (
                      <li
                        key={e.enrollmentId}
                        className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-white/[0.06] bg-black/20 px-3 py-2"
                      >
                        <div className="min-w-0">
                          <p className="truncate text-xs font-medium text-white/80">{e.courseTitle}</p>
                          {e.cecHours != null && e.cecHours > 0 ? (
                            <p className="text-[10px] text-white/40">{e.cecHours} CEC hours</p>
                          ) : null}
                        </div>
                        {alreadySent ? (
                          <StatusBadge label="Sent" tone="success" />
                        ) : hasIicrcMemberNumber ? (
                          <Button
                            type="button"
                            size="sm"
                            className="h-7 rounded-lg bg-[#2490ed] px-2.5 text-[11px] font-semibold hover:bg-[#1a7fd4]"
                            disabled={pendingSendIicrcIds.has(e.enrollmentId)}
                            onClick={() => void sendIicrcRenewalEmail(e.enrollmentId)}
                          >
                            {pendingSendIicrcIds.has(e.enrollmentId) ? (
                              <Loader2 className="h-3 w-3 animate-spin" />
                            ) : (
                              'Send email'
                            )}
                          </Button>
                        ) : null}
                      </li>
                    );
                  })}
                </ul>
              </div>
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
                <div className="text-[10px] font-semibold tracking-[0.16em] text-white/38 uppercase">
                  Add courses
                </div>
                <AdminCourseMultiPicker
                  courses={catalogCourses}
                  enrolledSlugs={enrolledSlugs}
                  selectedSlugs={selectedCourseSlugs}
                  onSelectionChange={setSelectedCourseSlugs}
                  disabled={pendingGrant || grantableCount === 0}
                  onEnroll={() => void grantSelectedCourses()}
                  enrollPending={pendingGrant}
                  enrollDisabled={enrollDisabled}
                />
                {grantableCount === 0 ? (
                  <p className="rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-xs text-white/45">
                    This learner is already enrolled in every course in the catalog.
                  </p>
                ) : null}
              </div>
            </CardHeader>
            <CardFooter className="flex flex-col gap-3 border-t border-white/[0.06] bg-black/20 px-6 py-4">
              <p className="text-sm text-white/50">
                {selectedCourseSlugs.size > 0 ? (
                  <>
                    <span className="font-medium text-white/85">
                      {selectedCourseSlugs.size} course
                      {selectedCourseSlugs.size === 1 ? '' : 's'} ready to assign
                    </span>
                    {' · '}Confirm enrollment below
                  </>
                ) : (
                  'Select one or more courses, then confirm enrollment'
                )}
              </p>
              <Button
                type="button"
                className="h-12 w-full rounded-xl bg-[#2490ed] px-6 text-base font-semibold text-white shadow-lg shadow-[#2490ed]/25 hover:bg-[#1a7fd4] disabled:opacity-40"
                disabled={enrollDisabled}
                onClick={() => void grantSelectedCourses()}
              >
                {pendingGrant ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  enrollButtonLabel
                )}
              </Button>
            </CardFooter>
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
                    hasIicrcMemberNumber={hasIicrcMemberNumber}
                    pendingSendIicrc={pendingSendIicrcIds.has(e.enrollmentId)}
                    pendingDownloadCertificate={pendingDownloadIds.has(e.enrollmentId)}
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
                    onSendIicrc={(id) => void sendIicrcRenewalEmail(id)}
                    onDownloadCertificate={(id, slug) => void downloadCertificate(id, slug)}
                  />
                );
              })}
            </div>
          ) : (
            <div
              className={cn(
                adminGlassCard,
                'flex flex-col items-center justify-center gap-4 py-16 text-center',
              )}
            >
              <Calendar className="h-10 w-10 text-white/25" strokeWidth={1.25} />
              <p className="text-sm font-medium text-white/70">No course enrollments yet</p>
              {selectedCourseSlugs.size > 0 ? (
                <>
                  <p className="max-w-sm text-xs text-white/45">
                    {selectedCourseSlugs.size} course
                    {selectedCourseSlugs.size === 1 ? '' : 's'} selected — use the blue{' '}
                    <span className="font-medium text-white/65">Enroll</span> button in the panel
                    above to grant access.
                  </p>
                  <Button
                    type="button"
                    className="h-11 rounded-xl bg-[#2490ed] px-8 font-semibold text-white hover:bg-[#1a7fd4] disabled:opacity-40"
                    disabled={enrollDisabled}
                    onClick={() => void grantSelectedCourses()}
                  >
                    {pendingGrant ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      enrollButtonLabel
                    )}
                  </Button>
                </>
              ) : (
                <p className="max-w-sm text-xs text-white/45">
                  Select courses in the panel above, then click{' '}
                  <span className="font-medium text-white/65">Enroll learner</span> to grant access
                  and start tracking modules and completion.
                </p>
              )}
            </div>
          )}
        </div>
      </div>

      <Dialog open={passwordDialogOpen} onOpenChange={(open) => (open ? setPasswordDialogOpen(true) : closePasswordDialog())}>
        <DialogContent className="border-white/10 bg-[#0a0f1a] text-white sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-white">
              {resetResult ? 'Password updated' : 'Reset learner password'}
            </DialogTitle>
            <DialogDescription className="text-white/50">
              {resetResult
                ? `New sign-in details for ${user.email}. Copy the password now — it will not be shown again.`
                : `Set a new password for ${displayName}. The previous password will stop working immediately.`}
            </DialogDescription>
          </DialogHeader>

          {resetResult ? (
            <div className="space-y-4">
              <div className="rounded-xl border border-emerald-400/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-100">
                {resetResult.emailSent
                  ? 'Password updated and emailed to the learner.'
                  : 'Password updated. Email was not sent — share the password securely.'}
              </div>
              <div className="space-y-2">
                <Label className="text-white/60">New password</Label>
                <div className="flex gap-2">
                  <Input
                    readOnly
                    value={resetResult.password}
                    className="font-mono text-sm border-white/10 bg-black/30 text-white"
                  />
                  <Button
                    type="button"
                    variant="secondary"
                    className="shrink-0 border-white/10 bg-white/[0.06] text-white hover:bg-white/10"
                    onClick={() => void copyResetPassword()}
                  >
                    {passwordCopied ? (
                      <Check className="h-4 w-4" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="grid gap-2">
                <Label className="text-white/60">Password option</Label>
                <div className="grid gap-2 sm:grid-cols-2">
                  <button
                    type="button"
                    onClick={() => setPasswordMode('generate')}
                    className={cn(
                      'rounded-xl border px-3 py-3 text-left text-sm transition-colors',
                      passwordMode === 'generate'
                        ? 'border-[#2490ed]/40 bg-[#2490ed]/10 text-white'
                        : 'border-white/10 bg-white/[0.03] text-white/70 hover:bg-white/[0.05]',
                    )}
                  >
                    <span className="font-medium">Generate secure password</span>
                    <p className="mt-1 text-xs text-white/45">Recommended — random Carsi-… format</p>
                  </button>
                  <button
                    type="button"
                    onClick={() => setPasswordMode('custom')}
                    className={cn(
                      'rounded-xl border px-3 py-3 text-left text-sm transition-colors',
                      passwordMode === 'custom'
                        ? 'border-[#2490ed]/40 bg-[#2490ed]/10 text-white'
                        : 'border-white/10 bg-white/[0.03] text-white/70 hover:bg-white/[0.05]',
                    )}
                  >
                    <span className="font-medium">Set custom password</span>
                    <p className="mt-1 text-xs text-white/45">Minimum 8 characters</p>
                  </button>
                </div>
              </div>

              {passwordMode === 'custom' ? (
                <div className="space-y-2">
                  <Label htmlFor="admin-custom-password" className="text-white/60">
                    Custom password
                  </Label>
                  <Input
                    id="admin-custom-password"
                    type="password"
                    autoComplete="new-password"
                    value={customPassword}
                    onChange={(e) => setCustomPassword(e.target.value)}
                    placeholder="At least 8 characters"
                    className="border-white/10 bg-black/30 text-white placeholder:text-white/30"
                  />
                </div>
              ) : null}

              <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-3">
                <input
                  type="checkbox"
                  checked={sendPasswordEmail}
                  onChange={(e) => setSendPasswordEmail(e.target.checked)}
                  className="mt-0.5 h-4 w-4 rounded border-white/20 bg-white/5 accent-[#2490ed]"
                />
                <span className="text-sm text-white/75">
                  Email new password to <span className="font-medium text-white">{user.email}</span>
                </span>
              </label>
            </div>
          )}

          <DialogFooter className="gap-2 sm:gap-0">
            {resetResult ? (
              <Button
                type="button"
                className="bg-[#2490ed] hover:bg-[#1a7fd4]"
                onClick={closePasswordDialog}
              >
                Done
              </Button>
            ) : (
              <>
                <Button
                  type="button"
                  variant="ghost"
                  className="text-white/70 hover:bg-white/10 hover:text-white"
                  onClick={closePasswordDialog}
                  disabled={pendingPasswordReset}
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  className="bg-[#2490ed] hover:bg-[#1a7fd4]"
                  disabled={pendingPasswordReset}
                  onClick={() => void resetUserPassword()}
                >
                  {pendingPasswordReset ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    'Reset password'
                  )}
                </Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
