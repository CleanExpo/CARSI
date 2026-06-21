import { describe, expect, it } from 'vitest';

import { getRoadshowSuccessView } from './ccw-roadshow-success';

const TITLE = 'CARSI x CCW Business Growth Days';

describe('getRoadshowSuccessView', () => {
  it('shows a waitlist state (token NOT valid for entry) when status=waitlisted', () => {
    const view = getRoadshowSuccessView({ status: 'waitlisted', hasToken: true, eventTitle: TITLE });
    expect(view.variant).toBe('waitlisted');
    expect(view.tokenIsValidForEntry).toBe(false);
    expect(view.showTokenBlock).toBe(true);
    expect(view.heading.toLowerCase()).toContain('waitlist');
  });

  it('shows free-entry confirmed (token valid) when a token is present and not waitlisted', () => {
    const confirmed = getRoadshowSuccessView({ status: 'confirmed', hasToken: true, eventTitle: TITLE });
    expect(confirmed.variant).toBe('free-confirmed');
    expect(confirmed.tokenIsValidForEntry).toBe(true);

    const noStatus = getRoadshowSuccessView({ status: undefined, hasToken: true, eventTitle: TITLE });
    expect(noStatus.variant).toBe('free-confirmed');
    expect(noStatus.tokenIsValidForEntry).toBe(true);
  });

  it('shows a paid booking (no token block) when there is no token', () => {
    const view = getRoadshowSuccessView({ status: undefined, hasToken: false, eventTitle: TITLE });
    expect(view.variant).toBe('paid-confirmed');
    expect(view.showTokenBlock).toBe(false);
  });
});
