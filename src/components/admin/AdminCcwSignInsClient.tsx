'use client';

import { useCallback, useEffect, useState } from 'react';

import { ccwRoadshowEvents } from '@/lib/marketing/ccw-roadshow';

type RosterRow = {
  signInId: string;
  eventSlug: string;
  fullName: string;
  businessName: string | null;
  email: string;
  iicrcRegNumber: string | null;
  registrationId: string | null;
  isWalkIn: boolean;
  provisionStatus: string;
  day1CheckedInAt: string | null;
  day2CheckedInAt: string | null;
  checkInCount: number;
  reversalCount: number;
  courseAccessGranted: boolean;
  cecEligible: boolean;
};

type Roster = {
  eventSlug: string;
  courseSlug: string;
  courseCecHours: number | null;
  rows: RosterRow[];
};

const surface = 'rounded-2xl border border-white/10 bg-white/[0.04]';

export function AdminCcwSignInsClient() {
  const [eventSlug, setEventSlug] = useState(ccwRoadshowEvents[0]?.slug ?? '');
  const [roster, setRoster] = useState<Roster | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Paper-digitisation form.
  const [paper, setPaper] = useState({ fullName: '', email: '', businessName: '', iicrcRegNumber: '', dayIndex: 1 });

  const load = useCallback(async () => {
    if (!eventSlug) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/ccw-roadshow/sign-ins?eventSlug=${encodeURIComponent(eventSlug)}`);
      if (!res.ok) throw new Error('Failed to load sign-ins');
      const data = (await res.json()) as { roster: Roster };
      setRoster(data.roster);
      setError('');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load sign-ins');
    } finally {
      setLoading(false);
    }
  }, [eventSlug]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- load is guarded and only sets state on completion
    void load();
  }, [load]);

  async function post(payload: Record<string, unknown>) {
    const res = await fetch('/api/admin/ccw-roadshow/sign-ins', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const p = (await res.json().catch(() => ({}))) as { detail?: string };
      setError(p.detail || 'Action failed');
      return false;
    }
    setError('');
    await load();
    return true;
  }

  async function correct(row: RosterRow, dayIndex: 1 | 2) {
    const reason = window.prompt(`Reverse Day ${dayIndex} check-in for ${row.fullName}? Enter a reason (recorded in the audit ledger):`);
    if (!reason) return;
    await post({ action: 'correct', signInId: row.signInId, dayIndex, reason });
  }

  async function merge(row: RosterRow) {
    const duplicateId = window.prompt(`Merge a duplicate INTO ${row.fullName}. Paste the duplicate sign-in id:`);
    if (!duplicateId) return;
    await post({ action: 'merge', primaryId: row.signInId, duplicateId: duplicateId.trim() });
  }

  async function submitPaper() {
    const ok = await post({
      action: 'digitise_paper',
      eventSlug,
      dayIndex: paper.dayIndex,
      fullName: paper.fullName,
      email: paper.email,
      businessName: paper.businessName || undefined,
      iicrcRegNumber: paper.iicrcRegNumber || undefined,
    });
    if (ok) setPaper({ fullName: '', email: '', businessName: '', iicrcRegNumber: '', dayIndex: 1 });
  }

  return (
    <div className="space-y-6 p-6 text-white">
      <div>
        <p className="text-[11px] font-semibold tracking-[0.2em] text-white/55 uppercase">Attendance foundation</p>
        <h1 className="mt-1 text-2xl font-bold tracking-tight">CCW Roadshow Sign-ins</h1>
        <p className="mt-1 text-sm text-white/60">
          Day-state is derived live from the append-only ledger. Corrections append a reversal row — history is never deleted.
        </p>
      </div>

      <div className="flex items-center gap-3">
        <label className="text-sm text-white/70">Event</label>
        <select
          value={eventSlug}
          onChange={(e) => setEventSlug(e.target.value)}
          className="rounded-lg border border-white/15 bg-white/10 px-3 py-2 text-sm"
        >
          {ccwRoadshowEvents.map((ev) => (
            <option key={ev.slug} value={ev.slug} className="bg-[#09111f]">
              {ev.city}
            </option>
          ))}
        </select>
        {roster && (
          <span className="text-sm text-white/60">
            CEC hours: {roster.courseCecHours ?? '—'} · {roster.rows.length} sign-ins
          </span>
        )}
      </div>

      {error && <p className="rounded-lg border border-red-400/30 bg-red-400/10 px-3 py-2 text-sm text-red-100">{error}</p>}
      {loading && <p className="text-sm text-white/60">Loading…</p>}

      {roster && (
        <div className="overflow-x-auto rounded-2xl border border-white/10 bg-[#09111f]/95">
          <table className="w-full min-w-[980px] border-collapse text-sm">
            <thead className="bg-white/[0.06] text-white/85">
              <tr className="border-b border-white/10 text-left">
                <th className="p-3 font-semibold">Name</th>
                <th className="p-3 font-semibold">Business</th>
                <th className="p-3 font-semibold">IICRC#</th>
                <th className="p-3 font-semibold">Day 1</th>
                <th className="p-3 font-semibold">Day 2</th>
                <th className="p-3 font-semibold">Type</th>
                <th className="p-3 font-semibold">Provision</th>
                <th className="p-3 font-semibold">CEC</th>
                <th className="p-3 font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody>
              {roster.rows.map((row) => (
                <tr key={row.signInId} className="border-b border-white/8 align-top last:border-0">
                  <td className="p-3">
                    <span className="font-semibold">{row.fullName}</span>
                    <br />
                    <span className="text-white/55">{row.email}</span>
                  </td>
                  <td className="p-3 text-white/75">{row.businessName ?? '—'}</td>
                  <td className="p-3 font-mono text-xs text-white/75">{row.iicrcRegNumber ?? '—'}</td>
                  <td className="p-3">{row.day1CheckedInAt ? '✓' : '—'}</td>
                  <td className="p-3">{row.day2CheckedInAt ? '✓' : '—'}</td>
                  <td className="p-3">{row.isWalkIn ? 'Walk-in' : 'Registered'}</td>
                  <td className="p-3 text-white/70">{row.provisionStatus}</td>
                  <td className="p-3">{row.cecEligible ? 'Eligible' : '—'}</td>
                  <td className="p-3">
                    <div className="flex flex-wrap gap-2">
                      {row.day1CheckedInAt && (
                        <button type="button" onClick={() => correct(row, 1)} className="rounded border border-amber-300/40 bg-amber-300/10 px-2 py-1 text-xs text-amber-100">
                          Reverse D1
                        </button>
                      )}
                      {row.day2CheckedInAt && (
                        <button type="button" onClick={() => correct(row, 2)} className="rounded border border-amber-300/40 bg-amber-300/10 px-2 py-1 text-xs text-amber-100">
                          Reverse D2
                        </button>
                      )}
                      <button type="button" onClick={() => merge(row)} className="rounded border border-white/15 bg-white/10 px-2 py-1 text-xs">
                        Merge dupe
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className={`${surface} p-4`}>
        <h2 className="text-lg font-semibold">Digitise a paper sign-in</h2>
        <p className="mt-1 text-sm text-white/60">Records an offline/paper entry against this event (source: paper).</p>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <input
            placeholder="Full name"
            value={paper.fullName}
            onChange={(e) => setPaper((p) => ({ ...p, fullName: e.target.value }))}
            className="rounded-lg border border-white/15 bg-white/10 px-3 py-2 text-sm"
          />
          <input
            placeholder="Email"
            value={paper.email}
            onChange={(e) => setPaper((p) => ({ ...p, email: e.target.value }))}
            className="rounded-lg border border-white/15 bg-white/10 px-3 py-2 text-sm"
          />
          <input
            placeholder="Business (optional)"
            value={paper.businessName}
            onChange={(e) => setPaper((p) => ({ ...p, businessName: e.target.value }))}
            className="rounded-lg border border-white/15 bg-white/10 px-3 py-2 text-sm"
          />
          <input
            placeholder="IICRC# (optional)"
            value={paper.iicrcRegNumber}
            onChange={(e) => setPaper((p) => ({ ...p, iicrcRegNumber: e.target.value }))}
            className="rounded-lg border border-white/15 bg-white/10 px-3 py-2 text-sm"
          />
          <select
            value={paper.dayIndex}
            onChange={(e) => setPaper((p) => ({ ...p, dayIndex: Number(e.target.value) }))}
            className="rounded-lg border border-white/15 bg-white/10 px-3 py-2 text-sm"
          >
            <option value={1} className="bg-[#09111f]">Day 1</option>
            <option value={2} className="bg-[#09111f]">Day 2</option>
          </select>
          <button type="button" onClick={submitPaper} className="rounded-lg border border-white/15 bg-white/15 px-3 py-2 text-sm font-semibold">
            Record paper sign-in
          </button>
        </div>
      </div>
    </div>
  );
}
