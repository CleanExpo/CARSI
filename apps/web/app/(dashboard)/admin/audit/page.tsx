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

const ACTION_COLOURS: Record<string, { bg: string; text: string }> = {
  'certificate.issued': { bg: 'rgba(0,255,136,0.12)', text: '#00FF88' },
  'user.login': { bg: 'rgba(36,144,237,0.12)', text: '#2490ed' },
  'enrollment.created': { bg: 'rgba(0,245,255,0.12)', text: '#00F5FF' },
};

function ActionBadge({ action }: { action: string }) {
  const style = ACTION_COLOURS[action] ?? {
    bg: 'rgba(255,255,255,0.06)',
    text: 'rgba(255,255,255,0.5)',
  };
  return (
    <span
      className="inline-block rounded-sm px-2 py-0.5 font-mono text-xs"
      style={{ background: style.bg, color: style.text }}
    >
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
    <div className="min-h-screen space-y-6 p-6" style={{ background: '#050505', color: '#ffffff' }}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-mono text-2xl font-bold tracking-tight">Audit Log</h1>
          <p className="mt-1 font-mono text-sm text-white/40">
            {data ? `${data.total} total events` : 'Platform compliance trail'}
          </p>
        </div>
        <Link
          href="/admin"
          className="rounded-sm px-3 py-2 font-mono text-xs"
          style={{
            background: '#060a14',
            border: '0.5px solid rgba(255,255,255,0.06)',
            color: '#2490ed',
          }}
        >
          ← Admin
        </Link>
      </div>

      {/* Filter */}
      <div className="flex items-center gap-3">
        <label className="font-mono text-xs tracking-wider text-white/40 uppercase">
          Filter by action
        </label>
        <select
          value={actionFilter}
          onChange={(e) => handleActionChange(e.target.value)}
          className="rounded-sm px-3 py-2 font-mono text-xs"
          style={{
            background: '#060a14',
            border: '0.5px solid rgba(255,255,255,0.12)',
            color: '#fff',
          }}
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
        <p className="animate-pulse font-mono text-sm text-white/30">Loading audit log…</p>
      )}
      {error && <p className="font-mono text-sm text-red-400">{error}</p>}

      {data && !loading && (
        <>
          {/* Table */}
          <div
            className="overflow-hidden rounded-sm"
            style={{ border: '0.5px solid rgba(255,255,255,0.06)' }}
          >
            <table className="w-full font-mono text-xs">
              <thead>
                <tr
                  style={{
                    background: '#060a14',
                    borderBottom: '0.5px solid rgba(255,255,255,0.06)',
                  }}
                >
                  {['Time', 'Actor', 'Action', 'Resource', 'IP'].map((h) => (
                    <th
                      key={h}
                      className="px-4 py-3 text-left tracking-widest text-white/30 uppercase"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.items.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-white/20">
                      No audit events found.
                    </td>
                  </tr>
                ) : (
                  data.items.map((entry) => (
                    <tr
                      key={entry.id}
                      style={{
                        borderBottom: '0.5px solid rgba(255,255,255,0.04)',
                        background: 'transparent',
                      }}
                    >
                      <td className="px-4 py-3 whitespace-nowrap text-white/40">
                        {new Date(entry.created_at).toLocaleString('en-AU', {
                          dateStyle: 'short',
                          timeStyle: 'medium',
                        })}
                      </td>
                      <td className="max-w-[160px] truncate px-4 py-3 text-white/60">
                        {entry.actor_email ?? '—'}
                      </td>
                      <td className="px-4 py-3">
                        <ActionBadge action={entry.action} />
                      </td>
                      <td className="px-4 py-3 text-white/40">
                        {entry.resource_type ? (
                          <span>
                            <span className="text-white/20">{entry.resource_type}</span>
                            {entry.resource_id && (
                              <span className="text-white/30">
                                {' '}
                                #{entry.resource_id.slice(0, 8)}
                              </span>
                            )}
                          </span>
                        ) : (
                          '—'
                        )}
                      </td>
                      <td className="px-4 py-3 text-white/30">{entry.ip_address ?? '—'}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between">
              <p className="font-mono text-xs text-white/30">
                Page {page + 1} of {totalPages} · {data.total} events
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => setPage((p) => Math.max(0, p - 1))}
                  disabled={page === 0}
                  className="rounded-sm px-3 py-2 font-mono text-xs disabled:opacity-30"
                  style={{
                    background: '#060a14',
                    border: '0.5px solid rgba(255,255,255,0.06)',
                    color: '#2490ed',
                  }}
                >
                  ← Previous
                </button>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                  disabled={page >= totalPages - 1}
                  className="rounded-sm px-3 py-2 font-mono text-xs disabled:opacity-30"
                  style={{
                    background: '#060a14',
                    border: '0.5px solid rgba(255,255,255,0.06)',
                    color: '#2490ed',
                  }}
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
