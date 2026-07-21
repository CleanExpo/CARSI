'use client';

import { useCallback, useEffect, useState } from 'react';
import { renderSVG } from 'uqr';

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
  courseAccessGranted: boolean;
  attendanceComplete: boolean;
};

type Roster = {
  eventSlug: string;
  courseSlug: string;
  rows: RosterRow[];
};

type CheckInLink = {
  checkInUrl: string;
  dayIndex: 1 | 2;
  dateStamp: string;
};

const surface = 'rounded-2xl border border-white/10 bg-white/[0.04]';

export function AdminCcwSignInsClient() {
  const [eventSlug, setEventSlug] = useState(ccwRoadshowEvents[0]?.slug ?? '');
  const [roster, setRoster] = useState<Roster | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [checkInDay, setCheckInDay] = useState<1 | 2>(1);
  const [checkInLink, setCheckInLink] = useState<CheckInLink | null>(null);
  const [generatingLink, setGeneratingLink] = useState(false);
  const [submittingAssisted, setSubmittingAssisted] = useState(false);
  const [copied, setCopied] = useState(false);

  // Organiser-assisted electronic fallback for anyone unable to use the QR.
  const [assisted, setAssisted] = useState({
    fullName: '',
    email: '',
    businessName: '',
    dayIndex: 1,
  });

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

  async function generateCheckInLink() {
    setGeneratingLink(true);
    setCopied(false);
    try {
      const res = await fetch('/api/admin/ccw-roadshow/checkin-token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ eventSlug, dayIndex: checkInDay }),
      });
      const payload = (await res.json().catch(() => ({}))) as CheckInLink & { detail?: string };
      if (!res.ok) {
        setError(payload.detail || 'Could not open electronic check-in.');
        setCheckInLink(null);
        return;
      }
      setCheckInLink(payload);
      setError('');
    } catch {
      setError('Network error while generating the check-in link. Please try again.');
      setCheckInLink(null);
    } finally {
      setGeneratingLink(false);
    }
  }

  async function copyCheckInLink() {
    if (!checkInLink) return;
    try {
      await navigator.clipboard.writeText(checkInLink.checkInUrl);
      setCopied(true);
      setError('');
    } catch {
      setCopied(false);
      setError('The browser blocked copying. Select and copy the link shown below instead.');
    }
  }

  async function submitAssisted() {
    if (submittingAssisted) return;
    setSubmittingAssisted(true);
    try {
      const ok = await post({
        action: 'admin_checkin',
        eventSlug,
        dayIndex: assisted.dayIndex,
        fullName: assisted.fullName,
        email: assisted.email,
        businessName: assisted.businessName || undefined,
      });
      if (ok) setAssisted({ fullName: '', email: '', businessName: '', dayIndex: 1 });
    } catch {
      setError('Network error while recording the check-in. Please try again.');
    } finally {
      setSubmittingAssisted(false);
    }
  }

  const qrSvg = checkInLink
    ? renderSVG(checkInLink.checkInUrl, { border: 4, ecc: 'M', pixelSize: 7 })
    : '';
  const qrSrc = qrSvg ? `data:image/svg+xml;charset=utf-8,${encodeURIComponent(qrSvg)}` : '';

  return (
    <div className="space-y-6 p-6 text-white">
      <div>
        <p className="text-[11px] font-semibold tracking-[0.2em] text-white/55 uppercase">
          Attendance foundation
        </p>
        <h1 className="mt-1 text-2xl font-bold tracking-tight">CCW Roadshow Sign-ins</h1>
        <p className="mt-1 text-sm text-white/60">
          Day marks are the write-once source of truth. A correction clears a mistaken mark
          (recorded in the admin log). Both days = certificate of attendance.
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
            setCheckInLink(null);
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
      </div>

      <div className={`${surface} p-4`}>
        <h2 className="text-lg font-semibold">Open today&apos;s electronic check-in</h2>
        <p className="mt-1 text-sm text-white/60">
          Choose the event day, generate the secure link, then display the QR for attendees to scan
          on their own devices.
        </p>
        <div className="mt-4 flex flex-wrap items-end gap-3">
          <label className="block">
            <span className="mb-1 block text-xs font-semibold text-white/70">Event day</span>
            <select
              value={checkInDay}
              onChange={(e) => {
                setCheckInDay(Number(e.target.value) as 1 | 2);
                setCheckInLink(null);
              }}
              className="rounded-lg border border-white/15 bg-white/10 px-3 py-2 text-sm"
            >
              <option value={1} className="bg-[#09111f]">
                Day 1
              </option>
              <option value={2} className="bg-[#09111f]">
                Day 2
              </option>
            </select>
          </label>
          <button
            type="button"
            onClick={generateCheckInLink}
            disabled={generatingLink}
            className="rounded-lg border border-cyan-300/35 bg-cyan-300/15 px-4 py-2 text-sm font-semibold text-cyan-50 disabled:opacity-60"
          >
            {generatingLink ? 'Generating…' : `Generate Day ${checkInDay} QR`}
          </button>
        </div>
        {checkInLink && (
          <div className="mt-5 grid gap-5 rounded-xl border border-white/10 bg-[#09111f]/80 p-4 md:grid-cols-[280px_1fr]">
            <div className="rounded-xl bg-white p-3">
              {/* The QR is generated locally; no third-party QR service sees the signed token. */}
              {/* eslint-disable-next-line @next/next/no-img-element -- generated data URI has no remote image source */}
              <img
                src={qrSrc}
                alt={`Day ${checkInLink.dayIndex} electronic check-in QR code`}
                className="h-auto w-full"
              />
            </div>
            <div className="min-w-0 space-y-3">
              <p className="text-sm text-white/70">
                Valid for {checkInLink.dateStamp}. It expires automatically after the event day.
              </p>
              <p className="rounded-lg bg-black/25 p-3 text-xs break-all text-white/70">
                {checkInLink.checkInUrl}
              </p>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={copyCheckInLink}
                  className="rounded-lg border border-white/15 bg-white/10 px-3 py-2 text-sm font-semibold"
                >
                  {copied ? 'Copied' : 'Copy link'}
                </button>
                <a
                  href={checkInLink.checkInUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="rounded-lg border border-white/15 bg-white/10 px-3 py-2 text-sm font-semibold"
                >
                  Open participant view
                </a>
              </div>
            </div>
          </div>
        )}
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
        <h2 className="text-lg font-semibold">Assisted electronic check-in</h2>
        <p className="mt-1 text-sm text-white/60">
          Use only when an attendee cannot scan the QR. This records the same electronic attendance
          mark.
        </p>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <input
            aria-label="Assisted check-in full name"
            placeholder="Full name"
            value={assisted.fullName}
            onChange={(e) => setAssisted((p) => ({ ...p, fullName: e.target.value }))}
            className="rounded-lg border border-white/15 bg-white/10 px-3 py-2 text-sm"
          />
          <input
            aria-label="Assisted check-in email"
            type="email"
            placeholder="Email"
            value={assisted.email}
            onChange={(e) => setAssisted((p) => ({ ...p, email: e.target.value }))}
            className="rounded-lg border border-white/15 bg-white/10 px-3 py-2 text-sm"
          />
          <input
            aria-label="Assisted check-in business (optional)"
            placeholder="Business (optional)"
            value={assisted.businessName}
            onChange={(e) => setAssisted((p) => ({ ...p, businessName: e.target.value }))}
            className="rounded-lg border border-white/15 bg-white/10 px-3 py-2 text-sm"
          />
          <select
            aria-label="Assisted check-in day"
            value={assisted.dayIndex}
            onChange={(e) => setAssisted((p) => ({ ...p, dayIndex: Number(e.target.value) }))}
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
            onClick={submitAssisted}
            disabled={submittingAssisted}
            aria-busy={submittingAssisted}
            className="rounded-lg border border-white/15 bg-white/15 px-3 py-2 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-60"
          >
            {submittingAssisted ? 'Recording…' : 'Record electronic check-in'}
          </button>
        </div>
      </div>
    </div>
  );
}
