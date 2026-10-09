'use client';

import { useCallback, useEffect, useState } from 'react';

type SessionSummary = {
  slug: string;
  monthLabel: string;
  capacity: number;
  confirmed: number;
  remaining: number;
  waitlisted: number;
};

type RegistryRow = {
  registrationId: string;
  sessionSlug: string;
  status: 'confirmed' | 'waitlisted';
  companyName: string | null;
  contactEmail: string;
  contactPhone: string | null;
  seatCount: number;
  packageId: string;
  amountTotalCents: number | null;
  stripeSessionId: string | null;
  createdAt: string;
  attendees: { fullName: string }[];
};

const surface =
  'rounded-2xl border border-white/10 bg-white/[0.04] shadow-[0_1px_0_rgba(255,255,255,0.04)_inset]';

export function AdminBusinessCoachingClient() {
  const [sessions, setSessions] = useState<SessionSummary[]>([]);
  const [rows, setRows] = useState<RegistryRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/business-coaching');
      if (!res.ok) throw new Error('Failed to load');
      const data = (await res.json()) as { sessions: SessionSummary[]; rows: RegistryRow[] };
      setSessions(data.sessions);
      setRows(data.rows);
      setError('');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div className="px-5 py-8 sm:px-8">
      <header className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-white">Owner Circle</h1>
          <p className="mt-1 text-sm text-white/55">
            Monthly $22/seat business coaching registrations (Stripe).
          </p>
        </div>
        <a
          href="/api/admin/business-coaching?format=csv"
          className="rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-sm text-white/85 hover:bg-white/10"
        >
          Export CSV
        </a>
      </header>

      {error ? <p className="mb-4 text-sm text-amber-300">{error}</p> : null}
      {loading ? <p className="text-sm text-white/45">Loading…</p> : null}

      <div className="mb-8 grid gap-3 sm:grid-cols-3">
        {sessions.map((s) => (
          <div key={s.slug} className={`p-4 ${surface}`}>
            <p className="text-sm font-semibold text-white">{s.monthLabel}</p>
            <p className="mt-2 text-xs text-white/50">
              {s.confirmed} / {s.capacity} confirmed · {s.remaining} left · {s.waitlisted} waitlisted
            </p>
          </div>
        ))}
      </div>

      <div className={`overflow-x-auto ${surface}`}>
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead className="border-b border-white/10 text-xs text-white/45">
            <tr>
              <th className="px-4 py-3">When</th>
              <th className="px-4 py-3">Session</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Contact</th>
              <th className="px-4 py-3">Seats</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.registrationId} className="border-b border-white/6 text-white/85">
                <td className="px-4 py-3 text-xs text-white/50">
                  {new Date(r.createdAt).toLocaleString('en-AU')}
                </td>
                <td className="px-4 py-3">{r.sessionSlug}</td>
                <td className="px-4 py-3">{r.status}</td>
                <td className="px-4 py-3">
                  <div>{r.contactEmail}</div>
                  {r.companyName ? (
                    <div className="text-xs text-white/45">{r.companyName}</div>
                  ) : null}
                </td>
                <td className="px-4 py-3">
                  {r.seatCount} · {r.packageId}
                  <div className="text-xs text-white/45">
                    {r.attendees.map((a) => a.fullName).join(', ')}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!loading && rows.length === 0 ? (
          <p className="px-4 py-8 text-center text-sm text-white/40">No bookings yet.</p>
        ) : null}
      </div>
    </div>
  );
}
