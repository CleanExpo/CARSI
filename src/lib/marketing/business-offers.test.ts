import { describe, expect, it } from 'vitest';

import {
  businessCoachingSeatPriceCents,
  formatAudFromCents,
} from '@/lib/marketing/business-coaching';
import { getBusinessOffers, growthDaysPriceLabel } from '@/lib/marketing/business-offers';
import { carsiCoachingMonthlyPriceLabel } from '@/lib/marketing/carsi-coaching-monthly';
import {
  type CcwRoadshowEvent,
  ccwRoadshowEvents,
  getCcwRoadshowPricing,
} from '@/lib/marketing/ccw-roadshow';

const base = ccwRoadshowEvents[0];
const event = (over: Partial<CcwRoadshowEvent>): CcwRoadshowEvent => ({ ...base, ...over });
const NOW = new Date('2026-11-02T00:00:00Z');
const FUTURE = '2027-03-01T08:00:00+10:00';
const PAST = '2026-01-01T08:00:00+10:00';

describe('getBusinessOffers', () => {
  const offers = getBusinessOffers(NOW);

  it('names three distinct offers, each with its own page', () => {
    expect(offers.map((o) => o.id)).toEqual(['owner-circle', 'business-coaching', 'growth-days']);
    expect(new Set(offers.map((o) => o.name)).size).toBe(3);
    expect(new Set(offers.map((o) => o.href)).size).toBe(3);
  });

  it('reads prices from the checkout constants, never its own copy', () => {
    const byId = Object.fromEntries(offers.map((o) => [o.id, o]));
    expect(byId['owner-circle'].priceLabel).toBe(
      `${formatAudFromCents(businessCoachingSeatPriceCents)} per seat`
    );
    expect(byId['business-coaching'].priceLabel).toBe(carsiCoachingMonthlyPriceLabel);
  });

  it('never shows a bare amount: every price says per seat, a month, per person, free or TBA', () => {
    for (const o of offers) {
      expect(o.priceLabel).toMatch(/per seat|\/month|per person|Free|confirmed/);
    }
  });

  it('tells the monthly subscription apart from the one-off event by how often you pay', () => {
    const byId = Object.fromEntries(offers.map((o) => [o.id, o]));
    expect(byId['business-coaching'].cadence).toMatch(/subscription/i);
    expect(byId['growth-days'].cadence).toMatch(/one-off/i);
    expect(byId['growth-days'].cadence).toMatch(/no subscription/i);
    expect(byId['owner-circle'].cadence).not.toMatch(/subscription/i);
  });

  it('the live Growth Days label matches the real event data', () => {
    const label = byIdLabel(offers);
    expect(label).toBe(
      growthDaysPriceLabel(getCcwRoadshowPricing(NOW), ccwRoadshowEvents, NOW)
    );
    // A dollar figure may only appear if some event really carries that unit price.
    const amount = label.match(/\$\d+/)?.[0];
    if (amount) {
      const real = ccwRoadshowEvents
        .map((e) => e.unitAmountCents)
        .filter((c): c is number => typeof c === 'number' && c > 0)
        .map(formatAudFromCents);
      expect(real).toContain(amount);
    }
  });
});

function byIdLabel(offers: ReturnType<typeof getBusinessOffers>): string {
  return offers.find((o) => o.id === 'growth-days')!.priceLabel;
}

describe('growthDaysPriceLabel', () => {
  it('says free while a CCW free-entry sitting is open, and prints no price', () => {
    const label = growthDaysPriceLabel({ mode: 'free', freeCities: ['Sydney'] }, [], NOW);
    expect(label).toMatch(/free for CCW customers/i);
    expect(label).not.toMatch(/\$/);
  });

  it('says TBA when no sitting is ahead', () => {
    expect(growthDaysPriceLabel({ mode: 'none' }, [], NOW)).toBe(
      'Price confirmed with each new date'
    );
  });

  it('shows the lowest upcoming paid seat, ignoring ended and free sittings', () => {
    const events = [
      event({ slug: 'paid-cheap-ended', endDateIso: PAST, registration: 'external', unitAmountCents: 10_000 }),
      event({ slug: 'free-upcoming', endDateIso: FUTURE, registration: 'free-token', unitAmountCents: 0 }),
      event({ slug: 'paid-a', endDateIso: FUTURE, registration: 'external', unitAmountCents: 59_500 }),
      event({ slug: 'paid-b', endDateIso: FUTURE, registration: 'external', unitAmountCents: 49_500 }),
    ];
    expect(growthDaysPriceLabel({ mode: 'paid' }, events, NOW)).toBe(
      `${formatAudFromCents(49_500)} per person, booked through CCW`
    );
  });

  it('falls back to TBA rather than inventing a price when no paid seat has an amount', () => {
    const events = [event({ endDateIso: FUTURE, registration: 'external', unitAmountCents: undefined })];
    expect(growthDaysPriceLabel({ mode: 'paid' }, events, NOW)).toBe(
      'Price confirmed with each new date'
    );
  });
});
