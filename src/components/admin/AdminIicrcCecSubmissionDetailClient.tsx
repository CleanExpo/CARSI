'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import {
  ArrowDownLeft,
  ArrowLeft,
  ArrowUpRight,
  FileText,
  Loader2,
  Mail,
  MessageSquare,
  Paperclip,
  RefreshCw,
  StickyNote,
} from 'lucide-react';

import { adminGlassCard, formatAdminDateTime } from '@/components/admin/admin-learner-ui';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import {
  RENEWAL_STATUSES,
  renewalStatusLabel,
  type RenewalCommunication,
  type RenewalStatus,
  type RenewalSubmissionDetail,
  type RenewalSubmissionNote,
} from '@/types/iicrc-renewal';

function renewalStatusClass(status: RenewalStatus): string {
  switch (status) {
    case 'sent':
      return 'border-emerald-500/35 bg-emerald-500/10 text-emerald-200';
    case 'awaiting_response':
      return 'border-amber-500/35 bg-amber-500/10 text-amber-200';
    case 'approved':
    case 'completed':
      return 'border-sky-500/35 bg-sky-500/10 text-sky-200';
    case 'rejected':
    case 'failed':
      return 'border-red-500/35 bg-red-500/10 text-red-200';
    case 'pending':
      return 'border-white/15 bg-white/5 text-white/55';
    default:
      return 'border-white/15 bg-white/5 text-white/55';
  }
}

function deliveryStatusClass(status: string): string {
  switch (status) {
    case 'sent':
    case 'delivered':
      return 'text-emerald-300';
    case 'failed':
    case 'bounced':
      return 'text-red-300';
    default:
      return 'text-white/50';
  }
}

function kindLabel(kind: string): string {
  switch (kind) {
    case 'iicrc_submission':
      return 'IICRC submission';
    case 'technician_receipt':
      return 'Technician receipt';
    case 'inbound_reply':
      return 'Inbound reply';
    case 'admin_manual':
      return 'Manual entry';
    default:
      return kind.replace(/_/g, ' ');
  }
}

function CommunicationCard({ comm }: { comm: RenewalCommunication }) {
  const isInbound = comm.direction === 'inbound';
  const timestamp = comm.sent_at ?? comm.received_at ?? comm.created_at;

  return (
    <article
      className={cn(
        adminGlassCard,
        'p-5',
        isInbound ? 'border-l-2 border-l-amber-400/50' : 'border-l-2 border-l-[#2490ed]/50',
      )}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <div
            className={cn(
              'flex h-9 w-9 shrink-0 items-center justify-center rounded-lg',
              isInbound ? 'bg-amber-500/10 text-amber-300' : 'bg-[#2490ed]/10 text-[#7ec5ff]',
            )}
          >
            {isInbound ? (
              <ArrowDownLeft className="h-4 w-4" aria-hidden />
            ) : (
              <ArrowUpRight className="h-4 w-4" aria-hidden />
            )}
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-semibold tracking-wide text-white/40 uppercase">
                {kindLabel(comm.kind)}
              </span>
              <span
                className={cn('text-xs font-medium capitalize', deliveryStatusClass(comm.delivery_status))}
              >
                {comm.delivery_status}
              </span>
            </div>
            <h3 className="mt-1 font-medium text-white/90">{comm.subject}</h3>
            <p className="mt-1 text-xs text-white/40">{formatAdminDateTime(timestamp)}</p>
          </div>
        </div>
      </div>

      <dl className="mt-4 grid gap-2 text-xs sm:grid-cols-2">
        <div>
          <dt className="text-white/35">From</dt>
          <dd className="mt-0.5 text-white/70">{comm.from_email}</dd>
        </div>
        <div>
          <dt className="text-white/35">To</dt>
          <dd className="mt-0.5 text-white/70">{comm.to_emails.join(', ')}</dd>
        </div>
        {comm.cc_emails.length > 0 ? (
          <div className="sm:col-span-2">
            <dt className="text-white/35">CC</dt>
            <dd className="mt-0.5 text-white/70">{comm.cc_emails.join(', ')}</dd>
          </div>
        ) : null}
        {comm.initiated_by_admin_email ? (
          <div className="sm:col-span-2">
            <dt className="text-white/35">Logged by admin</dt>
            <dd className="mt-0.5 text-white/70">{comm.initiated_by_admin_email}</dd>
          </div>
        ) : null}
        {comm.provider_message_id ? (
          <div className="sm:col-span-2">
            <dt className="text-white/35">Provider message ID</dt>
            <dd className="mt-0.5 font-mono text-[10px] text-white/45">{comm.provider_message_id}</dd>
          </div>
        ) : null}
        {comm.failure_reason ? (
          <div className="sm:col-span-2">
            <dt className="text-white/35">Failure reason</dt>
            <dd className="mt-0.5 text-red-200/80">{comm.failure_reason}</dd>
          </div>
        ) : null}
      </dl>

      {comm.text_body ? (
        <div className="mt-4 rounded-xl border border-white/[0.06] bg-black/20 p-4">
          <p className="mb-2 flex items-center gap-1.5 text-[10px] font-semibold tracking-wide text-white/35 uppercase">
            <FileText className="h-3 w-3" />
            Message
          </p>
          <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed text-white/75">
            {comm.text_body}
          </pre>
        </div>
      ) : null}

      {comm.attachments.length > 0 ? (
        <div className="mt-4">
          <p className="mb-2 flex items-center gap-1.5 text-[10px] font-semibold tracking-wide text-white/35 uppercase">
            <Paperclip className="h-3 w-3" />
            Attachments
          </p>
          <ul className="flex flex-wrap gap-2">
            {comm.attachments.map((a) => (
              <li
                key={a.id}
                className="rounded-lg border border-white/10 bg-white/[0.03] px-3 py-1.5 text-xs text-white/65"
              >
                {a.filename}
                {a.size_bytes != null ? (
                  <span className="ml-1 text-white/35">
                    ({Math.round(a.size_bytes / 1024)} KB)
                  </span>
                ) : null}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </article>
  );
}

function NoteCard({ note }: { note: RenewalSubmissionNote }) {
  return (
    <article className={cn(adminGlassCard, 'p-4')}>
      <div className="flex flex-wrap items-start justify-between gap-2">
        <p className="text-sm text-white/80">{note.body}</p>
        <time className="shrink-0 text-xs text-white/40">{formatAdminDateTime(note.created_at)}</time>
      </div>
      <p className="mt-2 text-xs text-white/40">By {note.author_admin_email}</p>
      {note.follow_up_action ? (
        <p className="mt-2 rounded-lg border border-amber-400/20 bg-amber-400/5 px-3 py-2 text-xs text-amber-100/90">
          Follow-up: {note.follow_up_action}
          {note.follow_up_due_at ? ` · due ${formatAdminDateTime(note.follow_up_due_at)}` : ''}
        </p>
      ) : null}
    </article>
  );
}

export function AdminIicrcCecSubmissionDetailClient({ submissionId }: { submissionId: string }) {
  const [detail, setDetail] = useState<RenewalSubmissionDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [savingStatus, setSavingStatus] = useState(false);
  const [savingNote, setSavingNote] = useState(false);
  const [savingReply, setSavingReply] = useState(false);

  const [noteBody, setNoteBody] = useState('');
  const [followUpAction, setFollowUpAction] = useState('');
  const [followUpDueAt, setFollowUpDueAt] = useState('');

  const [replyFrom, setReplyFrom] = useState('');
  const [replySubject, setReplySubject] = useState('');
  const [replyBody, setReplyBody] = useState('');
  const [replyStatus, setReplyStatus] = useState<RenewalStatus>('awaiting_response');

  const load = useCallback(async () => {
    setError(null);
    const res = await fetch(`/api/admin/iicrc-cec-submissions/${submissionId}`, {
      credentials: 'include',
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(typeof data.detail === 'string' ? data.detail : 'Failed to load submission');
      return;
    }
    setDetail(data.submission ?? null);
    if (data.submission?.recipient_email && !replyFrom) {
      setReplyFrom(data.submission.recipient_email);
    }
  }, [submissionId, replyFrom]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        await load();
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [load]);

  async function updateStatus(renewalStatus: RenewalStatus) {
    setSavingStatus(true);
    try {
      const res = await fetch(`/api/admin/iicrc-cec-submissions/${submissionId}`, {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ renewalStatus }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(typeof data.detail === 'string' ? data.detail : 'Failed to update status');
        return;
      }
      setDetail(data.submission ?? null);
    } finally {
      setSavingStatus(false);
    }
  }

  async function submitNote(e: React.FormEvent) {
    e.preventDefault();
    if (!noteBody.trim()) return;
    setSavingNote(true);
    try {
      const res = await fetch(`/api/admin/iicrc-cec-submissions/${submissionId}/notes`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          body: noteBody,
          followUpAction: followUpAction.trim() || undefined,
          followUpDueAt: followUpDueAt.trim() || undefined,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(typeof data.detail === 'string' ? data.detail : 'Failed to add note');
        return;
      }
      setNoteBody('');
      setFollowUpAction('');
      setFollowUpDueAt('');
      await load();
    } finally {
      setSavingNote(false);
    }
  }

  async function submitInboundReply(e: React.FormEvent) {
    e.preventDefault();
    if (!replyFrom.trim() || !replySubject.trim() || !replyBody.trim()) return;
    setSavingReply(true);
    try {
      const res = await fetch(
        `/api/admin/iicrc-cec-submissions/${submissionId}/inbound-reply`,
        {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            fromEmail: replyFrom,
            subject: replySubject,
            textBody: replyBody,
            setRenewalStatus: replyStatus,
          }),
        },
      );
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(typeof data.detail === 'string' ? data.detail : 'Failed to log reply');
        return;
      }
      setReplySubject('');
      setReplyBody('');
      setDetail(data.submission ?? null);
    } finally {
      setSavingReply(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center gap-2 px-6 py-12 text-sm text-white/50">
        <Loader2 className="h-4 w-4 animate-spin" />
        Loading communication log…
      </div>
    );
  }

  if (!detail) {
    return (
      <div className="px-6 py-12">
        <p className="text-sm text-red-200">{error ?? 'Submission not found'}</p>
        <Link href="/admin/iicrc-cec" className="mt-4 inline-block text-sm text-[#7ec5ff] hover:underline">
          Back to submissions
        </Link>
      </div>
    );
  }

  return (
    <div className="px-6 py-8">
      <div className="mb-6">
        <Link
          href="/admin/iicrc-cec"
          className="inline-flex items-center gap-1.5 text-sm text-white/50 hover:text-white/80"
        >
          <ArrowLeft className="h-4 w-4" />
          All CEC submissions
        </Link>
      </div>

      <div className="mb-8 flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <div
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl"
            style={{
              background: 'rgba(36, 144, 237, 0.12)',
              border: '1px solid rgba(36, 144, 237, 0.28)',
            }}
          >
            <Mail className="h-5 w-5 text-[#2490ed]" aria-hidden />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-white">Renewal communication log</h1>
            <p className="mt-1 text-sm text-white/45">
              {detail.student_name} · {detail.course_title}
            </p>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <Link
                href={`/admin/users/${detail.student_id}`}
                className="text-xs text-[#7ec5ff] hover:underline"
              >
                View learner profile
              </Link>
              {detail.iicrc_member_number ? (
                <span className="text-xs text-white/35">IICRC {detail.iicrc_member_number}</span>
              ) : null}
            </div>
          </div>
        </div>
        <Button
          type="button"
          variant="outline"
          className="border-white/15 text-white/80"
          onClick={() => void load()}
        >
          <RefreshCw className="mr-2 h-4 w-4" />
          Refresh
        </Button>
      </div>

      {error ? (
        <p className="mb-4 rounded-md border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-200">
          {error}
        </p>
      ) : null}

      <div className="mb-8 grid gap-4 lg:grid-cols-3">
        <div className={cn(adminGlassCard, 'p-5 lg:col-span-2')}>
          <h2 className="text-sm font-semibold text-white/80">Submission summary</h2>
          <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-xs text-white/35">Recipient</dt>
              <dd className="mt-0.5 text-white/75">{detail.recipient_email}</dd>
            </div>
            <div>
              <dt className="text-xs text-white/35">Technician</dt>
              <dd className="mt-0.5 text-white/75">{detail.technician_email}</dd>
            </div>
            <div>
              <dt className="text-xs text-white/35">Email status</dt>
              <dd className="mt-0.5 capitalize text-white/75">{detail.status}</dd>
            </div>
            <div>
              <dt className="text-xs text-white/35">Sent at</dt>
              <dd className="mt-0.5 text-white/75">
                {detail.sent_at ? formatAdminDateTime(detail.sent_at) : '—'}
              </dd>
            </div>
            {detail.initiated_by_admin_email ? (
              <div className="sm:col-span-2">
                <dt className="text-xs text-white/35">Initiated by admin</dt>
                <dd className="mt-0.5 text-white/75">{detail.initiated_by_admin_email}</dd>
              </div>
            ) : null}
            {detail.cec_hours != null ? (
              <div>
                <dt className="text-xs text-white/35">CEC hours</dt>
                <dd className="mt-0.5 text-white/75">{detail.cec_hours}</dd>
              </div>
            ) : null}
            {detail.iicrc_discipline ? (
              <div>
                <dt className="text-xs text-white/35">Discipline</dt>
                <dd className="mt-0.5 text-white/75">{detail.iicrc_discipline}</dd>
              </div>
            ) : null}
          </dl>
        </div>

        <div className={cn(adminGlassCard, 'p-5')}>
          <h2 className="text-sm font-semibold text-white/80">Renewal status</h2>
          <div className="mt-3">
            <span
              className={cn(
                'inline-flex rounded-full border px-3 py-1 text-sm font-medium',
                renewalStatusClass(detail.renewal_status),
              )}
            >
              {renewalStatusLabel(detail.renewal_status)}
            </span>
          </div>
          <label className="mt-4 block text-xs text-white/40">
            Update status
            <select
              className="mt-1.5 w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white/85"
              value={detail.renewal_status}
              disabled={savingStatus}
              onChange={(e) => void updateStatus(e.target.value as RenewalStatus)}
            >
              {RENEWAL_STATUSES.map((s) => (
                <option key={s} value={s} className="bg-[#0a0e1a]">
                  {renewalStatusLabel(s)}
                </option>
              ))}
            </select>
          </label>
        </div>
      </div>

      <section className="mb-10">
        <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-white/90">
          <MessageSquare className="h-5 w-5 text-[#2490ed]" />
          Communication history
          <span className="text-sm font-normal text-white/40">
            ({detail.communications.length})
          </span>
        </h2>
        {detail.communications.length === 0 ? (
          <p className={cn(adminGlassCard, 'px-5 py-8 text-sm text-white/45')}>
            No communications logged yet.
          </p>
        ) : (
          <div className="space-y-4">
            {detail.communications.map((comm) => (
              <CommunicationCard key={comm.id} comm={comm} />
            ))}
          </div>
        )}
      </section>

      <div className="grid gap-8 lg:grid-cols-2">
        <section>
          <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-white/90">
            <StickyNote className="h-5 w-5 text-amber-400" />
            Internal notes
          </h2>
          <form onSubmit={(e) => void submitNote(e)} className={cn(adminGlassCard, 'mb-4 space-y-3 p-5')}>
            <label className="block text-xs text-white/40">
              Note
              <textarea
                className="mt-1.5 min-h-[88px] w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white/85"
                value={noteBody}
                onChange={(e) => setNoteBody(e.target.value)}
                placeholder="Internal note visible only to administrators…"
                required
              />
            </label>
            <label className="block text-xs text-white/40">
              Follow-up action (optional)
              <input
                className="mt-1.5 w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white/85"
                value={followUpAction}
                onChange={(e) => setFollowUpAction(e.target.value)}
                placeholder="e.g. Call renewal team if no reply by Friday"
              />
            </label>
            <label className="block text-xs text-white/40">
              Follow-up due (optional)
              <input
                type="datetime-local"
                className="mt-1.5 w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white/85"
                value={followUpDueAt}
                onChange={(e) => setFollowUpDueAt(e.target.value)}
              />
            </label>
            <Button type="submit" disabled={savingNote || !noteBody.trim()}>
              {savingNote ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Add note
            </Button>
          </form>
          {detail.notes.length === 0 ? (
            <p className="text-sm text-white/40">No internal notes yet.</p>
          ) : (
            <div className="space-y-3">
              {detail.notes.map((note) => (
                <NoteCard key={note.id} note={note} />
              ))}
            </div>
          )}
        </section>

        <section>
          <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-white/90">
            <ArrowDownLeft className="h-5 w-5 text-amber-400" />
            Log inbound reply
          </h2>
          <p className="mb-4 text-sm text-white/45">
            Record a reply received from the IICRC renewal team (e.g. pasted from email) so it
            appears in the audit trail.
          </p>
          <form onSubmit={(e) => void submitInboundReply(e)} className={cn(adminGlassCard, 'space-y-3 p-5')}>
            <label className="block text-xs text-white/40">
              From
              <input
                className="mt-1.5 w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white/85"
                value={replyFrom}
                onChange={(e) => setReplyFrom(e.target.value)}
                required
              />
            </label>
            <label className="block text-xs text-white/40">
              Subject
              <input
                className="mt-1.5 w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white/85"
                value={replySubject}
                onChange={(e) => setReplySubject(e.target.value)}
                required
              />
            </label>
            <label className="block text-xs text-white/40">
              Message body
              <textarea
                className="mt-1.5 min-h-[120px] w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white/85"
                value={replyBody}
                onChange={(e) => setReplyBody(e.target.value)}
                required
              />
            </label>
            <label className="block text-xs text-white/40">
              Set renewal status after logging
              <select
                className="mt-1.5 w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white/85"
                value={replyStatus}
                onChange={(e) => setReplyStatus(e.target.value as RenewalStatus)}
              >
                {RENEWAL_STATUSES.map((s) => (
                  <option key={s} value={s} className="bg-[#0a0e1a]">
                    {renewalStatusLabel(s)}
                  </option>
                ))}
              </select>
            </label>
            <Button type="submit" disabled={savingReply}>
              {savingReply ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Log reply
            </Button>
          </form>
        </section>
      </div>
    </div>
  );
}
