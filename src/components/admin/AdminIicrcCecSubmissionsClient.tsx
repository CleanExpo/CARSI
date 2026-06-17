'use client';

import { useCallback, useEffect, useState } from 'react';
import { Loader2, Mail, RefreshCw } from 'lucide-react';
import Link from 'next/link';

import { adminGlassCard, formatAdminDateTime } from '@/components/admin/admin-learner-ui';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

type SubmissionRow = {
  id: string;
  enrollment_id: string;
  student_id: string;
  student_name: string;
  student_email: string;
  course_title: string;
  course_slug: string;
  status: string;
  cec_hours: number | null;
  iicrc_discipline: string | null;
  iicrc_member_number: string | null;
  recipient_email: string;
  sent_at: string | null;
  failure_reason: string | null;
  provider_message_id: string | null;
  created_at: string;
};

function statusClass(status: string): string {
  switch (status) {
    case 'sent':
      return 'border-emerald-500/35 bg-emerald-500/10 text-emerald-200';
    case 'failed':
      return 'border-red-500/35 bg-red-500/10 text-red-200';
    case 'pending':
      return 'border-amber-500/35 bg-amber-500/10 text-amber-200';
    default:
      return 'border-white/15 bg-white/5 text-white/55';
  }
}

export function AdminIicrcCecSubmissionsClient() {
  const [rows, setRows] = useState<SubmissionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retryingId, setRetryingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    const res = await fetch('/api/admin/iicrc-cec-submissions', { credentials: 'include' });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(typeof data.detail === 'string' ? data.detail : 'Failed to load submissions');
      return;
    }
    setRows(Array.isArray(data.submissions) ? data.submissions : []);
  }, []);

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

  async function retry(submissionId: string) {
    setRetryingId(submissionId);
    try {
      const res = await fetch('/api/admin/iicrc-cec-submissions', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ submissionId }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(typeof data.detail === 'string' ? data.detail : 'Retry failed');
        return;
      }
      await load();
    } finally {
      setRetryingId(null);
    }
  }

  return (
    <div className="px-6 py-8">
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
            <h1 className="text-2xl font-bold tracking-tight text-white">IICRC CEC submissions</h1>
            <p className="mt-1 max-w-2xl text-sm text-white/45">
              Automatic Certificate of Completion emails sent to IICRC Renewals when technicians
              finish CEC-eligible courses. Each row is the mail receipt logged by CARSI.
            </p>
          </div>
        </div>
        <Button
          type="button"
          variant="outline"
          className="border-white/15 text-white/80"
          onClick={() => void load()}
          disabled={loading}
        >
          <RefreshCw className={cn('mr-2 h-4 w-4', loading && 'animate-spin')} />
          Refresh
        </Button>
      </div>

      {error ? (
        <p className="mb-4 rounded-md border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-200">
          {error}
        </p>
      ) : null}

      {loading ? (
        <div className="flex items-center gap-2 text-sm text-white/50">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading submissions…
        </div>
      ) : rows.length === 0 ? (
        <p className={cn(adminGlassCard, 'px-5 py-8 text-sm text-white/45')}>
          No CEC submissions yet. They appear when a learner completes a course with CEC hours or an
          IICRC discipline.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-white/[0.07]">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-white/[0.03] text-xs uppercase tracking-wide text-white/40">
              <tr>
                <th className="px-4 py-3 font-medium">Technician</th>
                <th className="px-4 py-3 font-medium">Course</th>
                <th className="px-4 py-3 font-medium">CEC</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Sent</th>
                <th className="px-4 py-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.06]">
              {rows.map((row) => (
                <tr key={row.id} className="bg-white/[0.015] hover:bg-white/[0.03]">
                  <td className="px-4 py-3 align-top">
                    <p className="font-medium text-white/90">{row.student_name}</p>
                    <p className="text-xs text-white/40">{row.student_email}</p>
                    {row.iicrc_member_number ? (
                      <p className="mt-1 text-xs text-white/35">IICRC {row.iicrc_member_number}</p>
                    ) : null}
                  </td>
                  <td className="px-4 py-3 align-top text-white/75">{row.course_title}</td>
                  <td className="px-4 py-3 align-top text-white/60">
                    {row.cec_hours ?? '—'}
                    {row.iicrc_discipline ? (
                      <span className="block text-xs text-white/35">{row.iicrc_discipline}</span>
                    ) : null}
                  </td>
                  <td className="px-4 py-3 align-top">
                    <span
                      className={cn(
                        'inline-flex rounded-full border px-2.5 py-0.5 text-xs font-medium capitalize',
                        statusClass(row.status),
                      )}
                    >
                      {row.status}
                    </span>
                    {row.failure_reason ? (
                      <p className="mt-1 max-w-[220px] text-xs text-red-200/80">{row.failure_reason}</p>
                    ) : null}
                  </td>
                  <td className="px-4 py-3 align-top text-white/55">
                    {row.sent_at ? formatAdminDateTime(row.sent_at) : '—'}
                    {row.provider_message_id ? (
                      <p className="mt-1 font-mono text-[10px] text-white/30">
                        {row.provider_message_id}
                      </p>
                    ) : null}
                  </td>
                  <td className="px-4 py-3 align-top">
                    <div className="flex flex-col gap-2">
                      {row.status === 'failed' || row.status === 'pending' ? (
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          className="border-white/15 text-white/75"
                          disabled={retryingId === row.id}
                          onClick={() => void retry(row.id)}
                        >
                          {retryingId === row.id ? (
                            <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                          ) : null}
                          Retry
                        </Button>
                      ) : null}
                      <Link
                        href={`/admin/users/${row.student_id}`}
                        className="text-xs text-[#7ec5ff] hover:underline"
                      >
                        View learner
                      </Link>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
