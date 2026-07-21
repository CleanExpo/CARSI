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

type EmailStatus = {
  lastKind: string | null;
  lastStatus: string | null;
  lastAttemptAt: string | null;
  failureReason: string | null;
  everSent: boolean;
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
  /** null = no send ever attempted (or predates email logging). */
  email: EmailStatus | null;
};

/** Renders the email delivery state so a silent failure is visible at a glance. */
function EmailCell({ email }: { email: EmailStatus | null }) {
  if (!email) {
    return (
      <span
        className="text-amber-300"
        title="No email send has ever been recorded for this registration."
      >
        ⚠ never sent
      </span>
    );
  }
  if (email.lastStatus === 'failed') {
    return (
      <span className="text-red-400" title={email.failureReason ?? 'Send failed'}>
        ✗ failed{email.failureReason ? ` (${email.failureReason})` : ''}
      </span>
    );
  }
  if (email.lastStatus === 'skipped') {
    return (
      <span className="text-white/50" title="Dev console — not sent to the provider">
        – skipped
      </span>
    );
  }
  return (
    <span className="text-emerald-400" title={email.lastAttemptAt ?? undefined}>
      ✓ {email.lastKind ?? 'sent'}
    </span>
  );
}

const surface =
  'rounded-2xl border border-white/10 bg-white/[0.04] shadow-[0_1px_0_rgba(255,255,255,0.04)_inset]';
const mutedText = 'text-white/70';
const strongText = 'text-white';

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
    // eslint-disable-next-line react-hooks/set-state-in-effect -- pre-existing RA-4192 rule promotion; behaviour-preserving suppression, real fix tracked separately
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
    // A 200 means the seat was granted — it does NOT mean the attendee was told.
    // The email can fail independently, which used to be invisible here.
    const payload = (await res.json().catch(() => ({}))) as {
      emailSent?: boolean;
      emailReason?: string;
    };
    if (payload.emailSent === false) {
      setError(
        `Promoted ${row.contactEmail} — but the confirmation email did NOT send` +
          `${payload.emailReason ? ` (${payload.emailReason})` : ''}. Contact them manually.`
      );
    } else {
      setError('');
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

  if (loading) return <div className="p-6 text-white">Loading registry…</div>;

  return (
    <div className="space-y-6 p-6 text-white">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-[11px] font-semibold tracking-[0.2em] text-white/55 uppercase">
            Admin registry
          </p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-white">
            CCW Roadshow Registry
          </h1>
        </div>
        <div className="flex flex-wrap gap-2">
          <a
            href="/admin/ccw-roadshow/sign-ins"
            className="rounded-lg border border-cyan-300/35 bg-cyan-300/10 px-3 py-2 text-sm font-semibold text-cyan-50 transition hover:bg-cyan-300/15"
          >
            Electronic check-in
          </a>
          <a
            href="/api/admin/ccw-roadshow?format=csv"
            className="rounded-lg border border-white/15 bg-white/10 px-3 py-2 text-sm font-semibold text-white transition hover:bg-white/15"
          >
            Export CSV
          </a>
        </div>
      </div>

      {error && (
        <p className="rounded-lg border border-red-400/30 bg-red-400/10 px-3 py-2 text-sm text-red-100">
          {error}
        </p>
      )}

      <div className="grid gap-3 sm:grid-cols-2">
        {cities.map((c) => (
          <div key={c.slug} className={`${surface} p-4`}>
            <h2 className="text-lg font-semibold text-white">{c.city}</h2>
            <p className="text-sm text-white/70">
              {c.confirmed} / {c.capacity} confirmed · {c.remaining} left · {c.waitlisted}{' '}
              waitlisted
            </p>
          </div>
        ))}
      </div>

      <div className="overflow-x-auto rounded-2xl border border-white/10 bg-[#09111f]/95 shadow-[0_18px_48px_-32px_rgba(0,0,0,0.8)]">
        <table className="w-full min-w-[1040px] border-collapse text-sm text-white">
          <thead className="bg-white/[0.06] text-white/85">
            <tr className="border-b border-white/10 text-left">
              <th className="p-3 font-semibold">Event</th>
              <th className="p-3 font-semibold">Status</th>
              <th className="p-3 font-semibold">Company</th>
              <th className="p-3 font-semibold">Contact</th>
              <th className="p-3 font-semibold">Calendar</th>
              <th className="p-3 font-semibold">Email</th>
              <th className="p-3 font-semibold">Attendees</th>
              <th className="p-3 font-semibold">Token</th>
              <th className="p-3 font-semibold">Action</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr
                key={row.registrationId}
                className="border-b border-white/8 align-top last:border-0 odd:bg-white/[0.025] hover:bg-white/[0.055]"
              >
                <td className={`p-3 font-medium ${strongText}`}>{row.eventSlug}</td>
                <td className="p-3">
                  <span
                    className={`rounded-full border px-2 py-1 text-xs font-semibold ${row.status === 'confirmed' ? 'border-emerald-400/30 bg-emerald-400/10 text-emerald-100' : 'border-amber-400/30 bg-amber-400/10 text-amber-100'}`}
                  >
                    {row.status}
                  </span>
                </td>
                <td className={`p-3 ${strongText}`}>{row.companyName ?? '—'}</td>
                <td className={`p-3 ${mutedText}`}>
                  <span className="text-white">{row.contactEmail}</span>
                  <br />
                  {row.contactPhone ?? '—'}
                </td>
                <td className="p-3">
                  {row.calendarSynced ? (
                    <span className="rounded-full border border-green-400/30 bg-green-400/10 px-2 py-1 text-xs font-semibold text-green-100">
                      Synced
                    </span>
                  ) : row.status === 'confirmed' ? (
                    <button
                      type="button"
                      onClick={() => retryCalendarSync(row)}
                      className="rounded-full border border-amber-300/40 bg-amber-300/10 px-2 py-1 text-xs font-semibold text-amber-100 transition hover:bg-amber-300/15"
                    >
                      Not synced · retry
                    </button>
                  ) : (
                    <span className="rounded-full border border-white/10 bg-white/5 px-2 py-1 text-xs font-semibold text-white/65">
                      Pending
                    </span>
                  )}
                </td>
                <td className="p-3 text-xs font-semibold whitespace-nowrap">
                  <EmailCell email={row.email} />
                </td>
                <td className="p-3">
                  <ul className="space-y-2">
                    {row.attendees.map((a, i) => (
                      <li key={i}>
                        <span className="font-semibold text-white">{a.fullName}</span>{' '}
                        <span className="text-white/65">· {a.yearsExperience}</span>
                        <br />
                        <span className="text-white/70">{a.goals}</span>
                      </li>
                    ))}
                  </ul>
                </td>
                <td className="max-w-[220px] p-3 font-mono text-xs break-all text-white/75">
                  {row.freeEntryToken}
                </td>
                <td className="p-3">
                  <div className="flex gap-2">
                    {row.status === 'waitlisted' && (
                      <button
                        type="button"
                        onClick={() => promote(row)}
                        className="rounded-lg border border-white/15 bg-white/10 px-2 py-1 text-xs font-semibold text-white transition hover:bg-white/15"
                      >
                        Promote
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => remove(row)}
                      className="rounded-lg border border-red-300/40 bg-red-400/10 px-2 py-1 text-xs font-semibold text-red-100 transition hover:bg-red-400/15"
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
