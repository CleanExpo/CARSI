'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { renderSVG } from 'uqr';

import { ccwRoadshowEvents } from '@/lib/marketing/ccw-roadshow';
import { ccwRoadshowAttendeeOffers } from '@/lib/marketing/ccw-roadshow-offers';

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
  membershipCompedAt: string | null;
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

const SIGN_INS_ENDPOINT = '/api/admin/ccw-roadshow/sign-ins';
const COMP_MEMBERSHIP_ENDPOINT = '/api/admin/ccw-roadshow/comp-membership';

/**
 * The attendee first-year rate, read from the offer config rather than typed in
 * here, so the figure this form defaults to is the same one the offer itself
 * advertises. `null` when the offer carries no rate — the operator then has to
 * name a price, which is the right outcome: defaulting a missing rate to $0
 * would misstate what was collected.
 */
const attendeeRateAud = (() => {
  const offer = ccwRoadshowAttendeeOffers.find((o) => o.key === 'carsi-membership');
  return typeof offer?.membershipPriceAud === 'number' ? offer.membershipPriceAud : null;
})();

/** Named month — unambiguous to any reader, unlike a numeric day/month order. */
const COMPED_DATE_FORMAT: Intl.DateTimeFormatOptions = {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
};

/** Money, so: digits with at most two decimal places. Rejects negatives and junk. */
const PRICE_PATTERN = /^\d+(\.\d{1,2})?$/;

/**
 * The comp timestamp is stored and served in UTC. Slicing the ISO string would
 * show the UTC date, which is the PREVIOUS day for any comp issued before 10am
 * AEST — misdating a record an operator may have to reconcile.
 * `toLocaleDateString` resolves the date in the VIEWER'S TIMEZONE, which is what
 * fixes that.
 *
 * The FORMAT is deliberate and is not an oversight to "correct" to the viewer's
 * own locale. A purely numeric date is ambiguous across locales — 09/08 reads as
 * 8 September to one operator and 9 August to another — and this is a record
 * that may be reconciled against a payment. Naming the month removes that
 * ambiguity for every reader regardless of locale, which a viewer-locale numeric
 * date would not: it would make each operator's screen self-consistent while
 * leaving any two of them unable to agree on what a shared roster says.
 *
 * Safe from hydration mismatch either way: the roster only ever arrives
 * client-side, after mount, so this never renders on the server.
 */
function formatCompedDate(iso: string): string {
  const parsed = new Date(iso);
  return Number.isNaN(parsed.getTime())
    ? iso.slice(0, 10)
    : parsed.toLocaleDateString('en-AU', COMPED_DATE_FORMAT);
}

export function AdminCcwSignInsClient() {
  const [eventSlug, setEventSlug] = useState(ccwRoadshowEvents[0]?.slug ?? '');
  const [roster, setRoster] = useState<Roster | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [checkInDay, setCheckInDay] = useState<1 | 2>(1);
  const [checkInLink, setCheckInLink] = useState<CheckInLink | null>(null);
  const [generatingLink, setGeneratingLink] = useState(false);
  const [submittingAssisted, setSubmittingAssisted] = useState(false);
  const [pendingAction, setPendingAction] = useState<string | null>(null);
  const mutationInFlight = useRef(false);
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

  /**
   * Returns the parsed success body, or `null` for any failure. Callers that
   * only care whether it worked can test truthiness; the comp action needs the
   * body, because what was actually granted is not derivable from the request.
   */
  async function post(
    payload: Record<string, unknown>,
    url: string = SIGN_INS_ENDPOINT
  ): Promise<Record<string, unknown> | null> {
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const body = (await res.json().catch(() => ({}))) as Record<string, unknown> & {
        detail?: string;
      };
      if (!res.ok) {
        setError(body.detail || 'Action failed');
        return null;
      }
      setError('');
      await load();
      return body;
    } catch {
      setError('Network error while completing the action. Please try again.');
      return null;
    }
  }

  async function runRosterMutation(
    actionKey: string,
    payload: Record<string, unknown>,
    url: string = SIGN_INS_ENDPOINT
  ): Promise<Record<string, unknown> | null> {
    if (mutationInFlight.current) return null;
    mutationInFlight.current = true;
    setPendingAction(actionKey);
    try {
      return await post(payload, url);
    } finally {
      mutationInFlight.current = false;
      setPendingAction(null);
    }
  }

  async function correct(row: RosterRow, dayIndex: 1 | 2) {
    const reason = window.prompt(
      `Reverse Day ${dayIndex} check-in for ${row.fullName}? Enter a reason (recorded in the admin log):`
    );
    if (!reason) return;
    await runRosterMutation(`correct:${row.signInId}:${dayIndex}`, {
      action: 'correct',
      signInId: row.signInId,
      dayIndex,
      reason,
    });
  }

  async function merge(row: RosterRow) {
    const duplicateId = window.prompt(
      `Merge a duplicate INTO ${row.fullName}. Paste the duplicate sign-in id:`
    );
    if (!duplicateId) return;
    await runRosterMutation(`merge:${row.signInId}`, {
      action: 'merge',
      primaryId: row.signInId,
      duplicateId: duplicateId.trim(),
    });
  }

  /**
   * Comp ONE named attendee a year of membership — the admin half of the
   * `carsi-membership` offer.
   *
   * Two dialogs, deliberately. The grant rotates an existing member's password
   * and reveals the new one only in the welcome email, so a mis-click costs a
   * real person their access (the #694 hazard). The price is asked for first
   * because it is recorded against the grant and cannot be corrected from this
   * screen afterwards; the confirm then restates the resolved figure and the
   * address the credentials go to.
   */
  async function compMembership(row: RosterRow) {
    const entered = window.prompt(
      [
        `Grant ${row.fullName} (${row.email}) a year of CARSI membership.`,
        '',
        'This grants the membership outright — it creates NO Stripe subscription, so it will not renew. It also resets their CARSI password and sends the new one in the welcome email.',
        '',
        'Enter the lump sum collected in AUD, or 0 for a complimentary comp:',
      ].join('\n'),
      attendeeRateAud === null ? '' : String(attendeeRateAud)
    );
    if (entered === null) return;

    const raw = entered.trim();
    if (!PRICE_PATTERN.test(raw)) {
      setError('Enter the lump sum in AUD — digits only, up to two decimal places (0 for a complimentary comp).');
      return;
    }
    const priceAud = Number(raw);

    if (
      !window.confirm(
        `Comp ${row.fullName} a year of membership at A$${raw}?\n\nTheir password will be reset and the new one sent to ${row.email}.`
      )
    ) {
      return;
    }

    const result = await runRosterMutation(
      `comp:${row.signInId}`,
      {
        signInId: row.signInId,
        // An explicit price every time. The route defaults a missing mode to the
        // configured attendee rate, but this screen already knows the figure the
        // operator agreed to, so it says so rather than relying on that default.
        pricingMode: priceAud === 0 ? 'free' : 'custom',
        priceAud,
      },
      COMP_MEMBERSHIP_ENDPOINT
    );
    if (!result) return;

    // The grant reports whether the welcome email — the ONLY copy of the password
    // it just issued — actually reached the attendee. A failure here is not a
    // failed comp: the membership stands and must NOT be re-issued (that would
    // rotate the password again). It is a locked-out member, and the operator is
    // the only one positioned to notice.
    const welcomeEmail = result.welcomeEmail as
      | { delivered: boolean; reason: string | null }
      | undefined;

    window.alert(
      [
        `Membership granted to ${row.email}.`,
        `Recorded at: ${result.priceLabel ?? `A$${raw}`}`,
        `Courses they can open: ${result.reachableCourseCount ?? 0} of ${result.publishedCourseCount ?? 0} published.`,
        '',
        welcomeEmail === undefined
          ? 'Their password has been reset and exists only in the welcome email.'
          : welcomeEmail.delivered
            ? 'The welcome email carrying their new password has been sent.'
            : `WARNING: the welcome email was NOT delivered (${welcomeEmail.reason ?? 'unknown reason'}). Their password was reset and existed only in that email, so ${row.email} CANNOT sign in. Send a password reset — do NOT comp again.`,
      ].join('\n')
    );
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
          (recorded in the admin log). Both days = certificate of attendance. After Day 2, run{' '}
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
          <table className="w-full min-w-[1080px] border-collapse text-sm">
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
                <th className="p-3 font-semibold">Membership</th>
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
                    {row.membershipCompedAt
                      ? `Comped ${formatCompedDate(row.membershipCompedAt)}`
                      : row.offerEligible
                        ? 'Eligible'
                        : '—'}
                  </td>
                  <td className="p-3">
                    <div className="flex flex-wrap gap-2">
                      {row.day1CheckedInAt && (
                        <button
                          type="button"
                          onClick={() => correct(row, 1)}
                          disabled={pendingAction !== null}
                          aria-busy={pendingAction === `correct:${row.signInId}:1`}
                          className="rounded border border-amber-300/40 bg-amber-300/10 px-2 py-1 text-xs text-amber-100 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          Reverse D1
                        </button>
                      )}
                      {row.day2CheckedInAt && (
                        <button
                          type="button"
                          onClick={() => correct(row, 2)}
                          disabled={pendingAction !== null}
                          aria-busy={pendingAction === `correct:${row.signInId}:2`}
                          className="rounded border border-amber-300/40 bg-amber-300/10 px-2 py-1 text-xs text-amber-100 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          Reverse D2
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => merge(row)}
                        disabled={pendingAction !== null}
                        aria-busy={pendingAction === `merge:${row.signInId}`}
                        className="rounded border border-white/15 bg-white/10 px-2 py-1 text-xs disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        Merge dupe
                      </button>
                      {row.offerEligible && !row.membershipCompedAt && (
                        <button
                          type="button"
                          onClick={() => compMembership(row)}
                          disabled={pendingAction !== null}
                          aria-busy={pendingAction === `comp:${row.signInId}`}
                          className="rounded border border-emerald-300/40 bg-emerald-300/10 px-2 py-1 text-xs text-emerald-100 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          Comp membership
                        </button>
                      )}
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
