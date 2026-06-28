'use client';

import { useCallback, useEffect, useState } from 'react';

type CitySummary = {
  slug: string;
  city: string;
  capacity: number;
  confirmed: number;
  remaining: number;
  waitlisted: number;
};

type RegistryRow = {
  registrationId: string;
  eventSlug: string;
  status: 'confirmed' | 'waitlisted';
  freeEntryToken: string;
  companyName: string | null;
  contactEmail: string;
  contactPhone: string | null;
  ccwCustomerStatus: string | null;
  seatCount: number;
  calendarSynced: boolean;
  createdAt: string;
  attendees: { fullName: string; yearsExperience: string; goals: string }[];
};

export function AdminCcwRoadshowClient() {
  const [cities, setCities] = useState<CitySummary[]>([]);
  const [rows, setRows] = useState<RegistryRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/ccw-roadshow');
      if (!res.ok) throw new Error('Failed to load registry');
      const data = (await res.json()) as { cities: CitySummary[]; rows: RegistryRow[] };
      setCities(data.cities);
      setRows(data.rows);
      setError('');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load registry');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function promote(row: RegistryRow) {
    const res = await fetch('/api/admin/ccw-roadshow/promote', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ registrationId: row.registrationId, eventSlug: row.eventSlug }),
    });
    if (!res.ok) {
      const payload = (await res.json().catch(() => ({}))) as { detail?: string };
      setError(payload.detail || 'Failed to promote');
      return;
    }
    await load();
  }

  async function remove(row: RegistryRow) {
    if (!window.confirm(`Delete this registration (${row.contactEmail})? This frees its seats.`)) {
      return;
    }
    const res = await fetch('/api/admin/ccw-roadshow', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ registrationId: row.registrationId }),
    });
    if (!res.ok) {
      const payload = (await res.json().catch(() => ({}))) as { detail?: string };
      setError(payload.detail || 'Failed to delete');
      return;
    }
    await load();
  }

  async function retryCalendarSync(row: RegistryRow) {
    const res = await fetch('/api/admin/ccw-roadshow/sync-calendar', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ registrationId: row.registrationId }),
    });
    if (!res.ok) {
      const payload = (await res.json().catch(() => ({}))) as { detail?: string };
      setError(payload.detail || 'Failed to sync calendar');
      return;
    }
    await load();
  }

  if (loading) return <div className="p-6">Loading registry…</div>;

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">CCW Roadshow Registry</h1>
        <a
          href="/api/admin/ccw-roadshow?format=csv"
          className="rounded-lg border px-3 py-2 text-sm font-medium"
        >
          Export CSV
        </a>
      </div>

      {error && <p className="rounded-lg bg-red-100 px-3 py-2 text-sm text-red-800">{error}</p>}

      <div className="grid gap-3 sm:grid-cols-2">
        {cities.map((c) => (
          <div key={c.slug} className="rounded-xl border p-4">
            <h2 className="text-lg font-semibold">{c.city}</h2>
            <p className="text-sm text-gray-600">
              {c.confirmed} / {c.capacity} confirmed · {c.remaining} left · {c.waitlisted} waitlisted
            </p>
          </div>
        ))}
      </div>

      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-b text-left">
              <th className="p-2">Event</th>
              <th className="p-2">Status</th>
              <th className="p-2">Company</th>
              <th className="p-2">Contact</th>
              <th className="p-2">Calendar</th>
              <th className="p-2">Attendees</th>
              <th className="p-2">Token</th>
              <th className="p-2">Action</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.registrationId} className="border-b align-top">
                <td className="p-2">{row.eventSlug}</td>
                <td className="p-2">{row.status}</td>
                <td className="p-2">{row.companyName ?? '—'}</td>
                <td className="p-2">
                  {row.contactEmail}
                  <br />
                  {row.contactPhone ?? '—'}
                </td>
                <td className="p-2">
                  {row.calendarSynced ? (
                    <span className="rounded-full bg-green-100 px-2 py-1 text-xs font-medium text-green-800">
                      Synced
                    </span>
                  ) : row.status === 'confirmed' ? (
                    <button
                      type="button"
                      onClick={() => retryCalendarSync(row)}
                      className="rounded-full border border-amber-300 bg-amber-50 px-2 py-1 text-xs font-medium text-amber-800"
                    >
                      Not synced · retry
                    </button>
                  ) : (
                    <span className="rounded-full bg-gray-100 px-2 py-1 text-xs font-medium text-gray-600">
                      Pending
                    </span>
                  )}
                </td>
                <td className="p-2">
                  <ul className="space-y-1">
                    {row.attendees.map((a, i) => (
                      <li key={i}>
                        <span className="font-medium">{a.fullName}</span> · {a.yearsExperience}
                        <br />
                        <span className="text-gray-600">{a.goals}</span>
                      </li>
                    ))}
                  </ul>
                </td>
                <td className="p-2 font-mono text-xs">{row.freeEntryToken}</td>
                <td className="p-2">
                  <div className="flex gap-2">
                    {row.status === 'waitlisted' && (
                      <button
                        type="button"
                        onClick={() => promote(row)}
                        className="rounded-lg border px-2 py-1 text-xs font-medium"
                      >
                        Promote
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => remove(row)}
                      className="rounded-lg border border-red-300 px-2 py-1 text-xs font-medium text-red-700"
                    >
                      Delete
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
