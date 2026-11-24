import { describe, expect, it } from 'vitest';

/**
 * GP-773 round 4: checkout builds its line items through the same shared rule module, and what it
 * builds is exactly what the rule accepts (owner plan item at quantity 1, plus at most one seat
 * item). If checkout ever built a shape the rule refuses, the webhook would grant no seats.
 */
import {
  classifyTeamSubscription,
  teamCheckoutLineItems,
} from './team-subscription-store-pure';

const OWNER = {
  id: 'price_owner',
  active: true,
  currency: 'aud',
  unit_amount: 129_500,
  recurring: { interval: 'year', interval_count: 1 },
  billing_scheme: 'per_unit',
  transform_quantity: null,
};
const SEAT = { ...OWNER, id: 'price_extra_seat', unit_amount: 69_500 };
const CATALOGUE: Record<string, typeof OWNER> = { price_owner: OWNER, price_extra_seat: SEAT };

function asSubscription(lineItems: Array<{ price: string; quantity: number }>) {
  return {
    metadata: { plan: 'business_owner' },
    items: {
      data: lineItems.map((li, i) => ({ id: `si_${i}`, quantity: li.quantity, price: CATALOGUE[li.price] })),
    },
  };
}

describe('checkout line items round-trip through the shared rule', () => {
  for (const extra of [0, 1, 4, 50]) {
    it(`${extra} extra seats: accepted, seat limit = owner + ${extra}`, () => {
      const lineItems = teamCheckoutLineItems('price_owner', 'price_extra_seat', extra);
      expect(lineItems.every((li) => li.quantity > 0)).toBe(true);
      const shape = classifyTeamSubscription(asSubscription(lineItems), {
        seatPriceId: 'price_extra_seat',
      });
      expect(shape).toMatchObject({ ok: true, extraSeats: extra, seatLimit: 1 + extra });
    });
  }

  it('the rule refuses a seat item on a Price other than the expected seat Price', () => {
    const shape = classifyTeamSubscription(
      asSubscription([
        { price: 'price_owner', quantity: 1 },
        { price: 'price_extra_seat', quantity: 2 },
      ]),
      { seatPriceId: 'price_other_seat' },
    );
    expect(shape).toEqual({ ok: false, reason: 'unknown_item' });
  });
});
