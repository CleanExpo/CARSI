'use client';

import { useEffect, useState } from 'react';

interface CrmEventRow {
  id: string;
  event_type: string;
  status: string;
  response_status: number | null;
  created_at: string;
}

export function AdminCrmEvents() {
  const [items, setItems] = useState<CrmEventRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/admin/crm/events?limit=40', { credentials: 'include' })
      .then((r) => (r.ok ? r.json() : { items: [] }))
      .then((d) => setItems(d.items ?? []))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <p className="text-sm text-white/50">Loading CRM events…</p>;

  if (items.length === 0) {
    return (
      <p className="text-sm text-white/50">
        No CRM events yet. Set <code className="text-white/70">CRM_WEBHOOK_URL</code> to sync
        contact and enrollment activity.
      </p>
    );
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-white/10">
      <table className="min-w-full text-left text-sm">
        <thead className="border-b border-white/10 bg-white/[0.03] text-xs text-white/45 uppercase">
          <tr>
            <th className="px-4 py-3">Time</th>
            <th className="px-4 py-3">Event</th>
            <th className="px-4 py-3">Status</th>
            <th className="px-4 py-3">HTTP</th>
          </tr>
        </thead>
        <tbody>
          {items.map((row) => (
            <tr key={row.id} className="border-b border-white/6 text-white/75">
              <td className="px-4 py-2.5 text-xs text-white/45">
                {new Date(row.created_at).toLocaleString('en-AU')}
              </td>
              <td className="px-4 py-2.5 font-mono text-xs">{row.event_type}</td>
              <td className="px-4 py-2.5">
                <span
                  className={
                    row.status === 'delivered'
                      ? 'text-emerald-400'
                      : row.status === 'failed'
                        ? 'text-red-300'
                        : 'text-white/50'
                  }
                >
                  {row.status}
                </span>
              </td>
              <td className="px-4 py-2.5 tabular-nums">{row.response_status ?? '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
