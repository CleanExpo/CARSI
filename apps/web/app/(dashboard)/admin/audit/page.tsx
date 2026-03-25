'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { apiClient } from '@/lib/api/client';

interface AuditLogEntry {
  id: string;
  actor_email: string | null;
  action: string;
  resource_type: string | null;
  resource_id: string | null;
  details: Record<string, unknown> | null;
  ip_address: string | null;
  created_at: string;
}

interface AuditLogPage {
  items: AuditLogEntry[];
  total: number;
}

const ACTION_COLOURS: Record<string, { className: string }> = {
  'certificate.issued': { className: 'bg-green-500/10 text-green-500' },
  'user.login': { className: 'bg-blue-500/10 text-blue-500' },
  'enrollment.created': { className: 'bg-primary/10 text-primary' },
};

function ActionBadge({ action }: { action: string }) {
  const style = ACTION_COLOURS[action];
  if (style) {
    return (
      <span className={`inline-block rounded-lg px-2 py-0.5 text-xs ${style.className}`}>
        {action}
      </span>
    );
  }
  return (
    <span className="inline-block rounded-lg bg-muted px-2 py-0.5 text-xs text-muted-foreground">
      {action}
    </span>
  );
}

const ACTION_OPTIONS = ['', 'certificate.issued', 'user.login', 'enrollment.created'];

const PAGE_SIZE = 50;

export default function AuditLogPage() {
  const [data, setData] = useState<AuditLogPage | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionFilter, setActionFilter] = useState('');
  const [page, setPage] = useState(0);

  const load = useCallback((currentPage: number, action: string) => {
    setLoading(true);
    setError(null);
    const params = new URLSearchParams({
      limit: String(PAGE_SIZE),
      offset: String(currentPage * PAGE_SIZE),
    });
    if (action) params.set('action', action);

    apiClient
      .get<AuditLogPage>(`/api/lms/admin/audit-log?${params.toString()}`)
      .then((d) => setData(d))
      .catch(() => setError('Failed to load audit log.'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load(page, actionFilter);
  }, [load, page, actionFilter]);

  const totalPages = data ? Math.ceil(data.total / PAGE_SIZE) : 0;

  function handleActionChange(value: string) {
    setActionFilter(value);
    setPage(0);
  }

  return (
    <div className="min-h-screen space-y-6 bg-background p-6 text-foreground">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Audit Log</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {data ? `${data.total} total events` : 'Platform compliance trail'}
          </p>
        </div>
        <Link
          href="/admin"
          className="rounded-lg border border-border bg-background px-3 py-2 text-xs text-primary"
        >
          ← Admin
        </Link>
      </div>

      {/* Filter */}
      <div className="flex items-center gap-3">
        <label className="text-xs tracking-wider text-muted-foreground uppercase">
          Filter by action
        </label>
        <select
          value={actionFilter}
          onChange={(e) => handleActionChange(e.target.value)}
          className="rounded-lg border border-border bg-background px-3 py-2 text-xs text-foreground"
        >
          <option value="">All actions</option>
          {ACTION_OPTIONS.filter(Boolean).map((a) => (
            <option key={a} value={a}>
              {a}
            </option>
          ))}
        </select>
      </div>

      {loading && (
        <p className="animate-pulse text-sm text-muted-foreground/50">Loading audit log…</p>
      )}
      {error && <p className="text-sm text-red-400">{error}</p>}

      {data && !loading && (
        <>
          {/* Table */}
          <div className="overflow-hidden rounded-lg border border-border">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-border bg-background">
                  {['Time', 'Actor', 'Action', 'Resource', 'IP'].map((h) => (
                    <th
                      key={h}
                      className="px-4 py-3 text-left tracking-widest text-muted-foreground/50 uppercase"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.items.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground/50">
                      No audit events found.
                    </td>
                  </tr>
                ) : (
                  data.items.map((entry) => (
                    <tr
                      key={entry.id}
                      className="border-b border-border/40"
                    >
                      <td className="px-4 py-3 whitespace-nowrap text-muted-foreground">
                        {new Date(entry.created_at).toLocaleString('en-AU', {
                          dateStyle: 'short',
                          timeStyle: 'medium',
                        })}
                      </td>
                      <td className="max-w-[160px] truncate px-4 py-3 text-muted-foreground">
                        {entry.actor_email ?? '—'}
                      </td>
                      <td className="px-4 py-3">
                        <ActionBadge action={entry.action} />
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {entry.resource_type ? (
                          <span>
                            <span className="text-muted-foreground/50">{entry.resource_type}</span>
                            {entry.resource_id && (
                              <span className="text-muted-foreground/50">
                                {' '}
                                #{entry.resource_id.slice(0, 8)}
                              </span>
                            )}
                          </span>
                        ) : (
                          '—'
                        )}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground/50">{entry.ip_address ?? '—'}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between">
              <p className="text-xs text-muted-foreground/50">
                Page {page + 1} of {totalPages} · {data.total} events
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => setPage((p) => Math.max(0, p - 1))}
                  disabled={page === 0}
                  className="rounded-lg border border-border bg-background px-3 py-2 text-xs text-primary disabled:opacity-30"
                >
                  ← Previous
                </button>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                  disabled={page >= totalPages - 1}
                  className="rounded-lg border border-border bg-background px-3 py-2 text-xs text-primary disabled:opacity-30"
                >
                  Next →
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
