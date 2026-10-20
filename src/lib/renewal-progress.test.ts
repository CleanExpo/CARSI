import { describe, expect, it } from 'vitest';

import { renewalProgress } from './renewal-progress';
import type { RenewalSummaryPayload } from '@/types/renewal';

function summary(over: Partial<RenewalSummaryPayload>): RenewalSummaryPayload {
  return {
    tracking_mode: 'cycle',
    has_renewal_expiry: true,
    renewal_expiry_date: '2028-12-31',
    cycle_start: '2024-12-31T00:00:00.000Z',
    cycle_end: '2028-12-31T23:59:59.999Z',
    cec_required: 14,
    cec_earned_in_cycle: 0,
    cec_earned_lifetime: 0,
    by_discipline: {},
    by_discipline_lifetime: {},
    days_until_expiry: 800,
    renewal_urgent: false,
    iicrc_member_number: null,
    some_cecs_estimated: false,
    suggested_courses: [],
    ...over,
  };
}

describe('renewalProgress (GP-655)', () => {
  it('counts only the renewal period: 33 lifetime CECs, 0 in the period, is not reached', () => {
    // The independent review's reproduction: every completion predates the 4-year period.
    const p = renewalProgress(summary({ cec_earned_in_cycle: 0, cec_earned_lifetime: 33 }), 33);
    expect(p.inPeriod).toBe(true);
    expect(p.earned).toBe(0);
    expect(p.reached).toBe(false);
    expect(p.status).toBe(
      '14 CECs remaining in the period ending 31 Dec 2028. Unapproved courses add none.'
    );
  });

  it('is reached only by CECs inside the period', () => {
    const p = renewalProgress(summary({ cec_earned_in_cycle: 14, cec_earned_lifetime: 20 }), 20);
    expect(p.reached).toBe(true);
    expect(p.percent).toBe(100);
    expect(p.status).toBe('Renewal target reached for the period ending 31 Dec 2028.');
  });

  it('without a renewal date shows the lifetime total and never says reached', () => {
    const p = renewalProgress(
      summary({
        tracking_mode: 'lifetime_no_expiry',
        has_renewal_expiry: false,
        renewal_expiry_date: null,
        cec_earned_in_cycle: 40,
        cec_earned_lifetime: 40,
      }),
      40
    );
    expect(p).toMatchObject({ earned: 40, inPeriod: false, reached: false, percent: 0 });
    expect(p.status).toMatch(/^Lifetime total\./);
  });

  it('with no summary (failed load) uses the caller lifetime figure and never says reached', () => {
    const p = renewalProgress(null, 30);
    expect(p).toMatchObject({ earned: 30, target: 14, inPeriod: false, reached: false });
  });
});
