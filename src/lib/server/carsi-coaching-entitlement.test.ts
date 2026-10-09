import { describe, expect, it } from 'vitest';

import { decideCoachingPortalEntitlement } from './carsi-coaching-entitlement';

describe('decideCoachingPortalEntitlement', () => {
  it('grants access for active coaching subscription', () => {
    const result = decideCoachingPortalEntitlement(
      { status: 'active', currentPeriodEnd: new Date('2099-01-01') },
      new Date('2026-01-01'),
    );
    expect(result.entitled).toBe(true);
  });

  it('denies access when no subscription row', () => {
    const result = decideCoachingPortalEntitlement(null);
    expect(result.entitled).toBe(false);
  });
});
