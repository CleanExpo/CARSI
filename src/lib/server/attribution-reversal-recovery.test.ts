import { describe, expect, it } from 'vitest';

import { buildRecoveryPlan, parseRecoveryArgs } from '../../../scripts/plan-attribution-reversal-recovery';

describe('attribution reversal recovery planner', () => {
  it('requires explicit dry-run authorisation and plans offline Stripe exports without mutation', () => {
    expect(() => parseRecoveryArgs(['--input=events.json'])).toThrow('--dry-run');
    expect(() =>
      parseRecoveryArgs(['--dry-run', '--input=events.json', '--authorised-by=']),
    ).toThrow('--authorised-by');

    const plan = buildRecoveryPlan([
      {
        id: 'evt_refund',
        type: 'charge.refunded',
        created: 1_784_467_200,
        data: {
          object: {
            amount_refunded: 2_500,
            currency: 'aud',
            payment_intent: 'pi_offline',
          },
        },
      },
      { id: 'evt_ignored', type: 'customer.created', created: 1, data: { object: {} } },
    ]);

    expect(plan).toEqual([
      {
        stripeEventId: 'evt_refund',
        type: 'charge.refunded',
        paymentIntentId: 'pi_offline',
        reversedRevenueCents: 2_500,
        currency: 'AUD',
        eventAt: '2026-07-19T13:20:00.000Z',
        reason: 'refunded',
        requiresCanonicalTransactionLookup: true,
      },
    ]);
  });
});
