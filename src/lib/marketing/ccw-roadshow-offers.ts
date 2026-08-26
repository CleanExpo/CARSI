/**
 * CCW/CARSI roadshow — attendee Course Offers (slice-1: pure config + gating).
 *
 * TWO attendee-exclusive offers surfaced ONLY on the days of each event and
 * ONLY to verified attendees — see `ccwRoadshowAttendeeOffers` below for which,
 * and for why there is no longer a third. This module is pure and client-safe
 * (no env, no DB); the server flag lives in `@/lib/server/ccw-offers-flag`, and
 * the welcome-email wiring is BUILT (`ccw-attendance/provision.ts` feeds
 * `selectActiveOffersForNow` into the enrolment email). Spec — partly
 * superseded, read its header first:
 * docs/specs/ccw-attendee-offers-day-gated-2026-07-15.md
 *
 * The attendee membership offer was REMOVED by the founder on 2026-08-25. It was
 * a self-serve discounted `pro_annual` subscription — A$295 for the first year
 * via a `duration: once` Stripe coupon — and it never went live: the coupon it
 * depended on was never created, so the path only ever returned 503. Its price
 * constants, checkout branch, `/subscribe?offer=` entry point and the A$295 claim
 * in the attendee email are all gone with it.
 *
 * Membership for a named attendee is still available, by a DIFFERENT instrument:
 * `POST /api/admin/ccw-roadshow/comp-membership` grants a year outright via
 * `grantYearlyMembership`. No Stripe subscription, so no renewal — see that
 * route's service for why the two must never be swapped for one another. It does
 * not depend on any offer flag or on Stripe at all, and is unaffected here.
 */
import { ccwRoadshowEvents, type CcwRoadshowEvent } from './ccw-roadshow';

export type CcwOfferKey = 'ccw-store-credit' | 'ra-setup';

export type CcwAttendeeOffer = {
  key: CcwOfferKey;
  /** Participant-facing; kept soft (no hard price) until `live`. */
  label: string;
  /** One-line "how to claim". */
  detail: string;
  /** CCW / RA permanent product URL. Preview URLs are rejected (see below). */
  url?: string;
  /** false = configured but its external dependency isn't satisfied yet. */
  live: boolean;
};

/**
 * Shipped config — the two remaining attendee offers.
 *
 * `ccw-store-credit` is LIVE: its dependency was the permanent CCW product URL
 * from Toby, verified on the ccwonline.com.au custom domain 2026-07-15.
 * `ra-setup` is still dark, waiting on the RestoreAssist mechanism.
 *
 * There is no third offer. `carsi-membership` was removed with the A$295
 * attendee discount on 2026-08-25, so "Rana's membership price" is no longer a
 * dependency of anything here — do not restore an offer on the strength of it.
 *
 * An offer is flipped to `live: true` only when its dependency lands, and no
 * preview URL is ever baked in, so a temporary link cannot ship by accident.
 */
export const ccwRoadshowAttendeeOffers: CcwAttendeeOffer[] = [
  {
    key: 'ccw-store-credit',
    label: 'CCW attendee voucher',
    detail: 'Purchase your CCW/CARSI 2-day training voucher — includes CCW store credit.',
    // Verified live 2026-07-15: published product on the ccwonline.com.au custom
    // domain ("CCW/CARSI 2 Day In-house Training", $100 → $150 store credit).
    url: 'https://ccwonline.com.au/products/ccw-carsi-2-day-in-house-training',
    live: true,
  },
  {
    key: 'ra-setup',
    label: 'RestoreAssist assisted setup',
    detail: 'Attendee discount on RestoreAssist assisted account setup — details on the day.',
    live: false,
  },
];

type EventWindow = Pick<CcwRoadshowEvent, 'startDateIso' | 'endDateIso'>;

/**
 * True iff `now` is within the event's own [start, end] instant window
 * (inclusive). Compares absolute instants, so the per-event ISO offset handles
 * AEST/AEDT correctly. Authoritative — callers must not trust a client clock.
 */
export function areAttendeeOffersActive(event: EventWindow, now: Date): boolean {
  const start = new Date(event.startDateIso).getTime();
  const end = new Date(event.endDateIso).getTime();
  const t = now.getTime();
  if (Number.isNaN(start) || Number.isNaN(end) || Number.isNaN(t)) return false;
  return t >= start && t <= end;
}

/**
 * Last instant of the event's first day, in the event's OWN local timezone.
 * `startDateIso` carries the venue's offset (e.g. `+10:00`), so the calendar day
 * is read straight off it rather than through the server's clock.
 */
function endOfFirstLocalDay(startDateIso: string): number {
  const m = /^(\d{4}-\d{2}-\d{2})T[\d:.]+(Z|[+-]\d{2}:\d{2})$/.exec(startDateIso);
  if (!m) return NaN;
  const [, date, offset] = m;
  return new Date(`${date}T23:59:59.999${offset === 'Z' ? '+00:00' : offset}`).getTime();
}

/**
 * The CCW store-credit voucher has a PRE-PURCHASE window that is deliberately
 * wider than the on-the-day `areAttendeeOffersActive` window: it is open from now
 * right through the event's first day, so attendees can pay ahead, get store
 * credit immediately, and lock in their seat (the $50 bonus lands when they sign
 * in on day 1). Owner decision 2026-07-16 — supersedes the original "claim during
 * the 2 event days only" lock in the day-gated-offers spec.
 *
 * "Through the first day" = up to midnight at the end of day 1, local to the venue.
 * NOT `start + 24h`: for an 08:30 start that would stay open until 08:30 on day 2
 * and promise a day-1 sign-in bonus that can no longer be earned. The client clock
 * is never trusted (server passes `now`). Closed for past events.
 */
export function isVoucherPurchaseWindowOpen(event: EventWindow, now: Date): boolean {
  const closesAt = endOfFirstLocalDay(event.startDateIso);
  const t = now.getTime();
  if (Number.isNaN(closesAt) || Number.isNaN(t)) return false;
  return t <= closesAt;
}

/**
 * The pre-purchase CCW store-credit voucher to promote right now, or null.
 * Returns it only when the feature flag is enabled, the purchase window is open,
 * the offer is `live`, and it has a URL that passes the preview-host guard. Pure —
 * the caller passes `enabled` (server flag) so this stays client-safe and testable.
 * `url` is optional on the type, so a missing one is rejected rather than allowed
 * through to a caller that would render a CTA linking nowhere.
 */
export function selectPrepurchaseVoucher(
  event: EventWindow,
  now: Date,
  opts: { enabled: boolean; offers?: CcwAttendeeOffer[] },
): CcwAttendeeOffer | null {
  if (!opts.enabled) return null;
  if (!isVoucherPurchaseWindowOpen(event, now)) return null;
  const offers = opts.offers ?? ccwRoadshowAttendeeOffers;
  const voucher = offers.find((o) => o.key === 'ccw-store-credit') ?? null;
  if (!voucher || !voucher.live) return null;
  if (typeof voucher.url !== 'string' || !isDistributableOfferUrl(voucher.url)) return null;
  return voucher;
}

const PREVIEW_HOST = 'shopifypreview.com';

/**
 * Fail-closed guard: an offer URL may be distributed only if it is https and its
 * host is not a Shopify preview host (`shopifypreview.com` or `*.shopifypreview.com`).
 * Preview URLs are temporary and must never be emailed. Host is matched by
 * suffix, not substring, so a preview string in the path is fine.
 */
export function isDistributableOfferUrl(url: string): boolean {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return false;
  }
  if (parsed.protocol !== 'https:') return false;
  const host = parsed.hostname.toLowerCase();
  if (host === PREVIEW_HOST || host.endsWith(`.${PREVIEW_HOST}`)) return false;
  return true;
}

/**
 * The offers to surface right now: none unless the feature is enabled AND the
 * event is in its window; then only offers that are `live` and (if they carry a
 * URL) whose URL passes the preview guard. Pure — the caller passes `enabled`
 * (server flag) so this stays client-safe and fully testable.
 */
export function selectActiveOffers(
  event: EventWindow,
  now: Date,
  opts: { enabled: boolean; offers?: CcwAttendeeOffer[] },
): CcwAttendeeOffer[] {
  if (!opts.enabled) return [];
  if (!areAttendeeOffersActive(event, now)) return [];
  const offers = opts.offers ?? ccwRoadshowAttendeeOffers;
  return offers.filter((o) => o.live && (o.url == null || isDistributableOfferUrl(o.url)));
}

/**
 * Convenience for callers that don't know which event they're in (e.g. Day-1
 * provisioning): pick the roadshow event whose window contains `now` and return
 * its active offers. Off-event (or flag off) → []. The provisioning path runs at
 * sign-in time, so `now` is inside the running event's window.
 */
export function selectActiveOffersForNow(
  now: Date,
  opts: { enabled: boolean; events?: readonly EventWindow[]; offers?: CcwAttendeeOffer[] },
): CcwAttendeeOffer[] {
  const events = opts.events ?? ccwRoadshowEvents;
  const active = events.find((event) => areAttendeeOffersActive(event, now));
  if (!active) return [];
  return selectActiveOffers(active, now, { enabled: opts.enabled, offers: opts.offers });
}
