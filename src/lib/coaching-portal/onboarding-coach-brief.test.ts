import { describe, expect, it } from 'vitest';

import {
  composeFallbackCoachBrief,
  validateCoachBrief,
} from '@/lib/coaching-portal/onboarding-coach-brief';
import { PARTNER_DEMO_ONBOARDING_SNAPSHOT } from '@/lib/coaching-portal/partner-demo';

describe('onboarding coach brief (GP-628 / A1)', () => {
  it('composes a fallback brief without a model', () => {
    const brief = composeFallbackCoachBrief(PARTNER_DEMO_ONBOARDING_SNAPSHOT);
    expect(validateCoachBrief(brief)).toBe(true);
    expect(brief.source).toBe('fallback');
    expect(brief.sections.length).toBeGreaterThanOrEqual(3);
    expect(brief.draftActions.length).toBeGreaterThanOrEqual(2);
  });
});