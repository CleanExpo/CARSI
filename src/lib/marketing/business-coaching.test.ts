import { describe, expect, it } from 'vitest';

import {
    businessCoachingSeatPriceCents,
    getBusinessCoachingPackage,
    listBookableBusinessCoachingSessions,
    packageTotalCents,
} from './business-coaching';

describe('business coaching (Owner Circle)', () => {
  it('charges $22 AUD per seat', () => {
    expect(businessCoachingSeatPriceCents).toBe(2200);
  });

  it('owner + partner is two seats', () => {
    expect(getBusinessCoachingPackage('owner-partner')?.attendeeCount).toBe(2);
    expect(packageTotalCents('owner-partner')).toBe(4400);
  });

  it('lists future sessions only', () => {
    const future = listBookableBusinessCoachingSessions(new Date('2026-10-01T00:00:00Z'));
    expect(future.length).toBeGreaterThan(0);
    expect(future.every((s) => s.slug.length > 0)).toBe(true);
  });
});
