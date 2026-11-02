/**
 * CARSI's three business-development offers, side by side.
 *
 * Two of them carry a "$495" figure — the CARSI Business Coaching subscription ($495 a month) and
 * a paid CARSI x CCW Business Growth Days seat ($495 per person, one-off) — and the Owner Circle
 * page used to call itself "not $495 Growth Days" without mentioning the monthly coaching at all.
 * This module is the single place that names all three and says what each costs and how often,
 * so every sales page describes them the same way.
 *
 * It holds NO prices of its own. Every figure is read from the constant or event data that the
 * checkout already uses, so this copy cannot drift from what a buyer is charged.
 */
import {
  businessCoachingPath,
  businessCoachingProductName,
  businessCoachingSeatPriceCents,
} from '@/lib/marketing/business-coaching';
import {
  carsiCoachingMonthlyPath,
  carsiCoachingMonthlyPriceLabel,
  carsiCoachingProductName,
} from '@/lib/marketing/carsi-coaching-monthly';
import {
  type CcwRoadshowEvent,
  ccwRoadshowEvents,
  ccwRoadshowPath,
  ccwRoadshowTitle,
  formatAudFromCents,
  getCcwRoadshowPricing,
  hasCcwRoadshowSessionEnded,
  isOpenFreeEntrySitting,
} from '@/lib/marketing/ccw-roadshow';

export type BusinessOfferId = 'owner-circle' | 'business-coaching' | 'growth-days';

export type BusinessOffer = {
  id: BusinessOfferId;
  name: string;
  href: string;
  /** The price as a buyer sees it, always with its unit (per seat / a month / per person). */
  priceLabel: string;
  /** How often you pay — the line that separates the two "$495" offers. */
  cadence: string;
  format: string;
  bestFor: string;
};

type GrowthDaysPricing = ReturnType<typeof getCcwRoadshowPricing>;

/**
 * Growth Days are priced per sitting: some are free for CCW customers, others are paid seats booked
 * through CCW, and between seasons no price is set. Mirrors `getCcwRoadshowPricing` so this never
 * prints a flat "$495" while a free sitting is open, or a price before one is confirmed.
 */
export function growthDaysPriceLabel(
  pricing: GrowthDaysPricing,
  events: CcwRoadshowEvent[],
  now: Date
): string {
  if (pricing.mode === 'free') return 'Free for CCW customers at selected sittings';
  if (pricing.mode === 'none') return 'Price confirmed with each new date';
  const paid = events
    .filter((e) => !hasCcwRoadshowSessionEnded(e, now) && !isOpenFreeEntrySitting(e, now))
    .map((e) => e.unitAmountCents ?? 0)
    .filter((cents) => cents > 0);
  if (paid.length === 0) return 'Price confirmed with each new date';
  return `${formatAudFromCents(Math.min(...paid))} per person, booked through CCW`;
}

export function getBusinessOffers(now: Date = new Date()): BusinessOffer[] {
  return [
    {
      id: 'owner-circle',
      name: businessCoachingProductName,
      href: businessCoachingPath,
      priceLabel: `${formatAudFromCents(businessCoachingSeatPriceCents)} per seat`,
      cadence: 'Pay per session — book one month at a time',
      format: 'After-hours group session, once a month',
      bestFor: 'Owner-operators who want practical ideas and peers on a tight budget',
    },
    {
      id: 'business-coaching',
      name: carsiCoachingProductName,
      href: carsiCoachingMonthlyPath,
      priceLabel: carsiCoachingMonthlyPriceLabel,
      cadence: 'Ongoing monthly subscription — cancel anytime',
      format: 'Your own plan in the coaching portal, plus at least one live session with Phill each month',
      bestFor: 'Owners ready to work on their business every month with a coach',
    },
    {
      id: 'growth-days',
      name: ccwRoadshowTitle,
      href: ccwRoadshowPath,
      priceLabel: growthDaysPriceLabel(getCcwRoadshowPricing(now), ccwRoadshowEvents, now),
      cadence: 'One-off two-day event — no subscription',
      format: 'In person at Carpet Cleaners Warehouse, with CARSI and CCW',
      bestFor: 'Owners and teams who want two intensive days in person',
    },
  ];
}
