import { describe, expect, it } from 'vitest';

import {
  marketingFixImpactBadgeClass,
  marketingFixImpactLabel,
} from '@/lib/coaching-portal/marketing-pack/ui-labels';

describe('marketing pack UI labels', () => {
  it('maps impact to readable labels', () => {
    expect(marketingFixImpactLabel(3)).toBe('High impact');
    expect(marketingFixImpactLabel(2)).toBe('Medium impact');
    expect(marketingFixImpactLabel(1)).toBe('Quick win');
  });

  it('returns distinct badge classes per impact', () => {
    expect(marketingFixImpactBadgeClass(3)).toContain('amber');
    expect(marketingFixImpactBadgeClass(2)).toContain('sky');
    expect(marketingFixImpactBadgeClass(1)).toContain('emerald');
  });
});
