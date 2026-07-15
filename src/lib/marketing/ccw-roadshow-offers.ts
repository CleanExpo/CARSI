/**
 * CCW/CARSI roadshow — attendee Course Offers (slice-1: pure config + gating).
 *
 * Three attendee-exclusive offers surfaced ONLY on the days of each event and
 * ONLY to verified attendees. This module is pure and client-safe (no env, no
 * DB); the server flag lives in `@/lib/server/ccw-offers-flag` and the
 * welcome-email wiring is a later slice. Spec:
 * docs/specs/ccw-attendee-offers-day-gated-2026-07-15.md
 */
import type { CcwRoadshowEvent } from './ccw-roadshow';

export type CcwOfferKey = 'ccw-store-credit' | 'carsi-membership' | 'ra-setup';

export type CcwAttendeeOffer = {
  key: CcwOfferKey;
  /** Participant-facing; kept soft (no hard price) until `live`. */
  label: string;
  /** One-line "how to claim". */
  detail: string;
  /** CCW / RA permanent product URL. Preview URLs are rejected (see below). */
  url?: string;
  /** CARSI: price passed to `grantYearlyMembership`; NOT a coupon. Server-only. */
  membershipPriceAud?: number;
  /** false = configured but its external dependency isn't satisfied yet. */
  live: boolean;
};

/**
 * Shipped config — all three offers DARK (`live: false`) at ship time. Each is
 * flipped to `live: true` only when its dependency lands (permanent CCW URL from
 * Toby; Rana's membership price; RA mechanism). No URLs are baked in yet, so
 * nothing can accidentally ship a temporary preview link.
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
    key: 'carsi-membership',
    label: 'CARSI 1-year membership',
    detail: 'Attendee rate on a full year of CARSI membership — details on the day.',
    membershipPriceAud: 295,
    live: false,
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
