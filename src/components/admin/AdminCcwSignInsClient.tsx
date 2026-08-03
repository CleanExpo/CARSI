'use client';

import { useCallback, useEffect, useState } from 'react';

import { ccwRoadshowEvents } from '@/lib/marketing/ccw-roadshow';

type RosterRow = {
  signInId: string;
  eventSlug: string;
  fullName: string;
  businessName: string | null;
  email: string;
  registrationId: string | null;
  isWalkIn: boolean;
  provisionStatus: string;
  day1CheckedInAt: string | null;
  day2CheckedInAt: string | null;
  emailOptIn: boolean;
  offerEmailSentAt: string | null;
  courseAccessGranted: boolean;
  attendanceComplete: boolean;
  offerEligible: boolean;
};

type Roster = {
  eventSlug: string;
  courseSlug: string;
  rows: RosterRow[];
};

const surface = 'rounded-2xl border border-white/10 bg-white/[0.04]';

export function AdminCcwSignInsClient() {
  const [eventSlug, setEventSlug] = useState(ccwRoadshowEvents[0]?.slug ?? '');
  const [roster, setRoster] = useState<Roster | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Paper-digitisation form.
  const [paper, setPaper] = useState({ fullName: '', email: '', businessName: '', dayIndex: 1 });

  const load = useCallback(async () => {
    if (!eventSlug) return;
    setLoading(true);
    try {
      const res = await fetch(
        `/api/admin/ccw-roadshow/sign-ins?eventSlug=${encodeURIComponent(eventSlug)}`
      );
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
    const reason = window.prompt(
      `Reverse Day ${dayIndex} check-in for ${row.fullName}? Enter a reason (recorded in the admin log):`
    );
    if (!reason) return;
    await post({ action: 'correct', signInId: row.signInId, dayIndex, reason });
  }

  async function merge(row: RosterRow) {
    const duplicateId = window.prompt(
      `Merge a duplicate INTO ${row.fullName}. Paste the duplicate sign-in id:`
    );
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
      emailOptIn: true,
    });
    if (ok) setPaper({ fullName: '', email: '', businessName: '', dayIndex: 1 });
  }

  async function runProvisionBatch() {
    if (!eventSlug) return;
    if (
      !window.confirm(
        `Run provision for ${eventSlug}? Creates CARSI accounts for Day-1 sign-ins, issues both-day certificates, and sends the post-event offer pack (Shopify + $295 membership) to eligible attendees.`
      )
    ) {
      return;
    }
    setLoading(true);
    try {
      const res = await fetch('/api/admin/ccw-roadshow/provision', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ eventSlug }),
      });
      const p = (await res.json().catch(() => ({}))) as {
        detail?: string;
        provision?: { provisioned?: number; failed?: number };
        attendance?: { certified?: number };
        offers?: { sent?: number; eligible?: number; skippedAlreadySent?: number };
      };
      if (!res.ok) {
        setError(p.detail || 'Provision batch failed');
        return;
      }
      setError('');
      window.alert(
        [
          `Provisioned: ${p.provision?.provisioned ?? 0} (failed ${p.provision?.failed ?? 0})`,
          `Certificates: ${p.attendance?.certified ?? 0}`,
          `Offer emails: ${p.offers?.sent ?? 0} sent / ${p.offers?.eligible ?? 0} eligible / ${p.offers?.skippedAlreadySent ?? 0} already sent`,
        ].join('\n')
      );
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Provision batch failed');
    } finally {
      setLoading(false);
    }
  }

  async function sendOfferPack() {
    if (!eventSlug) return;
    if (
      !window.confirm(
        `Send post-event offer emails for ${eventSlug}? Only both-days + opted-in + provisioned attendees who have not already been emailed.`
      )
    ) {
      return;
    }
    setLoading(true);
    try {
      const res = await fetch('/api/admin/ccw-roadshow/offer-pack', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ eventSlug }),
      });
      const p = (await res.json().catch(() => ({}))) as {
        detail?: string;
        sent?: number;
        eligible?: number;
        skippedAlreadySent?: number;
      };
      if (!res.ok) {
        setError(p.detail || 'Offer pack send failed');
        return;
      }
      setError('');
      window.alert(
        `Offer pack: ${p.sent ?? 0} sent / ${p.eligible ?? 0} eligible / ${p.skippedAlreadySent ?? 0} already sent.`
      );
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Offer pack send failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6 p-6 text-white">
      <div>
        <p className="text-[11px] font-semibold tracking-[0.2em] text-white/55 uppercase">
          Attendance foundation
        </p>
        <h1 className="mt-1 text-2xl font-bold tracking-tight">CCW Roadshow Sign-ins</h1>
        <p className="mt-1 text-sm text-white/60">
          Day marks are write-once. Both days = certificate of attendance. After Day 2, run{' '}
          <span className="text-white/80">Provision + offers</span> to create accounts, issue
          certificates, and email the Shopify training link + $295 membership special to opted-in
          attendees.
        </p>
      </div>

      <div className="flex items-center gap-3">
        <label htmlFor="ccw-event-select" className="text-sm text-white/70">
          Event
        </label>
        <select
          id="ccw-event-select"
          value={eventSlug}
          // Clear the roster immediately on event switch so a stale roster from the
          // previous event can never be acted on during the reload.
          onChange={(e) => {
            setRoster(null);
            setEventSlug(e.target.value);
          }}
          className="rounded-lg border border-white/15 bg-white/10 px-3 py-2 text-sm"
        >
          {ccwRoadshowEvents.map((ev) => (
            <option key={ev.slug} value={ev.slug} className="bg-[#09111f]">
              {ev.city}
            </option>
          ))}
        </select>
        {roster && <span className="text-sm text-white/60">{roster.rows.length} sign-ins</span>}
        <button
          type="button"
          onClick={() => void runProvisionBatch()}
          disabled={loading || !eventSlug}
          className="rounded-lg border border-[#2490ed]/50 bg-[#2490ed]/20 px-3 py-2 text-sm font-semibold text-[#9fd4ff] disabled:opacity-50"
        >
          Run provision + offers
        </button>
        <button
          type="button"
          onClick={() => void sendOfferPack()}
          disabled={loading || !eventSlug}
          className="rounded-lg border border-[#b8e62e]/40 bg-[#b8e62e]/15 px-3 py-2 text-sm font-semibold text-[#d4f07a] disabled:opacity-50"
        >
          Resend offer pack only
        </button>
      </div>

      {error && (
        <p className="rounded-lg border border-red-400/30 bg-red-400/10 px-3 py-2 text-sm text-red-100">
          {error}
        </p>
      )}
      {loading && <p className="text-sm text-white/60">Loading…</p>}

      {roster && (
        <div className="overflow-x-auto rounded-2xl border border-white/10 bg-[#09111f]/95">
          <table className="w-full min-w-[980px] border-collapse text-sm">
            <thead className="bg-white/[0.06] text-white/85">
              <tr className="border-b border-white/10 text-left">
                <th className="p-3 font-semibold">Name</th>
                <th className="p-3 font-semibold">Business</th>
                <th className="p-3 font-semibold">Day 1</th>
                <th className="p-3 font-semibold">Day 2</th>
                <th className="p-3 font-semibold">Type</th>
                <th className="p-3 font-semibold">Provision</th>
                <th className="p-3 font-semibold">Opt-in</th>
                <th className="p-3 font-semibold">Offer</th>
                <th className="p-3 font-semibold">Certificate</th>
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
                  <td className="p-3">{row.day1CheckedInAt ? '✓' : '—'}</td>
                  <td className="p-3">{row.day2CheckedInAt ? '✓' : '—'}</td>
                  <td className="p-3">{row.isWalkIn ? 'Walk-in' : 'Registered'}</td>
                  <td className="p-3 text-white/70">{row.provisionStatus}</td>
                  <td className="p-3">{row.emailOptIn ? 'Yes' : '—'}</td>
                  <td className="p-3">
                    {row.offerEmailSentAt ? 'Sent' : row.offerEligible ? 'Ready' : '—'}
                  </td>
                  <td className="p-3">{row.attendanceComplete ? 'Attended' : '—'}</td>
                  <td className="p-3">
                    <div className="flex flex-wrap gap-2">
                      {row.day1CheckedInAt && (
                        <button
                          type="button"
                          onClick={() => correct(row, 1)}
                          className="rounded border border-amber-300/40 bg-amber-300/10 px-2 py-1 text-xs text-amber-100"
                        >
                          Reverse D1
                        </button>
                      )}
                      {row.day2CheckedInAt && (
                        <button
                          type="button"
                          onClick={() => correct(row, 2)}
                          className="rounded border border-amber-300/40 bg-amber-300/10 px-2 py-1 text-xs text-amber-100"
                        >
                          Reverse D2
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => merge(row)}
                        className="rounded border border-white/15 bg-white/10 px-2 py-1 text-xs"
                      >
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
        <p className="mt-1 text-sm text-white/60">
          Records an offline/paper entry against this event (source: paper).
        </p>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <input
            aria-label="Paper sign-in full name"
            placeholder="Full name"
            value={paper.fullName}
            onChange={(e) => setPaper((p) => ({ ...p, fullName: e.target.value }))}
            className="rounded-lg border border-white/15 bg-white/10 px-3 py-2 text-sm"
          />
          <input
            aria-label="Paper sign-in email"
            placeholder="Email"
            value={paper.email}
            onChange={(e) => setPaper((p) => ({ ...p, email: e.target.value }))}
            className="rounded-lg border border-white/15 bg-white/10 px-3 py-2 text-sm"
          />
          <input
            aria-label="Paper sign-in business (optional)"
            placeholder="Business (optional)"
            value={paper.businessName}
            onChange={(e) => setPaper((p) => ({ ...p, businessName: e.target.value }))}
            className="rounded-lg border border-white/15 bg-white/10 px-3 py-2 text-sm"
          />
          <select
            aria-label="Paper sign-in day"
            value={paper.dayIndex}
            onChange={(e) => setPaper((p) => ({ ...p, dayIndex: Number(e.target.value) }))}
            className="rounded-lg border border-white/15 bg-white/10 px-3 py-2 text-sm"
          >
            <option value={1} className="bg-[#09111f]">
              Day 1
            </option>
            <option value={2} className="bg-[#09111f]">
              Day 2
            </option>
          </select>
          <button
            type="button"
            onClick={submitPaper}
            className="rounded-lg border border-white/15 bg-white/15 px-3 py-2 text-sm font-semibold"
          >
            Record paper sign-in
          </button>
        </div>
      </div>
    </div>
  );
}
