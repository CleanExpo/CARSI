'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';

import { useAuth } from '@/components/auth/auth-provider';
import { ErrorBanner } from '@/components/lms/ErrorBanner';
import { apiClient, ApiClientError } from '@/lib/api/client';
import type { TeamTrainingRecords } from '@/lib/server/team-records';

function pctClass(pct: number): string {
  if (pct >= 100) return 'text-emerald-700 bg-emerald-50 border-emerald-200';
  if (pct >= 50) return 'text-amber-700 bg-amber-50 border-amber-200';
  return 'text-slate-600 bg-slate-50 border-slate-200';
}

function fmtDate(iso: string | null): string {
  if (!iso) return '—';
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? '—' : d.toLocaleDateString('en-AU');
}

export default function TeamRecordsPage() {
  const { user } = useAuth();
  const [records, setRecords] = useState<TeamTrainingRecords | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [downloading, setDownloading] = useState(false);

  const downloadCsv = useCallback(async () => {
    setDownloading(true);
    setError(null);
    try {
      const res = await fetch('/api/lms/teams/records?format=csv', { credentials: 'include' });
      if (!res.ok) throw new Error('Download failed');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${records?.teamName?.replace(/[^a-z0-9]+/gi, '-') ?? 'team'}-training-records.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch {
      setError('Could not download the CSV. Please try again.');
    } finally {
      setDownloading(false);
    }
  }, [records]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    setNotice(null);
    try {
      const data = await apiClient.get<{ records: TeamTrainingRecords | null }>(
        '/api/lms/teams/records'
      );
      setRecords(data.records ?? null);
    } catch (err) {
      if (err instanceof ApiClientError && err.status === 404) {
        setNotice('You do not have a team yet. Purchase a team bundle or create a team to track staff training.');
      } else if (err instanceof ApiClientError && err.status === 403) {
        setNotice('Only the team owner can view team training records.');
      } else {
        setError(err instanceof ApiClientError ? err.message : 'Failed to load training records');
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- pre-existing RA-4192 rule promotion; behaviour-preserving suppression, real fix tracked separately
    if (user) void load();
  }, [user, load]);

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <Link href="/dashboard/team" className="text-sm text-[#146fc2] hover:underline">
            ← Back to team
          </Link>
          <h1 className="mt-1 font-display text-2xl font-bold text-slate-900">
            Team training records
          </h1>
          <p className="text-sm text-slate-600">
            Your staff&rsquo;s course progress and completions — the record you can show insurers,
            auditors, and clients.
          </p>
        </div>
        {records && records.members.length > 0 ? (
          <button
            type="button"
            onClick={() => void downloadCsv()}
            disabled={downloading}
            className="rounded-md border border-[#146fc2]/30 bg-[#eef7ff] px-3 py-2 text-sm font-semibold text-[#146fc2] hover:bg-[#e0efff] disabled:opacity-60"
          >
            {downloading ? 'Preparing…' : 'Download CSV'}
          </button>
        ) : null}
      </div>

      {error ? <ErrorBanner message={error} /> : null}
      {notice ? (
        <div className="rounded-md border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
          {notice}
        </div>
      ) : null}

      {loading ? (
        <p className="text-sm text-slate-500">Loading training records…</p>
      ) : records && records.members.length > 0 ? (
        <div className="space-y-6">
          <p className="text-sm text-slate-600">
            <span className="font-semibold text-slate-900">{records.teamName}</span> ·{' '}
            {records.memberCount} member{records.memberCount === 1 ? '' : 's'}
          </p>
          {records.members.map((m) => (
            <div key={m.userId} className="rounded-lg border border-slate-200 bg-white p-4">
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <div>
                  <span className="font-semibold text-slate-900">{m.fullName ?? m.email}</span>
                  {m.role === 'owner' ? (
                    <span className="ml-2 rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-slate-600">
                      Owner
                    </span>
                  ) : null}
                  <span className="ml-2 text-xs text-slate-500">{m.email}</span>
                </div>
                <span className="text-xs text-slate-500">
                  {m.completedCourseCount}/{m.courseCount} complete · last active {fmtDate(m.lastActiveAt)}
                </span>
              </div>
              {m.courses.length === 0 ? (
                <p className="text-sm text-slate-500">No enrolments yet.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead>
                      <tr className="border-b border-slate-200 text-xs uppercase text-slate-500">
                        <th className="py-2 pr-3">Course</th>
                        <th className="py-2 pr-3">Status</th>
                        <th className="py-2 pr-3">Completion</th>
                        <th className="py-2 pr-3">Completed</th>
                        <th className="py-2">Certificate</th>
                      </tr>
                    </thead>
                    <tbody>
                      {m.courses.map((c) => (
                        <tr key={c.courseSlug} className="border-b border-slate-100 last:border-0">
                          <td className="py-2 pr-3 text-slate-800">{c.courseTitle}</td>
                          <td className="py-2 pr-3 capitalize text-slate-600">{c.status}</td>
                          <td className="py-2 pr-3">
                            <span
                              className={`rounded border px-1.5 py-0.5 text-xs font-semibold tabular-nums ${pctClass(c.completionPct)}`}
                            >
                              {c.completionPct}%
                            </span>
                          </td>
                          <td className="py-2 pr-3 text-slate-600">{fmtDate(c.completedAt)}</td>
                          <td className="py-2 text-slate-600">{c.certificateIssued ? 'Issued' : '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          ))}
        </div>
      ) : !notice && !error ? (
        <p className="text-sm text-slate-500">No members with training activity yet.</p>
      ) : null}
    </div>
  );
}
